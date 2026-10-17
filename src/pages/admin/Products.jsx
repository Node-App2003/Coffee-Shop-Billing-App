import { useState } from 'react';
import { Plus, Pencil, Trash2, Upload, Search } from 'lucide-react';
import { useStore, actions } from '../../store.js';
import { money, resizeImage } from '../../utils.js';
import Modal from '../../components/Modal.jsx';

const blank = (categoryId) => ({ id: '', name: '', price: '', categoryId, image: '', enabled: true });

export default function Products() {
  const { products, categories, settings } = useStore();
  const cur = settings.currency || '₹';
  const [edit, setEdit] = useState(null);
  const [q, setQ] = useState('');
  const [filter, setFilter] = useState('all');
  const [error, setError] = useState('');

  const catOf = (id) => categories.find((c) => c.id === id);
  const list = products.filter(
    (p) =>
      (filter === 'all' || p.categoryId === filter) &&
      (!q.trim() || p.name.toLowerCase().includes(q.trim().toLowerCase()))
  );

  const openAdd = () => {
    setError('');
    setEdit(blank(categories[0]?.id || ''));
  };
  const openEdit = (p) => {
    setError('');
    setEdit({ ...p });
  };

  const save = () => {
    if (!edit.name.trim()) return setError('Product name is required');
    if (!(Number(edit.price) >= 0) || edit.price === '') return setError('Enter a valid price');
    if (!edit.categoryId) return setError('Create a category first, then pick it here');
    actions.saveProduct({ ...edit, name: edit.name.trim() });
    setEdit(null);
  };

  const pickImage = async (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    try {
      const data = await resizeImage(f);
      setEdit((x) => ({ ...x, image: data }));
    } catch {
      setError('Could not read that image');
    }
    e.target.value = '';
  };

  const del = (p) => {
    if (window.confirm(`Delete "${p.name}"? Old bills are not affected.`)) actions.deleteProduct(p.id);
  };

  return (
    <>
      <div className="page-title">
        Products
        <button className="btn primary" onClick={openAdd}><Plus size={16} /> Add Product</button>
      </div>

      <div className="row wrap" style={{ marginBottom: 14 }}>
        <div className="search grow" style={{ minWidth: 200 }}>
          <Search size={17} />
          <input className="input" placeholder="Search products" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
        <select className="select" style={{ width: 200 }} value={filter} onChange={(e) => setFilter(e.target.value)}>
          <option value="all">All categories</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>{c.icon} {c.name}</option>
          ))}
        </select>
      </div>

      <div className="card table-wrap">
        <table className="tbl">
          <thead>
            <tr>
              <th></th><th>Name</th><th>Category</th><th className="num">Price ({cur})</th>
              <th>Status</th><th></th>
            </tr>
          </thead>
          <tbody>
            {list.length === 0 && (
              <tr><td colSpan={6} className="muted" style={{ textAlign: 'center' }}>No products</td></tr>
            )}
            {list.map((p) => (
              <tr key={p.id}>
                <td>
                  <div className="thumb-sm">
                    {p.image ? <img src={p.image} alt="" /> : catOf(p.categoryId)?.icon || '☕'}
                  </div>
                </td>
                <td><b>{p.name}</b></td>
                <td>{catOf(p.categoryId)?.name || <span className="muted">-</span>}</td>
                <td className="num">
                  <input
                    key={p.price}
                    className="input"
                    style={{ width: 90, textAlign: 'right' }}
                    type="number"
                    inputMode="decimal"
                    defaultValue={p.price}
                    title="Change price"
                    onBlur={(e) => {
                      const v = Number(e.target.value);
                      if (e.target.value !== '' && v >= 0 && v !== p.price) actions.saveProduct({ ...p, price: v });
                      else e.target.value = p.price;
                    }}
                  />
                </td>
                <td>
                  <button className={`badge ${p.enabled ? 'green' : 'off'}`} style={{ border: 0 }} onClick={() => actions.toggleProduct(p.id)}>
                    {p.enabled ? 'Enabled' : 'Disabled'}
                  </button>
                </td>
                <td className="right" style={{ whiteSpace: 'nowrap' }}>
                  <button className="btn sm icon" onClick={() => openEdit(p)} title="Edit"><Pencil size={14} /></button>{' '}
                  <button className="btn sm icon danger" onClick={() => del(p)} title="Delete"><Trash2 size={14} /></button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {edit && (
        <Modal title={edit.id ? 'Edit Product' : 'Add Product'} onClose={() => setEdit(null)}>
          <div className="field">
            <label>Name</label>
            <input className="input" autoFocus value={edit.name} onChange={(e) => setEdit({ ...edit, name: e.target.value })} />
          </div>
          <div className="field">
            <label>Price ({cur})</label>
            <input className="input" type="number" inputMode="decimal" value={edit.price} onChange={(e) => setEdit({ ...edit, price: e.target.value })} />
          </div>
          <div className="field">
            <label>Category</label>
            <select className="select" value={edit.categoryId} onChange={(e) => setEdit({ ...edit, categoryId: e.target.value })}>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>{c.icon} {c.name}</option>
              ))}
            </select>
          </div>
          <div className="field">
            <label>Image (optional)</label>
            <div className="row">
              <div className="thumb-sm" style={{ width: 64, height: 64 }}>
                {edit.image ? <img src={edit.image} alt="" /> : catOf(edit.categoryId)?.icon || '☕'}
              </div>
              <label className="btn sm" style={{ cursor: 'pointer' }}>
                <Upload size={14} /> Upload
                <input type="file" accept="image/*" hidden onChange={pickImage} />
              </label>
              {edit.image && (
                <button className="btn sm danger" onClick={() => setEdit({ ...edit, image: '' })}>Remove</button>
              )}
            </div>
          </div>
          <label className="check">
            <input type="checkbox" checked={edit.enabled} onChange={(e) => setEdit({ ...edit, enabled: e.target.checked })} />
            Enabled (shown on billing screen)
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
