/* ================================================================
   VendorBridge — Purchase Orders Page
   ================================================================ */

Pages.purchaseOrders = {
  async render() {
    const content = document.getElementById('page-content');
    content.innerHTML = `
    <div class="page-header">
      <div class="page-header-left">
        <h1>Purchase Orders</h1>
        <p>Track and manage all purchase orders</p>
      </div>
    </div>

    <!-- Stats -->
    <div id="po-stats" style="display:flex;gap:16px;flex-wrap:wrap;margin-bottom:24px;"></div>

    <!-- Filter bar -->
    <div class="filter-bar">
      <select class="form-select" id="po-status-filter" style="width:160px;">
        <option value="">All Status</option>
        <option value="issued">Issued</option>
        <option value="acknowledged">Acknowledged</option>
        <option value="in_progress">In Progress</option>
        <option value="delivered">Delivered</option>
        <option value="cancelled">Cancelled</option>
      </select>
    </div>

    <div id="po-content"></div>
    `;

    await Promise.all([this._loadStats(), this.loadPOs()]);
    document.getElementById('po-status-filter')?.addEventListener('change', () => this.loadPOs());
  },

  async _loadStats() {
    try {
      const res = await api.purchaseOrders.stats();
      if (!res?.data) return;
      const d = res.data;
      document.getElementById('po-stats').innerHTML = [
        { label: 'Total POs', value: d.total, color: '#674636' },
        { label: 'Total Spend', value: Utils.currency(d.total_spend), color: '#2563eb' },
        { label: 'Delivered', value: d.by_status?.delivered || 0, color: '#16a34a' },
        { label: 'In Progress', value: d.by_status?.in_progress || 0, color: '#f59e0b' },
      ].map(s => `
        <div style="display:flex;align-items:center;gap:10px;background:white;border:1px solid var(--clr-border);
          border-radius:var(--radius-md);padding:12px 16px;">
          <span style="font-size:20px;font-weight:800;color:${s.color};font-family:'Outfit',sans-serif;">${s.value}</span>
          <span style="font-size:12px;color:var(--clr-text-secondary);">${s.label}</span>
        </div>
      `).join('');
    } catch {}
  },

  async loadPOs() {
    const status = document.getElementById('po-status-filter')?.value || '';
    const params = `?${status?`status=${status}&`:''}per_page=30`;
    const content = document.getElementById('po-content');
    content.innerHTML = '<div class="page-loader"><div class="spinner"></div></div>';

    try {
      const res = await api.purchaseOrders.list(params);
      const pos = res?.data?.purchase_orders || [];

      if (!pos.length) {
        content.innerHTML = `<div class="empty-state">
          <div class="empty-state-icon">📄</div>
          <h3>No purchase orders yet</h3>
          <p>Purchase orders are created when quotations are approved. Go to Approvals to create your first PO.</p>
          <button class="btn btn-secondary" onclick="Router.go('#/approvals')">Go to Approvals</button>
        </div>`;
        return;
      }

      content.innerHTML = `
      <div class="table-container">
        <table class="data-table">
          <thead><tr>
            <th>PO Number</th><th>Vendor</th><th>Subtotal</th><th>Tax</th>
            <th>Total</th><th>Status</th><th>Expected Delivery</th><th>Actions</th>
          </tr></thead>
          <tbody>
            ${pos.map(po => `
            <tr>
              <td><span style="font-family:monospace;font-weight:700;color:var(--clr-primary);">${Utils.escape(po.po_number)}</span><br>
                <small style="color:var(--clr-text-muted);">${Utils.date(po.created_at)}</small></td>
              <td><strong>${Utils.escape(po.vendor_name||'N/A')}</strong></td>
              <td>${Utils.currency(po.subtotal)}</td>
              <td>${Utils.currency(po.tax_amount)}</td>
              <td><strong>${Utils.currency(po.total_amount)}</strong></td>
              <td>${Utils.statusBadge(po.status)}</td>
              <td>${Utils.date(po.expected_delivery)}</td>
              <td><div class="table-actions">
                <select class="form-select" style="width:130px;padding:5px 8px;font-size:12px;"
                        onchange="Pages.purchaseOrders.updateStatus(${po.id}, this.value)">
                  ${['issued','acknowledged','in_progress','delivered','cancelled'].map(s =>
                    `<option value="${s}" ${po.status===s?'selected':''}>${s.replace(/_/g,' ')}</option>`
                  ).join('')}
                </select>
                ${!po.invoice_count ? `
                  <button class="btn btn-sm btn-blue" onclick="Pages.purchaseOrders.generateInvoice(${po.id})">🧾 Invoice</button>
                ` : `
                  <button class="btn btn-sm btn-secondary" onclick="Router.go('#/invoices')">🧾 View</button>
                `}
              </div></td>
            </tr>`).join('')}
          </tbody>
        </table>
      </div>`;
    } catch (err) {
      content.innerHTML = `<div class="empty-state"><div class="empty-state-icon">⚠️</div><h3>${err.message}</h3></div>`;
    }
  },

  async updateStatus(id, status) {
    try {
      await api.purchaseOrders.update(id, { status });
      Toast.success('Status updated', `PO status → ${status.replace(/_/g,' ')}`);
    } catch (err) {
      Toast.error('Update failed', err.message);
    }
  },

  async generateInvoice(poId) {
    Modal.confirm({
      title: '🧾 Generate Invoice',
      message: 'Generate an invoice PDF for this purchase order?',
      confirmText: '🧾 Generate',
      confirmClass: 'btn-blue',
      onConfirm: async () => {
        try {
          const res = await api.invoices.generate({ po_id: poId });
          if (res?.data) {
            Toast.success('Invoice generated!', `${res.data.invoice_number} created`);
            Router.go('#/invoices');
          }
        } catch (err) {
          Toast.error('Failed', err.message);
        }
      }
    });
  }
};
