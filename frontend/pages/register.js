/* ================================================================
   VendorBridge — Register Page
   ================================================================ */

Pages.register = {
  async render() {
    const authPage = document.getElementById('auth-page');
    if (!authPage) return;

    authPage.innerHTML = `
    <div class="auth-left">
      <div class="auth-brand">
        <div class="logo">🌉 VendorBridge</div>
        <div class="tagline">Enterprise Procurement ERP</div>
      </div>
      <div class="auth-features">
        <div class="auth-feature">
          <div class="auth-feature-icon">🔐</div>
          <div class="auth-feature-text">
            <h4>Secure Authentication</h4>
            <p>JWT-based secure login with role-based access control</p>
          </div>
        </div>
        <div class="auth-feature">
          <div class="auth-feature-icon">👥</div>
          <div class="auth-feature-text">
            <h4>Role-Based Access</h4>
            <p>Admin, Procurement Manager, Finance Officer and Vendor roles</p>
          </div>
        </div>
        <div class="auth-feature">
          <div class="auth-feature-icon">📊</div>
          <div class="auth-feature-text">
            <h4>Real-time Analytics</h4>
            <p>Track all procurement activities with visual dashboards</p>
          </div>
        </div>
      </div>
    </div>

    <div class="auth-right">
      <div class="auth-card">
        <h2>Create Account</h2>
        <p class="subtitle">Set up your VendorBridge account</p>

        <form id="register-form">
          <div class="form-row-2">
            <div class="form-group">
              <label class="form-label">First Name <span class="required">*</span></label>
              <input type="text" class="form-input" name="first_name" placeholder="John" required />
            </div>
            <div class="form-group">
              <label class="form-label">Last Name <span class="required">*</span></label>
              <input type="text" class="form-input" name="last_name" placeholder="Doe" required />
            </div>
          </div>

          <div class="form-group">
            <label class="form-label">Email Address <span class="required">*</span></label>
            <div class="input-group">
              <span class="input-icon">📧</span>
              <input type="email" class="form-input" name="email" placeholder="you@company.com" required />
            </div>
          </div>

          <div class="form-group">
            <label class="form-label">Role</label>
            <select class="form-select" name="role">
              <option value="vendor">Vendor</option>
              <option value="procurement_manager">Procurement Manager</option>
              <option value="finance_officer">Finance Officer</option>
              <option value="admin">Administrator</option>
            </select>
          </div>

          <div class="form-group">
            <label class="form-label">Password <span class="required">*</span></label>
            <div class="input-group">
              <span class="input-icon">🔒</span>
              <input type="password" class="form-input" name="password" placeholder="Min. 8 characters" required minlength="8" />
            </div>
            <div class="form-hint">Must be at least 8 characters</div>
          </div>

          <button type="submit" class="btn btn-primary btn-block" id="register-btn">
            Create Account
          </button>

          <div id="register-error" style="color:var(--clr-red);font-size:13px;text-align:center;display:none;margin-top:8px;"></div>
        </form>

        <div class="auth-switch">
          Already have an account? <a href="javascript:void(0)" onclick="Router.go('#/login');return false;">Sign in</a>
        </div>
      </div>
    </div>
    `;

    document.getElementById('register-form').addEventListener('submit', (e) => this.handleRegister(e));
  },

  async handleRegister(e) {
    e.preventDefault();
    const btn = document.getElementById('register-btn');
    const errEl = document.getElementById('register-error');
    const form = e.target;
    const data = Utils.getFormData(form);

    errEl.style.display = 'none';
    Utils.showLoading(btn, 'Creating account...');

    try {
      const res = await api.auth.register(data);
      if (res?.data?.token) {
        Auth.setSession(res.data.token, res.data.user);
        Toast.success('Account created!', 'Welcome to VendorBridge');
        Router.go('#/dashboard');
      }
    } catch (err) {
      errEl.textContent = err.message || 'Registration failed.';
      errEl.style.display = 'block';
    } finally {
      Utils.hideLoading(btn);
    }
  }
};
