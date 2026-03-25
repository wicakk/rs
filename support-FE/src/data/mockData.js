export const MOCK_TICKETS = [
  { id: 'TKT-0041', title: 'Laptop tidak bisa connect WiFi',            category: 'Network',  priority: 'High',     status: 'In Progress',  user: 'Budi Santoso',  dept: 'Finance',    assigned: 'Rizky A.',  created: '2024-01-15', sla: '2024-01-16', initials: 'BS' },
  { id: 'TKT-0040', title: 'Email tidak bisa kirim attachment',         category: 'Email',    priority: 'Medium',   status: 'Open',         user: 'Siti Rahayu',   dept: 'HR',         assigned: null,        created: '2024-01-15', sla: '2024-01-17', initials: 'SR' },
  { id: 'TKT-0039', title: 'Printer offline di lantai 3',               category: 'Printer',  priority: 'Low',      status: 'Assigned',     user: 'Eko Prasetyo',  dept: 'Marketing',  assigned: 'Dian F.',   created: '2024-01-14', sla: '2024-01-18', initials: 'EP' },
  { id: 'TKT-0038', title: 'Server aplikasi ERP down',                  category: 'Server',   priority: 'Critical', status: 'In Progress',  user: 'Anita W.',      dept: 'IT',         assigned: 'Rizky A.',  created: '2024-01-14', sla: '2024-01-14', initials: 'AW' },
  { id: 'TKT-0037', title: 'Blue screen saat startup Windows',          category: 'Hardware', priority: 'High',     status: 'Resolved',     user: 'Bambang S.',    dept: 'Operations', assigned: 'Dian F.',   created: '2024-01-13', sla: '2024-01-15', initials: 'BS' },
  { id: 'TKT-0036', title: 'VPN tidak bisa konek dari rumah',           category: 'Network',  priority: 'Medium',   status: 'Waiting User', user: 'Dewi K.',       dept: 'Sales',      assigned: 'Ahmad R.',  created: '2024-01-13', sla: '2024-01-16', initials: 'DK' },
  { id: 'TKT-0035', title: 'Software akuntansi crash saat dibuka',      category: 'Software', priority: 'High',     status: 'Closed',       user: 'Fajar M.',      dept: 'Finance',    assigned: 'Ahmad R.',  created: '2024-01-12', sla: '2024-01-14', initials: 'FM' },
  { id: 'TKT-0034', title: 'Akun email terkunci setelah ganti password', category: 'Security', priority: 'High',    status: 'Resolved',     user: 'Hani P.',       dept: 'Legal',      assigned: 'Rizky A.',  created: '2024-01-12', sla: '2024-01-13', initials: 'HP' },
]

export const MOCK_ASSETS = [
  { id: 'AST-001', name: 'Dell Latitude 5520',         category: 'Laptop',  brand: 'Dell',   serial: 'DL5520-001',  user: 'Budi Santoso', location: 'Lantai 2 - Finance',     purchase: '2022-03-15', warranty: '2025-03-15', status: 'Active'      },
  { id: 'AST-002', name: 'HP LaserJet Pro M404n',      category: 'Printer', brand: 'HP',     serial: 'HP-LJ-0042',  user: null,           location: 'Lantai 3 - Meeting Room', purchase: '2021-08-20', warranty: '2024-08-20', status: 'Maintenance' },
  { id: 'AST-003', name: 'Cisco Catalyst 2960',        category: 'Network', brand: 'Cisco',  serial: 'CS-2960-003', user: null,           location: 'Server Room',             purchase: '2020-01-10', warranty: '2025-01-10', status: 'Active'      },
  { id: 'AST-004', name: 'Lenovo ThinkPad X1 Carbon',  category: 'Laptop',  brand: 'Lenovo', serial: 'LN-X1-0089',  user: 'Anita W.',     location: 'Lantai 1 - IT',           purchase: '2023-05-01', warranty: '2026-05-01', status: 'Active'      },
  { id: 'AST-005', name: 'Dell PowerEdge R740',         category: 'Server',  brand: 'Dell',   serial: 'PE-R740-001', user: null,           location: 'Data Center',             purchase: '2021-11-30', warranty: '2026-11-30', status: 'Active'      },
]

export const MOCK_KB = [
  { id: 1, title: 'Cara Install Driver Printer HP LaserJet',   category: 'Printer',  views: 234, rating: 4.8, author: 'Rizky A.', date: '2024-01-10', tags: ['printer','driver','hp']       },
  { id: 2, title: 'Reset Password Email Outlook 365',          category: 'Email',    views: 189, rating: 4.5, author: 'Dian F.',  date: '2024-01-08', tags: ['email','outlook','password']   },
  { id: 3, title: 'Cara Mapping Network Drive Windows 11',     category: 'Network',  views: 312, rating: 4.9, author: 'Ahmad R.', date: '2024-01-05', tags: ['network','drive','windows']    },
  { id: 4, title: 'Troubleshoot Koneksi VPN Cisco AnyConnect', category: 'Network',  views: 145, rating: 4.2, author: 'Rizky A.', date: '2023-12-28', tags: ['vpn','cisco','remote']         },
  { id: 5, title: 'Backup Data Otomatis ke OneDrive',          category: 'Software', views: 267, rating: 4.7, author: 'Dian F.',  date: '2023-12-20', tags: ['backup','onedrive','cloud']    },
]

export const MOCK_SERVERS = [
  { name: 'WEB-SERVER-01',  ip: '192.168.1.10', cpu: 45, ram: 67, disk: 55, status: 'Online',  uptime: '99.9%', os: 'Ubuntu 22.04'        },
  { name: 'DB-SERVER-01',   ip: '192.168.1.11', cpu: 78, ram: 82, disk: 73, status: 'Warning', uptime: '99.7%', os: 'CentOS 8'            },
  { name: 'FILE-SERVER-01', ip: '192.168.1.12', cpu: 23, ram: 45, disk: 91, status: 'Warning', uptime: '98.2%', os: 'Windows Server 2022' },
  { name: 'MAIL-SERVER-01', ip: '192.168.1.13', cpu: 56, ram: 61, disk: 40, status: 'Online',  uptime: '99.9%', os: 'Ubuntu 20.04'        },
  { name: 'BACKUP-SERVER',  ip: '192.168.1.14', cpu: 12, ram: 34, disk: 88, status: 'Warning', uptime: '97.5%', os: 'Debian 11'           },
]

export const MOCK_USERS = [
  { id: 1, name: 'Rizky Ardianto',     email: 'rizky@company.com',   role: 'IT Support', dept: 'IT',      status: 'Active', tickets: 45, initials: 'RA', color: '#3B8BFF' },
  { id: 2, name: 'Dian Fitriana',      email: 'dian@company.com',    role: 'IT Support', dept: 'IT',      status: 'Active', tickets: 38, initials: 'DF', color: '#8B5CF6' },
  { id: 3, name: 'Ahmad Ridwan',       email: 'ahmad@company.com',   role: 'IT Support', dept: 'IT',      status: 'Active', tickets: 41, initials: 'AR', color: '#06B6D4' },
  { id: 4, name: 'Budi Santoso',       email: 'budi@company.com',    role: 'User',       dept: 'Finance', status: 'Active', tickets: 5,  initials: 'BS', color: '#10B981' },
  { id: 5, name: 'Siti Rahayu',        email: 'siti@company.com',    role: 'User',       dept: 'HR',      status: 'Active', tickets: 3,  initials: 'SR', color: '#F59E0B' },
  { id: 6, name: 'Manager Departemen', email: 'manager@company.com', role: 'Manager IT', dept: 'IT',      status: 'Active', tickets: 0,  initials: 'MI', color: '#F97316' },
]

export const MONTHLY_DATA = [
  { m: 'Jul', o: 32, r: 28 }, { m: 'Agt', o: 45, r: 41 }, { m: 'Sep', o: 38, r: 35 },
  { m: 'Okt', o: 52, r: 48 }, { m: 'Nov', o: 61, r: 55 }, { m: 'Des', o: 44, r: 42 },
  { m: 'Jan', o: 38, r: 31 },
]

export const CATEGORY_DIST = [
  { label: 'Software', count: 31, color: '#3B8BFF' }, { label: 'Network',  count: 24, color: '#8B5CF6' },
  { label: 'Hardware', count: 18, color: '#06B6D4' }, { label: 'Email',    count: 12, color: '#10B981' },
  { label: 'Printer',  count: 9,  color: '#F59E0B' }, { label: 'Server',   count: 6,  color: '#EF4444' },
]

export const INITIAL_NOTIFS = [
  { id: 1, text: 'TKT-0040 dibuat oleh Siti Rahayu',     time: '5m',  read: false, type: 'ticket'   },
  { id: 2, text: 'TKT-0038 Critical — Server ERP Down!', time: '12m', read: false, type: 'critical' },
  { id: 3, text: 'TKT-0037 berhasil diselesaikan',        time: '1h',  read: true,  type: 'resolved' },
]

export const NAV_ITEMS = [
  { id: 'dashboard',  label: 'Dashboard',       iconName: 'LayoutDashboard' },
  { id: 'tickets',    label: 'Tickets',          iconName: 'Ticket'         },
  { id: 'assets',     label: 'Asset Management', iconName: 'Package'        },
  { id: 'knowledge',  label: 'Knowledge Base',   iconName: 'BookOpen'       },
  { id: 'monitoring', label: 'Monitoring',       iconName: 'Activity'       },
  { id: 'reports',    label: 'Reports',          iconName: 'BarChart3'      },
  { id: 'users',      label: 'User Management',  iconName: 'Users'          },
  { id: 'settings',   label: 'Settings',         iconName: 'Settings'       },
]
