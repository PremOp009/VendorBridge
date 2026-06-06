/* ================================================================
   VendorBridge — Global State
   ================================================================ */

const State = {
  _data: {
    currentPage: null,
    sidebarCollapsed: false,
    pendingApprovals: 0,
    notifications: [],
  },

  get(key) { return this._data[key]; },
  set(key, val) {
    this._data[key] = val;
    this._notify(key, val);
  },

  _listeners: {},
  on(key, fn) {
    if (!this._listeners[key]) this._listeners[key] = [];
    this._listeners[key].push(fn);
  },
  _notify(key, val) {
    (this._listeners[key] || []).forEach(fn => fn(val));
  }
};

window.State = State;
