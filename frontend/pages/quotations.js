/* ================================================================
   VendorBridge — Quotations Page
   ================================================================ */

Pages.quotations = {
  _rfqs: [], _vendors: [],

  async render() {
    const content = document.getElementById('page-content');
    const params = new URLSearchParams(window.location.hash.split('?')[1] || '');
    const rfqIdParam = params.get('rfq_id');

    content.innerHTML = `
    <div class="page-header">
      <div class="page-header-left">
        <h1>Quotations</h1>
        <p>Manage vendor quotations for RFQs</p>
      </div>
      <div class="page-header-actions">
        <button class="btn btn-primary" onclick="Pages.quotations.openAddModal()">➕ Add Quotation</button>
      </div>
    </div>

    <div class="filter-bar">
      <select class="form-select" id="q-rfq-filter" style="min-width:220px;">
        <option value="">All RFQs</option>
      </select>
      <select class="form-select" id="q-status-filter" style="width:150px;">
        <option value="">All Status</option>
        <option value="submitted">Submitted</option>
        <option value="under_review">Under Review</option>
        <option value="shortlisted">Shortlisted</option>
        <option value="accepted">Accepted</option>
        <option value="rejected">Rejected</option>
      </select>
    </div>

    <div id="quotations-content"></div>
    `;

    await this._loadSelects(rfqIdParam);
    await this.loadQuotations();
    this._setupFilters();
  },

  async _loadSelects(rfqIdParam) {
    try {
      const [rfqRes, vendorRes] = await Promise.all([
        api.rfqs.list('?per_page=100'),
        api.vendors.list('?per_page=100&status=active')
      ]);
      this._rfqs = rfqRes?.data?.rfqs || [];
      this._vendors = vendorRes?.data?.vendors || [];

      const rfqSel = document.getElementById('q-rfq-filter');
      if (rfqSel) {
        this._rfqs.forEach(r => {
          rfqSel.innerHTML += `<option value="${r.id}" ${rfqIdParam==r.id?'selected':''}>${r.rfq_number} — ${r.title}</option>`;
        });
      }
    } catch {}
  },

  async loadQuotations() {
    const rfqId  = document.getElementById('q-rfq-filter')?.value || '';
    const status = document.getElementById('q-status-filter')?.value || '';
    const params = `?${rfqId?`rfq_id=${rfqId}&`:''}${status?`status=${status}`:''}&per_page=50`;
    const content = document.getElementById('quotations-content');
    content.innerHTML = '<div class="page-loader"><div class="spinner"></div></div>';

    try {
      const res = await api.quotations.list(params);
      const quotations = res?.data?.quotations || [];

      if (!quotations.length) {
        content.innerHTML = `<div class="empty-state">
          <div class="empty-state-icon">💬</div>
          <h3>No quotations found</h3>
          <p>Quotations will appear here when vendors submit their pricing for RFQs</p>
          <button class="btn btn-primary" onclick="Pages.quotations.openAddModal()">Add Quotation</button>
        </div>`;
        return;
      }

      content.innerHTML = `
      <div class="table-container">
        <table class="data-table">
          <thead><tr>
            <th>RFQ</th><th>Vendor</th><th>Price</th><th>Tax</th>
            <th>Total</th><th>Delivery (days)</th><th>Status</th><th>Actions</th>
          </tr></thead>
          <tbody>
            ${quotations.map(q => `
            <tr>
              <td><span style="font-family:monospace;font-size:12px;color:var(--clr-text-muted);">RFQ#${q.rfq_id}</span></td>
              <td><strong>${Utils.escape(q.vendor?.company_name||'N/A')}</strong></td>
              <td>${Utils.currency(q.price)}</td>
              <td>${q.tax_percentage}%</td>
              <td><strong>${Utils.currency(q.total_price)}</strong></td>
              <td>${q.delivery_days} days</td>
              <td>${Utils.statusBadge(q.status)}</td>
              <td><div class="table-actions">
                <button class="btn btn-sm btn-secondary" onclick="Pages.quotations.openEditModal(${q.id})">✏️</button>
                <button class="btn btn-sm btn-green" onclick="Pages.quotations.sendForApproval(${q.id})">✅ Approve</button>
                <button class="btn btn-sm btn-red" onclick="Pages.quotations.deleteQuotation(${q.id})">🗑</button>
              </div></td>
            </tr>`).join('')}
          </tbody>
        </table>
      </div>`;
    } catch (err) {
      content.innerHTML = `<div class="empty-state"><div class="empty-state-icon">⚠️</div><h3>${err.message}</h3></div>`;
    }
  },

  _quotationForm(q = {}) {
    const rfqOptions = this._rfqs.map(r =>
      `<option value="${r.id}" ${q.rfq_id==r.id?'selected':''}>${r.rfq_number} — ${r.title}</option>`).join('');
    const vendorOptions = this._vendors.map(v =>
      `<option value="${v.id}" ${q.vendor_id==v.id?'selected':''}>${v.company_name}</option>`).join('');

    return `<form id="quotation-form">
      <div class="form-row-2">
        <div class="form-group">
          <label class="form-label">RFQ <span class="required">*</span></label>
          <select class="form-select" name="rfq_id" required>
            <option value="">Select RFQ</option>${rfqOptions}
          </select>
        </div>
        <div class="form-group">
          <label class="form-label">Vendor <span class="required">*</span></label>
          <select class="form-select" name="vendor_id" required>
            <option value="">Select Vendor</option>${vendorOptions}
          </select>
        </div>
      </div>
      <div class="form-row-3">
        <div class="form-group">
          <label class="form-label">Price (₹) <span class="required">*</span></label>
          <input class="form-input" name="price" type="number" step="0.01" value="${q.price||''}" placeholder="50000" required />
        </div>
        <div class="form-group">
          <label class="form-label">GST %</label>
          <input class="form-input" name="tax_percentage" type="number" step="0.01" value="${q.tax_percentage||18}" />
        </div>
        <div class="form-group">
          <label class="form-label">Delivery (days) <span class="required">*</span></label>
          <input class="form-input" name="delivery_days" type="number" value="${q.delivery_days||''}" placeholder="14" required />
        </div>
      </div>
      <div class="form-row-2">
        <div class="form-group">
          <label class="form-label">Validity (days)</label>
          <input class="form-input" name="validity_days" type="number" value="${q.validity_days||30}" />
        </div>
        <div class="form-group">
          <label class="form-label">Status</label>
          <select class="form-select" name="status">
            <option value="submitted" ${(q.status||'submitted')==='submitted'?'selected':''}>Submitted</option>
            <option value="under_review" ${q.status==='under_review'?'selected':''}>Under Review</option>
            <option value="shortlisted" ${q.status==='shortlisted'?'selected':''}>Shortlisted</option>
          </select>
        </div>
      </div>
      <div class="form-group">
        <label class="form-label">Notes</label>
        <textarea class="form-textarea" name="notes" rows="2" placeholder="Special terms or conditions...">${Utils.escape(q.notes||'')}</textarea>
      </div>
    </form>`;
  },

  openAddModal() {
    Modal.open({
      id: 'q-modal', title: '💬 Add Quotation', size: 'modal-lg',
      body: this._quotationForm(),
      footer: `
        <button class="btn btn-secondary" onclick="Modal.close('q-modal')">Cancel</button>
        <button class="btn btn-primary" onclick="Pages.quotations.saveQuotation()">Submit Quotation</button>
      `
    });
  },

  async openEditModal(id) {
    const res = await api.quotations.get(id);
    if (!res?.data) return;
    Modal.open({
      id: 'q-modal', title: '✏️ Edit Quotation', size: 'modal-lg',
      body: this._quotationForm(res.data),
      footer: `
        <button class="btn btn-secondary" onclick="Modal.close('q-modal')">Cancel</button>
        <button class="btn btn-primary" onclick="Pages.quotations.saveQuotation(${id})">Update</button>
      `
    });
  },

  async saveQuotation(id = null) {
    const form = document.getElementById('quotation-form');
    if (!form) return;
    const data = Utils.getFormData(form);
    const btn = document.querySelector('#q-modal .modal-footer .btn-primary');
    Utils.showLoading(btn);
    try {
      if (id) {
        await api.quotations.update(id, data);
        Toast.success('Quotation updated');
      } else {
        await api.quotations.create(data);
        Toast.success('Quotation submitted');
      }
      Modal.close('q-modal');
      await this.loadQuotations();
    } catch (err) {
      Toast.error('Save failed', err.message);
    } finally {
      Utils.hideLoading(btn);
    }
  },

  async sendForApproval(quotationId) {
    try {
      await api.approvals.create({ quotation_id: quotationId, remarks: 'Submitted for approval' });
      Toast.success('Sent for approval', 'Quotation is now under review');
      await this.loadQuotations();
    } catch (err) {
      Toast.error('Failed', err.message);
    }
  },

  deleteQuotation(id) {
    Modal.confirm({
      title: 'Delete Quotation',
      message: 'Are you sure? This action cannot be undone.',
      confirmText: 'Delete',
      onConfirm: async () => {
        try {
          await api.quotations.delete(id);
          Toast.success('Quotation deleted');
          await this.loadQuotations();
        } catch (err) {
          Toast.error('Delete failed', err.message);
        }
      }
    });
  },

  _setupFilters() {
    document.getElementById('q-rfq-filter')?.addEventListener('change', () => this.loadQuotations());
    document.getElementById('q-status-filter')?.addEventListener('change', () => this.loadQuotations());
  }
};
