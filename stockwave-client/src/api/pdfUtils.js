// ── Export Reports as PDF ──────────────────────────
export function exportReportsPDF(summary, categoryData, stockMovement, topProducts) {
  const date = new Date().toLocaleDateString("en-PH", {
    year: "numeric", month: "long", day: "numeric"
  });

  const categoryRows = categoryData.map(c => `
    <tr>
      <td>${c.name}</td>
      <td>${c.value} units</td>
      <td>₱${(c.totalValue ?? 0).toLocaleString()}</td>
    </tr>
  `).join("");

  const topRows = topProducts.map((p, i) => `
    <tr>
      <td>#${i + 1}</td>
      <td>${p.name}</td>
      <td>${p.category}</td>
      <td>${p.totalSold}</td>
      <td>${p.stock}</td>
    </tr>
  `).join("");

  // Profit vs Revenue rows (estimated profit from POS tax-adjusted sales)
  const movementRows = stockMovement.map(m => {
    const revenue = m.revenue ?? 0;
    const profit  = m.profit  ?? 0;
    const margin  = revenue > 0 ? ((profit / revenue) * 100).toFixed(1) + "%" : "—";
    return `
      <tr>
        <td>${m.month}</td>
        <td style="color:#1a6b3c;font-weight:600">₱${revenue.toLocaleString()}</td>
        <td style="color:#6366f1;font-weight:600">₱${profit.toLocaleString()}</td>
        <td>${margin}</td>
      </tr>
    `;
  }).join("");

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8"/>
      <title>StockWave Report — ${date}</title>
      <style>
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { font-family: 'Segoe UI', sans-serif; color: #111827; padding: 40px; font-size: 13px; }
        .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 32px; border-bottom: 2px solid #1a6b3c; padding-bottom: 20px; }
        .logo { font-size: 24px; font-weight: 700; color: #1a6b3c; }
        .logo span { color: #9ca3af; }
        .report-meta { text-align: right; color: #6b7280; font-size: 12px; line-height: 1.8; }
        h2 { font-size: 16px; font-weight: 700; color: #111827; margin: 28px 0 12px; border-left: 4px solid #1a6b3c; padding-left: 10px; }
        .stats-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; margin-bottom: 8px; }
        .stat-box { background: #f7f8fa; border: 1px solid #e5e7eb; border-radius: 10px; padding: 14px 16px; }
        .stat-box .label { font-size: 11px; color: #9ca3af; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 6px; }
        .stat-box .value { font-size: 22px; font-weight: 700; color: #111827; }
        .stat-box.green .value { color: #1a6b3c; }
        table { width: 100%; border-collapse: collapse; margin-top: 4px; }
        th { text-align: left; padding: 10px 12px; font-size: 11px; font-weight: 600; color: #9ca3af; text-transform: uppercase; letter-spacing: 0.5px; border-bottom: 2px solid #e5e7eb; background: #f9fafb; }
        td { padding: 10px 12px; font-size: 13px; color: #374151; border-bottom: 1px solid #f3f4f6; }
        tr:last-child td { border-bottom: none; }
        tr:hover td { background: #f9fafb; }
        .footer { margin-top: 48px; padding-top: 16px; border-top: 1px solid #e5e7eb; text-align: center; color: #9ca3af; font-size: 11px; }
        @media print {
          body { padding: 20px; }
          .no-print { display: none; }
        }
      </style>
    </head>
    <body>
      <div class="header">
        <div>
          <div class="logo">Stock<span>Wave</span></div>
          <div style="color:#6b7280;font-size:12px;margin-top:4px">Touchless Inventory Management System</div>
        </div>
        <div class="report-meta">
          <strong>Inventory Report</strong><br/>
          Generated: ${date}<br/>
          Prepared by: ${JSON.parse(localStorage.getItem("user") || "{}").fullName || "Admin"}
        </div>
      </div>

      <h2>Summary Overview</h2>
      <div class="stats-grid">
        <div class="stat-box green">
          <div class="label">Total Stock Value</div>
          <div class="value">₱${(summary?.totalStockValue ?? 0).toLocaleString()}</div>
        </div>
        <div class="stat-box">
          <div class="label">Total Products</div>
          <div class="value">${summary?.totalProducts ?? 0}</div>
        </div>
        <div class="stat-box">
          <div class="label">Items Added (Month)</div>
          <div class="value">${summary?.itemsAddedThisMonth ?? 0}</div>
        </div>
        <div class="stat-box">
          <div class="label">Items Sold (Month)</div>
          <div class="value">${summary?.itemsSoldThisMonth ?? 0}</div>
        </div>
      </div>

      ${categoryRows ? `
      <h2>Stock by Category</h2>
      <table>
        <thead><tr><th>Category</th><th>Total Stock</th><th>Est. Value</th></tr></thead>
        <tbody>${categoryRows}</tbody>
      </table>` : ""}

      ${movementRows ? `
      <h2>Profit vs Revenue (Last 6 Months)</h2>
      <table>
        <thead><tr><th>Month</th><th>Revenue</th><th>Profit</th><th>Margin</th></tr></thead>
        <tbody>${movementRows}</tbody>
      </table>` : ""}

      ${topRows ? `
      <h2>Top Selling Products</h2>
      <table>
        <thead><tr><th>#</th><th>Product</th><th>Category</th><th>Total Sold</th><th>Current Stock</th></tr></thead>
        <tbody>${topRows}</tbody>
      </table>` : ""}

      <div class="footer">
        StockWave &copy; ${new Date().getFullYear()} — Touchless Inventory Management System — Report generated on ${date}
      </div>
    </body>
    </html>
  `;

  const win = window.open("", "_blank");
  win.document.write(html);
  win.document.close();
  win.onload = () => {
    win.focus();
    win.print();
  };
}

// ── Generate Restock Order PDF ─────────────────────
export function generateRestockOrder(lowStockItems) {
  const date = new Date().toLocaleDateString("en-PH", {
    year: "numeric", month: "long", day: "numeric"
  });
  const user = JSON.parse(localStorage.getItem("user") || "{}");

  if (lowStockItems.length === 0) {
    alert("No low stock items to restock!");
    return;
  }

  const rows = lowStockItems.map((item, i) => `
    <tr>
      <td>${i + 1}</td>
      <td><strong>${item.name}</strong></td>
      <td>${item.category}</td>
      <td style="color:#ef4444;font-weight:700">${item.stock} ${item.unit}</td>
      <td style="color:#1a6b3c;font-weight:700">${Math.max(50 - item.stock, 10)}</td>
      <td>₱${(item.price ?? 0).toLocaleString()}</td>
      <td>₱${((item.price ?? 0) * Math.max(50 - item.stock, 10)).toLocaleString()}</td>
      <td style="border: 1px solid #e5e7eb; min-width: 120px;">&nbsp;</td>
    </tr>
  `).join("");

  const totalEstimate = lowStockItems.reduce((sum, item) => {
    return sum + ((item.price ?? 0) * Math.max(50 - item.stock, 10));
  }, 0);

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8"/>
      <title>Restock Order — ${date}</title>
      <style>
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { font-family: 'Segoe UI', sans-serif; color: #111827; padding: 40px; font-size: 13px; }

        .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 32px; }
        .logo { font-size: 26px; font-weight: 700; color: #1a6b3c; }
        .logo span { color: #9ca3af; }
        .doc-title { font-size: 13px; color: #6b7280; margin-top: 4px; }

        .order-info { background: #f7f8fa; border: 1px solid #e5e7eb; border-radius: 10px; padding: 16px 20px; margin-bottom: 28px; display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 12px; }
        .info-item .label { font-size: 11px; color: #9ca3af; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 4px; }
        .info-item .value { font-size: 13px; font-weight: 600; color: #111827; }

        .alert-box { background: #fef3c7; border: 1px solid #fde68a; border-radius: 8px; padding: 12px 16px; margin-bottom: 20px; font-size: 13px; color: #92400e; }

        table { width: 100%; border-collapse: collapse; margin-bottom: 24px; }
        th { text-align: left; padding: 10px 12px; font-size: 11px; font-weight: 600; color: #6b7280; text-transform: uppercase; letter-spacing: 0.5px; background: #f9fafb; border: 1px solid #e5e7eb; }
        td { padding: 11px 12px; font-size: 13px; color: #374151; border-bottom: 1px solid #f3f4f6; }
        tr:last-child td { border-bottom: 1px solid #e5e7eb; }

        .total-row { background: #f0faf5; font-weight: 700; }
        .total-row td { color: #1a6b3c; border-top: 2px solid #1a6b3c; }

        .signatures { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 32px; margin-top: 48px; }
        .sig-box { border-top: 1px solid #374151; padding-top: 8px; }
        .sig-label { font-size: 11px; color: #6b7280; text-align: center; }
        .sig-name { font-size: 12px; font-weight: 600; color: #111827; text-align: center; margin-bottom: 24px; }

        .footer { margin-top: 32px; padding-top: 16px; border-top: 1px solid #e5e7eb; text-align: center; color: #9ca3af; font-size: 11px; }

        @media print { body { padding: 20px; } }
      </style>
    </head>
    <body>
      <div class="header">
        <div>
          <div class="logo">Stock<span>Wave</span></div>
          <div class="doc-title">Touchless Inventory Management System</div>
        </div>
        <div style="text-align:right">
          <div style="font-size:20px;font-weight:700;color:#111827">RESTOCK ORDER</div>
          <div style="font-size:12px;color:#6b7280;margin-top:4px">RO-${Date.now().toString().slice(-6)}</div>
        </div>
      </div>

      <div class="order-info">
        <div class="info-item">
          <div class="label">Date Issued</div>
          <div class="value">${date}</div>
        </div>
        <div class="info-item">
          <div class="label">Requested By</div>
          <div class="value">${user.fullName || "Admin"}</div>
        </div>
        <div class="info-item">
          <div class="label">Total Items</div>
          <div class="value">${lowStockItems.length} products</div>
        </div>
      </div>

      <div class="alert-box">
        The following items have fallen below minimum stock levels and require immediate restocking.
      </div>

      <table>
        <thead>
          <tr>
            <th>#</th>
            <th>Product Name</th>
            <th>Category</th>
            <th>Current Stock</th>
            <th>Order Qty</th>
            <th>Unit Price</th>
            <th>Est. Total</th>
            <th>Supplier / Notes</th>
          </tr>
        </thead>
        <tbody>
          ${rows}
          <tr class="total-row">
            <td colspan="6" style="text-align:right">Total Estimated Cost:</td>
            <td>₱${totalEstimate.toLocaleString()}</td>
            <td></td>
          </tr>
        </tbody>
      </table>

      <div class="signatures">
        <div class="sig-box">
          <div class="sig-name">${user.fullName || "Admin"}</div>
          <div class="sig-label">Requested By</div>
        </div>
        <div class="sig-box">
          <div class="sig-name">&nbsp;</div>
          <div class="sig-label">Approved By</div>
        </div>
        <div class="sig-box">
          <div class="sig-name">&nbsp;</div>
          <div class="sig-label">Received By</div>
        </div>
      </div>

      <div class="footer">
        StockWave &copy; ${new Date().getFullYear()} — This restock order was generated automatically on ${date}
      </div>
    </body>
    </html>
  `;

  const win = window.open("", "_blank");
  win.document.write(html);
  win.document.close();
  win.onload = () => {
    win.focus();
    win.print();
  };
}