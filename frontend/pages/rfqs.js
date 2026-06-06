/* ================================================================
   VendorBridge — RFQs Page
   ================================================================ */

Pages.rfqs = {
  _vendors: [],

  async render() {
    const content = document.getElementById('page-content');
    content.innerHTML = `
    <div class="page-header">
      <div class="page-header-left">
        <h1>RFQ Management</h1>
        <p>Create and manage Request for Quotations</p>
      </div>
      <div class="page-header-actions">
        <button class="btn btn-primary" onclick="Pages.rfqs.openCreateModal()">➕ Create RFQ</button>
      </div>
    </div>

    <!-- Status tabs -->
    <div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:20px;" id="rfq-tabs">
      ${['','draft','published','closed','awarded','cancelled'].map((s,i) =>
        `<button class="btn ${i===0?'btn-primary':'btn-secondary'} btn-sm" data-status="${s}" onclick="Pages.rfqs._filterStatus('${s}', this)">
          ${s || 'All RFQs'}
        </button>`
      ).join('')}
    </div>

    <!-- Filter bar -->
    <div class="filter-bar">
      <div class="search-input-wrap">
        <span class="search-icon">🔍</span>
        <input type="text" class="form-input" id="rfq-search" placeholder="Search RFQs..." />
      </div>
    </div>

    <div id="rfqs-content"></div>
    <div id="rfqs-pagination" class="pagination"></div>
    `;

    // Load vendors for form
    try {
      const vres = await api.vendors.list('?per_page=100&status=active');
      this._vendors = vres?.data?.vendors || [];
    } catch {}

    await this.loadRFQs();
    this._setupSearch();
  },

  _currentStatus: '',

  async _filterStatus(status, btn) {
    this._currentStatus = status;
    document.querySelectorAll('#rfq-tabs button').forEach(b => {
      b.className = `btn btn-secondary btn-sm`;
    });
    if (btn) btn.className = 'btn btn-primary btn-sm';
    await this.loadRFQs();
  },

  async loadRFQs() {
    const search = document.getElementById('rfq-search')?.value || '';
    const params = `?page=1&per_page=20${this._currentStatus ? `&status=${this._currentStatus}` : ''}${search ? `&search=${encodeURIComponent(search)}` : ''}`;
    const content = document.getElementById('rfqs-content');
    content.innerHTML = '<div class="page-loader"><div class="spinner"></div></div>';

    try {
      const res = await api.rfqs.list(params);
      const rfqs = res?.data?.rfqs || [];

      if (!rfqs.length) {
        content.innerHTML = `<div class="empty-state">
          <div class="empty-state-icon">📋</div>
          <h3>No RFQs found</h3>
          <p>Create your first Request for Quotation to start the procurement process</p>
          <button class="btn btn-primary" onclick="Pages.rfqs.openCreateModal()">Create RFQ</button>
        </div>`;
        return;
      }

      content.innerHTML = `<div class="grid-2">${rfqs.map(r => this._rfqCard(r)).join('')}</div>`;
    } catch (err) {
      content.innerHTML = `<div class="empty-state"><div class="empty-state-icon">⚠️</div><h3>${err.message}</h3></div>`;
    }
  },

  _rfqCard(r) {
    const deadlinePassed = r.deadline && new Date(r.deadline) < new Date();
    return `
    <div class="rfq-card">
      <div class="rfq-card-header">
        <span class="rfq-number">${Utils.escape(r.rfq_number)}</span>
        ${Utils.statusBadge(r.status)}
      </div>
      <div class="rfq-title">${Utils.escape(r.title)}</div>
      <div class="rfq-meta">
        ${r.category ? `<div class="rfq-meta-item">🏷 ${Utils.escape(r.category)}</div>` : ''}
        ${r.quantity ? `<div class="rfq-meta-item">📦 Quantity: ${r.quantity}</div>` : ''}
        <div class="rfq-meta-item" style="color:${deadlinePassed?'var(--clr-red)':'inherit'}">
          📅 Deadline: ${Utils.date(r.deadline)}
        </div>
        <div class="rfq-meta-item">💬 ${r.quotation_count || 0} quote(s)</div>
        ${r.vendors?.length ? `<div class="rfq-meta-item">🏢 ${r.vendors.length} vendor(s)</div>` : ''}
      </div>
      <div class="rfq-card-footer">
        <div style="display:flex;gap:6px;flex-wrap:wrap;">
          ${r.status === 'draft' || r.status === 'published' ? `<button class="btn btn-sm btn-secondary" onclick="Pages.rfqs.openEditModal(${r.id})">✏️ Edit</button>` : ''}
          <button class="btn btn-sm btn-blue" onclick="Router.go('#/quotations?rfq_id=${r.id}')">💬 Quotations</button>
          <button class="btn btn-sm btn-secondary" onclick="Router.go('#/comparison?rfq_id=${r.id}')">⚖️ Compare</button>
          <button class="btn btn-sm btn-red" onclick="Pages.rfqs.deleteRFQ(${r.id},'${Utils.escape(r.rfq_number)}')">🗑</button>
        </div>
      </div>
    </div>`;
  },

  _rfqForm(rfq = {}) {
    const vendorCheckboxes = this._vendors.map(v => `
      <label style="display:flex;align-items:center;gap:8px;padding:6px;border-radius:6px;cursor:pointer;font-size:13px;"
             class="hover-surface">
        <input type="checkbox" name="vendor_ids" value="${v.id}"
               ${(rfq.vendors||[]).some(rv=>rv.id===v.id)?'checked':''} />
        <span>${Utils.escape(v.company_name)}</span>
        <span class="badge badge-gray" style="margin-left:auto;">${Utils.escape(v.category)}</span>
      </label>
    `).join('');

    return `<form id="rfq-form">
      <div class="form-group">
        <label class="form-label">RFQ Title <span class="required">*</span></label>
        <input class="form-input" name="title" value="${Utils.escape(rfq.title||'')}" placeholder="e.g. Laptop Procurement Q1 2026" required />
      </div>
      <div class="form-row-2">
        <div class="form-group">
          <label class="form-label">Category</label>
          <select class="form-select" name="category">
            <option value="">Select Category</option>
            <option value="IT Equipment" ${rfq.category==='IT Equipment'?'selected':''}>IT Equipment</option>
            <option value="Office Supplies" ${rfq.category==='Office Supplies'?'selected':''}>Office Supplies</option>
            <option value="Construction" ${rfq.category==='Construction'?'selected':''}>Construction</option>
            <option value="Furniture" ${rfq.category==='Furniture'?'selected':''}>Furniture</option>
            <option value="Facilities Management" ${rfq.category==='Facilities Management'?'selected':''}>Facilities Management</option>
            <option value="Logistics" ${rfq.category==='Logistics'?'selected':''}>Logistics</option>
            <option value="Marketing" ${rfq.category==='Marketing'?'selected':''}>Marketing</option>
            <option value="Other" ${rfq.category==='Other'?'selected':''}>Other</option>
          </select>
        </div>
        <div class="form-group">
          <label class="form-label">Status</label>
          <select class="form-select" name="status">
            <option value="draft" ${(rfq.status||'draft')==='draft'?'selected':''}>Draft</option>
            <option value="published" ${rfq.status==='published'?'selected':''}>Published</option>
            <option value="closed" ${rfq.status==='closed'?'selected':''}>Closed</option>
          </select>
        </div>
      </div>
      <div class="form-row-2">
        <div class="form-group">
          <label class="form-label">Quantity</label>
          <input class="form-input" name="quantity" type="number" value="${rfq.quantity||''}" placeholder="50" />
        </div>
        <div class="form-group">
          <label class="form-label">Budget (₹)</label>
          <input class="form-input" name="budget_amount" type="number" value="${rfq.budget_amount||''}" placeholder="500000" />
        </div>
      </div>
      <div class="form-group">
        <label class="form-label">Deadline <span class="required">*</span></label>
        <input class="form-input" name="deadline" type="date" value="${rfq.deadline||''}" required />
      </div>
      <div class="form-group">
        <label class="form-label">Description</label>
        <textarea class="form-textarea" name="description" placeholder="Detailed description of requirements...">${Utils.escape(rfq.description||'')}</textarea>
      </div>
      <div class="form-group">
        <label class="form-label">Assign Vendors</label>
        <div style="border:1px solid var(--clr-border);border-radius:var(--radius-md);
          max-height:200px;overflow-y:auto;padding:8px;">
          ${vendorCheckboxes || '<p style="color:var(--clr-text-muted);font-size:13px;padding:8px;">No active vendors found</p>'}
        </div>
      </div>
    </form>`;
  },

  openCreateModal() {
    Modal.open({
      id: 'rfq-modal', title: '📋 Create New RFQ', size: 'modal-lg',
      body: this._rfqForm(),
      footer: `
        <button class="btn btn-secondary" onclick="Modal.close('rfq-modal')">Cancel</button>
        <button class="btn btn-primary" onclick="Pages.rfqs.saveRFQ()">Create RFQ</button>
      `
    });
  },

  async openEditModal(id) {
    const res = await api.rfqs.get(id);
    if (!res?.data) return;
    Modal.open({
      id: 'rfq-modal', title: '✏️ Edit RFQ', size: 'modal-lg',
      body: `<div data-id="${id}">${this._rfqForm(res.data)}</div>`,
      footer: `
        <button class="btn btn-secondary" onclick="Modal.close('rfq-modal')">Cancel</button>
        <button class="btn btn-primary" onclick="Pages.rfqs.saveRFQ(${id})">Update RFQ</button>
      `
    });
  },

  async saveRFQ(id = null) {
    const form = document.getElementById('rfq-form');
    if (!form) return;
    const data = Utils.getFormData(form);

    // Collect multiple checkboxes
    const vendorIds = [...form.querySelectorAll('input[name="vendor_ids"]:checked')].map(cb => parseInt(cb.value));
    data.vendor_ids = vendorIds;

    const btn = document.querySelector('#rfq-modal .modal-footer .btn-primary');
    Utils.showLoading(btn, 'Saving...');
    try {
      if (id) {
        await api.rfqs.update(id, data);
        Toast.success('RFQ updated', 'Changes saved');
      } else {
        await api.rfqs.create(data);
        Toast.success('RFQ created', 'RFQ created successfully');
      }
      Modal.close('rfq-modal');
      await this.loadRFQs();
    } catch (err) {
      Toast.error('Save failed', err.message);
    } finally {
      Utils.hideLoading(btn);
    }
  },

  deleteRFQ(id, number) {
    Modal.confirm({
      title: 'Delete RFQ',
      message: `Delete <strong>${number}</strong>? This will also remove all associated quotations.`,
      confirmText: 'Delete',
      onConfirm: async () => {
        try {
          await api.rfqs.delete(id);
          Toast.success('RFQ deleted');
          await this.loadRFQs();
        } catch (err) {
          Toast.error('Delete failed', err.message);
        }
      }
    });
  },

  _setupSearch() {
    const debouncedLoad = Utils.debounce(() => this.loadRFQs(), 400);
    document.getElementById('rfq-search')?.addEventListener('input', debouncedLoad);
  }
};
