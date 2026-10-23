import { useState } from 'react';
import { Plus, Pencil, Trash2 } from 'lucide-react';
import { useStore, actions } from '../../store.js';
import { exportCSV, exportPDF, stamp } from '../../utils.js';
import ExportButtons from '../../components/ExportButtons.jsx';
import Modal from '../../components/Modal.jsx';

export default function Categories() {
  const { categories, products, settings } = useStore();
  const [edit, setEdit] = useState(null);
  const [error, setError] = useState('');

  const count = (id) => products.filter((p) => p.categoryId === id).length;

  const head = ['Category', 'Products', 'Status'];
  const rows = categories.map((c) => [c.name, count(c.id), c.enabled === false ? 'Disabled' : 'Enabled']);

  const save = () => {
    if (!edit.name.trim()) return setError('Category name is required');
    actions.saveCategory({ ...edit, name: edit.name.trim(), icon: edit.icon.trim() || '🍽️' });
    setEdit(null);
  };

  const del = (c) => {
    if (count(c.id) > 0) {
      window.alert(`"${c.name}" still has ${count(c.id)} product(s). Move or delete them first.`);
      return;
    }
    if (window.confirm(`Delete category "${c.name}"?`)) actions.deleteCategory(c.id);
  };

  return (
    <>
      <div className="page-title">
        Categories
        <div className="row wrap">
          <ExportButtons
            disabled={!categories.length}
            onCsv={() => exportCSV(`categories-${stamp()}.csv`, head, rows)}
            onPdf={() =>
              exportPDF({
                filename: `categories-${stamp()}.pdf`,
                title: `${settings.shopName} - Categories`,
                subtitle: `${categories.length} categories`,
                head,
                rows,
              })
            }
          />
          <button className="btn primary" onClick={() => { setError(''); setEdit({ id: '', name: '', icon: '🍽️', enabled: true }); }}>
            <Plus size={16} /> Add Category
          </button>
        </div>
      </div>

      <div className="card table-wrap">
        <table className="tbl">
          <thead><tr><th>Icon</th><th>Name</th><th className="num">Products</th><th>Status</th><th></th></tr></thead>
          <tbody>
            {categories.length === 0 && (
              <tr><td colSpan={5} className="muted" style={{ textAlign: 'center' }}>No categories</td></tr>
            )}
            {categories.map((c) => (
              <tr key={c.id}>
                <td style={{ fontSize: 22 }}>{c.icon}</td>
                <td><b>{c.name}</b></td>
                <td className="num">{count(c.id)}</td>
                <td>
                  <button className={`badge ${c.enabled === false ? 'off' : 'green'}`} style={{ border: 0, cursor: 'pointer' }} onClick={() => actions.toggleCategory(c.id)}>
                    {c.enabled === false ? 'Disabled' : 'Enabled'}
                  </button>
                </td>
                <td className="right" style={{ whiteSpace: 'nowrap' }}>
                  <button className="btn sm icon" onClick={() => { setError(''); setEdit({ ...c }); }}><Pencil size={14} /></button>{' '}
                  <button className="btn sm icon danger" onClick={() => del(c)}><Trash2 size={14} /></button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {edit && (
        <Modal title={edit.id ? 'Edit Category' : 'Add Category'} onClose={() => setEdit(null)}>
          <div className="field">
            <label>Name</label>
            <input className="input" autoFocus value={edit.name} onChange={(e) => setEdit({ ...edit, name: e.target.value })} />
          </div>
          <div className="field">
            <label>Icon (emoji)</label>
            <input className="input" value={edit.icon} maxLength={4} onChange={(e) => setEdit({ ...edit, icon: e.target.value })} />
          </div>
          <label className="check">
            <input type="checkbox" checked={edit.enabled !== false} onChange={(e) => setEdit({ ...edit, enabled: e.target.checked })} />
            Enabled (Billing page-la kaattum)
          </label>
          {error && <div className="err">{error}</div>}
          <div className="actions">
            <button className="btn" onClick={() => setEdit(null)}>Cancel</button>
            <button className="btn primary" onClick={save}>Save</button>
          </div>
        </Modal>
      )}
    </>
  );
}
