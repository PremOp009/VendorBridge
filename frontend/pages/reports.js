/* ================================================================
   VendorBridge — Reports & Analytics Page
   ================================================================ */

Pages.reports = {
  _charts: {},

  async render() {
    const content = document.getElementById('page-content');
    content.innerHTML = `
    <div class="page-header">
      <div class="page-header-left">
        <h1>Reports & Analytics</h1>
        <p>Comprehensive procurement insights and performance metrics</p>
      </div>
    </div>

    <!-- Quick KPIs -->
    <div id="report-kpis" style="display:grid;grid-template-columns:repeat(auto-fill,minmax(180px,1fr));gap:16px;margin-bottom:24px;"></div>

    <div class="reports-grid">
      <!-- Monthly Spend -->
      <div class="report-card report-card-full">
        <div class="card-header">
          <div class="card-title">📈 Monthly Procurement Spend</div>
          <select class="form-select" style="width:auto;" id="report-year">
            <option>${new Date().getFullYear()}</option>
            <option>${new Date().getFullYear()-1}</option>
          </select>
        </div>
        <div class="chart-wrap" style="height:280px;"><canvas id="r-monthly-chart"></canvas></div>
      </div>

      <!-- Category Spend -->
      <div class="report-card">
        <div class="card-header"><div class="card-title">🍩 Spend by Category</div></div>
        <div class="chart-wrap"><canvas id="r-category-chart"></canvas></div>
      </div>

      <!-- Approval Rate -->
      <div class="report-card">
        <div class="card-header"><div class="card-title">✅ Approval Rate</div></div>
        <div class="chart-wrap"><canvas id="r-approval-chart"></canvas></div>
      </div>

      <!-- Top Vendors Table -->
      <div class="report-card">
        <div class="card-header"><div class="card-title">🏆 Top Vendors by Spend</div></div>
        <div id="r-top-vendors"></div>
      </div>

      <!-- Vendor Performance -->
      <div class="report-card">
        <div class="card-header"><div class="card-title">⭐ Vendor Performance</div></div>
        <div class="chart-wrap"><canvas id="r-performance-chart"></canvas></div>
      </div>
    </div>
    `;

    await this._loadAllCharts();
    document.getElementById('report-year')?.addEventListener('change', async (e) => {
      const res = await api.reports.monthlySpend(e.target.value);
      if (res?.data) this._renderMonthly(res.data);
    });
  },

  async _loadAllCharts() {
    try {
      const [dashRes, spendRes, catRes, vendorsRes, approvalRes, perfRes] = await Promise.all([
        api.reports.dashboard(),
        api.reports.monthlySpend(new Date().getFullYear()),
        api.reports.categorySpend(),
        api.reports.topVendors(),
        api.reports.approvalRate(),
        api.reports.vendorPerformance(),
      ]);

      if (dashRes?.data) this._renderKPIs(dashRes.data);
      if (spendRes?.data) this._renderMonthly(spendRes.data);
      if (catRes?.data) this._renderCategory(catRes.data);
      if (vendorsRes?.data) this._renderTopVendors(vendorsRes.data.vendors);
      if (approvalRes?.data) this._renderApprovalRate(approvalRes.data);
      if (perfRes?.data) this._renderPerformance(perfRes.data.vendors);
    } catch (err) {
      Toast.error('Error loading reports', err.message);
    }
  },

  _renderKPIs(data) {
    const el = document.getElementById('report-kpis');
    const kpis = [
      { label: 'Active Vendors', value: data.active_vendors, icon: '🏢', color: '#674636' },
      { label: 'Total POs', value: data.total_pos, icon: '📄', color: '#2563eb' },
      { label: 'Total Spend', value: Utils.currency(data.total_spend), icon: '💰', color: '#16a34a' },
      { label: 'Pending Invoices', value: data.pending_invoices, icon: '🧾', color: '#f59e0b' },
    ];
    el.innerHTML = kpis.map(k => `
      <div style="background:white;border:1px solid var(--clr-border);border-radius:var(--radius-lg);
        padding:16px;box-shadow:var(--shadow-sm);display:flex;align-items:center;gap:12px;border-left:4px solid ${k.color};">
        <span style="font-size:24px;">${k.icon}</span>
        <div>
          <div style="font-size:20px;font-weight:800;color:${k.color};font-family:'Outfit',sans-serif;">${k.value}</div>
          <div style="font-size:11px;color:var(--clr-text-muted);">${k.label}</div>
        </div>
      </div>
    `).join('');
  },

  _renderMonthly(data) {
    const ctx = document.getElementById('r-monthly-chart');
    if (!ctx) return;
    if (this._charts.monthly) this._charts.monthly.destroy();
    this._charts.monthly = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: data.labels,
        datasets: [{
          label: 'Monthly Spend (₹)',
          data: data.values,
          backgroundColor: data.values.map((_, i) =>
            i === data.values.indexOf(Math.max(...data.values))
              ? 'rgba(103,70,54,0.85)' : 'rgba(103,70,54,0.25)'),
          borderColor: '#674636',
          borderWidth: 2,
          borderRadius: 8,
          borderSkipped: false,
        }]
      },
      options: {
        responsive: true, maintainAspectRatio: false,
        plugins: { legend: { display: false },
          tooltip: { callbacks: { label: ctx => ` ₹${ctx.raw.toLocaleString()}` } } },
        scales: {
          y: { beginAtZero: true, ticks: { callback: v => `₹${(v/1000).toFixed(0)}k` }, grid: { color: 'rgba(0,0,0,0.04)' } },
          x: { grid: { display: false } }
        }
      }
    });
  },

  _renderCategory(data) {
    const ctx = document.getElementById('r-category-chart');
    if (!ctx) return;
    if (this._charts.category) this._charts.category.destroy();
    const colors = ['#674636','#2563eb','#16a34a','#f59e0b','#dc2626','#7c3aed','#0891b2','#db2777'];
    const vals = data.values.length ? data.values : [1];
    const labs = data.labels.length ? data.labels : ['No Data'];
    this._charts.category = new Chart(ctx, {
      type: 'doughnut',
      data: { labels: labs, datasets: [{ data: vals, backgroundColor: colors, borderWidth: 0, hoverOffset: 8 }] },
      options: {
        responsive: true, maintainAspectRatio: false, cutout: '60%',
        plugins: {
          legend: { position: 'bottom', labels: { font: { size: 11 }, boxWidth: 10, padding: 10 } },
          tooltip: { callbacks: { label: ctx => ` ₹${ctx.raw.toLocaleString()}` } }
        }
      }
    });
  },

  _renderApprovalRate(data) {
    const ctx = document.getElementById('r-approval-chart');
    if (!ctx) return;
    if (this._charts.approval) this._charts.approval.destroy();
    this._charts.approval = new Chart(ctx, {
      type: 'pie',
      data: {
        labels: ['Approved', 'Rejected', 'Pending'],
        datasets: [{
          data: [data.approved || 0, data.rejected || 0, data.pending || 0],
          backgroundColor: ['#16a34a','#dc2626','#f59e0b'],
          borderWidth: 0,
        }]
      },
      options: {
        responsive: true, maintainAspectRatio: false,
        plugins: {
          legend: { position: 'bottom', labels: { font: { size: 11 }, boxWidth: 10, padding: 10 } }
        }
      }
    });
  },

  _renderTopVendors(vendors) {
    const el = document.getElementById('r-top-vendors');
    if (!vendors?.length) {
      el.innerHTML = '<p style="color:var(--clr-text-muted);font-size:13px;text-align:center;padding:20px;">No vendor spend data</p>';
      return;
    }
    const maxSpend = Math.max(...vendors.map(v => v.total_spend));
    el.innerHTML = vendors.map((v, i) => `
      <div style="display:flex;align-items:center;gap:10px;padding:8px 0;border-bottom:1px solid var(--clr-border);">
        <span style="font-weight:700;color:var(--clr-text-muted);min-width:20px;text-align:right;">${i+1}</span>
        <div style="flex:1;">
          <div style="font-size:13px;font-weight:600;">${Utils.escape(v.company_name)}</div>
          <div class="score-bar" style="width:100%;margin-top:3px;">
            <div class="score-fill" style="width:${(v.total_spend/maxSpend*100).toFixed(0)}%;"></div>
          </div>
        </div>
        <div style="text-align:right;font-size:13px;">
          <div style="font-weight:700;">${Utils.currency(v.total_spend)}</div>
          <div style="font-size:11px;color:var(--clr-text-muted);">${v.po_count} POs</div>
        </div>
      </div>
    `).join('');
  },

  _renderPerformance(vendors) {
    const ctx = document.getElementById('r-performance-chart');
    if (!ctx || !vendors?.length) return;
    if (this._charts.perf) this._charts.perf.destroy();
    this._charts.perf = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: vendors.map(v => v.company_name.split(' ')[0]),
        datasets: [{
          label: 'Rating',
          data: vendors.map(v => v.rating),
          backgroundColor: 'rgba(103,70,54,0.7)',
          borderRadius: 6,
        }]
      },
      options: {
        indexAxis: 'y',
        responsive: true, maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: {
          x: { max: 5, ticks: { callback: v => `${v}★` }, grid: { color: 'rgba(0,0,0,0.04)' } },
          y: { grid: { display: false }, ticks: { font: { size: 11 } } }
        }
      }
    });
  }
};
