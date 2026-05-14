import { useState, useEffect, useCallback } from "react";
import "./Pos.css";
import {
  Search, ScanBarcode, Sparkles, CreditCard,
  PlusCircle, Minus, Plus, Clock, UserRound,
  AlertTriangle, Loader, CheckCircle, X
} from "lucide-react";
import { getProducts, getRecentActivity, posCheckout } from "../api/stockwaveApi";

const user = JSON.parse(localStorage.getItem("user") || "{}");

export default function Pos() {
  const [search, setSearch]               = useState("");
  const [products, setProducts]           = useState([]);
  const [activity, setActivity]           = useState([]);
  const [cartItems, setCartItems]         = useState([]);
  const [loadingProducts, setLoadingProducts] = useState(true);
  const [loadingActivity, setLoadingActivity] = useState(true);
  const [checkingOut, setCheckingOut]     = useState(false);
  const [error, setError]                 = useState(null);
  const [toast, setToast]                 = useState(null); // { type, message }
  const [paymentMethod, setPaymentMethod] = useState("Card");

  const showToast = (type, message) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 3500);
  };

  // ── Fetch products ───────────────────────────────
  const loadProducts = useCallback(() => {
    setLoadingProducts(true);
    getProducts()
      .then((res) => setProducts(res.data))
      .catch(() => setError("Failed to load products."))
      .finally(() => setLoadingProducts(false));
  }, []);

  useEffect(() => { loadProducts(); }, [loadProducts]);

  // ── Fetch activity — real data from StockTransaction ────────────
  const loadActivity = useCallback(() => {
    setLoadingActivity(true);
    getRecentActivity()
      .then((res) => {
        // Use raw transaction data directly — no fake invoice numbers
        const transactions = res.data.slice(0, 8).map((a) => ({
          id: a.id,
          item: a.item,           // product name from API
          action: a.action,       // "Sold", "Added", "Removed"
          quantity: a.quantity,
          performedBy: a.performedBy,
          time: new Date(a.timestamp).toLocaleTimeString("en-PH", {
            hour: "2-digit", minute: "2-digit"
          }),
          date: new Date(a.timestamp).toLocaleDateString("en-PH", {
            month: "short", day: "numeric"
          }),
        }));
        setActivity(transactions);
      })
      .catch(() => setActivity([]))
      .finally(() => setLoadingActivity(false));
  }, []);

  useEffect(() => { loadActivity(); }, [loadActivity]);

  // ── Cart logic ───────────────────────────────────
  const addToCart = (product) => {
    if (product.stock <= 0) {
      showToast("error", `"${product.name}" is out of stock.`);
      return;
    }
    setCartItems((prev) => {
      const existing = prev.find((i) => i.id === product.id);
      if (existing) {
        // Don't exceed available stock
        if (existing.qty >= product.stock) {
          showToast("error", `Only ${product.stock} units of "${product.name}" available.`);
          return prev;
        }
        return prev.map((i) =>
          i.id === product.id ? { ...i, qty: i.qty + 1 } : i
        );
      }
      return [...prev, {
        id: product.id,
        name: product.name,
        qty: 1,
        price: product.price,
        maxStock: product.stock,
      }];
    });
  };

  const updateQty = (id, delta) => {
    setCartItems((prev) =>
      prev
        .map((i) => {
          if (i.id !== id) return i;
          const newQty = i.qty + delta;
          if (newQty > i.maxStock) {
            showToast("error", `Only ${i.maxStock} units available.`);
            return i;
          }
          return { ...i, qty: newQty };
        })
        .filter((i) => i.qty > 0)
    );
  };

  const clearCart = () => setCartItems([]);

  // ── Checkout ─────────────────────────────────────
  const handleCheckout = async () => {
    if (cartItems.length === 0) return;
    setCheckingOut(true);
    try {
      await posCheckout({
        items: cartItems.map((i) => ({
          productId: i.id,
          quantity: i.qty,
          price: i.price,
        })),
        paymentMethod,
        cashierName: user.fullName || "POS",
      });

      // Update local stock so UI reflects immediately
      setProducts((prev) =>
        prev.map((p) => {
          const sold = cartItems.find((c) => c.id === p.id);
          if (!sold) return p;
          const newStock = p.stock - sold.qty;
          return {
            ...p,
            stock: newStock,
            status: newStock === 0 ? "Out of Stock" : newStock <= 10 ? "Low Stock" : "In Stock",
          };
        })
      );

      showToast("success", `Checkout complete! ₱${total.toLocaleString()} charged via ${paymentMethod}.`);
      clearCart();
      loadActivity(); // refresh transaction feed
    } catch (err) {
      const msg = err?.response?.data?.message || "Checkout failed. Please try again.";
      showToast("error", msg);
    } finally {
      setCheckingOut(false);
    }
  };

  // ── Totals ───────────────────────────────────────
  const subtotal = cartItems.reduce((s, i) => s + i.price * i.qty, 0);
  const tax      = Math.round(subtotal * 0.07);
  const total    = subtotal + tax;

  const filtered = products.filter(
    (p) =>
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      (p.category || "").toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="pos-root">

      {/* ── Toast ── */}
      {toast && (
        <div className={`pos-toast ${toast.type}`}>
          {toast.type === "success" ? <CheckCircle size={15} /> : <AlertTriangle size={15} />}
          {toast.message}
          <button onClick={() => setToast(null)}><X size={13} /></button>
        </div>
      )}

      <div className="pos-header">
        <div>
          <h1 className="pos-title">Point of Sale</h1>
          <p className="pos-sub">Fast checkout with live inventory sync.</p>
        </div>
        <div className="pos-header-actions">
          <div className="pos-search">
            <Search size={16} />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search products or categories"
            />
          </div>
          <button className="pos-action" onClick={loadProducts}><ScanBarcode size={16} /> Refresh</button>
          <button className="pos-action primary"><Sparkles size={16} /> Smart Price</button>
        </div>
      </div>

      <div className="pos-layout">
        {/* ── Product Grid ── */}
        <section className="pos-main">
          <div className="pos-kpis">
            <div className="pos-kpi">
              <p>Active Register</p>
              <h3>POS-01</h3>
              <span>Ready</span>
            </div>
            <div className="pos-kpi">
              <p>Cart Items</p>
              <h3>{cartItems.reduce((s, i) => s + i.qty, 0)}</h3>
              <span>{cartItems.length} products</span>
            </div>
            <div className="pos-kpi">
              <p>Products Loaded</p>
              <h3>{loadingProducts ? "—" : products.length}</h3>
              <span>From inventory</span>
            </div>
          </div>

          {error && (
            <div className="pos-error">
              <AlertTriangle size={16} /> {error}
            </div>
          )}

          {loadingProducts ? (
            <div className="pos-loading"><Loader size={20} className="spin" /> Loading products...</div>
          ) : filtered.length === 0 ? (
            <div className="pos-loading">No products found.</div>
          ) : (
            <div className="pos-product-grid">
              {filtered.map((product) => {
                const outOfStock = product.stock <= 0;
                return (
                  <div key={product.id} className={`pos-card ${outOfStock ? "out-of-stock" : ""}`}>
                    <div className="pos-card-top">
                      <div className="pos-thumb" />
                      <span className={
                        outOfStock ? "pos-stock out" :
                        product.stock <= 10 ? "pos-stock low" : "pos-stock"
                      }>
                        {outOfStock ? "Out of stock" : `${product.stock} in stock`}
                      </span>
                    </div>
                    <h4>{product.name}</h4>
                    <p className="pos-sku">{product.category || "—"}</p>
                    <div className="pos-card-bottom">
                      <span className="pos-price">₱{(product.price || 0).toLocaleString()}</span>
                      <button
                        className="pos-add"
                        onClick={() => addToCart(product)}
                        disabled={outOfStock}
                        style={outOfStock ? { opacity: 0.4, cursor: "not-allowed" } : {}}
                      >
                        <PlusCircle size={14} /> Add
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {/* ── Side Panel ── */}
        <aside className="pos-side">
          {/* Cashier */}
          <div className="cashier-card">
            <div className="cashier-avatar">
              {user.fullName?.[0]?.toUpperCase() || "C"}
            </div>
            <div>
              <p className="cashier-name">{user.fullName || "Cashier"}</p>
              <p className="cashier-shift">Morning Shift • 08:00 - 16:00</p>
            </div>
            <span className="cashier-status">On Duty</span>
          </div>

          {/* Transaction Activity */}
          <div className="pos-activity">
            <div className="pos-activity-header">
              <h4>Transaction Activity</h4>
              <span>Live</span>
            </div>
            {loadingActivity ? (
              <div className="pos-loading" style={{ padding: "12px 0" }}>
                <Loader size={14} className="spin" /> Loading...
              </div>
            ) : activity.length === 0 ? (
              <p style={{ fontSize: 13, color: "#64748b", padding: "8px 0" }}>No transactions yet.</p>
            ) : (
              activity.map((item) => (
                <div key={item.id} className="pos-activity-row">
                  <div>
                    <p>{item.item}</p>
                    <span>{item.performedBy} • {item.time}</span>
                  </div>
                  <div className="pos-activity-meta">
                    <strong>{item.quantity} {item.quantity === 1 ? "unit" : "units"}</strong>
                    <span className={
                      item.action === "Sold"    ? "pill paid" :
                      item.action === "Added"   ? "pill restock" :
                      item.action === "Removed" ? "pill refund" : "pill restock"
                    }>{item.action}</span>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Live Cart */}
          <div className="pos-cart">
            <p className="cart-title">Live Cart {cartItems.length > 0 && `(${cartItems.length})`}</p>
            {cartItems.length === 0 ? (
              <p style={{ fontSize: 13, color: "#64748b", padding: "8px 0" }}>No items added yet.</p>
            ) : (
              cartItems.map((item) => (
                <div key={item.id} className="cart-row">
                  <div className="cart-item-info">
                    <span className="cart-item-name">{item.name}</span>
                    <span className="cart-item-price">₱{(item.price * item.qty).toLocaleString()}</span>
                  </div>
                  <div className="cart-qty">
                    <button onClick={() => updateQty(item.id, -1)}><Minus size={12} /></button>
                    <span>{item.qty}</span>
                    <button onClick={() => updateQty(item.id, 1)}><Plus size={12} /></button>
                  </div>
                </div>
              ))
            )}
            {cartItems.length > 0 && (
              <button className="checkout-btn" onClick={handleCheckout} disabled={checkingOut}>
                {checkingOut
                  ? <><Loader size={13} className="spin" /> Processing...</>
                  : `Charge ₱${total.toLocaleString()}`
                }
              </button>
            )}
          </div>

          {/* Receipt Preview */}
          <div className="receipt-preview">
            <p className="receipt-title">Receipt Preview</p>
            <div className="receipt-line"><span>Subtotal</span><strong>₱{subtotal.toLocaleString()}</strong></div>
            <div className="receipt-line"><span>Tax (7%)</span><strong>₱{tax.toLocaleString()}</strong></div>
            <div className="receipt-total"><span>Total</span><strong>₱{total.toLocaleString()}</strong></div>
            <button className="receipt-btn">Send receipt</button>
          </div>

          {/* Payment */}
          <div className="payment-sheet">
            <p className="payment-title">Payment</p>
            <div className="payment-methods">
              {["Card", "Wallet", "Cash"].map((m) => (
                <button
                  key={m}
                  className={paymentMethod === m ? "active" : ""}
                  onClick={() => setPaymentMethod(m)}
                >
                  {m === "Card" && <CreditCard size={14} />} {m}
                </button>
              ))}
            </div>
            <div className="payment-status">Terminal online • Ready to process</div>
          </div>

          {/* Queue */}
          <div className="queue-panel">
            <p className="queue-title">Customer Queue</p>
            <div className="queue-dots">
              <span className="queue-dot active" />
              <span className="queue-dot" />
              <span className="queue-dot" />
            </div>
            <div className="queue-meta">
              <div><Clock size={14} /> Avg 1m 12s</div>
              <div><UserRound size={14} /> 2 waiting</div>
            </div>
          </div>
        </aside>
      </div>

      {/* Quick Actions */}
      <div className="pos-quick-actions">
        <button onClick={clearCart}><Plus size={14} /> New Order</button>
        <button onClick={loadProducts}><ScanBarcode size={14} /> Refresh</button>
        <button onClick={handleCheckout} disabled={checkingOut || cartItems.length === 0}>
          <CreditCard size={14} /> Charge
        </button>
      </div>
    </div>
  );
}