import { NavLink, Outlet, Link } from 'react-router-dom';
import {
  LayoutDashboard, TrendingUp, Package, Tag, Wallet, Receipt, Settings, Users, LogOut, ShoppingCart, Coffee,
} from 'lucide-react';
import { useStore } from '../../store.js';

const links = [
  { to: '/admin', label: 'Reports', icon: LayoutDashboard, end: true },
  { to: '/admin/sales', label: 'Sales', icon: TrendingUp },
  { to: '/admin/products', label: 'Products', icon: Package },
  { to: '/admin/categories', label: 'Categories', icon: Tag },
  { to: '/admin/expenses', label: 'Expenses', icon: Wallet },
  { to: '/admin/bills', label: 'Bill History', icon: Receipt },
  { to: '/admin/workers', label: 'Workers', icon: Users },
  { to: '/admin/settings', label: 'Settings', icon: Settings },
];

export default function AdminLayout({ onLogout }) {
  const { settings } = useStore();
  return (
    <div className="admin">
      {/* phone: shop name first, then the menu below it */}
      <header className="admin-top">
        <div className="ttl"><Coffee size={20} /> <span>{settings.shopName}</span></div>
        <div className="acts">
          <Link to="/"><ShoppingCart size={14} /> Billing</Link>
          <a href="#logout" onClick={(e) => { e.preventDefault(); onLogout(); }}><LogOut size={14} /> Logout</a>
        </div>
      </header>
      <nav className="side">
        <div className="logo"><Coffee size={20} /> {settings.shopName}</div>
        {links.map(({ to, label, icon: Icon, end }) => (
          <NavLink key={to} to={to} end={end} className={({ isActive }) => (isActive ? 'active' : '')}>
            <Icon size={18} /> {label}
          </NavLink>
        ))}
        <div className="spacer desk-only" />
        <NavLink to="/" className="desk-only"><ShoppingCart size={18} /> Billing</NavLink>
        <a href="#logout" className="desk-only" onClick={(e) => { e.preventDefault(); onLogout(); }}>
          <LogOut size={18} /> Logout
        </a>
      </nav>
      <main className="admin-main">
        <Outlet />
      </main>
    </div>
  );
}
