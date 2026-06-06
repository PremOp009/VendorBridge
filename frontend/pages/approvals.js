/* ================================================================
   VendorBridge — Approvals Page
   ================================================================ */

Pages.approvals = {
  async render() {
    const content = document.getElementById('page-content');
    content.innerHTML = `
    <div class="page-header">
      <div class="page-header-left">
        <h1>Approval Workflow</h1>
        <p>Review and process quotation approvals</p>
      </div>
    </div>

    <!-- Approval stats -->
    <div id="approval-stats" style="display:flex;gap:16px;flex-wrap:wrap;margin-bottom:24px;"></div>

    <!-- Workflow diagram -->
    <div class="card" style="margin-bottom:24px;">
      <div class="card-title" style="margin-bottom:16px;">📌 Procurement Workflow</div>
      <div class="workflow-steps">
        ${['RFQ','Quotation','Comparison','Approval','Purchase Order','Invoice'].map((s,i,arr) => `
          <div class="workflow-step">
            <div class="step-node">
              <div class="step-circle ${i<4?'done':''}">
                ${i<4?'✓':(i+1)}
              </div>
              <div class="step-label">${s}</div>
            </div>
            ${i<arr.length-1 ? '<div class="step-connector done"></div>' : ''}
          </div>
        `).join('')}
      </div>
    </div>

    <!-- Filter tabs -->
    <div style="display:flex;gap:8px;margin-bottom:20px;" id="approval-tabs">
      ${['','pending','approved','rejected'].map((s,i) =>
        `<button class="btn btn-sm ${i===0?'btn-primary':'btn-secondary'}" data-status="${s}"
                 onclick="Pages.approvals._filterStatus('${s}',this)">
          ${s?s.charAt(0).toUpperCase()+s.slice(1):'All'}
        </button>`
      ).join('')}
    </div>

    <div id="approvals-content"></div>
    `;

    await Promise.all([this._loadStats(), this.loadApprovals()]);
  },

  _currentStatus: '',

  async _loadStats() {
    try {
      const res = await api.approvals.stats();
      if (!res?.data) return;
      const d = res.data;
      document.getElementById('approval-stats').innerHTML = [
        { label: 'Pending', value: d.pending, color: '#f59e0b', bg: 'rgba(245,158,11,0.1)' },
        { label: 'Approved', value: d.approved, color: '#16a34a', bg: 'rgba(22,163,74,0.1)' },
        { label: 'Rejected', value: d.rejected, color: '#dc2626', bg: 'rgba(220,38,38,0.1)' },
        { label: 'Approval Rate', value: `${d.approval_rate}%`, color: '#2563eb', bg: 'rgba(37,99,235,0.1)' },
      ].map(s => `
        <div style="display:flex;align-items:center;gap:10px;background:white;border:1px solid var(--clr-border);
          border-radius:var(--radius-md);padding:12px 16px;">
          <span style="font-size:24px;font-weight:800;color:${s.color};font-family:'Outfit',sans-serif;">${s.value}</span>
          <span style="font-size:12px;color:var(--clr-text-secondary);">${s.label}</span>
        </div>
      `).join('');
    } catch {}
  },

  async _filterStatus(status, btn) {
    this._currentStatus = status;
    document.querySelectorAll('#approval-tabs button').forEach(b => b.className = 'btn btn-sm btn-secondary');
    if (btn) btn.className = 'btn btn-sm btn-primary';
    await this.loadApprovals();
  },

  async loadApprovals() {
    const params = `?${this._currentStatus ? `status=${this._currentStatus}&` : ''}per_page=30`;
    const content = document.getElementById('approvals-content');
    content.innerHTML = '<div class="page-loader"><div class="spinner"></div></div>';

    try {
      const res = await api.approvals.list(params);
      const approvals = res?.data?.approvals || [];

      if (!approvals.length) {
        content.innerHTML = `<div class="empty-state">
          <div class="empty-state-icon">✅</div>
          <h3>No approvals found</h3>
          <p>Pending approvals will appear here. Submit quotations for approval from the Quotations page.</p>
          <button class="btn btn-secondary" onclick="Router.go('#/quotations')">View Quotations</button>
        </div>`;
        return;
      }

      content.innerHTML = `<div class="grid-2">${approvals.map(a => this._approvalCard(a)).join('')}</div>`;
    } catch (err) {
      content.innerHTML = `<div class="empty-state"><div class="empty-state-icon">⚠️</div><h3>${err.message}</h3></div>`;
    }
  },

  _approvalCard(a) {
    const q = a.quotation || {};
    const v = q.vendor || {};
    return `
    <div class="approval-card">
      <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:12px;">
        <div>
          <span style="font-size:11px;color:var(--clr-text-muted);font-family:monospace;">APPROVAL #${a.id}</span>
          <div style="font-size:15px;font-weight:700;color:var(--clr-text);margin-top:2px;">
            ${Utils.escape(v.company_name || 'Unknown Vendor')}
          </div>
        </div>
        ${Utils.statusBadge(a.status)}
      </div>

      <div style="background:var(--clr-surface);border-radius:var(--radius-md);padding:12px;margin-bottom:12px;">
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;font-size:12.5px;">
          <div><span style="color:var(--clr-text-muted);">Price:</span> <strong>${Utils.currency(q.price)}</strong></div>
          <div><span style="color:var(--clr-text-muted);">Total:</span> <strong>${Utils.currency(q.total_price)}</strong></div>
          <div><span style="color:var(--clr-text-muted);">Delivery:</span> <strong>${q.delivery_days} days</strong></div>
          <div><span style="color:var(--clr-text-muted);">RFQ:</span> <strong>RFQ#${q.rfq_id}</strong></div>
        </div>
      </div>

      ${a.remarks ? `<div style="font-size:12.5px;color:var(--clr-text-secondary);margin-bottom:10px;padding:8px;border-left:3px solid var(--clr-border);background:var(--clr-surface);border-radius:0 var(--radius-sm) var(--radius-sm) 0;">
        💬 ${Utils.escape(a.remarks)}
      </div>` : ''}

      <div style="display:flex;justify-content:space-between;align-items:center;font-size:11px;color:var(--clr-text-muted);">
        <span>📅 ${Utils.timeAgo(a.created_at)}</span>
        ${a.approver_name ? `<span>By: ${Utils.escape(a.approver_name)}</span>` : ''}
      </div>

      ${a.status === 'pending' ? `
      <div class="approval-actions">
        <button class="btn btn-green btn-sm" style="flex:1;" onclick="Pages.approvals.processApproval(${a.id},'approve')">
          ✅ Approve
        </button>
        <button class="btn btn-red btn-sm" style="flex:1;" onclick="Pages.approvals.processApproval(${a.id},'reject')">
          ❌ Reject
        </button>
      </div>
      ` : ''}

      ${a.status === 'approved' ? `
      <div style="margin-top:12px;">
        <button class="btn btn-blue btn-sm btn-block" onclick="Pages.approvals.createPO(${a.quotation_id})">
          📄 Generate Purchase Order
        </button>
      </div>` : ''}
    </div>`;
  },

  async processApproval(id, action) {
    Modal.open({
      id: 'approval-action-modal',
      title: action === 'approve' ? '✅ Approve Quotation' : '❌ Reject Quotation',
      size: 'modal-sm',
      body: `
        <div class="form-group">
          <label class="form-label">Remarks</label>
          <textarea class="form-textarea" id="approval-remarks" rows="3" placeholder="Add remarks or conditions..."></textarea>
        </div>
      `,
      footer: `
        <button class="btn btn-secondary" onclick="Modal.close('approval-action-modal')">Cancel</button>
        <button class="btn ${action==='approve'?'btn-green':'btn-red'}" id="do-approval-btn">
          ${action === 'approve' ? '✅ Confirm Approve' : '❌ Confirm Reject'}
        </button>
      `,
      onOpen() {
        document.getElementById('do-approval-btn').addEventListener('click', async () => {
          const remarks = document.getElementById('approval-remarks').value;
          try {
            if (action === 'approve') {
              await api.approvals.approve(id, { remarks });
              Toast.success('Approved!', 'Quotation approved successfully');
            } else {
              await api.approvals.reject(id, { remarks });
              Toast.success('Rejected', 'Quotation has been rejected');
            }
            Modal.close('approval-action-modal');
            await Pages.approvals.loadApprovals();
            await Pages.approvals._loadStats();
          } catch (err) {
            Toast.error('Action failed', err.message);
          }
        });
      }
    });
  },

  async createPO(quotationId) {
    Modal.open({
      id: 'po-from-approval',
      title: '📄 Generate Purchase Order',
      size: 'modal-sm',
      body: `
        <p style="color:var(--clr-text-secondary);font-size:13px;margin-bottom:16px;">
          This will generate an official Purchase Order from the approved quotation.
        </p>
        <div class="form-group">
          <label class="form-label">Delivery Address</label>
          <textarea class="form-textarea" id="po-delivery-address" rows="3" placeholder="Delivery location..."></textarea>
        </div>
        <div class="form-group">
          <label class="form-label">Expected Delivery Date</label>
          <input class="form-input" type="date" id="po-expected-delivery" />
        </div>
      `,
      footer: `
        <button class="btn btn-secondary" onclick="Modal.close('po-from-approval')">Cancel</button>
        <button class="btn btn-primary" id="create-po-btn">📄 Generate PO</button>
      `,
      onOpen() {
        document.getElementById('create-po-btn').addEventListener('click', async () => {
          const deliveryAddress = document.getElementById('po-delivery-address').value;
          const expectedDelivery = document.getElementById('po-expected-delivery').value;
          try {
            const res = await api.purchaseOrders.create({
              quotation_id: quotationId,
              delivery_address: deliveryAddress,
              expected_delivery: expectedDelivery || null
            });
            if (res?.data) {
              Toast.success('PO Generated!', `Purchase Order ${res.data.po_number} created`);
              Modal.close('po-from-approval');
              Router.go('#/purchase-orders');
            }
          } catch (err) {
            Toast.error('Failed', err.message);
          }
        });
      }
    });
  }
};
