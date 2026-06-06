/* ================================================================
   VendorBridge — Modal Component
   ================================================================ */

const Modal = {
  _stack: [],

  open({ id = 'modal', title, body, size = '', footer = '', onOpen } = {}) {
    // Remove existing
    document.getElementById(id)?.remove();

    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';
    overlay.id = `${id}-overlay`;

    overlay.innerHTML = `
      <div class="modal ${size}" id="${id}" role="dialog" aria-modal="true">
        <div class="modal-header">
          <h3 class="modal-title">${title}</h3>
          <button class="modal-close" id="${id}-close" aria-label="Close">×</button>
        </div>
        <div class="modal-body" id="${id}-body">
          ${body}
        </div>
        ${footer ? `<div class="modal-footer">${footer}</div>` : ''}
      </div>
    `;

    document.body.appendChild(overlay);
    this._stack.push(id);

    // Close events
    document.getElementById(`${id}-close`).addEventListener('click', () => Modal.close(id));
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) Modal.close(id);
    });
    document.addEventListener('keydown', function escListener(e) {
      if (e.key === 'Escape') { Modal.close(id); document.removeEventListener('keydown', escListener); }
    });

    if (onOpen) setTimeout(() => onOpen(document.getElementById(id)), 50);
    return overlay;
  },

  close(id = 'modal') {
    const overlay = document.getElementById(`${id}-overlay`);
    if (!overlay) return;
    overlay.classList.add('closing');
    const modal = document.getElementById(id);
    if (modal) modal.classList.add('closing');
    setTimeout(() => overlay.remove(), 200);
    this._stack = this._stack.filter(i => i !== id);
  },

  closeAll() {
    [...this._stack].forEach(id => Modal.close(id));
  },

  confirm({ title = 'Confirm', message, onConfirm, confirmText = 'Confirm', confirmClass = 'btn-red' } = {}) {
    Modal.open({
      id: 'confirm-modal',
      title,
      size: 'modal-sm',
      body: `<p style="color:var(--clr-text-secondary);font-size:14px;line-height:1.6;">${message}</p>`,
      footer: `
        <button class="btn btn-secondary" onclick="Modal.close('confirm-modal')">Cancel</button>
        <button class="btn ${confirmClass}" id="confirm-ok">${confirmText}</button>
      `,
      onOpen() {
        document.getElementById('confirm-ok').addEventListener('click', () => {
          Modal.close('confirm-modal');
          onConfirm?.();
        });
      }
    });
  }
};

window.Modal = Modal;
