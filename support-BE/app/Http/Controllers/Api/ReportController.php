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
use PhpOffice\PhpSpreadsheet\Style\Color;

class ReportController extends Controller
{
    // ── SLA target ────────────────────────────────────────────────────────────
    private const SLA_TARGET = [
        'Critical' => '4 Jam',
        'High'     => '8 Jam',
        'Medium'   => '24 Jam',
        'Low'      => '72 Jam',
    ];

    // ── Role yang boleh lihat semua data ──────────────────────────────────────
    private const FULL_ACCESS_ROLES = ['super_admin', 'admin', 'manager', 'manager_it'];

    private function hasFullAccess($user): bool
    {
        return in_array($user->role, self::FULL_ACCESS_ROLES);
    }

    private function scopeByRole($query, $user, string $type = 'ticket')
    {
        if ($this->hasFullAccess($user)) {
            return $query;
        }

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
            if ($user->role === 'supervisor') {
                return $query->where('department', $user->department);
            }
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
                $q->where('requester_id', $uid)
                  ->orWhere('assigned_to', $uid);
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
    // PDF EXPORT — LAPORAN TIKET (grouped by kategori, mirip gambar)
    // ══════════════════════════════════════════════════════════════════════════

    private function exportTicketsPdf($tickets, Request $request)
    {
        // Group tiket by kategori
        $grouped = $tickets->groupBy('category')->sortKeys();

        $filterDesc = $this->buildFilterDesc($request);
        $orgName    = config('app.org_name', 'IT Support Management System');

        // ── Bangun HTML ──────────────────────────────────────────────────────
        $tableRows = '';
        $grandTotal = 0;

        foreach ($grouped as $category => $items) {
            $count = $items->count();
            $grandTotal += $count;
            $no = 1;

            foreach ($items as $t) {
                $slaStatus = $t->sla_breached ? '<span class="breach">✗ Breach</span>' : '<span class="ok">✓ OK</span>';
                $priClass  = 'pri-' . strtolower($t->priority ?? 'medium');
                $tableRows .= "
                <tr>
                    <td class='center'>{$no}</td>
                    <td>" . e($t->title) . "</td>
                    <td>" . e($t->requester?->name ?? '—') . "</td>
                    <td>" . e($t->assignee?->name  ?? 'Unassigned') . "</td>
                    <td class='center {$priClass}'>" . e($t->priority) . "</td>
                    <td class='center'>" . e($t->status) . "</td>
                    <td class='center mono'>" . ($t->created_at  ? $t->created_at->format('d/m/Y H:i')  : '—') . "</td>
                    <td class='center mono'>" . ($t->resolved_at ? $t->resolved_at->format('d/m/Y H:i') : '—') . "</td>
                    <td class='center'>{$slaStatus}</td>
                </tr>";
                $no++;
            }

            // Baris summary per kategori — style kuning seperti gambar
            $tableRows .= "
            <tr class='group-summary'>
                <td colspan='9'>
                    <strong>Kategori : " . e($category ?: 'Tidak Ada Kategori') . " , jumlah : {$count}</strong>
                </td>
            </tr>";
        }

        // Baris total akhir — highlight kuning terang
        $tableRows .= "
        <tr class='grand-total'>
            <td colspan='9'>
                <strong>Jumlah tiket yang ditangani adalah = {$grandTotal}</strong>
            </td>
        </tr>";

        $html = $this->buildTicketPdfHtml($orgName, $filterDesc, $tableRows, $grandTotal);

        return Pdf::loadHTML($html)
            ->setPaper('a4', 'landscape')
            ->download('laporan-tiket-' . now()->format('Ymd') . '.pdf');
    }

    private function buildTicketPdfHtml(string $orgName, string $filterDesc, string $tableRows, int $grandTotal): string
    {
        return <<<HTML
<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<style>
  * { margin:0; padding:0; box-sizing:border-box; }
  body { font-family: 'DejaVu Sans', Arial, sans-serif; font-size: 8px; color: #1a1a1a; }

  /* ── Header ── */
  .page-header { text-align: center; margin-bottom: 14px; }
  .page-header h1 { font-size: 13px; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; }
  .page-header .org { font-size: 10px; font-weight: 700; margin-bottom: 2px; }
  .page-header .filter { font-size: 8px; color: #555; margin-top: 4px; }
  .divider { border-top: 2px solid #1a1a1a; margin: 6px 0 2px; }
  .divider2 { border-top: 1px solid #1a1a1a; margin-bottom: 10px; }

  /* ── Table ── */
  table { width: 100%; border-collapse: collapse; font-size: 7.5px; }
  thead tr { background: #F5F5A0; }
  th {
    border: 1px solid #999;
    padding: 5px 6px;
    text-align: center;
    font-weight: 700;
    font-size: 8px;
    background: #F5F5A0;
  }
  td {
    border: 1px solid #bbb;
    padding: 4px 6px;
    vertical-align: middle;
  }
  tr:nth-child(even) td { background: #fafafa; }

  .center { text-align: center; }
  .mono   { font-family: monospace; font-size: 7px; }

  /* Prioritas warna */
  .pri-critical { color: #dc2626; font-weight: 700; }
  .pri-high     { color: #ea580c; font-weight: 700; }
  .pri-medium   { color: #d97706; }
  .pri-low      { color: #16a34a; }

  /* SLA */
  .ok     { color: #16a34a; font-weight: 700; }
  .breach { color: #dc2626; font-weight: 700; }

  /* ── Group summary row (kuning muda, bold) ── */
  .group-summary td {
    background: #FFFFAA !important;
    color: #1a1a1a;
    font-size: 8px;
    padding: 4px 8px;
    border: 1px solid #bbb;
  }

  /* ── Grand total row (kuning terang, bold) ── */
  .grand-total td {
    background: #FFE200 !important;
    color: #1a1a1a;
    font-size: 9px;
    font-weight: 700;
    padding: 5px 8px;
    border: 1px solid #bbb;
  }

  /* ── Footer ── */
  .footer {
    margin-top: 10px;
    font-size: 7px;
    color: #888;
    display: flex;
    justify-content: space-between;
    border-top: 1px solid #ccc;
    padding-top: 4px;
  }
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

<table>
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
  <tbody>
    {$tableRows}
  </tbody>
</table>

<div class="footer">
  <span>IT Support Management System</span>
  <span>Digenerate: {$this->nowFormatted()}</span>
  <span>Total tiket: {$grandTotal}</span>
</div>

</body>
</html>
HTML;
    }

    // ══════════════════════════════════════════════════════════════════════════
    // EXCEL EXPORT — LAPORAN TIKET (grouped by kategori, mirip gambar)
    // ══════════════════════════════════════════════════════════════════════════

    private function exportTicketsExcel($tickets, Request $request)
    {
        $grouped    = $tickets->groupBy('category')->sortKeys();
        $filterDesc = $this->buildFilterDesc($request);
        $orgName    = config('app.org_name', 'IT Support Management System');

        $ss    = new Spreadsheet();
        $sheet = $ss->getActiveSheet()->setTitle('Laporan Tiket');

        // ── Warna konstanta ──────────────────────────────────────────────────
        $COLOR_HEADER_BG  = 'FFF5F5A0'; // kuning header kolom
        $COLOR_GROUP_BG   = 'FFFFFFEE'; // kuning muda grup summary
        $COLOR_TOTAL_BG   = 'FFFFE200'; // kuning terang grand total
        $COLOR_TITLE_BG   = 'FF1E3A5F'; // navy title
        $COLOR_ODD_ROW    = 'FFFAFAFA';
        $COLOR_EVEN_ROW   = 'FFFFFFFF';

        $col  = 1; // mulai kolom A
        $row  = 1;

        // ── Baris 1: Nama Organisasi ─────────────────────────────────────────
        $sheet->setCellValueByColumnAndRow($col, $row, $orgName);
        $sheet->mergeCellsByColumnAndRow($col, $row, 9, $row);
        $sheet->getStyleByColumnAndRow($col, $row, 9, $row)->applyFromArray([
            'font'      => ['bold' => true, 'size' => 12, 'color' => ['argb' => 'FFFFFFFF']],
            'fill'      => ['fillType' => Fill::FILL_SOLID, 'startColor' => ['argb' => $COLOR_TITLE_BG]],
            'alignment' => ['horizontal' => Alignment::HORIZONTAL_CENTER, 'vertical' => Alignment::VERTICAL_CENTER],
        ]);
        $sheet->getRowDimension($row)->setRowHeight(22);
        $row++;

        // ── Baris 2: Judul ───────────────────────────────────────────────────
        $sheet->setCellValueByColumnAndRow($col, $row, 'LAPORAN TIKET IT SUPPORT');
        $sheet->mergeCellsByColumnAndRow($col, $row, 9, $row);
        $sheet->getStyleByColumnAndRow($col, $row, 9, $row)->applyFromArray([
            'font'      => ['bold' => true, 'size' => 11, 'color' => ['argb' => 'FFFFFFFF']],
            'fill'      => ['fillType' => Fill::FILL_SOLID, 'startColor' => ['argb' => $COLOR_TITLE_BG]],
            'alignment' => ['horizontal' => Alignment::HORIZONTAL_CENTER],
        ]);
        $sheet->getRowDimension($row)->setRowHeight(18);
        $row++;

        // ── Baris 3: Filter info ─────────────────────────────────────────────
        $sheet->setCellValueByColumnAndRow($col, $row, $filterDesc);
        $sheet->mergeCellsByColumnAndRow($col, $row, 9, $row);
        $sheet->getStyleByColumnAndRow($col, $row, 9, $row)->applyFromArray([
            'font'      => ['italic' => true, 'size' => 8, 'color' => ['argb' => 'FF555555']],
            'alignment' => ['horizontal' => Alignment::HORIZONTAL_CENTER],
        ]);
        $row++;
        $row++; // spasi

        // ── Header kolom ─────────────────────────────────────────────────────
        $headers = ['No.', 'Judul Tiket', 'Reporter', 'Departemen', 'Assigned To', 'Prioritas', 'Status', 'Dibuat', 'Diselesaikan', 'SLA'];
        $colCount = count($headers);

        // Expand merge sampai kolom J (10)
        foreach ($headers as $hIdx => $hLabel) {
            $sheet->setCellValueByColumnAndRow($hIdx + 1, $row, $hLabel);
        }
        $sheet->getStyleByColumnAndRow(1, $row, $colCount, $row)->applyFromArray([
            'font'      => ['bold' => true, 'size' => 9, 'color' => ['argb' => 'FF1A1A1A']],
            'fill'      => ['fillType' => Fill::FILL_SOLID, 'startColor' => ['argb' => $COLOR_HEADER_BG]],
            'alignment' => ['horizontal' => Alignment::HORIZONTAL_CENTER, 'vertical' => Alignment::VERTICAL_CENTER, 'wrapText' => true],
            'borders'   => ['allBorders' => ['borderStyle' => Border::BORDER_THIN, 'color' => ['argb' => 'FF999999']]],
        ]);
        $sheet->getRowDimension($row)->setRowHeight(16);
        $row++;

        // ── Set lebar kolom ──────────────────────────────────────────────────
        $colWidths = [5, 40, 18, 16, 18, 12, 15, 18, 18, 10];
        foreach ($colWidths as $cIdx => $width) {
            $sheet->getColumnDimensionByColumn($cIdx + 1)->setWidth($width);
        }

        // ── Data per grup ────────────────────────────────────────────────────
        $grandTotal = 0;
        $dataRowStyle = [
            'borders' => ['allBorders' => ['borderStyle' => Border::BORDER_THIN, 'color' => ['argb' => 'FFBBBBBB']]],
            'font'    => ['size' => 8],
        ];

        foreach ($grouped as $category => $items) {
            $count = $items->count();
            $grandTotal += $count;
            $no = 1;

            foreach ($items as $t) {
                $isEven = ($no % 2 === 0);
                $bgColor = $isEven ? $COLOR_EVEN_ROW : $COLOR_ODD_ROW;

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

                // Warna prioritas di kolom 6
                $priColors = ['critical' => 'FFDC2626', 'high' => 'FFEA580C', 'medium' => 'FFD97706', 'low' => 'FF16A34A'];
                $priColor  = $priColors[strtolower($t->priority ?? 'medium')] ?? 'FF1A1A1A';
                $sheet->getStyleByColumnAndRow(6, $row)->getFont()->getColor()->setARGB($priColor);
                $sheet->getStyleByColumnAndRow(6, $row)->getFont()->setBold(true);

                // Warna SLA di kolom 10
                $slaColor = $t->sla_breached ? 'FFDC2626' : 'FF16A34A';
                $sheet->getStyleByColumnAndRow(10, $row)->getFont()->getColor()->setARGB($slaColor);
                $sheet->getStyleByColumnAndRow(10, $row)->getFont()->setBold(true);

                // Center beberapa kolom
                foreach ([1, 6, 7, 8, 9, 10] as $cCenter) {
                    $sheet->getStyleByColumnAndRow($cCenter, $row)->getAlignment()->setHorizontal(Alignment::HORIZONTAL_CENTER);
                }

                $sheet->getRowDimension($row)->setRowHeight(14);
                $no++;
                $row++;
            }

            // ── Baris summary grup (kuning muda) ─────────────────────────────
            $label = "Kategori : " . ($category ?: 'Tidak Ada Kategori') . " , jumlah : {$count}";
            $sheet->setCellValueByColumnAndRow(1, $row, $label);
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

        // ── Baris grand total (kuning terang) ────────────────────────────────
        $totalLabel = "Jumlah tiket yang ditangani adalah =  {$grandTotal}";
        $sheet->setCellValueByColumnAndRow(1, $row, $totalLabel);
        $sheet->mergeCellsByColumnAndRow(1, $row, $colCount, $row);
        $sheet->getStyleByColumnAndRow(1, $row, $colCount, $row)->applyFromArray([
            'font'      => ['bold' => true, 'size' => 10],
            'fill'      => ['fillType' => Fill::FILL_SOLID, 'startColor' => ['argb' => $COLOR_TOTAL_BG]],
            'borders'   => ['allBorders' => ['borderStyle' => Border::BORDER_MEDIUM, 'color' => ['argb' => 'FF999900']]],
            'alignment' => ['horizontal' => Alignment::HORIZONTAL_LEFT, 'vertical' => Alignment::VERTICAL_CENTER],
        ]);
        $sheet->getRowDimension($row)->setRowHeight(18);
        $row++;

        // ── Baris footer generated ───────────────────────────────────────────
        $row++;
        $sheet->setCellValueByColumnAndRow(1, $row, 'Digenerate: ' . $this->nowFormatted());
        $sheet->getStyleByColumnAndRow(1, $row)->applyFromArray([
            'font' => ['italic' => true, 'size' => 7, 'color' => ['argb' => 'FF888888']],
        ]);

        return response()->streamDownload(function () use ($ss) {
            $writer = new Xlsx($ss);
            $writer->save('php://output');
        }, 'laporan-tiket-' . now()->format('Ymd') . '.xlsx', [
            'Content-Type'        => 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            'Content-Disposition' => 'attachment; filename="laporan-tiket-' . now()->format('Ymd') . '.xlsx"',
            'Cache-Control'       => 'max-age=0',
        ]);
    }

    // ══════════════════════════════════════════════════════════════════════════
    // SLA
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
                $base->where(function ($q) use ($uid) {
                    $q->where('requester_id', $uid)->orWhere('assigned_to', $uid);
                });
            }

            $total    = (clone $base)->count();
            $onTime   = (clone $base)->where('sla_breached', false)->count();
            $breached = $total - $onTime;

            $rows[] = [
                'priority' => $p,
                'target'   => self::SLA_TARGET[$p],
                'total'    => $total,
                'on_time'  => $onTime,
                'breached' => $breached,
                'achieved' => $total > 0 ? round(($onTime / $total) * 100) : 100,
            ];
        }

        $format = strtolower($request->get('format', 'json'));
        if ($format === 'excel') return $this->exportSlaExcel($rows);
        if ($format === 'pdf')   return $this->exportSlaPdf($rows);

        return response()->json($rows);
    }

    // ══════════════════════════════════════════════════════════════════════════
    // TECHNICIANS
    // ══════════════════════════════════════════════════════════════════════════

    public function technicians(Request $request)
    {
        $user = $request->user();

        $techQuery = User::technicians();

        if ($this->hasFullAccess($user)) {
            if ($request->filled('user_id')) $techQuery->where('id', $request->user_id);
        } else {
            $techQuery->where('id', $user->id);
        }

        $techs = $techQuery->get()->map(function ($u) use ($request, $user) {
            $base = Ticket::where('assigned_to', $u->id);

            if (!$this->hasFullAccess($user) && $user->role === 'supervisor') {
                $base->whereHas('requester', fn($q) => $q->where('department', $user->department));
            }

            if ($request->filled('from')) $base->whereDate('created_at', '>=', $request->from);
            if ($request->filled('to'))   $base->whereDate('created_at', '<=', $request->to);

            $totalAssigned = (clone $base)->count();
            $totalResolved = (clone $base)->whereIn('status', ['Resolved', 'Closed'])->count();
            $slaMet        = (clone $base)->whereIn('status', ['Resolved', 'Closed'])->where('sla_breached', false)->count();
            $avgMinutes    = (clone $base)->whereIn('status', ['Resolved', 'Closed'])->whereNotNull('resolution_time_minutes')->avg('resolution_time_minutes') ?? 0;

            return [
                'name'           => $u->name,
                'role'           => $u->role_display ?? 'IT Support',
                'total_assigned' => $totalAssigned,
                'resolved_count' => $totalResolved,
                'sla_met'        => $slaMet,
                'sla_score'      => $totalResolved > 0 ? round(($slaMet / $totalResolved) * 100) : 100,
                'avg_hours'      => round($avgMinutes / 60, 1),
            ];
        });

        $format = strtolower($request->get('format', 'json'));
        if ($format === 'excel') return $this->exportTechExcel($techs->toArray());
        if ($format === 'pdf')   return $this->exportTechPdf($techs->toArray());

        return response()->json($techs);
    }

    // ══════════════════════════════════════════════════════════════════════════
    // ASSETS
    // ══════════════════════════════════════════════════════════════════════════

    public function assets(Request $request)
    {
        $user  = $request->user();
        $query = Asset::orderBy('category')->orderBy('name');
        $query = $this->scopeByRole($query, $user, 'asset');

        if ($request->filled('from'))   $query->whereDate('purchase_date', '>=', $request->from);
        if ($request->filled('to'))     $query->whereDate('purchase_date', '<=', $request->to);
        if ($request->filled('status')) $query->where('status', $request->status);

        $format = strtolower($request->get('format', 'json'));
        $assets = $query->get();

        if ($format === 'excel') return $this->exportAssetsExcel($assets);
        if ($format === 'pdf')   return $this->exportAssetsPdf($assets);

        $data = $assets->map(fn($a) => [
            'asset_number'    => $a->asset_number,
            'name'            => $a->name,
            'category'        => $a->category,
            'brand'           => $a->brand,
            'model'           => $a->model,
            'serial_number'   => $a->serial_number,
            'status'          => $a->status,
            'location'        => $a->location,
            'user'            => $a->user,
            'warranty_expiry' => $a->warranty_expiry?->format('d/m/Y'),
            'purchase_date'   => $a->purchase_date?->format('d/m/Y'),
        ])->values();

        return response()->json([
            'total'            => $assets->count(),
            'active'           => $assets->where('status', 'Active')->count(),
            'maintenance'      => $assets->where('status', 'Maintenance')->count(),
            'inactive'         => $assets->where('status', 'Inactive')->count(),
            'warranty_expired' => $assets->filter(fn($a) => $a->warranty_expiry && now()->gt($a->warranty_expiry))->count(),
            'by_category'      => $assets->groupBy('category')->map->count(),
            'data'             => $data,
        ]);
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

    private function nowFormatted(): string
    {
        return now()->format('d M Y H:i');
    }

    // ── Excel helpers ─────────────────────────────────────────────────────────

    private function buildSpreadsheet(array $headers, array $rows, string $title): Spreadsheet
    {
        $ss    = new Spreadsheet();
        $sheet = $ss->getActiveSheet()->setTitle($title);

        $sheet->setCellValue('A1', $title);
        $sheet->mergeCells('A1:' . \PhpOffice\PhpSpreadsheet\Cell\Coordinate::stringFromColumnIndex(count($headers)) . '1');
        $sheet->getStyle('A1')->applyFromArray([
            'font'      => ['bold' => true, 'size' => 13, 'color' => ['argb' => 'FFFFFFFF']],
            'fill'      => ['fillType' => Fill::FILL_SOLID, 'startColor' => ['argb' => 'FF1E3A5F']],
            'alignment' => ['horizontal' => Alignment::HORIZONTAL_CENTER],
        ]);
        $sheet->getRowDimension(1)->setRowHeight(24);

        $sheet->setCellValue('A2', 'Digenerate: ' . $this->nowFormatted());
        $sheet->mergeCells('A2:' . \PhpOffice\PhpSpreadsheet\Cell\Coordinate::stringFromColumnIndex(count($headers)) . '2');
        $sheet->getStyle('A2')->applyFromArray([
            'font'      => ['italic' => true, 'size' => 9, 'color' => ['argb' => 'FF888888']],
            'alignment' => ['horizontal' => Alignment::HORIZONTAL_CENTER],
        ]);

        foreach ($headers as $colIdx => $label) {
            $colLetter = \PhpOffice\PhpSpreadsheet\Cell\Coordinate::stringFromColumnIndex($colIdx + 1);
            $sheet->setCellValue("{$colLetter}4", $label);
            $sheet->getStyle("{$colLetter}4")->applyFromArray([
                'font'      => ['bold' => true, 'color' => ['argb' => 'FFFFFFFF']],
                'fill'      => ['fillType' => Fill::FILL_SOLID, 'startColor' => ['argb' => 'FF2563EB']],
                'alignment' => ['horizontal' => Alignment::HORIZONTAL_CENTER],
                'borders'   => ['allBorders' => ['borderStyle' => Border::BORDER_THIN, 'color' => ['argb' => 'FFCCE0FF']]],
            ]);
            $sheet->getColumnDimensionByColumn($colIdx + 1)->setAutoSize(true);
        }

        foreach ($rows as $rIdx => $row) {
            $rowNum = $rIdx + 5;
            $bg = $rIdx % 2 === 0 ? 'FFF8FAFF' : 'FFFFFFFF';
            foreach (array_values($row) as $cIdx => $val) {
                $colLetter = \PhpOffice\PhpSpreadsheet\Cell\Coordinate::stringFromColumnIndex($cIdx + 1);
                $sheet->setCellValue("{$colLetter}{$rowNum}", $val ?? '');
                $sheet->getStyle("{$colLetter}{$rowNum}")->applyFromArray([
                    'fill'      => ['fillType' => Fill::FILL_SOLID, 'startColor' => ['argb' => $bg]],
                    'borders'   => ['allBorders' => ['borderStyle' => Border::BORDER_THIN, 'color' => ['argb' => 'FFDDDDDD']]],
                    'alignment' => ['vertical' => Alignment::VERTICAL_CENTER],
                ]);
            }
        }

        return $ss;
    }

    private function streamExcel(Spreadsheet $ss, string $filename): \Symfony\Component\HttpFoundation\StreamedResponse
    {
        return response()->streamDownload(function () use ($ss) {
            $writer = new Xlsx($ss);
            $writer->save('php://output');
        }, $filename, [
            'Content-Type'        => 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            'Content-Disposition' => "attachment; filename=\"{$filename}\"",
            'Cache-Control'       => 'max-age=0',
        ]);
    }

    private function exportSlaExcel(array $rows)
    {
        $headers = ['Prioritas', 'Target SLA', 'Total Tiket', 'Tepat Waktu', 'Terlambat', 'Pencapaian (%)'];
        $data = array_map(fn($r) => [
            $r['priority'], $r['target'], $r['total'], $r['on_time'], $r['breached'], $r['achieved'] . '%',
        ], $rows);

        $ss = $this->buildSpreadsheet($headers, $data, 'SLA Performance Report');
        return $this->streamExcel($ss, 'sla-report.xlsx');
    }

    private function exportTechExcel(array $rows)
    {
        $headers = ['Nama Teknisi', 'Role', 'Total Ditugaskan', 'Diselesaikan', 'SLA Terpenuhi', 'SLA Score (%)', 'Avg Waktu (jam)'];
        $data = array_map(fn($r) => [
            $r['name'], $r['role'], $r['total_assigned'], $r['resolved_count'],
            $r['sla_met'], $r['sla_score'] . '%', $r['avg_hours'],
        ], $rows);

        $ss = $this->buildSpreadsheet($headers, $data, 'Laporan Kinerja Teknisi');
        return $this->streamExcel($ss, 'technicians-report.xlsx');
    }

    private function exportAssetsExcel($assets)
    {
        $headers = ['No.', 'No. Aset', 'Nama', 'Kategori', 'Brand / Model', 'Serial Number', 'Status', 'Lokasi', 'Pengguna', 'Tgl Beli', 'Garansi s/d', 'Harga Beli'];
        $rows = $assets->values()->map(fn($a, $i) => [
            $i + 1,
            $a->asset_number,
            $a->name,
            $a->category,
            trim("{$a->brand} {$a->model}"),
            $a->serial_number,
            $a->status,
            $a->location,
            $a->user ?? '—',
            $a->purchase_date?->format('d/m/Y') ?? '—',
            $a->warranty_expiry?->format('d/m/Y') ?? '—',
            $a->purchase_price ? 'Rp ' . number_format($a->purchase_price, 0, ',', '.') : '—',
        ])->toArray();

        $ss = $this->buildSpreadsheet($headers, $rows, 'Inventaris Aset IT');
        return $this->streamExcel($ss, 'assets-report.xlsx');
    }

    // ── PDF helpers ───────────────────────────────────────────────────────────

    private function exportSlaPdf(array $rows)
    {
        $html = $this->pdfWrapper('SLA Performance Report', now()->format('d M Y H:i'), '
            <table>
                <thead><tr>
                    <th>Prioritas</th><th>Target SLA</th><th>Total</th>
                    <th>Tepat Waktu</th><th>Terlambat</th><th>Pencapaian</th>
                </tr></thead>
                <tbody>' .
            implode('', array_map(fn($r) => "
                <tr>
                    <td class='pri-{$r['priority']}'>{$r['priority']}</td>
                    <td>{$r['target']}</td><td>{$r['total']}</td>
                    <td style='color:#10b981'>{$r['on_time']}</td>
                    <td style='color:#ef4444'>{$r['breached']}</td>
                    <td><strong>{$r['achieved']}%</strong></td>
                </tr>", $rows)) . '
                </tbody>
            </table>');

        return Pdf::loadHTML($html)->setPaper('a4')->download('sla-report.pdf');
    }

    private function exportTechPdf(array $rows)
    {
        $html = $this->pdfWrapper('Laporan Kinerja Teknisi', now()->format('d M Y H:i'), '
            <table>
                <thead><tr>
                    <th>Nama Teknisi</th><th>Role</th><th>Ditugaskan</th>
                    <th>Diselesaikan</th><th>SLA Terpenuhi</th><th>SLA Score</th><th>Avg Waktu</th>
                </tr></thead>
                <tbody>' .
            implode('', array_map(fn($r) => "
                <tr>
                    <td><strong>{$r['name']}</strong></td>
                    <td>{$r['role']}</td><td>{$r['total_assigned']}</td>
                    <td style='color:#10b981'>{$r['resolved_count']}</td>
                    <td>{$r['sla_met']}</td>
                    <td><strong>{$r['sla_score']}%</strong></td>
                    <td>{$r['avg_hours']} jam</td>
                </tr>", $rows)) . '
                </tbody>
            </table>');

        return Pdf::loadHTML($html)->setPaper('a4')->download('technicians-report.pdf');
    }

    private function exportAssetsPdf($assets)
    {
        $html = $this->pdfWrapper('Inventaris Aset IT', now()->format('d M Y H:i'), '
            <table>
                <thead><tr>
                    <th>No. Aset</th><th>Nama</th><th>Kategori</th><th>Brand/Model</th>
                    <th>Serial</th><th>Status</th><th>Lokasi</th><th>Garansi s/d</th>
                </tr></thead>
                <tbody>' .
            $assets->map(fn($a) => "
                <tr>
                    <td style='font-family:monospace'>{$a->asset_number}</td>
                    <td>{$a->name}</td><td>{$a->category}</td>
                    <td>{$a->brand} {$a->model}</td>
                    <td style='font-family:monospace'>{$a->serial_number}</td>
                    <td>{$a->status}</td><td>{$a->location}</td>
                    <td>" . ($a->warranty_expiry?->format('d/m/Y') ?? '—') . "</td>
                </tr>")->implode('') . '
                </tbody>
            </table>');

        return Pdf::loadHTML($html)->setPaper('a4', 'landscape')->download('assets-report.pdf');
    }

    private function pdfWrapper(string $title, string $generated, string $body): string
    {
        return <<<HTML
<!DOCTYPE html><html><head><meta charset="UTF-8">
<style>
  * { margin:0; padding:0; box-sizing:border-box; }
  body { font-family: 'DejaVu Sans', Arial, sans-serif; font-size:9px; color:#1e293b; }
  .header { background:#1e3a5f; color:#fff; padding:16px 20px; margin-bottom:16px; }
  .header h1 { font-size:16px; font-weight:700; letter-spacing:0.5px; }
  .header .sub { font-size:8px; color:#93c5fd; margin-top:3px; }
  table { width:100%; border-collapse:collapse; margin:0 20px; width:calc(100% - 40px); }
  thead tr { background:#2563eb; color:#fff; }
  th { padding:7px 8px; text-align:left; font-size:8px; font-weight:600; text-transform:uppercase; letter-spacing:0.4px; border:1px solid #1d4ed8; }
  td { padding:6px 8px; border:1px solid #e2e8f0; vertical-align:middle; }
  tbody tr:nth-child(even) { background:#f8faff; }
  .pri-Critical { color:#dc2626; font-weight:700; }
  .pri-High     { color:#ea580c; font-weight:700; }
  .pri-Medium   { color:#d97706; }
  .pri-Low      { color:#16a34a; }
  .ok      { color:#10b981; font-weight:700; }
  .breached{ color:#ef4444; font-weight:700; }
</style>
</head><body>
<div class="header">
  <h1>$title</h1>
  <div class="sub">IT Support Management System &nbsp;·&nbsp; Digenerate: $generated</div>
</div>
$body
</body></html>
HTML;
    }

    // ══════════════════════════════════════════════════════════════════════════
    // PROJECT REPORTS (tidak berubah)
    // ══════════════════════════════════════════════════════════════════════════

    public function summaryproject(Request $request): JsonResponse
    {
        $user  = $request->user();
        $query = $this->getProjectsForUser($user);

        if ($request->filled('from'))     $query->whereDate('created_at', '>=', $request->input('from'));
        if ($request->filled('to'))       $query->where('created_at', '<=', $request->input('to'));
        if ($request->filled('status'))   $query->where('status', $request->input('status'));
        if ($request->filled('priority')) $query->where('priority', $request->input('priority'));

        $projects   = $query->get();
        $projectIds = $projects->pluck('id');
        $totalTasks = Task::whereIn('project_id', $projectIds)->count();
        $completedTasks = Task::whereIn('project_id', $projectIds)
            ->whereHas('column', fn($q) => $q->where('name', 'Prod'))->count();
        $avgProgress = $projects->count() > 0 ? round($projects->avg('task_stats.progress') ?? 0) : 0;

        return response()->json([
            'total_projects'  => $projects->count(),
            'active_projects' => $projects->where('status', 'active')->count(),
            'total_tasks'     => $totalTasks,
            'completed_tasks' => $completedTasks,
            'avg_progress'    => $avgProgress,
            'user_role'       => $user->role,
            'is_full_access'  => $this->hasFullAccess($user),
        ]);
    }

    public function projects(Request $request): JsonResponse
    {
        $user  = $request->user();
        $query = $this->getProjectsForUser($user)->with(['creator:id,name', 'members:id,name'])->withCount('tasks');

        if ($request->filled('from'))     $query->where('created_at', '>=', $request->input('from'));
        if ($request->filled('to'))       $query->where('created_at', '<=', $request->input('to'));
        if ($request->filled('status'))   $query->where('status', $request->input('status'));
        if ($request->filled('priority')) $query->where('priority', $request->input('priority'));

        $projects = $query->latest()->get()->map(function ($project) {
            $columns = $project->columns()->withCount('tasks')->orderBy('position')->get();
            $totalColumns = $columns->count(); $totalTasks = 0; $weightedScore = 0.0;
            foreach ($columns as $index => $column) {
                $count = $column->tasks_count ?? 0;
                if ($count === 0) continue;
                $totalTasks    += $count;
                $weight         = $totalColumns > 1 ? ($index / ($totalColumns - 1)) * 100 : 100.0;
                $weightedScore += $count * $weight;
            }
            $lastColumn = $columns->last();
            $completed  = $lastColumn ? ($lastColumn->tasks_count ?? 0) : 0;
            $progress   = $totalTasks > 0 ? (int) round($weightedScore / $totalTasks) : 0;
            return [
                'name'            => $project->name,
                'category'        => $project->category ?? '—',
                'status'          => $project->status,
                'priority'        => $project->priority ?? 'medium',
                'progress'        => min(100, max(0, $progress)),
                'total_tasks'     => $totalTasks,
                'completed_tasks' => $completed,
                'creator_name'    => $project->creator->name ?? '—',
                'members'         => $project->members->pluck('name')->all(),
                'start_date'      => $project->created_at?->locale('id')->isoFormat('D MMM YYYY'),
                'due_date'        => $project->due_date ? \Carbon\Carbon::parse($project->due_date)->locale('id')->isoFormat('D MMM YYYY') : null,
            ];
        });

        return response()->json(['data' => $projects]);
    }

    public function tasks(Request $request): JsonResponse
    {
        $user       = $request->user();
        $projectIds = $this->getProjectsForUser($user)->pluck('id');
        $query = Task::whereIn('project_id', $projectIds)->with(['project:id,name', 'column:id,name', 'assignees:id,name']);

        if ($request->filled('from'))     $query->whereDate('created_at', '>=', $request->input('from'));
        if ($request->filled('to'))       $query->whereDate('created_at', '<=', $request->input('to'));
        if ($request->filled('priority')) $query->where('priority', $request->input('priority'));

        if ($this->hasFullAccess($user) && $request->filled('user_id')) {
            $query->whereHas('assignees', fn($q) => $q->where('users.id', $request->input('user_id')));
        } elseif (!$this->hasFullAccess($user) && $user->role !== 'supervisor') {
            $query->whereHas('assignees', fn($q) => $q->where('users.id', $user->id));
        }

        $tasks = $query->latest()->get()->map(fn($task) => [
            'project_name'  => $task->project->name ?? '—',
            'task_title'    => $task->title,
            'column_name'   => $task->column->name ?? '—',
            'priority'      => $task->priority,
            'assigned_name' => $task->assignees->isNotEmpty() ? $task->assignees->pluck('name')->implode(', ') : 'Unassigned',
            'due_date'      => $task->due_date ? \Carbon\Carbon::parse($task->due_date)->locale('id')->isoFormat('D MMM YYYY') : null,
            'created_at'    => $task->created_at ? \Carbon\Carbon::parse($task->created_at)->locale('id')->isoFormat('D MMM YYYY') : null,
        ]);

        return response()->json(['data' => $tasks]);
    }

    public function teamPerformance(Request $request): JsonResponse
    {
        $user       = $request->user();
        $projectIds = $this->getProjectsForUser($user)->pluck('id');

        $query = User::where(function ($q) use ($projectIds) {
            $q->whereHas('projects', fn($pq) => $pq->whereIn('project_id', $projectIds))
              ->orWhereHas('assignedTasks', fn($tq) => $tq->whereIn('project_id', $projectIds));
        });

        if ($this->hasFullAccess($user)) {
            if ($request->filled('user_id')) $query->where('id', $request->input('user_id'));
        } else {
            $query->where('id', $user->id);
        }

        $users = $query->get()->map(function ($u) use ($projectIds, $request) {
            $baseTask = Task::whereIn('project_id', $projectIds)->whereHas('assignees', fn($q) => $q->where('users.id', $u->id));
            if ($request->filled('from')) $baseTask->whereDate('created_at', '>=', $request->input('from'));
            if ($request->filled('to'))   $baseTask->whereDate('created_at', '<=', $request->input('to'));

            $assignedTasks  = (clone $baseTask)->count();
            $completedTasks = (clone $baseTask)->whereHas('column', fn($q) => $q->where('name', 'Prod'))->count();
            $inProgress     = (clone $baseTask)->whereHas('column', fn($q) => $q->whereNotIn('name', ['Prod', 'Mulai Project']))->count();
            $completionRate = $assignedTasks > 0 ? round(($completedTasks / $assignedTasks) * 100) : 0;
            $projectsCount  = $u->projects()->whereIn('project_id', $projectIds)->distinct('project_id')->count();

            return [
                'name'            => $u->name,
                'role'            => $u->role ?? '—',
                'total_assigned'  => $assignedTasks,
                'completed_tasks' => $completedTasks,
                'in_progress'     => $inProgress,
                'completion_rate' => $completionRate,
                'projects_count'  => $projectsCount,
            ];
        })->filter(fn($u) => $u['total_assigned'] > 0)->values();

        return response()->json(['data' => $users]);
    }

    private function getProjectsForUser($user)
    {
        if ($this->hasFullAccess($user)) return Project::query();

        if ($user->role === 'supervisor') {
            return Project::where(function ($q) use ($user) {
                $q->where('created_by', $user->id)
                  ->orWhereHas('members', fn($m) => $m->where('user_id', $user->id))
                  ->orWhereHas('members', fn($m) => $m->whereHas('user', fn($u) => $u->where('department', $user->department)));
            });
        }

        return Project::where(function ($q) use ($user) {
            $q->where('created_by', $user->id)
              ->orWhereHas('members', fn($m) => $m->where('user_id', $user->id));
        });
    }

    private function exportExcel($data, $filename)
    {
        return response()->json($data);
    }
}