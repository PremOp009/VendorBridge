/* ================================================================
   VendorBridge — SPA Router + App Initialization
   ================================================================
   NOTE: window.Pages and a stub window.Router are pre-created by an
   inline <script> in index.html BEFORE any external JS loads.
   Page scripts (login.js, vendors.js, …) each do:
       Pages.someKey = { render() { … } }
   So by the time this file runs, window.Pages is already populated.
   We use Object.assign to upgrade the stub Router in-place so that
   any existing onclick references still work.
   ================================================================ */

Object.assign(window.Router, {

  _routes: {
    '#/login':           function() { return Pages.login.render();          },
    '#/register':        function() { return Pages.register.render();       },
    '#/dashboard':       function() { return Pages.dashboard.render();      },
    '#/vendors':         function() { return Pages.vendors.render();        },
    '#/rfqs':            function() { return Pages.rfqs.render();           },
    '#/quotations':      function() { return Pages.quotations.render();     },
    '#/comparison':      function() { return Pages.comparison.render();     },
    '#/approvals':       function() { return Pages.approvals.render();      },
    '#/purchase-orders': function() { return Pages.purchaseOrders.render(); },
    '#/invoices':        function() { return Pages.invoices.render();       },
    '#/reports':         function() { return Pages.reports.render();        },
    '#/activity-logs':   function() { return Pages.activityLogs.render();   },
  },

  _publicRoutes: ['#/login', '#/register'],

  go: function(path) {
    window.location.hash = path;
  },

  _getPath: function() {
    var hash = window.location.hash || '#/login';
    return hash.split('?')[0];
  },

  route: async function() {
    var path     = this._getPath();
    var isPublic = this._publicRoutes.includes(path);
    var isKnown  = !!this._routes[path];

    // Unknown / bare hash  → redirect to the right home
    if (!isKnown) {
      window.location.hash = Auth.isAuthenticated() ? '#/dashboard' : '#/login';
      return;
    }

    // Auth guard
    if (!isPublic && !Auth.isAuthenticated()) {
      window.location.hash = '#/login';
      return;
    }
    if (isPublic && Auth.isAuthenticated()) {
      window.location.hash = '#/dashboard';
      return;
    }

    // Toggle shells
    var appEl    = document.getElementById('app');
    var authPage = document.getElementById('auth-page');

    if (isPublic) {
      if (appEl)    appEl.style.display    = 'none';
      if (authPage) authPage.style.display = 'flex';
    } else {
      if (appEl)    appEl.style.display    = 'flex';
      if (authPage) authPage.style.display = 'none';

      Sidebar.render();
      Topbar.render(path);
      Sidebar.setActive(path);
    }

    // Render page
    var handler = this._routes[path];
    var content = document.getElementById('page-content');

    if (handler) {
      if (content) {
        content.innerHTML = '<div class="page-loader"><div class="spinner"></div></div>';
      }
      try {
        await handler();
        if (content) {
          content.classList.add('page-enter');
          setTimeout(function() { content.classList.remove('page-enter'); }, 350);
        }
      } catch (err) {
        console.error('[Router] Page render error:', err);
        if (content) {
          content.innerHTML =
            '<div class="empty-state">' +
              '<div class="empty-state-icon">⚠️</div>' +
              '<h3>Something went wrong</h3>' +
              '<p>' + (err.message || 'Unknown error') + '</p>' +
              '<button class="btn btn-primary" onclick="Router.go(\'#/dashboard\')">Go to Dashboard</button>' +
            '</div>';
        }
      }
      Topbar.updatePageTitle(path);
      _loadPendingBadge();
    } else {
      this.go('#/dashboard');
    }
  },

  init: function() {
    var self = this;
    window.addEventListener('hashchange', function() { self.route(); });
    self.route();
  }

}); // end Object.assign(window.Router, …)


/* ── Helpers ───────────────────────────────────────────────── */
async function _loadPendingBadge() {
  if (!Auth.isAuthenticated()) return;
  try {
    var data = await api.approvals.stats();
    if (data && data.data && data.data.pending > 0) {
      Sidebar.updateBadge('pendingApprovals', data.data.pending);
    }
  } catch (e) { /* silent */ }
}

/* ── Boot ──────────────────────────────────────────────────── */
document.addEventListener('DOMContentLoaded', function() {
  Toast.init();
  Router.init();
});
