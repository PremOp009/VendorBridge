/* ================================================================
   VendorBridge — Vendors Page
   ================================================================ */

Pages.vendors = {
  _data: [], _page: 1, _total: 0,

  async render() {
    const content = document.getElementById('page-content');
    content.innerHTML = `
    <div class="page-header">
      <div class="page-header-left">
        <h1>Vendor Management</h1>
        <p>Manage your supplier and vendor database</p>
      </div>
      <div class="page-header-actions">
        <button class="btn btn-primary" onclick="Pages.vendors.openAddModal()">➕ Add Vendor</button>
      </div>
    </div>

    <!-- Stats -->
    <div id="vendor-stats" style="display:flex;gap:16px;flex-wrap:wrap;margin-bottom:24px;"></div>

    <!-- Filter bar -->
    <div class="filter-bar">
      <div class="search-input-wrap">
        <span class="search-icon">🔍</span>
        <input type="text" class="form-input" id="vendor-search" placeholder="Search vendors..." />
      </div>
      <select class="form-select" id="vendor-status-filter" style="width:160px;">
        <option value="active" selected>Active Vendors</option>
        <option value="">All Vendors</option>
        <option value="inactive">Inactive (Archived)</option>
        <option value="blacklisted">Blacklisted</option>
        <option value="pending">Pending</option>
      </select>
      <select class="form-select" id="vendor-category-filter" style="width:160px;">
        <option value="">All Categories</option>
      </select>
      <select class="form-select" id="vendor-view" style="width:120px;">
        <option value="grid">🗂 Grid View</option>
        <option value="table">📋 Table View</option>
      </select>
    </div>

    <!-- Content -->
    <div id="vendors-content"></div>
    <div id="vendors-pagination" class="pagination"></div>
    `;

    await Promise.all([this._loadStats(), this._loadCategories(), this.loadVendors()]);
    this._setupFilters();
  },

  async _loadStats() {
    try {
      const res = await api.vendors.stats();
      if (!res?.data) return;
      const d = res.data;
      document.getElementById('vendor-stats').innerHTML = [
        { label: 'Total Vendors', value: d.total, color: '#674636' },
        { label: 'Active', value: d.active, color: '#16a34a' },
        { label: 'Inactive', value: d.inactive, color: '#64748b' },
      ].map(s => `
        <div style="display:flex;align-items:center;gap:8px;background:white;border:1px solid var(--clr-border);
          border-radius:var(--radius-md);padding:10px 16px;font-size:13px;">
          <span style="font-size:20px;font-weight:800;color:${s.color};">${s.value}</span>
          <span style="color:var(--clr-text-secondary);">${s.label}</span>
        </div>
      `).join('');
    } catch {}
  },

  async _loadCategories() {
    try {
      const res = await api.vendors.categories();
      const sel = document.getElementById('vendor-category-filter');
      if (sel && res?.data?.categories) {
        res.data.categories.forEach(cat => {
          sel.innerHTML += `<option value="${cat}">${cat}</option>`;
        });
      }
    } catch {}
  },

  async loadVendors() {
    const search   = document.getElementById('vendor-search')?.value || '';
    const statusSel= document.getElementById('vendor-status-filter');
    const status   = statusSel ? statusSel.value : 'active';
    const category = document.getElementById('vendor-category-filter')?.value || '';
    const view     = document.getElementById('vendor-view')?.value || 'grid';

    const params = `?page=${this._page}&per_page=12${search ? `&search=${encodeURIComponent(search)}` : ''}${status ? `&status=${status}` : ''}${category ? `&category=${encodeURIComponent(category)}` : ''}`;

    const content = document.getElementById('vendors-content');
    content.innerHTML = '<div class="page-loader"><div class="spinner"></div></div>';

    try {
      const res = await api.vendors.list(params);
      if (!res?.data) return;
      this._data = res.data.vendors;
      this._total = res.data.total;

      if (!this._data.length) {
        content.innerHTML = `<div class="empty-state">
          <div class="empty-state-icon">🏢</div>
          <h3>No vendors found</h3>
          <p>Try adjusting your search or add a new vendor</p>
          <button class="btn btn-primary" onclick="Pages.vendors.openAddModal()">Add Vendor</button>
        </div>`;
        document.getElementById('vendors-pagination').innerHTML = '';
        return;
      }

      if (view === 'grid') {
        content.innerHTML = `<div class="grid-auto">${this._data.map(v => this._vendorCard(v)).join('')}</div>`;
      } else {
        content.innerHTML = this._vendorTable(this._data);
      }
      this._renderPagination(res.data);
    } catch (err) {
      content.innerHTML = `<div class="empty-state"><div class="empty-state-icon">⚠️</div><h3>Error loading vendors</h3><p>${err.message}</p></div>`;
    }
  },

  _vendorCard(v) {
    const initials = v.company_name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
    return `
    <div class="vendor-card" id="vendor-${v.id}">
      <div class="vendor-card-header">
        <div class="vendor-avatar">${initials}</div>
        <div style="flex:1;min-width:0;">
          <div class="vendor-name">${Utils.escape(v.company_name)}</div>
          <div class="vendor-category">${Utils.escape(v.category)}</div>
          ${Utils.statusBadge(v.status)}
        </div>
      </div>
      <div class="vendor-card-body">
        <div class="vendor-detail"><span>📧</span><span>${Utils.escape(v.email)}</span></div>
        ${v.phone ? `<div class="vendor-detail"><span>📞</span><span>${Utils.escape(v.phone)}</span></div>` : ''}
        ${v.city ? `<div class="vendor-detail"><span>📍</span><span>${Utils.escape(v.city)}, ${Utils.escape(v.state || '')}</span></div>` : ''}
        ${v.gst_number ? `<div class="vendor-detail"><span>🏛</span><span>${Utils.escape(v.gst_number)}</span></div>` : ''}
      </div>
      <div class="vendor-card-footer">
        <div>${Utils.stars(v.rating)} <span style="font-size:11px;color:var(--clr-text-muted);">${v.rating}/5</span></div>
        <div style="display:flex;gap:6px;">
          <button class="btn btn-sm btn-secondary" onclick="Pages.vendors.openEditModal(${v.id})">✏️</button>
          <button class="btn btn-sm btn-red" onclick="Pages.vendors.deleteVendor(${v.id}, '${Utils.escape(v.company_name)}')">🗑</button>
        </div>
      </div>
    </div>`;
  },

  _vendorTable(vendors) {
    return `
    <div class="table-container">
      <table class="data-table">
        <thead><tr>
          <th>Company</th><th>Category</th><th>Email</th>
          <th>City</th><th>Rating</th><th>Status</th><th>Actions</th>
        </tr></thead>
        <tbody>
          ${vendors.length ? vendors.map(v => `
          <tr>
            <td><strong>${Utils.escape(v.company_name)}</strong><br><small style="color:var(--clr-text-muted);">${Utils.escape(v.gst_number || '')}</small></td>
            <td>${Utils.escape(v.category)}</td>
            <td>${Utils.escape(v.email)}</td>
            <td>${Utils.escape(v.city || '—')}</td>
            <td>${Utils.stars(v.rating)}</td>
            <td>${Utils.statusBadge(v.status)}</td>
            <td><div class="table-actions">
              <button class="btn btn-sm btn-secondary" onclick="Pages.vendors.openEditModal(${v.id})">✏️ Edit</button>
              <button class="btn btn-sm btn-red" onclick="Pages.vendors.deleteVendor(${v.id},'${Utils.escape(v.company_name)}')">🗑</button>
            </div></td>
          </tr>`).join('') : Utils.emptyRow(7)}
        </tbody>
      </table>
    </div>`;
  },

  _renderPagination(data) {
    const pg = document.getElementById('vendors-pagination');
    if (data.pages <= 1) { pg.innerHTML = ''; return; }
    pg.innerHTML = `
      <button class="pagination-btn" ${this._page <= 1 ? 'disabled' : ''} onclick="Pages.vendors._page--;Pages.vendors.loadVendors()">‹</button>
      <span style="font-size:13px;color:var(--clr-text-secondary);">Page ${this._page} of ${data.pages}</span>
      <button class="pagination-btn" ${this._page >= data.pages ? 'disabled' : ''} onclick="Pages.vendors._page++;Pages.vendors.loadVendors()">›</button>
    `;
  },

  _setupFilters() {
    const debouncedLoad = Utils.debounce(() => { this._page = 1; this.loadVendors(); }, 400);
    document.getElementById('vendor-search')?.addEventListener('input', debouncedLoad);
    document.getElementById('vendor-status-filter')?.addEventListener('change', () => { this._page = 1; this.loadVendors(); });
    document.getElementById('vendor-category-filter')?.addEventListener('change', () => { this._page = 1; this.loadVendors(); });
    document.getElementById('vendor-view')?.addEventListener('change', () => this.loadVendors());
  },

  _vendorForm(vendor = {}) {
    const categories = ['IT Equipment','Office Supplies','Construction','Furniture',
      'Facilities Management','Logistics','Marketing','Software','Consulting','Other'];
    return `
    <form id="vendor-form">
      <div class="form-row-2">
        <div class="form-group">
          <label class="form-label">Company Name <span class="required">*</span></label>
          <input class="form-input" name="company_name" value="${Utils.escape(vendor.company_name||'')}" placeholder="Acme Corp Pvt Ltd" required />
        </div>
        <div class="form-group">
          <label class="form-label">Category <span class="required">*</span></label>
          <select class="form-select" name="category" required>
            ${categories.map(c => `<option value="${c}" ${vendor.category===c?'selected':''}>${c}</option>`).join('')}
          </select>
        </div>
      </div>
      <div class="form-row-2">
        <div class="form-group">
          <label class="form-label">Email <span class="required">*</span></label>
          <input class="form-input" name="email" type="email" value="${Utils.escape(vendor.email||'')}" placeholder="contact@company.com" required />
        </div>
        <div class="form-group">
          <label class="form-label">Phone</label>
          <input class="form-input" name="phone" value="${Utils.escape(vendor.phone||'')}" placeholder="+91-9876543210" />
        </div>
      </div>
      <div class="form-row-2">
        <div class="form-group">
          <label class="form-label">GST Number</label>
          <input class="form-input" name="gst_number" value="${Utils.escape(vendor.gst_number||'')}" placeholder="22AAAAA0000A1Z5" />
        </div>
        <div class="form-group">
          <label class="form-label">Status</label>
          <select class="form-select" name="status">
            <option value="active" ${(vendor.status||'active')==='active'?'selected':''}>Active</option>
            <option value="inactive" ${vendor.status==='inactive'?'selected':''}>Inactive</option>
            <option value="pending" ${vendor.status==='pending'?'selected':''}>Pending</option>
            <option value="blacklisted" ${vendor.status==='blacklisted'?'selected':''}>Blacklisted</option>
          </select>
        </div>
      </div>
      <div class="form-row-3">
        <div class="form-group">
          <label class="form-label">City</label>
          <input class="form-input" name="city" value="${Utils.escape(vendor.city||'')}" placeholder="Mumbai" />
        </div>
        <div class="form-group">
          <label class="form-label">State</label>
          <input class="form-input" name="state" value="${Utils.escape(vendor.state||'')}" placeholder="Maharashtra" />
        </div>
        <div class="form-group">
          <label class="form-label">Rating (0-5)</label>
          <input class="form-input" name="rating" type="number" min="0" max="5" step="0.1" value="${vendor.rating||0}" />
        </div>
      </div>
      <div class="form-group">
        <label class="form-label">Address</label>
        <textarea class="form-textarea" name="address" placeholder="Full address...">${Utils.escape(vendor.address||'')}</textarea>
      </div>
      <div class="form-group">
        <label class="form-label">Notes</label>
        <textarea class="form-textarea" name="notes" rows="2" placeholder="Any additional notes...">${Utils.escape(vendor.notes||'')}</textarea>
      </div>
    </form>`;
  },

  openAddModal() {
    Modal.open({
      id: 'vendor-modal', title: '➕ Add New Vendor', size: 'modal-lg',
      body: this._vendorForm(),
      footer: `
        <button class="btn btn-secondary" onclick="Modal.close('vendor-modal')">Cancel</button>
        <button class="btn btn-primary" onclick="Pages.vendors.saveVendor()">Save Vendor</button>
      `
    });
  },

  async openEditModal(id) {
    const res = await api.vendors.get(id);
    if (!res?.data) return;
    Modal.open({
      id: 'vendor-modal', title: '✏️ Edit Vendor', size: 'modal-lg',
      body: `<div data-id="${id}">${this._vendorForm(res.data)}</div>`,
      footer: `
        <button class="btn btn-secondary" onclick="Modal.close('vendor-modal')">Cancel</button>
        <button class="btn btn-primary" onclick="Pages.vendors.saveVendor(${id})">Update Vendor</button>
      `
    });
  },

  async saveVendor(id = null) {
    const form = document.getElementById('vendor-form');
    if (!form) return;
    const data = Utils.getFormData(form);
    const btn = document.querySelector('#vendor-modal .modal-footer .btn-primary');

    Utils.showLoading(btn, 'Saving...');
    try {
      if (id) {
        await api.vendors.update(id, data);
        Toast.success('Vendor updated', 'Changes saved successfully');
      } else {
        await api.vendors.create(data);
        Toast.success('Vendor added', 'New vendor created successfully');
      }
      Modal.close('vendor-modal');
      await this.loadVendors();
      await this._loadStats();
    } catch (err) {
      Toast.error('Save failed', err.message);
    } finally {
      Utils.hideLoading(btn);
    }
  },

  deleteVendor(id, name) {
    Modal.confirm({
      title: 'Delete Vendor',
      message: `Are you sure you want to delete <strong>${name}</strong>? This cannot be undone.`,
      confirmText: 'Delete',
      onConfirm: async () => {
        try {
          await api.vendors.delete(id);
          Toast.success('Vendor deleted', `${name} removed`);
          await this.loadVendors();
          await this._loadStats();
        } catch (err) {
          Toast.error('Delete failed', err.message);
        }
      }
    });
  }
};
