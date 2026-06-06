/* ================================================================
   VendorBridge — Sidebar Component
   ================================================================ */

const Sidebar = {
  _routes: [
    { section: 'Main' },
    { path: '#/dashboard', label: 'Dashboard', icon: '🏠' },
    { section: 'Procurement' },
    { path: '#/vendors',    label: 'Vendors',    icon: '🏢' },
    { path: '#/rfqs',       label: 'RFQs',       icon: '📋' },
    { path: '#/quotations', label: 'Quotations', icon: '💬' },
    { path: '#/comparison', label: 'Comparison', icon: '⚖️' },
    { section: 'Workflow' },
    { path: '#/approvals',  label: 'Approvals',  icon: '✅', badgeKey: 'pendingApprovals' },
    { section: 'Documents' },
    { path: '#/purchase-orders', label: 'Purchase Orders', icon: '📄' },
    { path: '#/invoices',        label: 'Invoices',        icon: '🧾' },
    { section: 'Insights' },
    { path: '#/reports',       label: 'Reports & Analytics', icon: '📊' },
    { path: '#/activity-logs', label: 'Activity Logs',       icon: '🔔' },
  ],

  render() {
    const user = Auth.getUser();
    const sidebar = document.getElementById('sidebar');
    if (!sidebar) return;

    const navItems = this._routes.map(r => {
      if (r.section) {
        return `<div class="nav-section-title">${r.section}</div>`;
      }
      const badge = r.badgeKey && State.get(r.badgeKey) > 0
        ? `<span class="nav-badge">${State.get(r.badgeKey)}</span>`
        : '';
      return `
        <div class="nav-item" data-path="${r.path}" onclick="Router.go('${r.path}')">
          <span class="nav-icon">${r.icon}</span>
          <span class="nav-label">${r.label}</span>
          ${badge}
        </div>
      `;
    }).join('');

    sidebar.innerHTML = `
      <div class="sidebar-logo">
        <div class="sidebar-logo-icon">🌉</div>
        <div class="sidebar-logo-text">
          <span class="brand">VendorBridge</span>
          <span class="tagline">Procurement ERP</span>
        </div>
      </div>
      <nav class="sidebar-nav" id="sidebar-nav">
        ${navItems}
      </nav>
      <div class="sidebar-footer">
        <div class="sidebar-user" onclick="Sidebar.showUserMenu()">
          <div class="user-avatar">${Auth.getInitials()}</div>
          <div class="user-info">
            <div class="user-name">${user ? user.full_name || `${user.first_name} ${user.last_name}` : 'User'}</div>
            <div class="user-role">${Auth.getRoleLabel()}</div>
          </div>
        </div>
      </div>
    `;
  },

  setActive(path) {
    document.querySelectorAll('.nav-item').forEach(el => {
      el.classList.toggle('active', el.dataset.path === path);
    });
  },

  toggle() {
    const sidebar = document.getElementById('sidebar');
    const main    = document.getElementById('main');
    const isCollapsed = sidebar.classList.toggle('collapsed');
    main.classList.toggle('sidebar-collapsed', isCollapsed);
    State.set('sidebarCollapsed', isCollapsed);
  },

  showUserMenu() {
    Modal.open({
      id: 'user-menu',
      title: 'Account',
      size: 'modal-sm',
      body: `
        <div style="text-align:center; margin-bottom: 20px;">
          <div class="user-avatar" style="width:60px;height:60px;font-size:22px;margin:0 auto 12px;">${Auth.getInitials()}</div>
          <h4>${Auth.getUser()?.full_name || ''}</h4>
          <p style="color:var(--clr-text-muted);font-size:12px;">${Auth.getUser()?.email}</p>
          <span class="badge badge-brown" style="margin-top:6px;">${Auth.getRoleLabel()}</span>
        </div>
      `,
      footer: `
        <button class="btn btn-secondary" onclick="Modal.close('user-menu')">Cancel</button>
        <button class="btn btn-red" onclick="Auth.logout()">Sign Out</button>
      `
    });
  },

  updateBadge(key, count) {
    State.set(key, count);
    // Update badge in DOM
    const navItem = document.querySelector(`[data-path="#/approvals"] .nav-badge`);
    if (navItem) navItem.textContent = count;
    else if (count > 0) {
      const approvalNav = document.querySelector(`[data-path="#/approvals"]`);
      if (approvalNav) approvalNav.insertAdjacentHTML('beforeend',
        `<span class="nav-badge">${count}</span>`);
    }
  }
};

window.Sidebar = Sidebar;
