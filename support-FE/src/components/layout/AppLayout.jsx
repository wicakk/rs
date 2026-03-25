// components/layout/AppLayout.jsx
import Sidebar from './Sidebar'
import Topbar from './Topbar'
import { useApp } from '../../context/AppContext'
import { useTheme } from '../../context/ThemeContext'
import { NAV_ITEMS } from '../../data/mockData'

const AppLayout = ({ children }) => {
  const { setNotifOpen } = useApp()
  const { T } = useTheme()

  return (
    <div
      onClick={() => setNotifOpen(false)}
      style={{
        display: 'flex',
        height: '100vh',
        overflow: 'hidden',
        background: T.bg,
        // Transisi halus saat ganti tema
        transition: 'background 0.3s ease, color 0.3s ease',
      }}
    >
      <Sidebar navItems={NAV_ITEMS} />

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <Topbar />

        <main
          className="page-enter"
          style={{
            flex: 1,
            overflowY: 'auto',
            padding: 24,
            color: T.text,
            // Scrollbar sesuai tema
            scrollbarColor: `${T.scrollbar} transparent`,
          }}
        >
          {children}
        </main>
      </div>
    </div>
  )
}

export default AppLayout