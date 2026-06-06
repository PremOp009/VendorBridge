/* ================================================================
   VendorBridge — Auth Manager
   ================================================================ */

const Auth = {
  TOKEN_KEY: 'vb_token',
  USER_KEY: 'vb_user',

  getToken() { return localStorage.getItem(this.TOKEN_KEY); },
  getUser()  {
    try { return JSON.parse(localStorage.getItem(this.USER_KEY)); }
    catch { return null; }
  },

  setSession(token, user) {
    localStorage.setItem(this.TOKEN_KEY, token);
    localStorage.setItem(this.USER_KEY, JSON.stringify(user));
  },

  clearSession() {
    localStorage.removeItem(this.TOKEN_KEY);
    localStorage.removeItem(this.USER_KEY);
  },

  isAuthenticated() { return !!this.getToken(); },

  hasRole(...roles) {
    const user = this.getUser();
    return user && roles.includes(user.role);
  },

  isAdmin()    { return this.hasRole('admin'); },
  isPM()       { return this.hasRole('admin','procurement_manager'); },
  isFinance()  { return this.hasRole('admin','finance_officer'); },

  async logout() {
    this.clearSession();
    window.location.hash = '#/login';
  },

  requireAuth() {
    if (!this.isAuthenticated()) {
      window.location.hash = '#/login';
      return false;
    }
    return true;
  },

  getInitials() {
    const user = this.getUser();
    if (!user) return 'U';
    return `${user.first_name?.[0] || ''}${user.last_name?.[0] || ''}`.toUpperCase();
  },

  getRoleLabel() {
    const roles = {
      admin: 'Administrator',
      procurement_manager: 'Procurement Manager',
      finance_officer: 'Finance Officer',
      vendor: 'Vendor'
    };
    const user = this.getUser();
    return roles[user?.role] || 'User';
  }
};

window.Auth = Auth;
