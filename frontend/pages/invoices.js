/* ================================================================
   VendorBridge — Invoices Page
   ================================================================ */

Pages.invoices = {
  async render() {
    const content = document.getElementById('page-content');
    content.innerHTML = `
    <div class="page-header">
      <div class="page-header-left">
        <h1>Invoices</h1>
        <p>Generate, download, print, and email vendor invoices</p>
      </div>
    </div>

    <!-- Stats -->
    <div id="inv-stats" style="display:flex;gap:16px;flex-wrap:wrap;margin-bottom:24px;"></div>

    <!-- Filters -->
    <div class="filter-bar">
      <select class="form-select" id="inv-status-filter" style="width:150px;">
        <option value="">All Status</option>
        <option value="generated">Generated</option>
        <option value="sent">Sent</option>
        <option value="paid">Paid</option>
        <option value="overdue">Overdue</option>
      </select>
    </div>

    <div id="invoices-content"></div>
    `;

    await Promise.all([this._loadStats(), this.loadInvoices()]);
    document.getElementById('inv-status-filter')?.addEventListener('change', () => this.loadInvoices());
  },

  async _loadStats() {
    try {
      const res = await api.invoices.stats();
      if (!res?.data) return;
      const d = res.data;
      document.getElementById('inv-stats').innerHTML = [
        { label: 'Total Invoices', value: d.total, color: '#674636' },
        { label: 'Paid', value: d.paid, color: '#16a34a' },
        { label: 'Pending', value: d.pending, color: '#f59e0b' },
        { label: 'Total Value', value: Utils.currency(d.total_value), color: '#2563eb' },
      ].map(s => `
        <div style="display:flex;align-items:center;gap:10px;background:white;border:1px solid var(--clr-border);
          border-radius:var(--radius-md);padding:12px 16px;">
          <span style="font-size:20px;font-weight:800;color:${s.color};font-family:'Outfit',sans-serif;">${s.value}</span>
          <span style="font-size:12px;color:var(--clr-text-secondary);">${s.label}</span>
        </div>
      `).join('');
    } catch {}
  },

  async loadInvoices() {
    const status = document.getElementById('inv-status-filter')?.value || '';
    const params = `?${status?`status=${status}&`:''}per_page=30`;
    const content = document.getElementById('invoices-content');
    content.innerHTML = '<div class="page-loader"><div class="spinner"></div></div>';

    try {
      const res = await api.invoices.list(params);
      const invoices = res?.data?.invoices || [];

      if (!invoices.length) {
        content.innerHTML = `<div class="empty-state">
          <div class="empty-state-icon">🧾</div>
          <h3>No invoices found</h3>
          <p>Invoices are generated from Purchase Orders. Go to Purchase Orders to create your first invoice.</p>
          <button class="btn btn-secondary" onclick="Router.go('#/purchase-orders')">View Purchase Orders</button>
        </div>`;
        return;
      }

      content.innerHTML = `
      <div class="grid-2">
        ${invoices.map(inv => this._invoiceCard(inv)).join('')}
      </div>`;
    } catch (err) {
      content.innerHTML = `<div class="empty-state"><div class="empty-state-icon">⚠️</div><h3>${err.message}</h3></div>`;
    }
  },

  _invoiceCard(inv) {
    return `
    <div class="card" style="border-top:4px solid var(--clr-primary);">
      <!-- Invoice header -->
      <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:16px;">
        <div>
          <div style="font-size:10px;color:var(--clr-text-muted);margin-bottom:2px;">INVOICE</div>
          <div style="font-family:monospace;font-size:16px;font-weight:800;color:var(--clr-primary);">${Utils.escape(inv.invoice_number)}</div>
        </div>
        ${Utils.statusBadge(inv.status)}
      </div>

      <!-- Invoice details -->
      <div style="background:var(--clr-surface);border-radius:var(--radius-md);padding:12px;margin-bottom:16px;">
        <div class="invoice-meta">
          <div class="invoice-meta-item">
            <label>Vendor</label>
            <span>${Utils.escape(inv.vendor_name||'N/A')}</span>
          </div>
          <div class="invoice-meta-item">
            <label>PO Reference</label>
            <span>${Utils.escape(inv.po_number||'N/A')}</span>
          </div>
          <div class="invoice-meta-item">
            <label>Generated</label>
            <span>${Utils.date(inv.generated_at)}</span>
          </div>
          <div class="invoice-meta-item">
            <label>Due Date</label>
            <span>${Utils.date(inv.due_date)}</span>
          </div>
        </div>

        <div style="border-top:1px solid var(--clr-border);padding-top:10px;margin-top:4px;">
          <div class="invoice-total-row">
            <span style="color:var(--clr-text-muted);">Subtotal</span>
            <span>${Utils.currency(inv.subtotal)}</span>
          </div>
          <div class="invoice-total-row">
            <span style="color:var(--clr-text-muted);">GST</span>
            <span>${Utils.currency(inv.tax_amount)}</span>
          </div>
          <div class="invoice-grand-total">
            <span>Total Payable</span>
            <span>${Utils.currency(inv.total_amount)}</span>
          </div>
        </div>
      </div>

      <!-- Email status -->
      ${inv.email_sent ? `
        <div style="display:flex;align-items:center;gap:6px;font-size:12px;color:var(--clr-green);margin-bottom:12px;">
          ✅ Emailed to vendor ${Utils.timeAgo(inv.email_sent_at)}
        </div>` : ''}

      <!-- Actions -->
      <div style="display:flex;gap:8px;flex-wrap:wrap;">
        <button onclick="Pages.invoices.downloadInvoice(${inv.id}, '${inv.invoice_number}')"
           class="btn btn-sm btn-secondary" title="Download PDF">
          📥 Download PDF
        </button>
        <button class="btn btn-sm btn-blue" onclick="Pages.invoices.printInvoice(${inv.id})"
                title="Print Invoice">
          🖨️ Print
        </button>
        <button class="btn btn-sm btn-primary" onclick="Pages.invoices.emailInvoice(${inv.id},'${Utils.escape(inv.vendor_email||'')}')"
                title="Email Invoice" ${inv.email_sent?'style="opacity:0.7;"':''}>
          📧 ${inv.email_sent ? 'Re-send' : 'Email'}
        </button>
        <select class="form-select" style="width:100px;padding:5px 8px;font-size:12px;"
                onchange="Pages.invoices.updateStatus(${inv.id}, this.value)">
          ${['generated','sent','paid','overdue','cancelled'].map(s =>
            `<option value="${s}" ${inv.status===s?'selected':''}>${s}</option>`
          ).join('')}
        </select>
      </div>
    </div>`;
  },

  async emailInvoice(id, vendorEmail) {
    Modal.confirm({
      title: '📧 Send Invoice Email',
      message: `Send invoice PDF to <strong>${vendorEmail}</strong>?`,
      confirmText: '📧 Send Email',
      confirmClass: 'btn-primary',
      onConfirm: async () => {
        try {
          await api.invoices.email(id);
          Toast.success('Email sent!', 'Invoice emailed to vendor');
          await this.loadInvoices();
        } catch (err) {
          Toast.error('Email failed', err.message || 'Check email configuration in .env');
        }
      }
    });
  },

  async downloadInvoice(id, invNumber) {
    try {
      Toast.info('Downloading PDF...');
      const res = await fetch(`${API_BASE}/invoices/${id}/download`, {
        headers: api._getHeaders()
      });
      if (!res.ok) throw new Error('Failed to download invoice');
      
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${invNumber}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      Toast.error('Download failed', err.message);
    }
  },

  async printInvoice(id) {
    try {
      const res = await fetch(`${API_BASE}/invoices/${id}/download`, {
        headers: api._getHeaders()
      });
      if (!res.ok) throw new Error('Failed to fetch invoice for printing');
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const printWindow = window.open(url, '_blank');
      if (printWindow) {
        printWindow.onload = () => {
          printWindow.print();
        };
      }
    } catch (err) {
      Toast.error('Print failed', err.message);
    }
  },

  async updateStatus(id, status) {
    try {
      await api.invoices.status(id, status);
      Toast.success('Status updated');
      if (status === 'paid') {
        Toast.info('Invoice paid', 'Marked as paid!');
      }
      await this._loadStats();
    } catch (err) {
      Toast.error('Update failed', err.message);
    }
  }
};
