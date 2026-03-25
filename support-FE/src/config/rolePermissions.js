// src/config/rolePermissions.js
// Definisi permissions per role — sesuai enum: super_admin, manager_it, it_support, user

export const ROLES = {
  super_admin: { label: 'Super Admin', color: '#7C3AED', bg: 'rgba(124,58,237,0.10)', border: 'rgba(124,58,237,0.22)' },
  manager_it:  { label: 'Manager IT',  color: '#0EA5E9', bg: 'rgba(14,165,233,0.10)',  border: 'rgba(14,165,233,0.22)' },
  it_support:  { label: 'IT Support',  color: '#10B981', bg: 'rgba(16,185,129,0.10)',  border: 'rgba(16,185,129,0.22)' },
  user:        { label: 'User',        color: '#94A3B8', bg: 'rgba(148,163,184,0.10)', border: 'rgba(148,163,184,0.22)' },
}

export const ROLE_DESCRIPTIONS = {
  super_admin: 'Akses penuh ke seluruh sistem termasuk konfigurasi dan manajemen role.',
  manager_it:  'Manajemen tim IT, melihat laporan, dan mengelola eskalasi tiket.',
  it_support:  'Menangani tiket helpdesk, manajemen aset, dan knowledge base.',
  user:        'Membuat tiket, melihat status, dan mengakses knowledge base.',
}

export const ALL_PERMISSIONS = [
  {
    group: 'Dashboard',
    key: 'dashboard',
    items: [
      { key: 'dashboard.view',   label: 'Lihat Dashboard' },
      { key: 'dashboard.charts', label: 'Lihat Grafik & Statistik' },
    ],
  },
  {
    group: 'Tiket',
    key: 'tickets',
    items: [
      { key: 'tickets.view',    label: 'Lihat Semua Tiket' },
      { key: 'tickets.create',  label: 'Buat Tiket' },
      { key: 'tickets.edit',    label: 'Edit Tiket' },
      { key: 'tickets.delete',  label: 'Hapus Tiket' },
      { key: 'tickets.assign',  label: 'Assign Tiket ke Teknisi' },
      { key: 'tickets.resolve', label: 'Resolve / Close Tiket' },
      { key: 'tickets.comment', label: 'Tambah Komentar' },
    ],
  },
  {
    group: 'Aset',
    key: 'assets',
    items: [
      { key: 'assets.view',     label: 'Lihat Aset' },
      { key: 'assets.create',   label: 'Tambah Aset' },
      { key: 'assets.edit',     label: 'Edit Aset' },
      { key: 'assets.delete',   label: 'Hapus Aset' },
      { key: 'assets.assign',   label: 'Assign Aset ke User' },
      { key: 'assets.maintain', label: 'Set Status Maintenance' },
    ],
  },
  {
    group: 'Knowledge Base',
    key: 'knowledge',
    items: [
      { key: 'knowledge.view',   label: 'Lihat Artikel' },
      { key: 'knowledge.create', label: 'Tulis Artikel' },
      { key: 'knowledge.edit',   label: 'Edit Artikel' },
      { key: 'knowledge.delete', label: 'Hapus Artikel' },
    ],
  },
  {
    group: 'Monitoring',
    key: 'monitoring',
    items: [
      { key: 'monitoring.view',   label: 'Lihat Server Monitor' },
      { key: 'monitoring.manage', label: 'Tambah / Hapus Server' },
      { key: 'monitoring.ping',   label: 'Ping Server' },
    ],
  },
  {
    group: 'Laporan',
    key: 'reports',
    items: [
      { key: 'reports.view',   label: 'Lihat Laporan' },
      { key: 'reports.export', label: 'Export Laporan' },
    ],
  },
  {
    group: 'User Management',
    key: 'users',
    items: [
      { key: 'users.view',   label: 'Lihat Daftar User' },
      { key: 'users.create', label: 'Tambah User' },
      { key: 'users.edit',   label: 'Edit User' },
      { key: 'users.delete', label: 'Hapus User' },
    ],
  },
  {
    group: 'Role Management',
    key: 'roles',
    items: [
      { key: 'roles.view', label: 'Lihat Role & Permissions' },
      { key: 'roles.edit', label: 'Edit Permissions Role' },
    ],
  },
  {
    group: 'Master Data',
    key: 'master',
    items: [
      { key: 'master.view',             label: 'Lihat Master Data'     },
      { key: 'master.categories',       label: 'Master Category'       },
      // { key: 'master.locations',        label: 'Master Lokasi'         },
      // ── [TAMBAHAN] ──
      { key: 'master.asset-categories', label: 'Master Kategori Aset' },
    ],
  },
]

export const DEFAULT_ROLE_PERMISSIONS = {
  super_admin: ALL_PERMISSIONS.flatMap(g => g.items.map(i => i.key)), // semua

  manager_it: [
    'dashboard.view', 'dashboard.charts',
    'tickets.view', 'tickets.create', 'tickets.edit', 'tickets.assign', 'tickets.resolve', 'tickets.comment',
    'assets.view', 'assets.create', 'assets.edit', 'assets.assign', 'assets.maintain',
    'knowledge.view', 'knowledge.create', 'knowledge.edit', 'knowledge.delete',
    'monitoring.view', 'monitoring.manage', 'monitoring.ping',
    'reports.view', 'reports.export',
    'users.view', 'users.create', 'users.edit',
    'roles.view',
    'master.view', 'master.categories', 'master.locations',
    // ── [TAMBAHAN] ──
    'master.asset-categories',
  ],

  it_support: [
    'dashboard.view', 'dashboard.charts',
    'tickets.view', 'tickets.create', 'tickets.edit', 'tickets.resolve', 'tickets.comment',
    'assets.view', 'assets.edit', 'assets.maintain',
    'knowledge.view', 'knowledge.create', 'knowledge.edit',
    'monitoring.view', 'monitoring.ping',
    'reports.view',
    'users.view',
  ],

  user: [
    'dashboard.view',
    'tickets.view', 'tickets.create', 'tickets.comment',
    'assets.view',
    'knowledge.view',
  ],
}

export function loadRolePermissions() {
  try {
    const saved = localStorage.getItem('role_permissions')
    return saved ? JSON.parse(saved) : { ...DEFAULT_ROLE_PERMISSIONS }
  } catch {
    return { ...DEFAULT_ROLE_PERMISSIONS }
  }
}

export function saveRolePermissions(perms) {
  localStorage.setItem('role_permissions', JSON.stringify(perms))
}

export function userCan(userRole, permissionKey) {
  const perms = loadRolePermissions()
  return (perms[userRole] ?? []).includes(permissionKey)
}