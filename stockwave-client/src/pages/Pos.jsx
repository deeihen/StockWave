import { useState } from "react";
import "./Pos.css";
import {
  Search,
  ScanBarcode,
  Sparkles,
  CreditCard,
  PlusCircle,
  Minus,
  Plus,
  Clock,
  UserRound
} from "lucide-react";

const products = [
  { id: 1, name: "Smart Shelf Tag", sku: "SHELF-221", price: 1240, stock: 48 },
  { id: 2, name: "Thermal Roll Pack", sku: "THERM-118", price: 320, stock: 120 },
  { id: 3, name: "Wireless Scanner", sku: "SCAN-031", price: 8420, stock: 18 },
  { id: 4, name: "POS Tablet Stand", sku: "STND-414", price: 2140, stock: 32 },
  { id: 5, name: "Inventory Hub", sku: "HUB-982", price: 12600, stock: 6 },
  { id: 6, name: "Receipt Printer", sku: "PRINT-205", price: 6890, stock: 9 }
];

const cartItems = [
  { id: 1, name: "Wireless Scanner", qty: 1, price: 8420 },
  { id: 2, name: "Thermal Roll Pack", qty: 2, price: 320 },
  { id: 3, name: "POS Tablet Stand", qty: 1, price: 2140 }
];

const activity = [
  { id: 1, label: "Invoice #1293", time: "2 min ago", amount: 12480, status: "Paid" },
  { id: 2, label: "Refund #1291", time: "18 min ago", amount: -840, status: "Approved" },
  { id: 3, label: "Invoice #1289", time: "32 min ago", amount: 6420, status: "Paid" }
];

export default function Pos() {
  const [search, setSearch] = useState("");

  const filtered = products.filter((p) =>
    p.name.toLowerCase().includes(search.toLowerCase()) ||
    p.sku.toLowerCase().includes(search.toLowerCase())
  );

  const subtotal = cartItems.reduce((sum, item) => sum + item.price * item.qty, 0);
  const tax = Math.round(subtotal * 0.07);
  const total = subtotal + tax;

  return (
    <div className="pos-root">
      <div className="pos-header">
        <div>
          <h1 className="pos-title">Point of Sale</h1>
          <p className="pos-sub">Fast checkout with live inventory sync and AI pricing hints.</p>
        </div>
        <div className="pos-header-actions">
          <div className="pos-search">
            <Search size={16} />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search products, SKUs, or barcodes"
            />
          </div>
          <button className="pos-action"><ScanBarcode size={16} /> Scan</button>
          <button className="pos-action primary"><Sparkles size={16} /> Smart Price</button>
        </div>
      </div>

      <div className="pos-layout">
        <section className="pos-main">
          <div className="pos-kpis">
            <div className="pos-kpi">
              <p>Active Register</p>
              <h3>POS-01</h3>
              <span>Ready</span>
            </div>
            <div className="pos-kpi">
              <p>Queue Time</p>
              <h3>01:12</h3>
              <span>2 waiting</span>
            </div>
            <div className="pos-kpi">
              <p>Items Scanned</p>
              <h3>14</h3>
              <span>Last 10 min</span>
            </div>
          </div>

          <div className="pos-product-grid">
            {filtered.map((product) => (
              <div key={product.id} className="pos-card">
                <div className="pos-card-top">
                  <div className="pos-thumb" />
                  <span className={product.stock <= 10 ? "pos-stock low" : "pos-stock"}>
                    {product.stock} in stock
                  </span>
                </div>
                <h4>{product.name}</h4>
                <p className="pos-sku">{product.sku}</p>
                <div className="pos-card-bottom">
                  <span className="pos-price">₱{product.price.toLocaleString()}</span>
                  <button className="pos-add"><PlusCircle size={14} /> Add</button>
                </div>
              </div>
            ))}
          </div>
        </section>

        <aside className="pos-side">
          <div className="cashier-card">
            <div className="cashier-avatar">LS</div>
            <div>
              <p className="cashier-name">Lana Santos</p>
              <p className="cashier-shift">Morning Shift • 08:00 - 16:00</p>
            </div>
            <span className="cashier-status">On Duty</span>
          </div>

          <div className="pos-activity">
            <div className="pos-activity-header">
              <h4>Transaction Activity</h4>
              <span>Today</span>
            </div>
            {activity.map((item) => (
              <div key={item.id} className="pos-activity-row">
                <div>
                  <p>{item.label}</p>
                  <span>{item.time}</span>
                </div>
                <div className="pos-activity-meta">
                  <strong>{item.amount < 0 ? "-" : ""}₱{Math.abs(item.amount).toLocaleString()}</strong>
                  <span className={item.status === "Paid" ? "pill paid" : "pill refund"}>{item.status}</span>
                </div>
              </div>
            ))}
          </div>

          <div className="pos-cart">
            <p className="cart-title">Live Cart</p>
            {cartItems.map((item) => (
              <div key={item.id} className="cart-row">
                <span>{item.name}</span>
                <div className="cart-qty">
                  <button><Minus size={12} /></button>
                  <span>{item.qty}</span>
                  <button><Plus size={12} /></button>
                </div>
              </div>
            ))}
            <button className="checkout-btn">Charge ₱{total.toLocaleString()}</button>
          </div>

          <div className="receipt-preview">
            <p className="receipt-title">Receipt Preview</p>
            <div className="receipt-line"><span>Subtotal</span><strong>₱{subtotal.toLocaleString()}</strong></div>
            <div className="receipt-line"><span>Tax</span><strong>₱{tax.toLocaleString()}</strong></div>
            <div className="receipt-total"><span>Total</span><strong>₱{total.toLocaleString()}</strong></div>
            <button className="receipt-btn">Send receipt</button>
          </div>

          <div className="payment-sheet">
            <p className="payment-title">Payment</p>
            <div className="payment-methods">
              <button><CreditCard size={14} /> Card</button>
              <button>Wallet</button>
              <button>Split</button>
            </div>
            <div className="payment-status">Terminal online • Ready to process</div>
          </div>

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

      <div className="pos-quick-actions">
        <button><Plus size={14} /> New Order</button>
        <button><ScanBarcode size={14} /> Scan Item</button>
        <button><CreditCard size={14} /> Charge</button>
      </div>
    </div>
  );
}
