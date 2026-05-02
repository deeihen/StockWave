import { useState } from "react";
import "./Inventory.css";

// ── Mock Data ──────────────────────────────────────
const initialProducts = [
  { id: 1, name: "Wireless Keyboard", category: "Electronics", stock: 50, price: 1200, unit: "pcs", status: "In Stock" },
  { id: 2, name: "USB-C Cable", category: "Electronics", stock: 12, price: 250, unit: "pcs", status: "Low Stock" },
  { id: 3, name: "Office Chair", category: "Furniture", stock: 5, price: 8500, unit: "pcs", status: "Low Stock" },
  { id: 4, name: "Monitor Stand", category: "Furniture", stock: 30, price: 1500, unit: "pcs", status: "In Stock" },
  { id: 5, name: "HDMI Cable", category: "Electronics", stock: 0, price: 350, unit: "pcs", status: "Out of Stock" },
  { id: 6, name: "Printer Paper", category: "Office Supplies", stock: 7, price: 300, unit: "ream", status: "Low Stock" },
  { id: 7, name: "AA Batteries", category: "Electronics", stock: 4, price: 120, unit: "pack", status: "Low Stock" },
  { id: 8, name: "Sticky Notes", category: "Office Supplies", stock: 9, price: 80, unit: "pack", status: "Low Stock" },
  { id: 9, name: "Ethernet Cable", category: "Electronics", stock: 2, price: 450, unit: "pcs", status: "Low Stock" },
  { id: 10, name: "Whiteboard Marker", category: "Office Supplies", stock: 60, price: 50, unit: "pcs", status: "In Stock" },
  { id: 11, name: "Laptop Stand", category: "Furniture", stock: 18, price: 2200, unit: "pcs", status: "In Stock" },
  { id: 12, name: "Mouse Pad", category: "Electronics", stock: 45, price: 300, unit: "pcs", status: "In Stock" },
];

const categories = ["All", "Electronics", "Furniture", "Office Supplies"];
const statuses = ["All", "In Stock", "Low Stock", "Out of Stock"];
const emptyForm = { name: "", category: "Electronics", stock: "", price: "", unit: "pcs", status: "In Stock" };

// ── Status Badge ───────────────────────────────────
function StatusBadge({ status }) {
  const cls = status === "In Stock" ? "badge-in" : status === "Low Stock" ? "badge-low" : "badge-out";
  return <span className={`status-badge ${cls}`}>{status}</span>;
}

// ── Modal ──────────────────────────────────────────
function ProductModal({ mode, product, onClose, onSave }) {
  const [form, setForm] = useState(product || emptyForm);
  const [error, setError] = useState("");

  const handleChange = (e) => {
    const { name, value } = e.target;
    let updated = { ...form, [name]: value };
    // Auto-set status based on stock
    if (name === "stock") {
      const s = parseInt(value);
      updated.status = isNaN(s) ? "In Stock" : s === 0 ? "Out of Stock" : s <= 10 ? "Low Stock" : "In Stock";
    }
    setForm(updated);
    if (error) setError("");
  };

  const handleSubmit = () => {
    if (!form.name || !form.stock || !form.price || !form.unit) {
      setError("Please fill in all fields."); return;
    }
    onSave({ ...form, stock: parseInt(form.stock), price: parseFloat(form.price) });
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-card" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h3 className="modal-title">{mode === "add" ? "Add New Product" : "Edit Product"}</h3>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>

        {error && <div className="modal-error">{error}</div>}

        <div className="modal-body">
          <div className="mfield-group">
            <label className="mfield-label">Product Name</label>
            <input className="mfield-input" name="name" placeholder="e.g. Wireless Mouse"
              value={form.name} onChange={handleChange} />
          </div>

          <div className="mfield-row">
            <div className="mfield-group">
              <label className="mfield-label">Category</label>
              <select className="mfield-input" name="category" value={form.category} onChange={handleChange}>
                {["Electronics", "Furniture", "Office Supplies", "Food", "Tools", "Clothing"].map(c =>
                  <option key={c}>{c}</option>)}
              </select>
            </div>
            <div className="mfield-group">
              <label className="mfield-label">Unit</label>
              <select className="mfield-input" name="unit" value={form.unit} onChange={handleChange}>
                {["pcs", "pack", "ream", "box", "kg", "liter"].map(u =>
                  <option key={u}>{u}</option>)}
              </select>
            </div>
          </div>

          <div className="mfield-row">
            <div className="mfield-group">
              <label className="mfield-label">Stock Quantity</label>
              <input className="mfield-input" name="stock" type="number" min="0"
                placeholder="0" value={form.stock} onChange={handleChange} />
            </div>
            <div className="mfield-group">
              <label className="mfield-label">Price (₱)</label>
              <input className="mfield-input" name="price" type="number" min="0"
                placeholder="0.00" value={form.price} onChange={handleChange} />
            </div>
          </div>

          <div className="mfield-group">
            <label className="mfield-label">Status</label>
            <div className="status-preview">
              <StatusBadge status={form.status} />
              <span className="status-hint">Auto-set based on stock quantity</span>
            </div>
          </div>
        </div>

        <div className="modal-footer">
          <button className="btn-cancel" onClick={onClose}>Cancel</button>
          <button className="btn-save" onClick={handleSubmit}>
            {mode === "add" ? "Add Product" : "Save Changes"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Delete Confirm ─────────────────────────────────
function DeleteModal({ product, onClose, onConfirm }) {
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-card small" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h3 className="modal-title">Delete Product</h3>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>
        <div className="delete-body">
          <div className="delete-icon">🗑️</div>
          <p className="delete-msg">
            Are you sure you want to delete <strong>{product.name}</strong>?
            <br/>This action cannot be undone.
          </p>
        </div>
        <div className="modal-footer">
          <button className="btn-cancel" onClick={onClose}>Cancel</button>
          <button className="btn-delete" onClick={onConfirm}>Delete</button>
        </div>
      </div>
    </div>
  );
}

// ── Main Component ─────────────────────────────────
export default function Inventory() {
  const [products, setProducts] = useState(initialProducts);
  const [search, setSearch] = useState("");
  const [filterCat, setFilterCat] = useState("All");
  const [filterStatus, setFilterStatus] = useState("All");
  const [modal, setModal] = useState(null); // { type: "add"|"edit"|"delete", product? }
  const [selected, setSelected] = useState([]);
  const [sortBy, setSortBy] = useState("name");
  const [sortDir, setSortDir] = useState("asc");
  const [page, setPage] = useState(1);
  const PER_PAGE = 8;

  // ── Filter + Sort ──────────────────────────────
  const filtered = products
    .filter(p => {
      const matchSearch = p.name.toLowerCase().includes(search.toLowerCase()) ||
        p.category.toLowerCase().includes(search.toLowerCase());
      const matchCat = filterCat === "All" || p.category === filterCat;
      const matchStatus = filterStatus === "All" || p.status === filterStatus;
      return matchSearch && matchCat && matchStatus;
    })
    .sort((a, b) => {
      let va = a[sortBy], vb = b[sortBy];
      if (typeof va === "string") va = va.toLowerCase();
      if (typeof vb === "string") vb = vb.toLowerCase();
      return sortDir === "asc" ? (va > vb ? 1 : -1) : (va < vb ? 1 : -1);
    });

  const totalPages = Math.ceil(filtered.length / PER_PAGE);
  const paginated = filtered.slice((page - 1) * PER_PAGE, page * PER_PAGE);

  const handleSort = (col) => {
    if (sortBy === col) setSortDir(d => d === "asc" ? "desc" : "asc");
    else { setSortBy(col); setSortDir("asc"); }
  };

  const SortIcon = ({ col }) => (
    <span className="sort-icon">
      {sortBy === col ? (sortDir === "asc" ? " ↑" : " ↓") : " ↕"}
    </span>
  );

  // ── CRUD ──────────────────────────────────────
  const handleAdd = (data) => {
    const newP = { ...data, id: Date.now() };
    setProducts(prev => [newP, ...prev]);
    setModal(null);
  };

  const handleEdit = (data) => {
    setProducts(prev => prev.map(p => p.id === modal.product.id ? { ...data, id: p.id } : p));
    setModal(null);
  };

  const handleDelete = () => {
    setProducts(prev => prev.filter(p => p.id !== modal.product.id));
    setModal(null);
  };

  const handleBulkDelete = () => {
    setProducts(prev => prev.filter(p => !selected.includes(p.id)));
    setSelected([]);
  };

  const toggleSelect = (id) => {
    setSelected(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  const toggleAll = () => {
    const pageIds = paginated.map(p => p.id);
    const allSelected = pageIds.every(id => selected.includes(id));
    setSelected(allSelected ? selected.filter(id => !pageIds.includes(id)) : [...new Set([...selected, ...pageIds])]);
  };

  // ── Stats ──────────────────────────────────────
  const totalItems = products.length;
  const inStock = products.filter(p => p.status === "In Stock").length;
  const lowStock = products.filter(p => p.status === "Low Stock").length;
  const outOfStock = products.filter(p => p.status === "Out of Stock").length;

  return (
    <div className="inv-root">
      {/* ── PAGE HEADER ── */}
      <div className="inv-header">
        <div>
          <h1 className="inv-title">Inventory</h1>
          <p className="inv-sub">Manage and track all your products</p>
        </div>
        <button className="btn-add" onClick={() => setModal({ type: "add" })}>
          <span>＋</span> Add Product
        </button>
      </div>

      {/* ── MINI STATS ── */}
      <div className="inv-stats">
        <div className="inv-stat">
          <span className="istat-num">{totalItems}</span>
          <span className="istat-label">Total Products</span>
        </div>
        <div className="istat-divider" />
        <div className="inv-stat">
          <span className="istat-num green">{inStock}</span>
          <span className="istat-label">In Stock</span>
        </div>
        <div className="istat-divider" />
        <div className="inv-stat">
          <span className="istat-num amber">{lowStock}</span>
          <span className="istat-label">Low Stock</span>
        </div>
        <div className="istat-divider" />
        <div className="inv-stat">
          <span className="istat-num red">{outOfStock}</span>
          <span className="istat-label">Out of Stock</span>
        </div>
      </div>

      {/* ── FILTERS ── */}
      <div className="inv-filters">
        <div className="search-box">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none">
            <circle cx="11" cy="11" r="8" stroke="#aaa" strokeWidth="1.5"/>
            <path d="M21 21l-4.35-4.35" stroke="#aaa" strokeWidth="1.5" strokeLinecap="round"/>
          </svg>
          <input
            className="search-inp"
            placeholder="Search products..."
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(1); }}
          />
        </div>

        <div className="filter-group">
          <select className="filter-sel" value={filterCat}
            onChange={e => { setFilterCat(e.target.value); setPage(1); }}>
            {categories.map(c => <option key={c}>{c}</option>)}
          </select>

          <select className="filter-sel" value={filterStatus}
            onChange={e => { setFilterStatus(e.target.value); setPage(1); }}>
            {statuses.map(s => <option key={s}>{s}</option>)}
          </select>
        </div>

        {selected.length > 0 && (
          <button className="btn-bulk-delete" onClick={handleBulkDelete}>
            🗑 Delete {selected.length} selected
          </button>
        )}
      </div>

      {/* ── TABLE ── */}
      <div className="inv-table-wrap">
        <table className="inv-table">
          <thead>
            <tr>
              <th className="th-check">
                <input type="checkbox"
                  checked={paginated.length > 0 && paginated.every(p => selected.includes(p.id))}
                  onChange={toggleAll} />
              </th>
              <th onClick={() => handleSort("name")}>Product <SortIcon col="name" /></th>
              <th onClick={() => handleSort("category")}>Category <SortIcon col="category" /></th>
              <th onClick={() => handleSort("stock")}>Stock <SortIcon col="stock" /></th>
              <th onClick={() => handleSort("price")}>Price <SortIcon col="price" /></th>
              <th>Unit</th>
              <th onClick={() => handleSort("status")}>Status <SortIcon col="status" /></th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {paginated.length === 0 ? (
              <tr>
                <td colSpan="8" className="empty-row">
                  <div className="empty-state">
                    <span className="empty-icon">📦</span>
                    <p>No products found</p>
                  </div>
                </td>
              </tr>
            ) : paginated.map(p => (
              <tr key={p.id} className={selected.includes(p.id) ? "row-selected" : ""}>
                <td className="td-check">
                  <input type="checkbox"
                    checked={selected.includes(p.id)}
                    onChange={() => toggleSelect(p.id)} />
                </td>
                <td className="td-name">{p.name}</td>
                <td><span className="cat-tag">{p.category}</span></td>
                <td className={`td-stock ${p.stock === 0 ? "zero" : p.stock <= 10 ? "low" : ""}`}>
                  {p.stock}
                </td>
                <td className="td-price">₱{p.price.toLocaleString()}</td>
                <td className="td-unit">{p.unit}</td>
                <td><StatusBadge status={p.status} /></td>
                <td>
                  <div className="action-btns">
                    <button className="act-btn edit" title="Edit"
                      onClick={() => setModal({ type: "edit", product: p })}>
                      ✏️
                    </button>
                    <button className="act-btn del" title="Delete"
                      onClick={() => setModal({ type: "delete", product: p })}>
                      🗑️
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* ── PAGINATION ── */}
      {totalPages > 1 && (
        <div className="pagination">
          <span className="page-info">
            Showing {(page - 1) * PER_PAGE + 1}–{Math.min(page * PER_PAGE, filtered.length)} of {filtered.length}
          </span>
          <div className="page-btns">
            <button className="page-btn" disabled={page === 1} onClick={() => setPage(p => p - 1)}>‹</button>
            {Array.from({ length: totalPages }, (_, i) => i + 1).map(n => (
              <button key={n} className={`page-btn ${n === page ? "active" : ""}`} onClick={() => setPage(n)}>{n}</button>
            ))}
            <button className="page-btn" disabled={page === totalPages} onClick={() => setPage(p => p + 1)}>›</button>
          </div>
        </div>
      )}

      {/* ── MODALS ── */}
      {modal?.type === "add" && (
        <ProductModal mode="add" onClose={() => setModal(null)} onSave={handleAdd} />
      )}
      {modal?.type === "edit" && (
        <ProductModal mode="edit" product={modal.product} onClose={() => setModal(null)} onSave={handleEdit} />
      )}
      {modal?.type === "delete" && (
        <DeleteModal product={modal.product} onClose={() => setModal(null)} onConfirm={handleDelete} />
      )}
    </div>
  );
}