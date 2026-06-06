/* ================================================================
   VendorBridge — Toast Notification Component
   ================================================================ */

const Toast = {
  _container: null,

  init() {
    if (!document.getElementById('toast-container')) {
      const c = document.createElement('div');
      c.id = 'toast-container';
      document.body.appendChild(c);
    }
    this._container = document.getElementById('toast-container');
  },

  show(type, title, message = '', duration = 4000) {
    if (!this._container) this.init();

    const icons = { success: '✅', error: '❌', warning: '⚠️', info: 'ℹ️' };
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.innerHTML = `
      <span class="toast-icon">${icons[type] || 'ℹ️'}</span>
      <div class="toast-content">
        <div class="toast-title">${Utils.escape(title)}</div>
        ${message ? `<div class="toast-msg">${Utils.escape(message)}</div>` : ''}
      </div>
      <button class="toast-close" onclick="this.closest('.toast').remove()">×</button>
    `;

    this._container.appendChild(toast);

    if (duration > 0) {
      setTimeout(() => {
        toast.classList.add('removing');
        setTimeout(() => toast.remove(), 250);
      }, duration);
    }
  },

  success: (title, msg) => Toast.show('success', title, msg),
  error:   (title, msg) => Toast.show('error', title, msg),
  warning: (title, msg) => Toast.show('warning', title, msg),
  info:    (title, msg) => Toast.show('info', title, msg),
};

window.Toast = Toast;
