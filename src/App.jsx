import { useState } from 'react';
import { BrowserRouter, HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Capacitor } from '@capacitor/core';
import { actions, getState } from './store.js';
import Modal from './components/Modal.jsx';
import { QuickLoginForm } from './components/QuickLogin.jsx';
import Billing from './pages/Billing.jsx';
import AdminLayout from './pages/admin/AdminLayout.jsx';
import Login from './pages/admin/Login.jsx';
import Reports from './pages/admin/Reports.jsx';
import Sales from './pages/admin/Sales.jsx';
import Products from './pages/admin/Products.jsx';
import Categories from './pages/admin/Categories.jsx';
import Expenses from './pages/admin/Expenses.jsx';
import Bills from './pages/admin/Bills.jsx';
import Workers from './pages/admin/Workers.jsx';
import DayClose from './pages/admin/DayClose.jsx';
import Settings from './pages/admin/Settings.jsx';

// Browser: clean URLs (/admin). Android APK: hash URLs (more reliable inside the WebView).
const Router = Capacitor.isNativePlatform() ? HashRouter : BrowserRouter;
const SESSION_KEY = 'cafe-admin-session';

function AdminGate() {
  const [authed, setAuthed] = useState(() => sessionStorage.getItem(SESSION_KEY) === '1');
  const [offerQuick, setOfferQuick] = useState(false);
  if (!authed) {
    return (
      <Login
        onSuccess={(method) => {
          sessionStorage.setItem(SESSION_KEY, '1');
          setAuthed(true);
          // right after the first password login, offer a PIN (only once)
          const a = getState().auth;
          if (method === 'password' && !a.pinHash && !a.quickPrompted) setOfferQuick(true);
        }}
      />
    );
  }
  const closeOffer = () => {
    actions.markQuickPrompted();
    setOfferQuick(false);
  };
  return (
    <>
      <AdminLayout
        onLogout={() => {
          sessionStorage.removeItem(SESSION_KEY);
          setAuthed(false);
        }}
      />
      {offerQuick && (
        <Modal title="PIN set pannalaamaa?">
          <p className="muted small" style={{ marginTop: 0 }}>
            Inimel password type pannaama, PIN-la admin open pannalaam. Later Settings-layum maathalaam.
          </p>
          <QuickLoginForm onDone={closeOffer} onSkip={closeOffer} />
        </Modal>
      )}
    </>
  );
}

export default function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Billing />} />
        <Route path="/admin" element={<AdminGate />}>
          <Route index element={<Reports />} />
          <Route path="sales" element={<Sales />} />
          <Route path="products" element={<Products />} />
          <Route path="categories" element={<Categories />} />
          <Route path="closing" element={<DayClose />} />
          <Route path="expenses" element={<Expenses />} />
          <Route path="bills" element={<Bills />} />
          <Route path="workers" element={<Workers />} />
          <Route path="settings" element={<Settings />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Router>
  );
}
