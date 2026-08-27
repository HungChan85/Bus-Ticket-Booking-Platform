import { Link, useLocation } from "react-router-dom";

export default function Sidebar() {
  const location = useLocation();

  const isActive = (path) => location.pathname === path;

  return (
    <aside className="admin-sidebar">
      <div className="admin-sidebar__brand">
        <span className="admin-sidebar__logo">🚌</span>
        <div>
          <div className="admin-sidebar__title">Admin Dashboard</div>
          <div className="admin-sidebar__subtitle">Bus Management</div>
        </div>
      </div>

      <nav className="admin-sidebar__nav">
        <Link
          to="/admin"
          className={
            "admin-sidebar__link" +
            (isActive("/admin") ? " admin-sidebar__link--active" : "")
          }
        >
          Human Resources & Customer Management
        </Link>

        <Link
          to="/admin/page-2"
          className={
            "admin-sidebar__link" +
            (isActive("/admin/page-2") ? " admin-sidebar__link--active" : "")
          }
        >
          Transport Management Dashboard
        </Link>
        <Link
          to="/admin/page-3"
          className={
            "admin-sidebar__link" +
            (isActive("/admin/page-3") ? " admin-sidebar__link--active" : "")
          }
        >
          Buisiness Rules
        </Link>
      </nav>
    </aside>
  );
}
