/* ================================================================
   VendorBridge — Login Page
   ================================================================ */

Pages.login = {
  async render() {
    const authPage = document.getElementById('auth-page');
    if (!authPage) return;

    authPage.innerHTML = `
    <div class="auth-left">
      <div class="auth-brand">
        <div class="logo">🌉 VendorBridge</div>
        <div class="tagline">Enterprise Procurement & Vendor Management ERP</div>
      </div>
      <div class="auth-features">
        <div class="auth-feature">
          <div class="auth-feature-icon">🏢</div>
          <div class="auth-feature-text">
            <h4>Vendor Management</h4>
            <p>Centralize all vendor records with GST details, categories & ratings</p>
          </div>
        </div>
        <div class="auth-feature">
          <div class="auth-feature-icon">📋</div>
          <div class="auth-feature-text">
            <h4>RFQ & Quotations</h4>
            <p>Create RFQs, receive quotes and compare them side-by-side with AI scoring</p>
          </div>
        </div>
        <div class="auth-feature">
          <div class="auth-feature-icon">✅</div>
          <div class="auth-feature-text">
            <h4>Approval Workflow</h4>
            <p>Structured multi-level approvals with full audit trail</p>
          </div>
        </div>
        <div class="auth-feature">
          <div class="auth-feature-icon">🧾</div>
          <div class="auth-feature-text">
            <h4>Invoice & PDF</h4>
            <p>Auto-generate invoices with PDF download and email delivery</p>
          </div>
        </div>
      </div>
    </div>

    <div class="auth-right">
      <div class="auth-card">
        <h2>Welcome back</h2>
        <p class="subtitle">Sign in to your VendorBridge account</p>

        <form id="login-form" class="login-form-fields">
          <div class="form-group">
            <label class="form-label">Email Address <span class="required">*</span></label>
            <div class="input-group">
              <span class="input-icon">📧</span>
              <input type="email" class="form-input" name="email" id="login-email"
                     placeholder="admin@vendorbridge.com" autocomplete="email" required />
            </div>
          </div>

          <div class="form-group">
            <label class="form-label">Password <span class="required">*</span></label>
            <div class="input-group">
              <span class="input-icon">🔒</span>
              <input type="password" class="form-input" name="password" id="login-password"
                     placeholder="Enter password" autocomplete="current-password" required />
            </div>
            <a href="#" class="forgot-link">Forgot password?</a>
          </div>

          <button type="submit" class="btn btn-primary btn-block" id="login-btn">
            Sign In
          </button>

          <div id="login-error" style="color:var(--clr-red);font-size:13px;text-align:center;display:none;margin-top:8px;"></div>
        </form>

        <div class="auth-divider"><span>Demo Accounts</span></div>

        <div class="demo-accounts">
          <h4>Click to auto-fill</h4>
          <div class="demo-account-item" onclick="Pages.login.fillDemo('admin@vendorbridge.com','Admin@1234')">
            <span>👑</span>
            <span>admin@vendorbridge.com</span>
            <span class="role-chip">Admin</span>
          </div>
          <div class="demo-account-item" onclick="Pages.login.fillDemo('procurement@vendorbridge.com','Admin@1234')">
            <span>📋</span>
            <span>procurement@vendorbridge.com</span>
            <span class="role-chip">PM</span>
          </div>
          <div class="demo-account-item" onclick="Pages.login.fillDemo('finance@vendorbridge.com','Admin@1234')">
            <span>💰</span>
            <span>finance@vendorbridge.com</span>
            <span class="role-chip">Finance</span>
          </div>
        </div>

        <div class="auth-switch">
          Don't have an account? <a href="javascript:void(0)" onclick="Router.go('#/register');return false;">Create account</a>
        </div>
      </div>
    </div>
    `;

    document.getElementById('login-form').addEventListener('submit', (e) => this.handleLogin(e));
  },

  fillDemo(email, password) {
    document.getElementById('login-email').value = email;
    document.getElementById('login-password').value = password;
  },

  async handleLogin(e) {
    e.preventDefault();
    const btn = document.getElementById('login-btn');
    const errEl = document.getElementById('login-error');
    const email = document.getElementById('login-email').value;
    const password = document.getElementById('login-password').value;

    errEl.style.display = 'none';
    Utils.showLoading(btn, 'Signing in...');

    try {
      const res = await api.auth.login({ email, password });
      if (res?.data?.token) {
        Auth.setSession(res.data.token, res.data.user);
        Toast.success('Welcome back!', `Logged in as ${res.data.user.first_name}`);
        Router.go('#/dashboard');
      }
    } catch (err) {
      errEl.textContent = err.message || 'Login failed. Check your credentials.';
      errEl.style.display = 'block';
    } finally {
      Utils.hideLoading(btn);
    }
  }
};
