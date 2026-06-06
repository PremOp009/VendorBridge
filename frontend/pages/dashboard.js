/* ================================================================
   VendorBridge — Dashboard Page
   ================================================================ */

Pages.dashboard = {
  _charts: {},

  async render() {
    const content = document.getElementById('page-content');

    content.innerHTML = `
    <div class="page-header">
      <div class="page-header-left">
        <h1>Dashboard</h1>
        <p>Welcome back, ${Auth.getUser()?.first_name || 'User'}! Here's your procurement overview.</p>
      </div>
      <div class="page-header-actions">
        <button class="btn btn-secondary" onclick="Router.go('#/rfqs')">📋 New RFQ</button>
        <button class="btn btn-primary" onclick="Router.go('#/vendors')">🏢 Add Vendor</button>
      </div>
    </div>

    <!-- KPI Cards -->
    <div class="dashboard-stats-grid" id="stats-grid">
      ${this._skeletonCards(6)}
    </div>

    <!-- Charts row -->
    <div class="dashboard-charts-grid">
      <div class="card">
        <div class="card-header">
          <div>
            <div class="card-title">📈 Monthly Procurement Spend</div>
            <div class="card-subtitle">Current year spending trend</div>
          </div>
          <select class="form-select" style="width:auto;" id="year-select">
            <option value="${new Date().getFullYear()}">${new Date().getFullYear()}</option>
            <option value="${new Date().getFullYear()-1}">${new Date().getFullYear()-1}</option>
          </select>
        </div>
        <div class="chart-wrap"><canvas id="spend-chart"></canvas></div>
      </div>

      <div class="card">
        <div class="card-header">
          <div class="card-title">🍩 Spend by Category</div>
        </div>
        <div class="chart-wrap"><canvas id="category-chart"></canvas></div>
      </div>
    </div>

    <!-- Bottom row -->
    <div class="dashboard-bottom-grid">
      <div class="card">
        <div class="card-header">
          <div class="card-title">🏆 Top Vendors</div>
          <a href="#" onclick="Router.go('#/vendors')" style="font-size:12px;color:var(--clr-primary);">View all →</a>
        </div>
        <div id="top-vendors-list"><div class="spinner" style="margin:20px auto;"></div></div>
      </div>

      <div class="card">
        <div class="card-header">
          <div class="card-title">🔔 Recent Activity</div>
          <a href="#" onclick="Router.go('#/activity-logs')" style="font-size:12px;color:var(--clr-primary);">View all →</a>
        </div>
        <div id="recent-activity"><div class="spinner" style="margin:20px auto;"></div></div>
      </div>
    </div>
    `;

    await this._loadData();
    this._setupYearSelect();
  },

  async _loadData() {
    try {
      const [dashRes, spendRes, catRes, vendorsRes, approvalRes] = await Promise.all([
        api.reports.dashboard(),
        api.reports.monthlySpend(new Date().getFullYear()),
        api.reports.categorySpend(),
        api.reports.topVendors(),
        api.reports.approvalRate(),
      ]);

      if (dashRes?.data) this._renderStats(dashRes.data);
      if (spendRes?.data) this._renderSpendChart(spendRes.data);
      if (catRes?.data) this._renderCategoryChart(catRes.data);
      if (vendorsRes?.data) this._renderTopVendors(vendorsRes.data.vendors);
      if (dashRes?.data?.recent_activity) this._renderActivity(dashRes.data.recent_activity);

    } catch (err) {
      Toast.error('Dashboard Error', err.message);
    }
  },

  _skeletonCards(n) {
    return Array(n).fill(`
      <div class="stat-card" style="animation: pulse 1.5s infinite;">
        <div class="stat-card-icon" style="background:var(--clr-surface);"></div>
        <div class="stat-card-content">
          <div style="height:28px;background:var(--clr-surface);border-radius:4px;width:80px;margin-bottom:8px;"></div>
          <div style="height:12px;background:var(--clr-surface);border-radius:4px;width:120px;"></div>
        </div>
      </div>
    `).join('');
  },

  _renderStats(data) {
    const cards = [
      { label: 'Active Vendors', value: data.active_vendors, icon: '🏢', color: '#674636', bg: 'rgba(103,70,54,0.1)', change: '+2 this month', up: true },
      { label: 'Active RFQs', value: data.active_rfqs, icon: '📋', color: '#2563eb', bg: 'rgba(37,99,235,0.1)', change: 'Open requests', up: true },
      { label: 'Pending Approvals', value: data.pending_approvals, icon: '⏳', color: '#f59e0b', bg: 'rgba(245,158,11,0.1)', change: 'Awaiting review', up: false },
      { label: 'Purchase Orders', value: data.total_pos, icon: '📄', color: '#7c3aed', bg: 'rgba(124,58,237,0.1)', change: 'Total issued', up: true },
      { label: 'Total Spend', value: Utils.currency(data.total_spend), icon: '💰', color: '#16a34a', bg: 'rgba(22,163,74,0.1)', change: 'This financial year', up: true },
      { label: 'Pending Invoices', value: data.pending_invoices, icon: '🧾', color: '#dc2626', bg: 'rgba(220,38,38,0.1)', change: 'Awaiting payment', up: false },
    ];

    const grid = document.getElementById('stats-grid');
    grid.innerHTML = cards.map(c => `
      <div class="stat-card" style="--accent-color:${c.color}; cursor:default;">
        <div class="stat-card-icon" style="background:${c.bg}; color:${c.color};">
          ${c.icon}
        </div>
        <div class="stat-card-content">
          <div class="stat-card-value">${c.value}</div>
          <div class="stat-card-label">${c.label}</div>
          <div class="stat-card-change ${c.up ? 'stat-change-up' : 'stat-change-down'}">
            ${c.up ? '↑' : '↓'} ${c.change}
          </div>
        </div>
      </div>
    `).join('');
  },

  _renderSpendChart(data) {
    const ctx = document.getElementById('spend-chart');
    if (!ctx) return;
    if (this._charts.spend) this._charts.spend.destroy();

    this._charts.spend = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: data.labels,
        datasets: [{
          label: 'Procurement Spend (₹)',
          data: data.values,
          backgroundColor: 'rgba(103,70,54,0.15)',
          borderColor: '#674636',
          borderWidth: 2,
          borderRadius: 6,
          borderSkipped: false,
        }]
      },
      options: {
        responsive: true, maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: {
          y: {
            beginAtZero: true,
            ticks: { callback: v => `₹${(v/1000).toFixed(0)}k`, font: { size: 11 } },
            grid: { color: 'rgba(0,0,0,0.05)' }
          },
          x: { grid: { display: false }, ticks: { font: { size: 11 } } }
        }
      }
    });
  },

  _renderCategoryChart(data) {
    const ctx = document.getElementById('category-chart');
    if (!ctx) return;
    if (this._charts.category) this._charts.category.destroy();

    const colors = ['#674636','#2563eb','#16a34a','#f59e0b','#dc2626','#7c3aed','#0891b2'];
    const vals = data.values.length ? data.values : [1];
    const labs = data.labels.length ? data.labels : ['No data'];

    this._charts.category = new Chart(ctx, {
      type: 'doughnut',
      data: {
        labels: labs,
        datasets: [{ data: vals, backgroundColor: colors, borderWidth: 0, hoverOffset: 6 }]
      },
      options: {
        responsive: true, maintainAspectRatio: false,
        plugins: {
          legend: { position: 'bottom', labels: { font: { size: 11 }, boxWidth: 12, padding: 12 } }
        },
        cutout: '65%'
      }
    });
  },

  _renderTopVendors(vendors) {
    const el = document.getElementById('top-vendors-list');
    if (!vendors?.length) {
      el.innerHTML = '<div class="empty-state" style="padding:30px;"><div class="empty-state-icon">🏢</div><p>No vendor data yet</p></div>';
      return;
    }
    const maxSpend = Math.max(...vendors.map(v => v.total_spend));
    el.innerHTML = vendors.map((v, i) => `
      <div class="log-item" style="align-items:center;">
        <div style="width:24px;height:24px;border-radius:50%;background:var(--clr-surface);
          display:flex;align-items:center;justify-content:center;font-size:11px;
          font-weight:700;color:var(--clr-primary);flex-shrink:0;">${i+1}</div>
        <div class="log-content">
          <div class="log-action">${Utils.escape(v.company_name)}</div>
          <div class="score-bar" style="width:100%;margin-top:4px;">
            <div class="score-fill" style="width:${(v.total_spend/maxSpend*100).toFixed(0)}%;"></div>
          </div>
        </div>
        <div style="text-align:right;flex-shrink:0;">
          <div style="font-size:13px;font-weight:700;color:var(--clr-text);">${Utils.currency(v.total_spend)}</div>
          <div style="font-size:11px;color:var(--clr-text-muted);">${v.po_count} POs</div>
        </div>
      </div>
    `).join('');
  },

  _renderActivity(logs) {
    const el = document.getElementById('recent-activity');
    if (!logs?.length) {
      el.innerHTML = '<div class="empty-state" style="padding:30px;"><div class="empty-state-icon">🔔</div><p>No activity yet</p></div>';
      return;
    }
    el.innerHTML = logs.slice(0, 8).map(log => `
      <div class="log-item">
        <div class="log-dot" style="background:${Utils.moduleChipColor(log.module)};"></div>
        <div class="log-content">
          <div class="log-action">${Utils.escape(log.action.replace(/_/g,' '))}</div>
          <div class="log-desc">${Utils.escape(log.description || '')}</div>
          <div class="log-time">${Utils.timeAgo(log.created_at)}</div>
        </div>
      </div>
    `).join('');
  },

  _setupYearSelect() {
    const sel = document.getElementById('year-select');
    if (sel) {
      sel.addEventListener('change', async (e) => {
        const res = await api.reports.monthlySpend(e.target.value);
        if (res?.data) this._renderSpendChart(res.data);
      });
    }
  }
};
