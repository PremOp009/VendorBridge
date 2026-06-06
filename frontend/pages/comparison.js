/* ================================================================
   VendorBridge — Quotation Comparison Page (AI-powered)
   ================================================================ */

Pages.comparison = {
  _rfqs: [],

  async render() {
    const content = document.getElementById('page-content');
    const params = new URLSearchParams(window.location.hash.split('?')[1] || '');
    const rfqIdParam = params.get('rfq_id') || '';

    content.innerHTML = `
    <div class="page-header">
      <div class="page-header-left">
        <h1>⚖️ Quotation Comparison</h1>
        <p>AI-powered vendor comparison with smart recommendations</p>
      </div>
    </div>

    <div class="filter-bar" style="margin-bottom:24px;">
      <select class="form-select" id="compare-rfq-sel" style="min-width:260px;">
        <option value="">Select an RFQ to compare</option>
      </select>
      <button class="btn btn-primary" onclick="Pages.comparison.loadComparison()">Compare Quotations</button>
    </div>

    <!-- Legend -->
    <div style="display:flex;gap:16px;flex-wrap:wrap;margin-bottom:20px;font-size:12px;">
      <div style="display:flex;align-items:center;gap:6px;"><span class="ai-badge">🤖 AI Pick</span> Best overall score</div>
      <div style="display:flex;align-items:center;gap:6px;"><span class="badge badge-green">💰 Cheapest</span> Lowest price</div>
      <div style="display:flex;align-items:center;gap:6px;"><span class="badge badge-blue">⚡ Fastest</span> Quickest delivery</div>
      <div style="display:flex;align-items:center;gap:6px;"><span class="badge badge-yellow">⭐ Top Rated</span> Highest rating</div>
    </div>

    <div id="comparison-content">
      <div class="empty-state">
        <div class="empty-state-icon">⚖️</div>
        <h3>Select an RFQ to compare</h3>
        <p>Choose an RFQ above to see side-by-side vendor quotation comparison with AI scoring</p>
      </div>
    </div>
    `;

    await this._loadRFQSelect(rfqIdParam);
    if (rfqIdParam) await this.loadComparison();
  },

  async _loadRFQSelect(selected) {
    try {
      const res = await api.rfqs.list('?per_page=100&status=published');
      const rfqs = res?.data?.rfqs || [];
      const sel = document.getElementById('compare-rfq-sel');
      rfqs.forEach(r => {
        sel.innerHTML += `<option value="${r.id}" ${selected==r.id?'selected':''}>${r.rfq_number} — ${r.title}</option>`;
      });
    } catch {}
  },

  async loadComparison() {
    const rfqId = document.getElementById('compare-rfq-sel')?.value;
    if (!rfqId) { Toast.warning('Select RFQ', 'Please select an RFQ first'); return; }

    const content = document.getElementById('comparison-content');
    content.innerHTML = '<div class="page-loader"><div class="spinner"></div></div>';

    try {
      const res = await api.quotations.compare(rfqId);
      if (!res?.data) return;

      const { rfq, quotations } = res.data;

      if (!quotations.length) {
        content.innerHTML = `<div class="empty-state">
          <div class="empty-state-icon">📭</div>
          <h3>No quotations for this RFQ</h3>
          <p>Invite vendors to submit their quotations first</p>
        </div>`;
        return;
      }

      content.innerHTML = `
      <div class="comparison-header-info">
        <h3>${Utils.escape(rfq.title)}</h3>
        <div style="display:flex;gap:20px;flex-wrap:wrap;font-size:13px;color:var(--clr-text-secondary);margin-top:8px;">
          <span>📋 ${rfq.rfq_number}</span>
          <span>📅 Deadline: ${Utils.date(rfq.deadline)}</span>
          <span>💬 ${quotations.length} Quotations</span>
          ${rfq.budget_amount ? `<span>💰 Budget: ${Utils.currency(rfq.budget_amount)}</span>` : ''}
        </div>
      </div>

      <div class="table-container">
        <table class="data-table">
          <thead>
            <tr style="background:var(--clr-primary);">
              <th style="color:white;">Vendor</th>
              <th style="color:white;">AI Score</th>
              <th style="color:white;">Unit Price</th>
              <th style="color:white;">GST %</th>
              <th style="color:white;">Total Price</th>
              <th style="color:white;">Delivery</th>
              <th style="color:white;">Rating</th>
              <th style="color:white;">Badges</th>
              <th style="color:white;">Action</th>
            </tr>
          </thead>
          <tbody>
            ${quotations.map((q, i) => this._comparisonRow(q, i)).join('')}
          </tbody>
        </table>
      </div>

      <div style="margin-top:24px;">
        <h3 style="font-size:15px;font-weight:700;margin-bottom:16px;">📊 Score Breakdown</h3>
        <div class="grid-3">
          ${quotations.map(q => this._scoreCard(q)).join('')}
        </div>
      </div>
      `;
    } catch (err) {
      content.innerHTML = `<div class="empty-state"><div class="empty-state-icon">⚠️</div><h3>${err.message}</h3></div>`;
    }
  },

  _comparisonRow(q, index) {
    const isTop = index === 0; // highest AI score
    const rowBg = isTop ? 'background:rgba(103,70,54,0.04);' : '';
    const badges = [];
    if (q.is_recommended) badges.push(`<span class="ai-badge">🤖 AI Pick</span>`);
    if (q.is_cheapest)    badges.push(`<span class="badge badge-green">💰 Cheapest</span>`);
    if (q.is_fastest)     badges.push(`<span class="badge badge-blue">⚡ Fastest</span>`);
    if (q.is_top_rated)   badges.push(`<span class="badge badge-yellow">⭐ Top Rated</span>`);

    return `
    <tr style="${rowBg}">
      <td>
        <div>
          <strong>${Utils.escape(q.vendor?.company_name||'N/A')}</strong>
          ${isTop ? `<div style="font-size:10px;font-weight:700;color:var(--clr-primary);text-transform:uppercase;">✦ Best Overall</div>` : ''}
        </div>
      </td>
      <td>
        <div style="display:flex;align-items:center;gap:8px;">
          <div class="score-bar" style="width:60px;">
            <div class="score-fill" style="width:${q.ai_score}%;"></div>
          </div>
          <strong style="font-size:14px;color:var(--clr-primary);">${q.ai_score}</strong>
        </div>
      </td>
      <td>${Utils.currency(q.price)}</td>
      <td>${q.tax_percentage}%</td>
      <td><strong style="color:var(--clr-text);">${Utils.currency(q.total_price)}</strong></td>
      <td>${q.delivery_days} days</td>
      <td>${Utils.stars(q.vendor?.rating)} (${q.vendor?.rating||0})</td>
      <td style="max-width:180px;"><div style="display:flex;gap:4px;flex-wrap:wrap;">${badges.join('') || '<span class="badge badge-gray">—</span>'}</div></td>
      <td>
        <button class="btn btn-sm btn-green" onclick="Pages.comparison.approveQuotation(${q.id})">
          ✅ Approve
        </button>
      </td>
    </tr>`;
  },

  _scoreCard(q) {
    return `
    <div class="card" style="position:relative;">
      ${q.is_recommended ? `<div class="ai-badge" style="position:absolute;top:12px;right:12px;">🤖 AI Pick</div>` : ''}
      <div style="font-weight:700;margin-bottom:12px;padding-right:${q.is_recommended?70:0}px;">
        ${Utils.escape(q.vendor?.company_name||'N/A')}
      </div>
      <div style="margin-bottom:10px;">
        <div style="display:flex;justify-content:space-between;font-size:12px;margin-bottom:4px;">
          <span style="color:var(--clr-text-muted);">💰 Price Score</span>
          <strong>${q.price_score}</strong>
        </div>
        <div class="score-bar"><div class="score-fill" style="width:${q.price_score}%;background:#16a34a;"></div></div>
      </div>
      <div style="margin-bottom:10px;">
        <div style="display:flex;justify-content:space-between;font-size:12px;margin-bottom:4px;">
          <span style="color:var(--clr-text-muted);">⚡ Delivery Score</span>
          <strong>${q.delivery_score}</strong>
        </div>
        <div class="score-bar"><div class="score-fill" style="width:${q.delivery_score}%;background:#2563eb;"></div></div>
      </div>
      <div style="margin-bottom:12px;">
        <div style="display:flex;justify-content:space-between;font-size:12px;margin-bottom:4px;">
          <span style="color:var(--clr-text-muted);">⭐ Rating Score</span>
          <strong>${q.rating_score}</strong>
        </div>
        <div class="score-bar"><div class="score-fill" style="width:${q.rating_score}%;background:#f59e0b;"></div></div>
      </div>
      <div style="border-top:2px solid var(--clr-primary);padding-top:10px;display:flex;justify-content:space-between;align-items:center;">
        <span style="font-size:12px;color:var(--clr-text-muted);">Overall Score</span>
        <span style="font-size:22px;font-weight:800;color:var(--clr-primary);font-family:'Outfit',sans-serif;">${q.ai_score}</span>
      </div>
    </div>`;
  },

  async approveQuotation(quotationId) {
    try {
      await api.approvals.create({ quotation_id: quotationId, remarks: 'Approved via comparison' });
      Toast.success('Sent for approval', 'Redirecting to approvals...');
      setTimeout(() => Router.go('#/approvals'), 1500);
    } catch (err) {
      Toast.error('Failed', err.message);
    }
  }
};
