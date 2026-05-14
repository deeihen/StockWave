import { useState, useEffect, useCallback } from "react";
import "./Pos.css";
import {
  Search, CreditCard,
  PlusCircle, Minus, Plus,
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
  const [lastReceipt, setLastReceipt]     = useState(null);
  const [reviewedActivity, setReviewedActivity] = useState(null);

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
        // Use only sale transactions for the POS feed
        const grouped = new Map();
        res.data
          .filter((a) => a.action === "Sale" || a.action === "Sold")
          .forEach((a) => {
            const key = new Date(a.timestamp).toISOString();
            const current = grouped.get(key) || {
              id: key,
              itemCount: 0,
              quantity: 0,
              items: [],
              totalAmount: 0,
              performedBy: a.performedBy,
              timestamp: a.timestamp,
            };
            current.itemCount += 1;
            current.quantity += a.quantity;
            current.items.push({
              name: a.item,
              quantity: a.quantity,
              price: a.price ?? 0,
            });
            current.totalAmount += (a.price ?? 0) * a.quantity;
            grouped.set(key, current);
          });

        const transactions = Array.from(grouped.values())
          .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
          .slice(0, 8)
          .map((a) => ({
            id: a.id,
            item: `Batch sale (${a.itemCount} items)`,
            itemCount: a.itemCount,
            quantity: a.quantity,
            performedBy: a.performedBy,
            timestamp: a.timestamp,
            items: a.items,
            totalAmount: a.totalAmount,
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

  const setQty = (id, value) => {
    const parsed = Number(value);
    if (Number.isNaN(parsed)) return;
    setCartItems((prev) =>
      prev
        .map((i) => {
          if (i.id !== id) return i;
          const nextQty = Math.max(1, Math.min(i.maxStock, parsed));
          if (nextQty > i.maxStock) {
            showToast("error", `Only ${i.maxStock} units available.`);
          }
          return { ...i, qty: nextQty };
        })
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

      setLastReceipt({
        items: cartItems.map((i) => ({ ...i })),
        subtotal,
        tax,
        total,
        paymentMethod,
        cashierName: user.fullName || "POS",
        timestamp: new Date().toISOString(),
      });

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

  const handleSendReceipt = () => {
    const receipt = cartItems.length > 0
      ? {
          items: cartItems.map((i) => ({ ...i })),
          subtotal,
          tax,
          total,
          paymentMethod,
          cashierName: user.fullName || "POS",
          timestamp: new Date().toISOString(),
        }
      : lastReceipt;

    if (!receipt) {
      showToast("error", "No receipt available yet.");
      return;
    }

    const date = new Date(receipt.timestamp).toLocaleString("en-PH", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });

    const rows = receipt.items.map((item) => `
      <tr>
        <td>${item.name}</td>
        <td style="text-align:right">${item.qty}</td>
        <td style="text-align:right">₱${(item.price * item.qty).toLocaleString()}</td>
      </tr>
    `).join("");

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8" />
        <title>Receipt</title>
        <style>
          * { box-sizing: border-box; margin: 0; padding: 0; }
          body { font-family: Arial, sans-serif; padding: 24px; color: #111827; }
          h1 { font-size: 18px; margin-bottom: 6px; }
          .meta { font-size: 12px; color: #6b7280; margin-bottom: 16px; }
          table { width: 100%; border-collapse: collapse; margin: 12px 0; }
          th, td { font-size: 12px; padding: 6px 0; border-bottom: 1px solid #e5e7eb; }
          th { text-align: left; color: #6b7280; }
          .totals { margin-top: 12px; font-size: 12px; }
          .totals div { display: flex; justify-content: space-between; margin-top: 4px; }
          .total { font-weight: 700; }
        </style>
      </head>
      <body>
        <h1>StockWave Receipt</h1>
        <div class="meta">${date} • Cashier: ${receipt.cashierName} • ${receipt.paymentMethod}</div>
        <table>
          <thead>
            <tr>
              <th>Item</th>
              <th style="text-align:right">Qty</th>
              <th style="text-align:right">Amount</th>
            </tr>
          </thead>
          <tbody>
            ${rows}
          </tbody>
        </table>
        <div class="totals">
          <div><span>Subtotal</span><span>₱${receipt.subtotal.toLocaleString()}</span></div>
          <div><span>Tax (7%)</span><span>₱${receipt.tax.toLocaleString()}</span></div>
          <div class="total"><span>Total</span><span>₱${receipt.total.toLocaleString()}</span></div>
        </div>
      </body>
      </html>
    `;

    const win = window.open("", "_blank");
    if (!win) {
      showToast("error", "Popup blocked. Allow popups to print the receipt.");
      return;
    }
    win.document.write(html);
    win.document.close();
    win.onload = () => {
      win.focus();
      win.print();
    };
  };

  const handlePrintActivityReceipt = (activityItem) => {
    if (!activityItem) return;
    const date = new Date(activityItem.timestamp).toLocaleString("en-PH", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });

    const rows = (activityItem.items || []).map((item) => `
      <tr>
        <td>${item.name}</td>
        <td style="text-align:right">${item.quantity}</td>
        <td style="text-align:right">₱${(item.price ?? 0).toLocaleString()}</td>
        <td style="text-align:right">₱${((item.price ?? 0) * item.quantity).toLocaleString()}</td>
      </tr>
    `).join("");

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8" />
        <title>Receipt</title>
        <style>
          * { box-sizing: border-box; margin: 0; padding: 0; }
          body { font-family: Arial, sans-serif; padding: 24px; color: #111827; }
          h1 { font-size: 18px; margin-bottom: 6px; }
          .meta { font-size: 12px; color: #6b7280; margin-bottom: 16px; }
          table { width: 100%; border-collapse: collapse; margin: 12px 0; }
          th, td { font-size: 12px; padding: 6px 0; border-bottom: 1px solid #e5e7eb; }
          th { text-align: left; color: #6b7280; }
          .row { display: flex; justify-content: space-between; font-size: 12px; padding: 6px 0; }
          .total { font-weight: 700; }
        </style>
      </head>
      <body>
        <h1>StockWave Receipt</h1>
        <div class="meta">${date} • Cashier: ${activityItem.performedBy}</div>
        <div class="row"><span>Batch</span><span>${activityItem.itemCount} items</span></div>
        <table>
          <thead>
            <tr>
              <th>Item</th>
              <th style="text-align:right">Qty</th>
              <th style="text-align:right">Price</th>
              <th style="text-align:right">Line Total</th>
            </tr>
          </thead>
          <tbody>
            ${rows}
          </tbody>
        </table>
        <div class="row total"><span>Total Units</span><span>${activityItem.quantity}</span></div>
        <div class="row total"><span>Total Amount</span><span>₱${(activityItem.totalAmount ?? 0).toLocaleString()}</span></div>
      </body>
      </html>
    `;

    const win = window.open("", "_blank");
    if (!win) {
      showToast("error", "Popup blocked. Allow popups to print the receipt.");
      return;
    }
    win.document.write(html);
    win.document.close();
    win.onload = () => {
      win.focus();
      win.print();
    };
  };

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

          {/* Live Cart */}
          <div className="pos-cart">
            <p className="cart-title">Live Cart {cartItems.length > 0 && `(${cartItems.length})`}</p>
            {cartItems.length === 0 ? (
              <p style={{ fontSize: 13, color: "#64748b", padding: "8px 0" }}>No items added yet.</p>
            ) : (
              <div className="pos-cart-items">
                {cartItems.map((item) => (
                  <div key={item.id} className="cart-row">
                    <div className="cart-item-info">
                      <span className="cart-item-name">{item.name}</span>
                      <span className="cart-item-price">₱{(item.price * item.qty).toLocaleString()}</span>
                    </div>
                    <div className="cart-qty">
                      <button onClick={() => updateQty(item.id, -1)}><Minus size={12} /></button>
                      <input
                        className="cart-qty-input"
                        type="number"
                        min="1"
                        max={item.maxStock}
                        value={item.qty}
                        onChange={(e) => setQty(item.id, e.target.value)}
                      />
                      <button onClick={() => updateQty(item.id, 1)}><Plus size={12} /></button>
                    </div>
                  </div>
                ))}
              </div>
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
            <button className="receipt-btn" onClick={handleSendReceipt}>Send receipt</button>
          </div>

          {/* Transaction Activity */}
          <div className="pos-activity">
            <div className="pos-activity-header">
              <h4>Transaction Activity</h4>
              <div className="pos-activity-actions">
                <span>Live</span>
                <button className="pos-activity-print" onClick={handleSendReceipt}>Print receipt</button>
              </div>
            </div>
            {loadingActivity ? (
              <div className="pos-loading" style={{ padding: "12px 0" }}>
                <Loader size={14} className="spin" /> Loading...
              </div>
            ) : activity.length === 0 ? (
              <p style={{ fontSize: 13, color: "#64748b", padding: "8px 0" }}>No sales yet.</p>
            ) : (
              activity.map((item) => (
                <button
                  key={item.id}
                  className="pos-activity-row"
                  onClick={() => setReviewedActivity(item)}
                  type="button"
                >
                  <div>
                    <p>{item.item}</p>
                    <span>{item.performedBy} • {item.time}</span>
                  </div>
                  <div className="pos-activity-meta">
                    <strong>{item.quantity} {item.quantity === 1 ? "unit" : "units"}</strong>
                    <span className="pill paid">Sold</span>
                  </div>
                </button>
              ))
            )}
          </div>

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
        </aside>
      </div>

      {reviewedActivity && (
        <div className="pos-modal" onClick={() => setReviewedActivity(null)}>
          <div className="pos-modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="pos-modal-header">
              <h3>Transaction History</h3>
              <button onClick={() => setReviewedActivity(null)}><X size={16} /></button>
            </div>
            <div className="pos-modal-body">
              <div><strong>{reviewedActivity.item}</strong></div>
              <div>Cashier: {reviewedActivity.performedBy}</div>
              <div>Units: {reviewedActivity.quantity}</div>
              <div>Total Amount: ₱{(reviewedActivity.totalAmount ?? 0).toLocaleString()}</div>
              <div>Time: {reviewedActivity.date} • {reviewedActivity.time}</div>
              {reviewedActivity.items?.length > 0 && (
                <div className="pos-modal-items">
                  {reviewedActivity.items.map((item, index) => (
                    <div key={`${item.name}-${index}`} className="pos-modal-item">
                      <span className="pos-modal-name">{item.name}</span>
                      <span className="pos-modal-qty">{item.quantity}</span>
                      <span className="pos-modal-line">₱{((item.price ?? 0) * item.quantity).toLocaleString()}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div className="pos-modal-actions">
              <button className="pos-modal-btn" onClick={() => handlePrintActivityReceipt(reviewedActivity)}>Print receipt</button>
              <button className="pos-modal-btn" onClick={() => setReviewedActivity(null)}>Close</button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}