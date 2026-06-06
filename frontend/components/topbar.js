/* ================================================================
   VendorBridge — Topbar Component
   ================================================================ */

const Topbar = {
  _pageTitles: {
    '#/dashboard':      { title: 'Dashboard', icon: '🏠' },
    '#/vendors':        { title: 'Vendor Management', icon: '🏢' },
    '#/rfqs':           { title: 'RFQ Management', icon: '📋' },
    '#/quotations':     { title: 'Quotations', icon: '💬' },
    '#/comparison':     { title: 'Quotation Comparison', icon: '⚖️' },
    '#/approvals':      { title: 'Approval Workflow', icon: '✅' },
    '#/purchase-orders':{ title: 'Purchase Orders', icon: '📄' },
    '#/invoices':       { title: 'Invoices', icon: '🧾' },
    '#/reports':        { title: 'Reports & Analytics', icon: '📊' },
    '#/activity-logs':  { title: 'Activity Logs', icon: '🔔' },
  },

  render(path) {
    const meta = this._pageTitles[path] || { title: 'VendorBridge', icon: '🌉' };
    const topbar = document.getElementById('topbar');
    if (!topbar) return;

    topbar.innerHTML = `
      <button class="topbar-toggle" id="sidebar-toggle" title="Toggle Sidebar" onclick="Sidebar.toggle()">☰</button>

      <div class="topbar-breadcrumb">
        <span>VendorBridge</span>
        <span style="color:var(--clr-border);">›</span>
        <span class="page-title">${meta.icon} ${meta.title}</span>
      </div>

      <div class="topbar-right">
        <div class="topbar-search">
          <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
            <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
          </svg>
          <input type="text" placeholder="Search..." id="global-search" />
        </div>

        <button class="topbar-btn" title="Notifications" onclick="Topbar.showNotifications()">
          🔔
          <span class="notif-dot" id="notif-dot" style="display:none;"></span>
        </button>

        <button class="topbar-btn" title="Help">❓</button>
      </div>
    `;

    // Global search
    const searchInput = document.getElementById('global-search');
    if (searchInput) {
      searchInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') Topbar.search(e.target.value);
      });
    }
  },

  updatePageTitle(path) {
    const meta = this._pageTitles[path] || { title: 'VendorBridge', icon: '🌉' };
    document.title = `${meta.title} — VendorBridge ERP`;
    const titleEl = document.querySelector('.page-title');
    if (titleEl) titleEl.textContent = `${meta.icon} ${meta.title}`;
  },

  showNotifications() {
    Toast.info('Notifications', 'No new notifications');
  },

  search(query) {
    if (!query.trim()) return;
    Router.go(`#/vendors?search=${encodeURIComponent(query)}`);
  }
};

window.Topbar = Topbar;
