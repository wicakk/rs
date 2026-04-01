<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Ticket;
use App\Models\Asset;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\DB;
use Barryvdh\DomPDF\Facade\Pdf;
use App\Models\Project;
use App\Models\Task;
use PhpOffice\PhpSpreadsheet\Spreadsheet;
use PhpOffice\PhpSpreadsheet\Writer\Xlsx;
use PhpOffice\PhpSpreadsheet\Style\Fill;
use PhpOffice\PhpSpreadsheet\Style\Alignment;
use PhpOffice\PhpSpreadsheet\Style\Border;

class ReportController extends Controller
{
    private const SLA_TARGET = [
        'Critical' => '4 Jam',
        'High'     => '8 Jam',
        'Medium'   => '24 Jam',
        'Low'      => '72 Jam',
    ];

    private const FULL_ACCESS_ROLES = ['super_admin', 'admin', 'manager', 'manager_it'];

    private function hasFullAccess($user): bool
    {
        return in_array($user->role, self::FULL_ACCESS_ROLES);
    }

    private function scopeByRole($query, $user, string $type = 'ticket')
    {
        if ($this->hasFullAccess($user)) return $query;

        if ($type === 'ticket') {
            if ($user->role === 'supervisor') {
                return $query->whereHas('requester', fn($q) =>
                    $q->where('department', $user->department)
                );
            }
            return $query->where(function ($q) use ($user) {
                $q->where('requester_id', $user->id)
                  ->orWhere('assigned_to', $user->id);
            });
        }

        if ($type === 'asset') {
            if ($user->role === 'supervisor') return $query->where('department', $user->department);
            return $query->where('user_id', $user->id);
        }

        return $query;
    }

    private function applyTicketFilters($query, Request $request)
    {
        if ($request->filled('from'))   $query->whereDate('created_at', '>=', $request->from);
        if ($request->filled('to'))     $query->whereDate('created_at', '<=', $request->to);
        if ($request->filled('status')) $query->where('status', $request->status);

        if ($request->filled('user_id')) {
            $uid = $request->user_id;
            $query->where(function ($q) use ($uid) {
                $q->where('requester_id', $uid)->orWhere('assigned_to', $uid);
            });
        }

        return $query;
    }

    // ══════════════════════════════════════════════════════════════════════════
    // SUMMARY
    // ══════════════════════════════════════════════════════════════════════════

    public function summary(Request $request): JsonResponse
    {
        $user  = $request->user();
        $month = $request->get('month', now()->month);
        $year  = $request->get('year',  now()->year);

        $base = Ticket::whereMonth('created_at', $month)->whereYear('created_at', $year);
        $base = $this->scopeByRole($base, $user, 'ticket');
        $base = $this->applyTicketFilters($base, $request);

        $resolvedThisMonth = (clone $base)->whereIn('status', ['Resolved', 'Closed'])->count();
        $avgMinutes = (clone $base)->whereIn('status', ['Resolved', 'Closed'])->whereNotNull('resolution_time_minutes')->avg('resolution_time_minutes') ?? 0;

        $slaQuery  = Ticket::whereIn('status', ['Resolved', 'Closed']);
        $slaQuery  = $this->scopeByRole($slaQuery, $user, 'ticket');
        $slaQuery  = $this->applyTicketFilters($slaQuery, $request);
        $slaTotal  = (clone $slaQuery)->count();
        $slaOnTime = (clone $slaQuery)->where('sla_breached', false)->count();
        $slaScore  = $slaTotal > 0 ? round(($slaOnTime / $slaTotal) * 100) : 100;

        $openQuery    = Ticket::whereNotIn('status', ['Resolved', 'Closed']);
        $openQuery    = $this->scopeByRole($openQuery, $user, 'ticket');
        $overdueQuery = Ticket::overdue();
        $overdueQuery = $this->scopeByRole($overdueQuery, $user, 'ticket');
        $overdueQuery = $this->applyTicketFilters($overdueQuery, $request);

        return response()->json([
            'total_tickets'   => (clone $base)->count(),
            'resolved'        => $resolvedThisMonth,
            'open'            => (clone $base)->where('status', 'Open')->count(),
            'in_progress'     => (clone $base)->whereIn('status', ['Assigned', 'In Progress', 'Waiting User'])->count(),
            'avg_resolution'  => round($avgMinutes / 60, 1),
            'sla_score'       => $slaScore,
            'open_tickets'    => $openQuery->count(),
            'overdue_tickets' => $overdueQuery->count(),
            'user_role'       => $user->role,
            'user_department' => $user->department ?? null,
            'is_full_access'  => $this->hasFullAccess($user),
        ]);
    }

    // ══════════════════════════════════════════════════════════════════════════
    // TICKETS — JSON / PDF / EXCEL
    // ══════════════════════════════════════════════════════════════════════════

    public function tickets(Request $request)
    {
        $user = $request->user();

        $query = Ticket::with(['requester:id,name,department', 'assignee:id,name'])->latest();
        $query = $this->scopeByRole($query, $user, 'ticket');
        $query = $this->applyTicketFilters($query, $request);

        $format = strtolower($request->get('format', 'json'));

        if ($format === 'excel') return $this->exportTicketsExcel($query->get(), $request);
        if ($format === 'pdf')   return $this->exportTicketsPdf($query->limit(500)->get(), $request);

        $tickets = $query->paginate(20);
        $tickets->getCollection()->transform(fn($t) => [
            'id'            => $t->id,
            'ticket_number' => $t->ticket_number ?? "#{$t->id}",
            'title'         => $t->title,
            'category'      => $t->category,
            'priority'      => $t->priority,
            'status'        => $t->status,
            'requester'     => $t->requester ? ['name' => $t->requester->name, 'department' => $t->requester->department] : null,
            'assignee'      => $t->assignee  ? ['name' => $t->assignee->name] : null,
            'created_at'    => $t->created_at?->toISOString(),
            'resolved_at'   => $t->resolved_at?->toISOString(),
            'sla_deadline'  => $t->sla_deadline?->toISOString(),
            'sla_breached'  => (bool) $t->sla_breached,
        ]);

        return response()->json($tickets);
    }

    // ══════════════════════════════════════════════════════════════════════════
    // HELPER: Ambil data identitas user dari filter atau login user
    //
    // Jika user_id diisi → ambil dari user tersebut
    // Jika tidak (semua user) → semua field = '-'
    // ══════════════════════════════════════════════════════════════════════════

    private function resolveIdentityUser(Request $request): array
    {
        if ($request->filled('user_id')) {
            $u = User::find($request->user_id);
            if ($u) {
                return [
                    'nama'    => $u->name        ?? '-',
                    'nip'     => $u->nip         ?? '-',
                    'pangkat' => $u->pangkat      ?? '-',
                    'jabatan' => $u->jabatan ?? ($u->role_display ?? $u->role ?? '-'),
                    'unit'    => $u->department   ?? '-',
                ];
            }
        }

        // Tidak ada filter user → semua field '-'
        return [
            'nama'    => '-',
            'nip'     => '-',
            'pangkat' => '-',
            'jabatan' => '-',
            'unit'    => '-',
        ];
    }

    // ══════════════════════════════════════════════════════════════════════════
    // HELPER: Hitung tiket per hari per kategori
    // Return: [ day => [ '__total' => n, 'CategoryName' => n, ... ] ]
    // ══════════════════════════════════════════════════════════════════════════

    private function buildTicketDataPerDay($tickets, int $month, int $year): array
    {
        $data = [];
        foreach ($tickets as $t) {
            if (!$t->created_at) continue;
            if ((int)$t->created_at->format('n') !== $month || (int)$t->created_at->format('Y') !== $year) continue;

            $day      = (int) $t->created_at->format('j');
            $category = $t->category ?? '';

            if (!isset($data[$day])) $data[$day] = ['__total' => 0];
            $data[$day]['__total']++;
            if ($category !== '') {
                $data[$day][$category] = ($data[$day][$category] ?? 0) + 1;
            }
        }
        return $data;
    }

    // ══════════════════════════════════════════════════════════════════════════
    // HELPER: Ambil daftar kategori unik dari tiket
    // Return: [ 'CategoryName', ... ] sorted alphabetically
    // ══════════════════════════════════════════════════════════════════════════

    private function getUniqueCategories($tickets): array
    {
        return $tickets
            ->pluck('category')
            ->filter()
            ->unique()
            ->sort()
            ->values()
            ->toArray();
    }

    // ══════════════════════════════════════════════════════════════════════════
    // PDF EXPORT — LAPORAN TIKET + LKH DINAMIS
    // ══════════════════════════════════════════════════════════════════════════

    private function exportTicketsPdf($tickets, Request $request)
    {
        $grouped    = $tickets->groupBy('category')->sortKeys();
        $filterDesc = $this->buildFilterDesc($request);
        $orgName    = config('app.org_name', 'IT Support Management System');

        // ── Tabel tiket ──────────────────────────────────────────────────────
        $tableRows  = '';
        $grandTotal = 0;

        foreach ($grouped as $category => $items) {
            $count = $items->count();
            $grandTotal += $count;
            $no = 1;

            foreach ($items as $t) {
                $slaStatus = $t->sla_breached
                    ? '<span class="breach">&#x2717; Breach</span>'
                    : '<span class="ok">&#x2713; OK</span>';
                $priClass = 'pri-' . strtolower($t->priority ?? 'medium');

                $tableRows .= "
                <tr>
                    <td class='center'>{$no}</td>
                    <td>" . e($t->title) . "</td>
                    <td>" . e($t->requester?->name ?? '&#x2014;') . "</td>
                    <td>" . e($t->assignee?->name  ?? 'Unassigned') . "</td>
                    <td class='center {$priClass}'>" . e($t->priority) . "</td>
                    <td class='center'>" . e($t->status) . "</td>
                    <td class='center mono'>" . ($t->created_at  ? $t->created_at->format('d/m/Y H:i')  : '&#x2014;') . "</td>
                    <td class='center mono'>" . ($t->resolved_at ? $t->resolved_at->format('d/m/Y H:i') : '&#x2014;') . "</td>
                    <td class='center'>{$slaStatus}</td>
                </tr>";
                $no++;
            }

            $tableRows .= "
            <tr class='group-summary'>
                <td colspan='9'>
                    <strong>Kategori : " . e($category ?: 'Tidak Ada Kategori') . " , jumlah : {$count}</strong>
                </td>
            </tr>";
        }

        $tableRows .= "
        <tr class='grand-total'>
            <td colspan='9'>
                <strong>Jumlah tiket yang ditangani adalah = {$grandTotal}</strong>
            </td>
        </tr>";

        // ── Deteksi bulan & tahun ────────────────────────────────────────────
        if ($request->filled('from')) {
            $refDate = \Carbon\Carbon::parse($request->from);
        } elseif ($tickets->isNotEmpty() && $tickets->first()->created_at) {
            $refDate = $tickets->first()->created_at;
        } else {
            $refDate = now();
        }
        $lkhMonth = (int) $refDate->format('n');
        $lkhYear  = (int) $refDate->format('Y');

        // ── Data per hari & kategori unik ────────────────────────────────────
        $ticketData  = $this->buildTicketDataPerDay($tickets, $lkhMonth, $lkhYear);
        $categories  = $this->getUniqueCategories($tickets);
        $identity    = $this->resolveIdentityUser($request);

        // ── LKH section ──────────────────────────────────────────────────────
        $lkhHtml = $this->buildLkhHtml($ticketData, $categories, $identity, $lkhMonth, $lkhYear);
        $html    = $this->buildTicketPdfHtml($orgName, $filterDesc, $tableRows, $grandTotal, $lkhHtml);

        return Pdf::loadHTML($html)
            ->setPaper('a4', 'landscape')
            ->download('laporan-tiket-' . now()->format('Ymd') . '.pdf');
    }

    // ══════════════════════════════════════════════════════════════════════════
    // LKH HTML — uraian dari kategori DB, identitas dari user filter
    // ══════════════════════════════════════════════════════════════════════════

    private function buildLkhHtml(
        array  $ticketData,
        array  $categories,
        array  $identity,
        int    $month,
        int    $year
    ): string {
        $bulanNames = [
            1=>'Januari',2=>'Februari',3=>'Maret',4=>'April',
            5=>'Mei',6=>'Juni',7=>'Juli',8=>'Agustus',
            9=>'September',10=>'Oktober',11=>'November',12=>'Desember',
        ];

        $daysInMonth = cal_days_in_month(CAL_GREGORIAN, $month, $year);
        $bulantahun  = ($bulanNames[$month] ?? $month) . ' ' . $year;

        // ── Header hari ───────────────────────────────────────────────────────
        $dayThs = '';
        for ($d = 1; $d <= 31; $d++) {
            if ($d <= $daysInMonth) {
                $dow   = (int) date('w', mktime(0, 0, 0, $month, $d, $year));
                $style = $dow === 0 ? ' style="background:#f0f0f0;color:#aaa"' : '';
                $dayThs .= "<th{$style}>{$d}</th>";
            } else {
                $dayThs .= '<th style="background:#f9f9f9;color:#ccc;border:1px solid #ddd"></th>';
            }
        }

        // ── Baris kategori ────────────────────────────────────────────────────
        $bodyRows   = '';
        $colTotals  = array_fill(1, 31, 0);
        $grandLkh   = 0;
        $no         = 1;

        // Baris 1: Total semua tiket per hari
        $rowTotalAll = 0;
        $cellsAll    = '';
        for ($d = 1; $d <= 31; $d++) {
            if ($d > $daysInMonth) { $cellsAll .= '<td class="cell-off"></td>'; continue; }
            $dow  = (int) date('w', mktime(0, 0, 0, $month, $d, $year));
            $val  = $ticketData[$d]['__total'] ?? 0;
            $rowTotalAll      += $val;
            $colTotals[$d]    += $val;
            $grandLkh         += $val;

            if ($dow === 0)     $cls = 'cell-wknd';
            elseif ($val >= 10) $cls = 'cell-crit';
            elseif ($val >= 5)  $cls = 'cell-high';
            elseif ($val > 0)   $cls = 'cell-ticket';
            else                $cls = '';

            $display  = $val > 0 ? $val : '';
            $cellsAll .= "<td class=\"{$cls}\">{$display}</td>";
        }

        $bodyRows .= "
        <tr>
            <td class='td-no'>{$no}</td>
            <td class='td-uraian'><strong>Total Semua Tiket</strong> <span class='auto-tag'>auto: total</span></td>
            {$cellsAll}
            <td class='td-jumlah' style='color:#1e40af'>{$rowTotalAll}</td>
        </tr>";
        $no++;

        // Baris per kategori
        foreach ($categories as $cat) {
            $rowTotal = 0;
            $cells    = '';

            for ($d = 1; $d <= 31; $d++) {
                if ($d > $daysInMonth) { $cells .= '<td class="cell-off"></td>'; continue; }

                $dow = (int) date('w', mktime(0, 0, 0, $month, $d, $year));
                $val = $ticketData[$d][$cat] ?? 0;

                $rowTotal      += $val;
                $colTotals[$d] += $val;
                $grandLkh      += $val;

                if ($dow === 0)     $cls = 'cell-wknd';
                elseif ($val >= 10) $cls = 'cell-crit';
                elseif ($val >= 5)  $cls = 'cell-high';
                elseif ($val > 0)   $cls = 'cell-ticket';
                else                $cls = '';

                $display = $val > 0 ? $val : '';
                $cells  .= "<td class=\"{$cls}\">{$display}</td>";
            }

            $bodyRows .= "
            <tr>
                <td class='td-no'>{$no}</td>
                <td class='td-uraian'>" . e($cat) . " <span class='auto-cat-tag'>auto: " . e($cat) . "</span></td>
                {$cells}
                <td class='td-jumlah' style='color:#1e40af'>{$rowTotal}</td>
            </tr>";
            $no++;
        }

        // Baris total kolom
        $colTotalCells = '';
        for ($d = 1; $d <= 31; $d++) {
            if ($d > $daysInMonth) { $colTotalCells .= '<td class="cell-off"></td>'; continue; }
            $dow = (int) date('w', mktime(0, 0, 0, $month, $d, $year));
            $v   = $colTotals[$d];
            if ($dow === 0)    $cls = 'cell-wknd';
            elseif ($v >= 10)  $cls = 'cell-crit';
            elseif ($v >= 5)   $cls = 'cell-high';
            elseif ($v > 0)    $cls = 'cell-ticket';
            else               $cls = '';
            $colTotalCells .= "<td class=\"{$cls}\">{$v}</td>";
        }

        // ── Identity HTML ─────────────────────────────────────────────────────
        $identityFields = [
            'Nama'                => $identity['nama'],
            'NIP'                 => $identity['nip'],
            'Pangkat/Gol Ruangan' => $identity['pangkat'],
            'Jabatan/Pekerjaan'   => $identity['jabatan'],
            'Unit Organisasi'     => $identity['unit'],
            'Bulan, Tahun'        => $bulantahun,
        ];

        $identityHtml = '<div class="identity-grid">';
        foreach ($identityFields as $label => $value) {
            $identityHtml .= "
            <div class='identity-row'>
                <span class='id-label'>{$label}</span>
                <span class='id-colon'>:</span>
                <span class='id-value'>" . e($value) . "</span>
            </div>";
        }
        $identityHtml .= '</div>';

        return <<<HTML
<div class="lkh-header">
  <div style="font-size:9px;">
    <div class="lkh-org-label">IT Support<br>Management System</div>
  </div>
  <div style="flex:1;text-align:center;">
    <span class="lkh-title-box">Laporan Kegiatan Harian Pegawai</span>
  </div>
  <div class="lkh-form-code">F/039/175/R/00</div>
</div>

{$identityHtml}

<div class="lkh-note">
  Uraian kegiatan diisi otomatis dari <strong>kategori tiket</strong> yang ada pada periode laporan.
  Warna: <span style="background:#dbeafe;color:#1e40af;padding:1px 3px;">biru</span>=ada tiket &nbsp;
  <span style="background:#fef3c7;color:#92400e;padding:1px 3px;">kuning</span>=&#x2265;5 &nbsp;
  <span style="background:#fee2e2;color:#991b1b;padding:1px 3px;">merah</span>=&#x2265;10
</div>

<table class="lkh">
  <thead>
    <tr>
      <th class="td-no">NO</th>
      <th class="td-uraian" style="min-width:160px">URAIAN KEGIATAN (KATEGORI TIKET)</th>
      {$dayThs}
      <th class="td-jumlah">JML</th>
    </tr>
  </thead>
  <tbody>
    {$bodyRows}
    <tr class="lkh-total">
      <td colspan="2" style="text-align:left;padding-left:6px;">JUMLAH</td>
      {$colTotalCells}
      <td class="td-jumlah">{$grandLkh}</td>
    </tr>
  </tbody>
</table>

<div class="lkh-ket"><strong>Ket:</strong> Data diambil otomatis dari kategori tiket pada laporan di atas &nbsp;|&nbsp; Digenerate: {$this->nowFormatted()}</div>
HTML;
    }

    // ── HTML wrapper laporan tiket + LKH ─────────────────────────────────────

    private function buildTicketPdfHtml(
        string $orgName,
        string $filterDesc,
        string $tableRows,
        int    $grandTotal,
        string $lkhSection = ''
    ): string {
        return <<<HTML
<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<style>
  * { margin:0; padding:0; box-sizing:border-box; }
  body { font-family: 'DejaVu Sans', Arial, sans-serif; font-size: 8px; color: #1a1a1a; }

  .page-header { text-align: center; margin-bottom: 14px; }
  .page-header h1 { font-size: 13px; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; }
  .page-header .org { font-size: 10px; font-weight: 700; margin-bottom: 2px; }
  .page-header .filter { font-size: 8px; color: #555; margin-top: 4px; }
  .divider  { border-top: 2px solid #1a1a1a; margin: 6px 0 2px; }
  .divider2 { border-top: 1px solid #1a1a1a; margin-bottom: 10px; }

  table.ticket { width: 100%; border-collapse: collapse; font-size: 7.5px; }
  table.ticket thead tr { background: #F5F5A0; }
  table.ticket th { border: 1px solid #999; padding: 5px 6px; text-align: center; font-weight: 700; font-size: 8px; background: #F5F5A0; }
  table.ticket td { border: 1px solid #bbb; padding: 4px 6px; vertical-align: middle; }
  table.ticket tr:nth-child(even) td { background: #fafafa; }

  .center { text-align: center; }
  .mono   { font-family: monospace; font-size: 7px; }
  .pri-critical { color: #dc2626; font-weight: 700; }
  .pri-high     { color: #ea580c; font-weight: 700; }
  .pri-medium   { color: #d97706; }
  .pri-low      { color: #16a34a; }
  .ok     { color: #16a34a; font-weight: 700; }
  .breach { color: #dc2626; font-weight: 700; }

  tr.group-summary td { background: #FFFFAA !important; color: #1a1a1a; font-size: 8px; padding: 4px 8px; border: 1px solid #bbb; }
  tr.grand-total td   { background: #FFE200 !important; color: #1a1a1a; font-size: 9px; font-weight: 700; padding: 5px 8px; border: 1px solid #bbb; }

  .rpt-footer { margin-top: 10px; font-size: 7px; color: #888; display: flex; justify-content: space-between; border-top: 1px solid #ccc; padding-top: 4px; }

  .section-divider { border-top: 2px dashed #aaa; margin: 20px 0 16px; page-break-before: always; }

  .lkh-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 10px; }
  .lkh-title-box { flex: 1; text-align: center; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; border: 1px solid #999; padding: 5px 18px; display: inline-block; }
  .lkh-org-label { font-size: 9px; font-weight: 700; color: #555; line-height: 1.3; }
  .lkh-form-code { font-size: 9px; color: #777; border: 1px solid #bbb; padding: 3px 7px; white-space: nowrap; }

  .identity-grid { display: table; width: 50%; margin-bottom: 10px; font-size: 9px; }
  .identity-row  { display: table-row; }
  .id-label { display: table-cell; width: 130px; color: #555; padding: 2px 0; }
  .id-colon { display: table-cell; width: 12px; color: #555; }
  .id-value { display: table-cell; font-weight: 700; padding: 2px 0; }

  .lkh-note { font-size: 8px; color: #92400e; background: #fffbe6; border: 1px solid #ffe58f; padding: 3px 8px; margin-bottom: 6px; }

  table.lkh { width: 100%; border-collapse: collapse; font-size: 7.5px; }
  table.lkh th { border: 1px solid #999; padding: 4px 2px; text-align: center; font-weight: 700; background: #F5F5A0; font-size: 7.5px; }
  table.lkh td { border: 1px solid #bbb; padding: 3px 2px; vertical-align: middle; text-align: center; }
  table.lkh td.td-uraian { text-align: left; padding: 3px 5px; }
  table.lkh td.td-no     { width: 18px; }
  table.lkh td.td-jumlah { font-weight: 700; width: 28px; }

  td.cell-ticket { background: #dbeafe; color: #1e40af; font-weight: 700; }
  td.cell-high   { background: #fef3c7; color: #92400e; font-weight: 700; }
  td.cell-crit   { background: #fee2e2; color: #991b1b; font-weight: 700; }
  td.cell-wknd   { background: #f0f0f0; color: #aaa; }
  td.cell-off    { background: #f9f9f9; }

  tr.lkh-total td { background: #F5F5A0; font-weight: 700; font-size: 8px; }

  .auto-tag     { font-size: 6px; color: #1e40af; background: #dbeafe; border-radius: 2px; padding: 1px 2px; margin-left: 3px; }
  .auto-cat-tag { font-size: 6px; color: #065f46; background: #d1fae5; border-radius: 2px; padding: 1px 2px; margin-left: 3px; }
  .lkh-ket      { font-size: 8px; color: #888; margin-top: 5px; }
</style>
</head>
<body>

<div class="page-header">
  <div class="org">{$orgName}</div>
  <div class="divider"></div>
  <h1>Laporan Tiket IT Support</h1>
  <div class="divider2"></div>
  <div class="filter">{$filterDesc}</div>
</div>

<table class="ticket">
  <thead>
    <tr>
      <th style="width:25px">No.</th>
      <th>Judul Tiket</th>
      <th style="width:80px">Reporter</th>
      <th style="width:80px">Assigned To</th>
      <th style="width:55px">Prioritas</th>
      <th style="width:70px">Status</th>
      <th style="width:80px">Dibuat</th>
      <th style="width:80px">Diselesaikan</th>
      <th style="width:45px">SLA</th>
    </tr>
  </thead>
  <tbody>{$tableRows}</tbody>
</table>

<div class="rpt-footer">
  <span>IT Support Management System</span>
  <span>Digenerate: {$this->nowFormatted()}</span>
  <span>Total tiket: {$grandTotal}</span>
</div>

<div class="section-divider"></div>

{$lkhSection}

</body>
</html>
HTML;
    }

    // ══════════════════════════════════════════════════════════════════════════
    // EXCEL EXPORT — LAPORAN TIKET + SHEET LKH DINAMIS
    // ══════════════════════════════════════════════════════════════════════════

    private function exportTicketsExcel($tickets, Request $request)
    {
        $grouped    = $tickets->groupBy('category')->sortKeys();
        $filterDesc = $this->buildFilterDesc($request);
        $orgName    = config('app.org_name', 'IT Support Management System');
        $identity   = $this->resolveIdentityUser($request);

        $ss    = new Spreadsheet();
        $sheet = $ss->getActiveSheet()->setTitle('Laporan Tiket');

        $COLOR_HEADER_BG = 'FFF5F5A0';
        $COLOR_TOTAL_BG  = 'FFFFE200';
        $COLOR_TITLE_BG  = 'FF1E3A5F';

        $row = 1;

        // ── Header ───────────────────────────────────────────────────────────
        $sheet->setCellValueByColumnAndRow(1, $row, $orgName);
        $sheet->mergeCellsByColumnAndRow(1, $row, 10, $row);
        $sheet->getStyleByColumnAndRow(1, $row, 10, $row)->applyFromArray([
            'font'      => ['bold' => true, 'size' => 12, 'color' => ['argb' => 'FFFFFFFF']],
            'fill'      => ['fillType' => Fill::FILL_SOLID, 'startColor' => ['argb' => $COLOR_TITLE_BG]],
            'alignment' => ['horizontal' => Alignment::HORIZONTAL_CENTER, 'vertical' => Alignment::VERTICAL_CENTER],
        ]);
        $sheet->getRowDimension($row)->setRowHeight(22);
        $row++;

        $sheet->setCellValueByColumnAndRow(1, $row, 'LAPORAN TIKET IT SUPPORT');
        $sheet->mergeCellsByColumnAndRow(1, $row, 10, $row);
        $sheet->getStyleByColumnAndRow(1, $row, 10, $row)->applyFromArray([
            'font'      => ['bold' => true, 'size' => 11, 'color' => ['argb' => 'FFFFFFFF']],
            'fill'      => ['fillType' => Fill::FILL_SOLID, 'startColor' => ['argb' => $COLOR_TITLE_BG]],
            'alignment' => ['horizontal' => Alignment::HORIZONTAL_CENTER],
        ]);
        $sheet->getRowDimension($row)->setRowHeight(18);
        $row++;

        $sheet->setCellValueByColumnAndRow(1, $row, $filterDesc);
        $sheet->mergeCellsByColumnAndRow(1, $row, 10, $row);
        $sheet->getStyleByColumnAndRow(1, $row, 10, $row)->applyFromArray([
            'font'      => ['italic' => true, 'size' => 8, 'color' => ['argb' => 'FF555555']],
            'alignment' => ['horizontal' => Alignment::HORIZONTAL_CENTER],
        ]);
        $row++;
        $row++;

        // ── Header kolom ─────────────────────────────────────────────────────
        $headers  = ['No.', 'Judul Tiket', 'Reporter', 'Departemen', 'Assigned To', 'Prioritas', 'Status', 'Dibuat', 'Diselesaikan', 'SLA'];
        $colCount = count($headers);
        foreach ($headers as $hIdx => $hLabel) {
            $sheet->setCellValueByColumnAndRow($hIdx + 1, $row, $hLabel);
        }
        $sheet->getStyleByColumnAndRow(1, $row, $colCount, $row)->applyFromArray([
            'font'      => ['bold' => true, 'size' => 9],
            'fill'      => ['fillType' => Fill::FILL_SOLID, 'startColor' => ['argb' => $COLOR_HEADER_BG]],
            'alignment' => ['horizontal' => Alignment::HORIZONTAL_CENTER, 'vertical' => Alignment::VERTICAL_CENTER],
            'borders'   => ['allBorders' => ['borderStyle' => Border::BORDER_THIN, 'color' => ['argb' => 'FF999999']]],
        ]);
        $sheet->getRowDimension($row)->setRowHeight(16);
        $row++;

        foreach ([5, 40, 18, 16, 18, 12, 15, 18, 18, 10] as $cIdx => $width) {
            $sheet->getColumnDimensionByColumn($cIdx + 1)->setWidth($width);
        }

        // ── Data ─────────────────────────────────────────────────────────────
        $grandTotal   = 0;
        $dataRowStyle = [
            'borders' => ['allBorders' => ['borderStyle' => Border::BORDER_THIN, 'color' => ['argb' => 'FFBBBBBB']]],
            'font'    => ['size' => 8],
        ];

        foreach ($grouped as $category => $items) {
            $count = $items->count();
            $grandTotal += $count;
            $no = 1;

            foreach ($items as $t) {
                $bgColor = ($no % 2 === 0) ? 'FFFFFFFF' : 'FFFAFAFA';
                $rowData = [
                    $no,
                    $t->title,
                    $t->requester?->name ?? '—',
                    $t->requester?->department ?? '—',
                    $t->assignee?->name  ?? 'Unassigned',
                    $t->priority,
                    $t->status,
                    $t->created_at  ? $t->created_at->format('d/m/Y H:i')  : '—',
                    $t->resolved_at ? $t->resolved_at->format('d/m/Y H:i') : '—',
                    $t->sla_breached ? '✗ Breach' : '✓ OK',
                ];

                foreach ($rowData as $cIdx => $val) {
                    $sheet->setCellValueByColumnAndRow($cIdx + 1, $row, $val);
                }
                $sheet->getStyleByColumnAndRow(1, $row, $colCount, $row)->applyFromArray(array_merge($dataRowStyle, [
                    'fill' => ['fillType' => Fill::FILL_SOLID, 'startColor' => ['argb' => $bgColor]],
                    'alignment' => ['vertical' => Alignment::VERTICAL_CENTER],
                ]));

                $priColors = ['critical' => 'FFDC2626', 'high' => 'FFEA580C', 'medium' => 'FFD97706', 'low' => 'FF16A34A'];
                $priColor  = $priColors[strtolower($t->priority ?? 'medium')] ?? 'FF1A1A1A';
                $sheet->getStyleByColumnAndRow(6, $row)->getFont()->getColor()->setARGB($priColor);
                $sheet->getStyleByColumnAndRow(6, $row)->getFont()->setBold(true);

                $slaColor = $t->sla_breached ? 'FFDC2626' : 'FF16A34A';
                $sheet->getStyleByColumnAndRow(10, $row)->getFont()->getColor()->setARGB($slaColor);
                $sheet->getStyleByColumnAndRow(10, $row)->getFont()->setBold(true);

                foreach ([1, 6, 7, 8, 9, 10] as $cCenter) {
                    $sheet->getStyleByColumnAndRow($cCenter, $row)->getAlignment()->setHorizontal(Alignment::HORIZONTAL_CENTER);
                }

                $sheet->getRowDimension($row)->setRowHeight(14);
                $no++;
                $row++;
            }

            // Summary grup
            $sheet->setCellValueByColumnAndRow(1, $row, "Kategori : " . ($category ?: 'Tidak Ada Kategori') . " , jumlah : {$count}");
            $sheet->mergeCellsByColumnAndRow(1, $row, $colCount, $row);
            $sheet->getStyleByColumnAndRow(1, $row, $colCount, $row)->applyFromArray([
                'font'      => ['bold' => true, 'size' => 8, 'italic' => true],
                'fill'      => ['fillType' => Fill::FILL_SOLID, 'startColor' => ['argb' => 'FFFFFFAA']],
                'borders'   => ['allBorders' => ['borderStyle' => Border::BORDER_THIN, 'color' => ['argb' => 'FFBBBBBB']]],
                'alignment' => ['horizontal' => Alignment::HORIZONTAL_LEFT, 'vertical' => Alignment::VERTICAL_CENTER],
            ]);
            $sheet->getRowDimension($row)->setRowHeight(14);
            $row++;
        }

        // Grand total
        $sheet->setCellValueByColumnAndRow(1, $row, "Jumlah tiket yang ditangani adalah =  {$grandTotal}");
        $sheet->mergeCellsByColumnAndRow(1, $row, $colCount, $row);
        $sheet->getStyleByColumnAndRow(1, $row, $colCount, $row)->applyFromArray([
            'font'      => ['bold' => true, 'size' => 10],
            'fill'      => ['fillType' => Fill::FILL_SOLID, 'startColor' => ['argb' => $COLOR_TOTAL_BG]],
            'borders'   => ['allBorders' => ['borderStyle' => Border::BORDER_MEDIUM, 'color' => ['argb' => 'FF999900']]],
            'alignment' => ['horizontal' => Alignment::HORIZONTAL_LEFT, 'vertical' => Alignment::VERTICAL_CENTER],
        ]);
        $sheet->getRowDimension($row)->setRowHeight(18);
        $row += 2;

        $sheet->setCellValueByColumnAndRow(1, $row, 'Digenerate: ' . $this->nowFormatted());
        $sheet->getStyleByColumnAndRow(1, $row)->applyFromArray([
            'font' => ['italic' => true, 'size' => 7, 'color' => ['argb' => 'FF888888']],
        ]);

        // ── Sheet 2: LKH ──────────────────────────────────────────────────────
        $this->buildLkhExcelSheet($ss, $tickets, $identity, $request);

        return response()->streamDownload(function () use ($ss) {
            $writer = new Xlsx($ss);
            $writer->save('php://output');
        }, 'laporan-tiket-' . now()->format('Ymd') . '.xlsx', [
            'Content-Type'        => 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            'Content-Disposition' => 'attachment; filename="laporan-tiket-' . now()->format('Ymd') . '.xlsx"',
            'Cache-Control'       => 'max-age=0',
        ]);
    }

    // ── Sheet LKH di Excel ────────────────────────────────────────────────────

    private function buildLkhExcelSheet(Spreadsheet $ss, $tickets, array $identity, Request $request): void
    {
        // Deteksi bulan & tahun
        if ($request->filled('from')) {
            $refDate = \Carbon\Carbon::parse($request->from);
        } elseif ($tickets->isNotEmpty() && $tickets->first()->created_at) {
            $refDate = $tickets->first()->created_at;
        } else {
            $refDate = now();
        }
        $month = (int) $refDate->format('n');
        $year  = (int) $refDate->format('Y');

        $bulanNames = [
            1=>'Januari',2=>'Februari',3=>'Maret',4=>'April',
            5=>'Mei',6=>'Juni',7=>'Juli',8=>'Agustus',
            9=>'September',10=>'Oktober',11=>'November',12=>'Desember',
        ];
        $daysInMonth = cal_days_in_month(CAL_GREGORIAN, $month, $year);
        $bulantahun  = ($bulanNames[$month] ?? $month) . ' ' . $year;

        $ticketData = $this->buildTicketDataPerDay($tickets, $month, $year);
        $categories = $this->getUniqueCategories($tickets);

        $lkhSheet = $ss->createSheet()->setTitle('Kegiatan Harian');
        $lkhSheet = $ss->getSheetByName('Kegiatan Harian');

        $COLOR_TITLE_BG  = 'FF1E3A5F';
        $COLOR_HEADER_BG = 'FFF5F5A0';
        $COLOR_TOTAL_BG  = 'FFFFE200';
        $COLOR_TICKET    = 'FFDBEAFE';
        $COLOR_HIGH      = 'FFFEF3C7';
        $COLOR_CRIT      = 'FFFEE2E2';
        $COLOR_WKND      = 'FFF0F0F0';

        $totalCols = 2 + 31 + 1; // NO + URAIAN + 31 hari + JML
        $row = 1;

        // Judul
        $lkhSheet->setCellValueByColumnAndRow(1, $row, 'LAPORAN KEGIATAN HARIAN PEGAWAI');
        $lkhSheet->mergeCellsByColumnAndRow(1, $row, $totalCols, $row);
        $lkhSheet->getStyleByColumnAndRow(1, $row, $totalCols, $row)->applyFromArray([
            'font'      => ['bold' => true, 'size' => 12, 'color' => ['argb' => 'FFFFFFFF']],
            'fill'      => ['fillType' => Fill::FILL_SOLID, 'startColor' => ['argb' => $COLOR_TITLE_BG]],
            'alignment' => ['horizontal' => Alignment::HORIZONTAL_CENTER, 'vertical' => Alignment::VERTICAL_CENTER],
        ]);
        $lkhSheet->getRowDimension($row)->setRowHeight(22);
        $row++;

        $lkhSheet->setCellValueByColumnAndRow(1, $row, 'F/039/175/R/00 — IT Support Management System');
        $lkhSheet->mergeCellsByColumnAndRow(1, $row, $totalCols, $row);
        $lkhSheet->getStyleByColumnAndRow(1, $row, $totalCols, $row)->applyFromArray([
            'font'      => ['italic' => true, 'size' => 8, 'color' => ['argb' => 'FF888888']],
            'alignment' => ['horizontal' => Alignment::HORIZONTAL_RIGHT],
        ]);
        $row++;
        $row++;

        // Identity
        $identityData = [
            'Nama'                => $identity['nama'],
            'NIP'                 => $identity['nip'],
            'Pangkat/Gol Ruangan' => $identity['pangkat'],
            'Jabatan/Pekerjaan'   => $identity['jabatan'],
            'Unit Organisasi'     => $identity['unit'],
            'Bulan, Tahun'        => $bulantahun,
        ];

        $lkhSheet->getColumnDimensionByColumn(1)->setWidth(22);
        $lkhSheet->getColumnDimensionByColumn(2)->setWidth(3);
        $lkhSheet->getColumnDimensionByColumn(3)->setWidth(40);

        foreach ($identityData as $label => $value) {
            $lkhSheet->setCellValueByColumnAndRow(1, $row, $label);
            $lkhSheet->setCellValueByColumnAndRow(2, $row, ':');
            $lkhSheet->setCellValueByColumnAndRow(3, $row, $value);
            $lkhSheet->getStyleByColumnAndRow(3, $row)->getFont()->setBold(true);
            $lkhSheet->getRowDimension($row)->setRowHeight(14);
            $row++;
        }
        $row++;

        // Catatan auto-fill
        $lkhSheet->setCellValueByColumnAndRow(1, $row, 'Uraian kegiatan diisi otomatis dari kategori tiket yang ada pada periode laporan.');
        $lkhSheet->mergeCellsByColumnAndRow(1, $row, $totalCols, $row);
        $lkhSheet->getStyleByColumnAndRow(1, $row, $totalCols, $row)->applyFromArray([
            'font'      => ['italic' => true, 'size' => 8, 'color' => ['argb' => 'FF92400E']],
            'fill'      => ['fillType' => Fill::FILL_SOLID, 'startColor' => ['argb' => 'FFFFFBE6']],
            'alignment' => ['horizontal' => Alignment::HORIZONTAL_LEFT],
        ]);
        $lkhSheet->getRowDimension($row)->setRowHeight(14);
        $row++;
        $row++;

        // Header kolom: NO | URAIAN | 1..31 | JML
        $lkhSheet->getColumnDimensionByColumn(1)->setWidth(5);
        $lkhSheet->getColumnDimensionByColumn(2)->setWidth(55);
        for ($d = 1; $d <= 31; $d++) {
            $lkhSheet->getColumnDimensionByColumn($d + 2)->setWidth(4);
        }
        $lkhSheet->getColumnDimensionByColumn(34)->setWidth(6);

        $lkhSheet->setCellValueByColumnAndRow(1, $row, 'NO');
        $lkhSheet->setCellValueByColumnAndRow(2, $row, 'URAIAN KEGIATAN (KATEGORI TIKET)');
        for ($d = 1; $d <= 31; $d++) {
            $lkhSheet->setCellValueByColumnAndRow($d + 2, $row, $d);
        }
        $lkhSheet->setCellValueByColumnAndRow(34, $row, 'JML');
        $lkhSheet->getStyleByColumnAndRow(1, $row, $totalCols, $row)->applyFromArray([
            'font'      => ['bold' => true, 'size' => 8],
            'fill'      => ['fillType' => Fill::FILL_SOLID, 'startColor' => ['argb' => $COLOR_HEADER_BG]],
            'alignment' => ['horizontal' => Alignment::HORIZONTAL_CENTER, 'vertical' => Alignment::VERTICAL_CENTER, 'wrapText' => true],
            'borders'   => ['allBorders' => ['borderStyle' => Border::BORDER_THIN, 'color' => ['argb' => 'FF999999']]],
        ]);
        $lkhSheet->getRowDimension($row)->setRowHeight(16);
        $row++;

        // ── Data kegiatan ─────────────────────────────────────────────────────
        $colTotals = array_fill(1, 31, 0);
        $grandLkh  = 0;
        $no        = 1;

        // Baris 1: Total semua tiket
        $rowTotalAll = 0;
        $lkhSheet->setCellValueByColumnAndRow(1, $row, $no);
        $lkhSheet->setCellValueByColumnAndRow(2, $row, 'Total Semua Tiket [auto: total]');

        for ($d = 1; $d <= 31; $d++) {
            $colIdx = $d + 2;
            if ($d > $daysInMonth) {
                $lkhSheet->getStyleByColumnAndRow($colIdx, $row)->applyFromArray([
                    'fill' => ['fillType' => Fill::FILL_SOLID, 'startColor' => ['argb' => 'FFF9F9F9']],
                ]);
                continue;
            }
            $dow = (int) date('w', mktime(0, 0, 0, $month, $d, $year));
            $val = $ticketData[$d]['__total'] ?? 0;
            $rowTotalAll += $val; $colTotals[$d] += $val; $grandLkh += $val;

            if ($val > 0) $lkhSheet->setCellValueByColumnAndRow($colIdx, $row, $val);
            $bgArgb = $dow === 0 ? $COLOR_WKND : ($val >= 10 ? $COLOR_CRIT : ($val >= 5 ? $COLOR_HIGH : ($val > 0 ? $COLOR_TICKET : 'FFFFFFFF')));
            $lkhSheet->getStyleByColumnAndRow($colIdx, $row)->applyFromArray([
                'fill'      => ['fillType' => Fill::FILL_SOLID, 'startColor' => ['argb' => $bgArgb]],
                'alignment' => ['horizontal' => Alignment::HORIZONTAL_CENTER],
                'borders'   => ['allBorders' => ['borderStyle' => Border::BORDER_THIN, 'color' => ['argb' => 'FFBBBBBB']]],
                'font'      => ['size' => 8, 'bold' => $val > 0],
            ]);
        }
        $lkhSheet->setCellValueByColumnAndRow(34, $row, $rowTotalAll ?: '');
        $lkhSheet->getStyleByColumnAndRow(1, $row, $totalCols, $row)->applyFromArray([
            'borders' => ['allBorders' => ['borderStyle' => Border::BORDER_THIN, 'color' => ['argb' => 'FFBBBBBB']]],
            'font'    => ['size' => 8, 'bold' => true],
        ]);
        $lkhSheet->getStyleByColumnAndRow(2, $row)->getFont()->setBold(true);
        $lkhSheet->getStyleByColumnAndRow(34, $row)->applyFromArray([
            'font'      => ['bold' => true, 'size' => 8, 'color' => ['argb' => 'FF1E40AF']],
            'alignment' => ['horizontal' => Alignment::HORIZONTAL_CENTER],
        ]);
        $lkhSheet->getRowDimension($row)->setRowHeight(14);
        $no++;
        $row++;

        // Baris per kategori
        foreach ($categories as $cat) {
            $rowTotal = 0;
            $lkhSheet->setCellValueByColumnAndRow(1, $row, $no);
            $lkhSheet->setCellValueByColumnAndRow(2, $row, $cat . ' [auto: ' . $cat . ']');

            for ($d = 1; $d <= 31; $d++) {
                $colIdx = $d + 2;
                if ($d > $daysInMonth) {
                    $lkhSheet->getStyleByColumnAndRow($colIdx, $row)->applyFromArray([
                        'fill' => ['fillType' => Fill::FILL_SOLID, 'startColor' => ['argb' => 'FFF9F9F9']],
                    ]);
                    continue;
                }
                $dow = (int) date('w', mktime(0, 0, 0, $month, $d, $year));
                $val = $ticketData[$d][$cat] ?? 0;
                $rowTotal += $val; $colTotals[$d] += $val; $grandLkh += $val;

                if ($val > 0) $lkhSheet->setCellValueByColumnAndRow($colIdx, $row, $val);
                $bgArgb = $dow === 0 ? $COLOR_WKND : ($val >= 10 ? $COLOR_CRIT : ($val >= 5 ? $COLOR_HIGH : ($val > 0 ? $COLOR_TICKET : 'FFFFFFFF')));
                $lkhSheet->getStyleByColumnAndRow($colIdx, $row)->applyFromArray([
                    'fill'      => ['fillType' => Fill::FILL_SOLID, 'startColor' => ['argb' => $bgArgb]],
                    'alignment' => ['horizontal' => Alignment::HORIZONTAL_CENTER],
                    'borders'   => ['allBorders' => ['borderStyle' => Border::BORDER_THIN, 'color' => ['argb' => 'FFBBBBBB']]],
                    'font'      => ['size' => 8, 'bold' => $val > 0],
                ]);
            }

            $lkhSheet->setCellValueByColumnAndRow(34, $row, $rowTotal ?: '');
            $lkhSheet->getStyleByColumnAndRow(1, $row, $totalCols, $row)->applyFromArray([
                'borders' => ['allBorders' => ['borderStyle' => Border::BORDER_THIN, 'color' => ['argb' => 'FFBBBBBB']]],
                'font'    => ['size' => 8],
            ]);
            $lkhSheet->getStyleByColumnAndRow(34, $row)->applyFromArray([
                'font'      => ['bold' => true, 'size' => 8, 'color' => ['argb' => 'FF1E40AF']],
                'alignment' => ['horizontal' => Alignment::HORIZONTAL_CENTER],
            ]);
            $lkhSheet->getStyleByColumnAndRow(1, $row)->getAlignment()->setHorizontal(Alignment::HORIZONTAL_CENTER);
            $lkhSheet->getRowDimension($row)->setRowHeight(14);
            $no++;
            $row++;
        }

        // Baris JUMLAH
        $lkhSheet->setCellValueByColumnAndRow(2, $row, 'JUMLAH');
        for ($d = 1; $d <= 31; $d++) {
            $colIdx = $d + 2;
            $v = $colTotals[$d] ?? 0;
            if ($d <= $daysInMonth) {
                $lkhSheet->setCellValueByColumnAndRow($colIdx, $row, $v ?: '');
                $dow = (int) date('w', mktime(0, 0, 0, $month, $d, $year));
                $bgArgb = $dow === 0 ? $COLOR_WKND : ($v >= 10 ? $COLOR_CRIT : ($v >= 5 ? $COLOR_HIGH : ($v > 0 ? $COLOR_TICKET : $COLOR_HEADER_BG)));
                $lkhSheet->getStyleByColumnAndRow($colIdx, $row)->applyFromArray([
                    'fill'      => ['fillType' => Fill::FILL_SOLID, 'startColor' => ['argb' => $bgArgb]],
                    'alignment' => ['horizontal' => Alignment::HORIZONTAL_CENTER],
                    'font'      => ['bold' => true, 'size' => 8],
                    'borders'   => ['allBorders' => ['borderStyle' => Border::BORDER_THIN, 'color' => ['argb' => 'FF999999']]],
                ]);
            } else {
                $lkhSheet->getStyleByColumnAndRow($colIdx, $row)->applyFromArray([
                    'fill' => ['fillType' => Fill::FILL_SOLID, 'startColor' => ['argb' => 'FFF9F9F9']],
                ]);
            }
        }
        $lkhSheet->setCellValueByColumnAndRow(34, $row, $grandLkh);
        $lkhSheet->getStyleByColumnAndRow(1, $row, $totalCols, $row)->applyFromArray([
            'fill'    => ['fillType' => Fill::FILL_SOLID, 'startColor' => ['argb' => $COLOR_HEADER_BG]],
            'font'    => ['bold' => true, 'size' => 9],
            'borders' => ['allBorders' => ['borderStyle' => Border::BORDER_THIN, 'color' => ['argb' => 'FF999999']]],
        ]);
        $lkhSheet->getStyleByColumnAndRow(34, $row)->applyFromArray([
            'fill'      => ['fillType' => Fill::FILL_SOLID, 'startColor' => ['argb' => $COLOR_TOTAL_BG]],
            'font'      => ['bold' => true, 'size' => 9],
            'alignment' => ['horizontal' => Alignment::HORIZONTAL_CENTER],
        ]);
        $lkhSheet->getRowDimension($row)->setRowHeight(16);
        $row += 2;

        $lkhSheet->setCellValueByColumnAndRow(1, $row, 'Ket: Data diambil otomatis dari kategori tiket  |  Digenerate: ' . $this->nowFormatted());
        $lkhSheet->getStyleByColumnAndRow(1, $row)->applyFromArray([
            'font' => ['italic' => true, 'size' => 8, 'color' => ['argb' => 'FF888888']],
        ]);
    }

    // ══════════════════════════════════════════════════════════════════════════
    // SLA, TECHNICIANS, ASSETS — tidak berubah
    // ══════════════════════════════════════════════════════════════════════════

    public function sla(Request $request)
    {
        $user = $request->user();
        $rows = [];
        foreach (['Critical', 'High', 'Medium', 'Low'] as $p) {
            $base = Ticket::where('priority', $p)->whereIn('status', ['Resolved', 'Closed']);
            $base = $this->scopeByRole($base, $user, 'ticket');
            if ($request->filled('from')) $base->whereDate('created_at', '>=', $request->from);
            if ($request->filled('to'))   $base->whereDate('created_at', '<=', $request->to);
            if ($this->hasFullAccess($user) && $request->filled('user_id')) {
                $uid = $request->user_id;
                $base->where(fn($q) => $q->where('requester_id', $uid)->orWhere('assigned_to', $uid));
            }
            $total = (clone $base)->count(); $onTime = (clone $base)->where('sla_breached', false)->count();
            $rows[] = ['priority' => $p, 'target' => self::SLA_TARGET[$p], 'total' => $total, 'on_time' => $onTime, 'breached' => $total - $onTime, 'achieved' => $total > 0 ? round(($onTime / $total) * 100) : 100];
        }
        $format = strtolower($request->get('format', 'json'));
        if ($format === 'excel') return $this->exportSlaExcel($rows);
        if ($format === 'pdf')   return $this->exportSlaPdf($rows);
        return response()->json($rows);
    }

    public function technicians(Request $request)
    {
        $user = $request->user();
        $techQuery = User::technicians();
        if ($this->hasFullAccess($user)) { if ($request->filled('user_id')) $techQuery->where('id', $request->user_id); }
        else { $techQuery->where('id', $user->id); }
        $techs = $techQuery->get()->map(function ($u) use ($request, $user) {
            $base = Ticket::where('assigned_to', $u->id);
            if (!$this->hasFullAccess($user) && $user->role === 'supervisor') { $base->whereHas('requester', fn($q) => $q->where('department', $user->department)); }
            if ($request->filled('from')) $base->whereDate('created_at', '>=', $request->from);
            if ($request->filled('to'))   $base->whereDate('created_at', '<=', $request->to);
            $totalAssigned = (clone $base)->count(); $totalResolved = (clone $base)->whereIn('status', ['Resolved', 'Closed'])->count();
            $slaMet = (clone $base)->whereIn('status', ['Resolved', 'Closed'])->where('sla_breached', false)->count();
            $avgMinutes = (clone $base)->whereIn('status', ['Resolved', 'Closed'])->whereNotNull('resolution_time_minutes')->avg('resolution_time_minutes') ?? 0;
            return ['name' => $u->name, 'role' => $u->role_display ?? 'IT Support', 'total_assigned' => $totalAssigned, 'resolved_count' => $totalResolved, 'sla_met' => $slaMet, 'sla_score' => $totalResolved > 0 ? round(($slaMet / $totalResolved) * 100) : 100, 'avg_hours' => round($avgMinutes / 60, 1)];
        });
        $format = strtolower($request->get('format', 'json'));
        if ($format === 'excel') return $this->exportTechExcel($techs->toArray());
        if ($format === 'pdf')   return $this->exportTechPdf($techs->toArray());
        return response()->json($techs);
    }

    public function assets(Request $request)
    {
        $user = $request->user(); $query = Asset::orderBy('category')->orderBy('name');
        $query = $this->scopeByRole($query, $user, 'asset');
        if ($request->filled('from'))   $query->whereDate('purchase_date', '>=', $request->from);
        if ($request->filled('to'))     $query->whereDate('purchase_date', '<=', $request->to);
        if ($request->filled('status')) $query->where('status', $request->status);
        $format = strtolower($request->get('format', 'json')); $assets = $query->get();
        if ($format === 'excel') return $this->exportAssetsExcel($assets);
        if ($format === 'pdf')   return $this->exportAssetsPdf($assets);
        $data = $assets->map(fn($a) => ['asset_number' => $a->asset_number, 'name' => $a->name, 'category' => $a->category, 'brand' => $a->brand, 'model' => $a->model, 'serial_number' => $a->serial_number, 'status' => $a->status, 'location' => $a->location, 'user' => $a->user, 'warranty_expiry' => $a->warranty_expiry?->format('d/m/Y'), 'purchase_date' => $a->purchase_date?->format('d/m/Y')])->values();
        return response()->json(['total' => $assets->count(), 'active' => $assets->where('status', 'Active')->count(), 'maintenance' => $assets->where('status', 'Maintenance')->count(), 'inactive' => $assets->where('status', 'Inactive')->count(), 'warranty_expired' => $assets->filter(fn($a) => $a->warranty_expiry && now()->gt($a->warranty_expiry))->count(), 'by_category' => $assets->groupBy('category')->map->count(), 'data' => $data]);
    }

    // ══════════════════════════════════════════════════════════════════════════
    // HELPERS
    // ══════════════════════════════════════════════════════════════════════════

    private function buildFilterDesc(Request $request): string
    {
        $parts = [];
        if ($request->filled('from'))   $parts[] = 'Dari: ' . $request->from;
        if ($request->filled('to'))     $parts[] = 'Sampai: ' . $request->to;
        if ($request->filled('status')) $parts[] = 'Status: ' . $request->status;
        if (empty($parts)) $parts[] = 'Semua periode · Semua status';
        $parts[] = 'Digenerate: ' . $this->nowFormatted();
        return implode('   ·   ', $parts);
    }

    private function nowFormatted(): string { return now()->format('d M Y H:i'); }

    private function buildSpreadsheet(array $headers, array $rows, string $title): Spreadsheet
    {
        $ss = new Spreadsheet(); $sheet = $ss->getActiveSheet()->setTitle($title);
        $sheet->setCellValue('A1', $title);
        $sheet->mergeCells('A1:' . \PhpOffice\PhpSpreadsheet\Cell\Coordinate::stringFromColumnIndex(count($headers)) . '1');
        $sheet->getStyle('A1')->applyFromArray(['font' => ['bold' => true, 'size' => 13, 'color' => ['argb' => 'FFFFFFFF']], 'fill' => ['fillType' => Fill::FILL_SOLID, 'startColor' => ['argb' => 'FF1E3A5F']], 'alignment' => ['horizontal' => Alignment::HORIZONTAL_CENTER]]);
        $sheet->getRowDimension(1)->setRowHeight(24);
        $sheet->setCellValue('A2', 'Digenerate: ' . $this->nowFormatted());
        $sheet->mergeCells('A2:' . \PhpOffice\PhpSpreadsheet\Cell\Coordinate::stringFromColumnIndex(count($headers)) . '2');
        $sheet->getStyle('A2')->applyFromArray(['font' => ['italic' => true, 'size' => 9, 'color' => ['argb' => 'FF888888']], 'alignment' => ['horizontal' => Alignment::HORIZONTAL_CENTER]]);
        foreach ($headers as $colIdx => $label) {
            $colLetter = \PhpOffice\PhpSpreadsheet\Cell\Coordinate::stringFromColumnIndex($colIdx + 1);
            $sheet->setCellValue("{$colLetter}4", $label);
            $sheet->getStyle("{$colLetter}4")->applyFromArray(['font' => ['bold' => true, 'color' => ['argb' => 'FFFFFFFF']], 'fill' => ['fillType' => Fill::FILL_SOLID, 'startColor' => ['argb' => 'FF2563EB']], 'alignment' => ['horizontal' => Alignment::HORIZONTAL_CENTER], 'borders' => ['allBorders' => ['borderStyle' => Border::BORDER_THIN, 'color' => ['argb' => 'FFCCE0FF']]]]);
            $sheet->getColumnDimensionByColumn($colIdx + 1)->setAutoSize(true);
        }
        foreach ($rows as $rIdx => $row) {
            $rowNum = $rIdx + 5; $bg = $rIdx % 2 === 0 ? 'FFF8FAFF' : 'FFFFFFFF';
            foreach (array_values($row) as $cIdx => $val) {
                $colLetter = \PhpOffice\PhpSpreadsheet\Cell\Coordinate::stringFromColumnIndex($cIdx + 1);
                $sheet->setCellValue("{$colLetter}{$rowNum}", $val ?? '');
                $sheet->getStyle("{$colLetter}{$rowNum}")->applyFromArray(['fill' => ['fillType' => Fill::FILL_SOLID, 'startColor' => ['argb' => $bg]], 'borders' => ['allBorders' => ['borderStyle' => Border::BORDER_THIN, 'color' => ['argb' => 'FFDDDDDD']]], 'alignment' => ['vertical' => Alignment::VERTICAL_CENTER]]);
            }
        }
        return $ss;
    }

    private function streamExcel(Spreadsheet $ss, string $filename): \Symfony\Component\HttpFoundation\StreamedResponse
    {
        return response()->streamDownload(function () use ($ss) { $writer = new Xlsx($ss); $writer->save('php://output'); }, $filename, ['Content-Type' => 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'Content-Disposition' => "attachment; filename=\"{$filename}\"", 'Cache-Control' => 'max-age=0']);
    }

    private function exportSlaExcel(array $rows)
    {
        $headers = ['Prioritas', 'Target SLA', 'Total Tiket', 'Tepat Waktu', 'Terlambat', 'Pencapaian (%)'];
        $data = array_map(fn($r) => [$r['priority'], $r['target'], $r['total'], $r['on_time'], $r['breached'], $r['achieved'] . '%'], $rows);
        return $this->streamExcel($this->buildSpreadsheet($headers, $data, 'SLA Performance Report'), 'sla-report.xlsx');
    }

    private function exportTechExcel(array $rows)
    {
        $headers = ['Nama Teknisi', 'Role', 'Total Ditugaskan', 'Diselesaikan', 'SLA Terpenuhi', 'SLA Score (%)', 'Avg Waktu (jam)'];
        $data = array_map(fn($r) => [$r['name'], $r['role'], $r['total_assigned'], $r['resolved_count'], $r['sla_met'], $r['sla_score'] . '%', $r['avg_hours']], $rows);
        return $this->streamExcel($this->buildSpreadsheet($headers, $data, 'Laporan Kinerja Teknisi'), 'technicians-report.xlsx');
    }

    private function exportAssetsExcel($assets)
    {
        $headers = ['No.', 'No. Aset', 'Nama', 'Kategori', 'Brand / Model', 'Serial Number', 'Status', 'Lokasi', 'Pengguna', 'Tgl Beli', 'Garansi s/d', 'Harga Beli'];
        $rows = $assets->values()->map(fn($a, $i) => [$i + 1, $a->asset_number, $a->name, $a->category, trim("{$a->brand} {$a->model}"), $a->serial_number, $a->status, $a->location, $a->user ?? '—', $a->purchase_date?->format('d/m/Y') ?? '—', $a->warranty_expiry?->format('d/m/Y') ?? '—', $a->purchase_price ? 'Rp ' . number_format($a->purchase_price, 0, ',', '.') : '—'])->toArray();
        return $this->streamExcel($this->buildSpreadsheet($headers, $rows, 'Inventaris Aset IT'), 'assets-report.xlsx');
    }

    private function exportSlaPdf(array $rows)
    {
        $html = $this->pdfWrapper('SLA Performance Report', now()->format('d M Y H:i'), '<table><thead><tr><th>Prioritas</th><th>Target SLA</th><th>Total</th><th>Tepat Waktu</th><th>Terlambat</th><th>Pencapaian</th></tr></thead><tbody>' . implode('', array_map(fn($r) => "<tr><td class='pri-{$r['priority']}'>{$r['priority']}</td><td>{$r['target']}</td><td>{$r['total']}</td><td style='color:#10b981'>{$r['on_time']}</td><td style='color:#ef4444'>{$r['breached']}</td><td><strong>{$r['achieved']}%</strong></td></tr>", $rows)) . '</tbody></table>');
        return Pdf::loadHTML($html)->setPaper('a4')->download('sla-report.pdf');
    }

    private function exportTechPdf(array $rows)
    {
        $html = $this->pdfWrapper('Laporan Kinerja Teknisi', now()->format('d M Y H:i'), '<table><thead><tr><th>Nama Teknisi</th><th>Role</th><th>Ditugaskan</th><th>Diselesaikan</th><th>SLA Terpenuhi</th><th>SLA Score</th><th>Avg Waktu</th></tr></thead><tbody>' . implode('', array_map(fn($r) => "<tr><td><strong>{$r['name']}</strong></td><td>{$r['role']}</td><td>{$r['total_assigned']}</td><td style='color:#10b981'>{$r['resolved_count']}</td><td>{$r['sla_met']}</td><td><strong>{$r['sla_score']}%</strong></td><td>{$r['avg_hours']} jam</td></tr>", $rows)) . '</tbody></table>');
        return Pdf::loadHTML($html)->setPaper('a4')->download('technicians-report.pdf');
    }

    private function exportAssetsPdf($assets)
    {
        $html = $this->pdfWrapper('Inventaris Aset IT', now()->format('d M Y H:i'), '<table><thead><tr><th>No. Aset</th><th>Nama</th><th>Kategori</th><th>Brand/Model</th><th>Serial</th><th>Status</th><th>Lokasi</th><th>Garansi s/d</th></tr></thead><tbody>' . $assets->map(fn($a) => "<tr><td style='font-family:monospace'>{$a->asset_number}</td><td>{$a->name}</td><td>{$a->category}</td><td>{$a->brand} {$a->model}</td><td style='font-family:monospace'>{$a->serial_number}</td><td>{$a->status}</td><td>{$a->location}</td><td>" . ($a->warranty_expiry?->format('d/m/Y') ?? '—') . "</td></tr>")->implode('') . '</tbody></table>');
        return Pdf::loadHTML($html)->setPaper('a4', 'landscape')->download('assets-report.pdf');
    }

    private function pdfWrapper(string $title, string $generated, string $body): string
    {
        return <<<HTML
<!DOCTYPE html><html><head><meta charset="UTF-8"><style>
* { margin:0; padding:0; box-sizing:border-box; }
body { font-family: 'DejaVu Sans', Arial, sans-serif; font-size:9px; color:#1e293b; }
.header { background:#1e3a5f; color:#fff; padding:16px 20px; margin-bottom:16px; }
.header h1 { font-size:16px; font-weight:700; }
.header .sub { font-size:8px; color:#93c5fd; margin-top:3px; }
table { width:100%; border-collapse:collapse; margin:0 20px; width:calc(100% - 40px); }
thead tr { background:#2563eb; color:#fff; }
th { padding:7px 8px; text-align:left; font-size:8px; font-weight:600; text-transform:uppercase; border:1px solid #1d4ed8; }
td { padding:6px 8px; border:1px solid #e2e8f0; }
tbody tr:nth-child(even) { background:#f8faff; }
.pri-Critical { color:#dc2626; font-weight:700; } .pri-High { color:#ea580c; font-weight:700; }
.pri-Medium { color:#d97706; } .pri-Low { color:#16a34a; }
</style></head><body>
<div class="header"><h1>$title</h1><div class="sub">IT Support Management System &nbsp;·&nbsp; Digenerate: $generated</div></div>
$body</body></html>
HTML;
    }

    // ══════════════════════════════════════════════════════════════════════════
    // PROJECT REPORTS
    // ══════════════════════════════════════════════════════════════════════════

    public function summaryproject(Request $request): JsonResponse
    {
        $user = $request->user(); $query = $this->getProjectsForUser($user);
        if ($request->filled('from'))     $query->whereDate('created_at', '>=', $request->input('from'));
        if ($request->filled('to'))       $query->where('created_at', '<=', $request->input('to'));
        if ($request->filled('status'))   $query->where('status', $request->input('status'));
        if ($request->filled('priority')) $query->where('priority', $request->input('priority'));
        $projects = $query->get(); $projectIds = $projects->pluck('id');
        return response()->json(['total_projects' => $projects->count(), 'active_projects' => $projects->where('status', 'active')->count(), 'total_tasks' => Task::whereIn('project_id', $projectIds)->count(), 'completed_tasks' => Task::whereIn('project_id', $projectIds)->whereHas('column', fn($q) => $q->where('name', 'Prod'))->count(), 'avg_progress' => $projects->count() > 0 ? round($projects->avg('task_stats.progress') ?? 0) : 0, 'user_role' => $user->role, 'is_full_access' => $this->hasFullAccess($user)]);
    }

    public function projects(Request $request): JsonResponse
    {
        $user = $request->user(); $query = $this->getProjectsForUser($user)->with(['creator:id,name', 'members:id,name'])->withCount('tasks');
        if ($request->filled('from'))     $query->where('created_at', '>=', $request->input('from'));
        if ($request->filled('to'))       $query->where('created_at', '<=', $request->input('to'));
        if ($request->filled('status'))   $query->where('status', $request->input('status'));
        if ($request->filled('priority')) $query->where('priority', $request->input('priority'));
        $projects = $query->latest()->get()->map(function ($project) {
            $columns = $project->columns()->withCount('tasks')->orderBy('position')->get();
            $totalColumns = $columns->count(); $totalTasks = 0; $weightedScore = 0.0;
            foreach ($columns as $index => $column) { $count = $column->tasks_count ?? 0; if ($count === 0) continue; $totalTasks += $count; $weight = $totalColumns > 1 ? ($index / ($totalColumns - 1)) * 100 : 100.0; $weightedScore += $count * $weight; }
            $lastColumn = $columns->last(); $completed = $lastColumn ? ($lastColumn->tasks_count ?? 0) : 0; $progress = $totalTasks > 0 ? (int) round($weightedScore / $totalTasks) : 0;
            return ['name' => $project->name, 'category' => $project->category ?? '—', 'status' => $project->status, 'priority' => $project->priority ?? 'medium', 'progress' => min(100, max(0, $progress)), 'total_tasks' => $totalTasks, 'completed_tasks' => $completed, 'creator_name' => $project->creator->name ?? '—', 'members' => $project->members->pluck('name')->all(), 'start_date' => $project->created_at?->locale('id')->isoFormat('D MMM YYYY'), 'due_date' => $project->due_date ? \Carbon\Carbon::parse($project->due_date)->locale('id')->isoFormat('D MMM YYYY') : null];
        });
        return response()->json(['data' => $projects]);
    }

    public function tasks(Request $request): JsonResponse
    {
        $user = $request->user(); $projectIds = $this->getProjectsForUser($user)->pluck('id');
        $query = Task::whereIn('project_id', $projectIds)->with(['project:id,name', 'column:id,name', 'assignees:id,name']);
        if ($request->filled('from'))     $query->whereDate('created_at', '>=', $request->input('from'));
        if ($request->filled('to'))       $query->whereDate('created_at', '<=', $request->input('to'));
        if ($request->filled('priority')) $query->where('priority', $request->input('priority'));
        if ($this->hasFullAccess($user) && $request->filled('user_id')) { $query->whereHas('assignees', fn($q) => $q->where('users.id', $request->input('user_id'))); }
        elseif (!$this->hasFullAccess($user) && $user->role !== 'supervisor') { $query->whereHas('assignees', fn($q) => $q->where('users.id', $user->id)); }
        $tasks = $query->latest()->get()->map(fn($task) => ['project_name' => $task->project->name ?? '—', 'task_title' => $task->title, 'column_name' => $task->column->name ?? '—', 'priority' => $task->priority, 'assigned_name' => $task->assignees->isNotEmpty() ? $task->assignees->pluck('name')->implode(', ') : 'Unassigned', 'due_date' => $task->due_date ? \Carbon\Carbon::parse($task->due_date)->locale('id')->isoFormat('D MMM YYYY') : null, 'created_at' => $task->created_at ? \Carbon\Carbon::parse($task->created_at)->locale('id')->isoFormat('D MMM YYYY') : null]);
        return response()->json(['data' => $tasks]);
    }

    public function teamPerformance(Request $request): JsonResponse
    {
        $user = $request->user(); $projectIds = $this->getProjectsForUser($user)->pluck('id');
        $query = User::where(fn($q) => $q->whereHas('projects', fn($pq) => $pq->whereIn('project_id', $projectIds))->orWhereHas('assignedTasks', fn($tq) => $tq->whereIn('project_id', $projectIds)));
        if ($this->hasFullAccess($user)) { if ($request->filled('user_id')) $query->where('id', $request->input('user_id')); } else { $query->where('id', $user->id); }
        $users = $query->get()->map(function ($u) use ($projectIds, $request) {
            $baseTask = Task::whereIn('project_id', $projectIds)->whereHas('assignees', fn($q) => $q->where('users.id', $u->id));
            if ($request->filled('from')) $baseTask->whereDate('created_at', '>=', $request->input('from'));
            if ($request->filled('to'))   $baseTask->whereDate('created_at', '<=', $request->input('to'));
            $assignedTasks = (clone $baseTask)->count(); $completedTasks = (clone $baseTask)->whereHas('column', fn($q) => $q->where('name', 'Prod'))->count();
            $inProgress = (clone $baseTask)->whereHas('column', fn($q) => $q->whereNotIn('name', ['Prod', 'Mulai Project']))->count();
            return ['name' => $u->name, 'role' => $u->role ?? '—', 'total_assigned' => $assignedTasks, 'completed_tasks' => $completedTasks, 'in_progress' => $inProgress, 'completion_rate' => $assignedTasks > 0 ? round(($completedTasks / $assignedTasks) * 100) : 0, 'projects_count' => $u->projects()->whereIn('project_id', $projectIds)->distinct('project_id')->count()];
        })->filter(fn($u) => $u['total_assigned'] > 0)->values();
        return response()->json(['data' => $users]);
    }

    private function getProjectsForUser($user)
    {
        if ($this->hasFullAccess($user)) return Project::query();
        if ($user->role === 'supervisor') {
            return Project::where(fn($q) => $q->where('created_by', $user->id)->orWhereHas('members', fn($m) => $m->where('user_id', $user->id))->orWhereHas('members', fn($m) => $m->whereHas('user', fn($u) => $u->where('department', $user->department))));
        }
        return Project::where(fn($q) => $q->where('created_by', $user->id)->orWhereHas('members', fn($m) => $m->where('user_id', $user->id)));
    }

    private function exportExcel($data, $filename) { return response()->json($data); }
}