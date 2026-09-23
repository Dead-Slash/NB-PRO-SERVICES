import { NavLink, Outlet } from 'react-router-dom';
import { ToastProvider } from '../lib/toast.jsx';

const links = [
  { to: '/', label: '📊 Tableau de bord', end: true },
  { to: '/devis', label: '📋 Devis' },
  { to: '/factures', label: '💳 Factures' },
  { to: '/clients', label: '👥 Clients' },
  { to: '/fournisseurs', label: '🏢 Fournisseurs' },
  { to: '/achats', label: '🛒 Achats' },
  { to: '/parametres', label: '⚙️ Paramètres' },
];

export default function Layout() {
  return (
    <ToastProvider>
    <div className="app-shell">
      <aside className="sidebar">
        <div className="sidebar-title">
          NB PRO SERVICES
          <span className="sidebar-subtitle">Facturation</span>
        </div>
        <nav>
          {links.map((l) => (
            <NavLink key={l.to} to={l.to} end={l.end} className={({ isActive }) => 'nav-link' + (isActive ? ' active' : '')}>
              {l.label}
            </NavLink>
          ))}
        </nav>
      </aside>
      <main className="content">
        <Outlet />
      </main>
    </div>
    </ToastProvider>
  );
}
