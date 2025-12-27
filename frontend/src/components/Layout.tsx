import { NavLink, Outlet } from "react-router-dom";
import { useAuth, Role } from "../lib/auth";

const navItems: Array<{ label: string; to: string; roles: Role[] }> = [
  {
    label: "Dashboard",
    to: "/",
    roles: [
      "ADMIN",
      "STORE_CLERK",
      "APPROVER",
      "MAINTENANCE",
      "INVENTORY",
      "AUDITOR"
    ]
  },
  {
    label: "Assets",
    to: "/assets",
    roles: [
      "ADMIN",
      "STORE_CLERK",
      "APPROVER",
      "MAINTENANCE",
      "INVENTORY",
      "AUDITOR"
    ]
  },
  { label: "Approvals", to: "/approvals", roles: ["ADMIN", "APPROVER"] },
  { label: "Inventory", to: "/inventory", roles: ["ADMIN", "INVENTORY"] },
  { label: "Maintenance", to: "/maintenance", roles: ["ADMIN", "MAINTENANCE"] },
  { label: "Audit Logs", to: "/audit", roles: ["ADMIN", "AUDITOR"] },
  { label: "Users", to: "/users", roles: ["ADMIN"] }
];

export default function Layout() {
  const { user, logout } = useAuth();

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          <span className="brand-mark">MAM</span>
          <div>
            <div className="brand-title">Ministry Asset</div>
            <div className="brand-subtitle">Management</div>
          </div>
        </div>

        <nav className="nav">
          {navItems
            .filter((item) => (user ? item.roles.includes(user.role) : false))
            .map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) =>
                  isActive ? "nav-link active" : "nav-link"
                }
              >
                {item.label}
              </NavLink>
            ))}
        </nav>

        {user && (
          <div className="sidebar-footer">
            <div className="user-pill">
              <span className="user-role">{user.role}</span>
              <span className="user-email">{user.email}</span>
            </div>
            <button className="btn ghost" onClick={logout}>
              Sign out
            </button>
          </div>
        )}
      </aside>

      <main className="main-content">
        <Outlet />
      </main>
    </div>
  );
}
