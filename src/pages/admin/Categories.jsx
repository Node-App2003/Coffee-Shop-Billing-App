import { useState } from 'react';
import { Plus, Pencil, Trash2 } from 'lucide-react';
import { useStore, actions } from '../../store.js';
import Modal from '../../components/Modal.jsx';

export default function Categories() {
  const { categories, products } = useStore();
  const [edit, setEdit] = useState(null);
  const [error, setError] = useState('');

  const count = (id) => products.filter((p) => p.categoryId === id).length;

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
        <button className="btn primary" onClick={() => { setError(''); setEdit({ id: '', name: '', icon: '🍽️' }); }}>
          <Plus size={16} /> Add Category
        </button>
      </div>

      <div className="card table-wrap">
        <table className="tbl">
          <thead><tr><th>Icon</th><th>Name</th><th className="num">Products</th><th></th></tr></thead>
          <tbody>
            {categories.length === 0 && (
              <tr><td colSpan={4} className="muted" style={{ textAlign: 'center' }}>No categories</td></tr>
            )}
            {categories.map((c) => (
              <tr key={c.id}>
                <td style={{ fontSize: 22 }}>{c.icon}</td>
                <td><b>{c.name}</b></td>
                <td className="num">{count(c.id)}</td>
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
