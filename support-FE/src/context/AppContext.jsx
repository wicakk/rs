import { createContext, useContext, useState, useCallback } from "react";
import { MOCK_TICKETS, INITIAL_NOTIFS } from "../data/mockData";

const AppContext = createContext(null);

/* ─── Helper fetch dengan Authorization header ───────── */
const apiFetch = (url, token, options = {}) =>
  fetch(url, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers ?? {}),
    },
  });

export const AppProvider = ({ children }) => {
  /* ─── Restore session ─────────────────────────────── */
  const [user, setUser] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem("user"));
    } catch {
      return null;
    }
  });

  const [token, setToken] = useState(() => localStorage.getItem("token") ?? null);

  const [permissions, setPermissions] = useState({});
  const [currentPage, setCurrentPage] = useState("dashboard");
  const [tickets, setTickets] = useState(MOCK_TICKETS);
  const [notifs, setNotifs] = useState(INITIAL_NOTIFS);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);

  /* ─── AUTH ───────────────────────────────────────── */
  const login = useCallback((userData, authToken) => {
    localStorage.setItem("token", authToken);
    localStorage.setItem("user", JSON.stringify(userData));
    setToken(authToken);
    setUser(userData);
    setCurrentPage("dashboard");
  }, []);

  const logout = useCallback(async () => {
    if (token) {
      await apiFetch("/api/logout", token, { method: "POST" }).catch(() => {});
    }

    localStorage.removeItem("token");
    localStorage.removeItem("user");

    setToken(null);
    setUser(null);
    setPermissions({});
    setCurrentPage("dashboard");
  }, [token]);

  /* ─── NAVIGATION ─────────────────────────────────── */
  const navigateTo = useCallback((page) => {
    setCurrentPage(page);
  }, []);

  /* ─── TICKETS ────────────────────────────────────── */
  const addTicket = useCallback(
    (form) => {
      setTickets((prev) => [
        {
          id: `TKT-${String(prev.length + 42).padStart(4, "0")}`,
          ...form,
          status: "Open",
          user: user?.name ?? "You",
          assigned: null,
          created: new Date().toISOString().slice(0, 10),
          sla: new Date(Date.now() + 86400000).toISOString().slice(0, 10),
          initials: user?.initials ?? "YO",
        },
        ...prev,
      ]);
    },
    [user]
  );

  /* ─── NOTIFS ─────────────────────────────────────── */
  const markAllRead = useCallback(
    () => setNotifs((p) => p.map((n) => ({ ...n, read: true }))),
    []
  );

  const unreadCount = notifs.filter((n) => !n.read).length;

  const authFetch = (url, options = {}) => {
    const isFormData = options.body instanceof FormData

    const headers = {
      ...(isFormData ? {} : { 'Content-Type': 'application/json' }),
      'Authorization': `Bearer ${token}`,
      ...options.headers,
    }

    return fetch(url, { ...options, headers })
  }

  return (
    <AppContext.Provider
      value={{
        user,
        token,
        login,
        logout,
        authFetch,
        permissions,
        setPermissions,
        currentPage,
        setCurrentPage,
        navigateTo,
        tickets,
        addTicket,
        notifs,
        setNotifs,
        markAllRead,
        unreadCount,
        sidebarCollapsed,
        setSidebarCollapsed,
        notifOpen,
        setNotifOpen,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

/* ─── Hooks ───────────────────────────────────────── */

export const useApp = () => useContext(AppContext);

export const useAuth = () => {
  const { user, token, login, logout, authFetch, permissions, setPermissions, navigateTo } =
    useApp();
  return { user, token, login, logout, authFetch, permissions, setPermissions, navigateTo };
};

export const useNav = () => {
  const { currentPage, setCurrentPage, navigateTo } = useApp();
  return { page: currentPage, navigate: setCurrentPage, navigateTo };
};

export const useTickets = () => {
  const { tickets, addTicket } = useApp();
  return { tickets, addTicket };
};

export const useNotifs = () => {
  const { notifs, setNotifs, markAllRead, unreadCount, notifOpen, setNotifOpen } = useApp();
  return { notifs, setNotifs, markAllRead, unreadCount, notifOpen, setNotifOpen };
};