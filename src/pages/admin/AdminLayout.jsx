import { NavLink, Outlet } from 'react-router-dom';
import {
  LayoutDashboard, TrendingUp, Package, Tag, Wallet, Receipt, Settings, LogOut, ShoppingCart, Coffee,
} from 'lucide-react';

const links = [
  { to: '/admin', label: 'Reports', icon: LayoutDashboard, end: true },
  { to: '/admin/sales', label: 'Sales', icon: TrendingUp },
  { to: '/admin/products', label: 'Products', icon: Package },
  { to: '/admin/categories', label: 'Categories', icon: Tag },
  { to: '/admin/expenses', label: 'Expenses', icon: Wallet },
  { to: '/admin/bills', label: 'Bill History', icon: Receipt },
  { to: '/admin/settings', label: 'Settings', icon: Settings },
];

export default function AdminLayout({ onLogout }) {
  return (
    <div className="admin">
      <nav className="side">
        <div className="logo"><Coffee size={20} /> Admin</div>
        {links.map(({ to, label, icon: Icon, end }) => (
          <NavLink key={to} to={to} end={end} className={({ isActive }) => (isActive ? 'active' : '')}>
            <Icon size={18} /> {label}
          </NavLink>
        ))}
        <div className="spacer" />
        <NavLink to="/"><ShoppingCart size={18} /> Billing</NavLink>
        <a href="#logout" onClick={(e) => { e.preventDefault(); onLogout(); }}>
          <LogOut size={18} /> Logout
        </a>
      </nav>
      <main className="admin-main">
        <Outlet />
      </main>
    </div>
  );
}
