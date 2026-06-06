from backend.routes.auth import auth_bp
from backend.routes.vendors import vendors_bp
from backend.routes.rfqs import rfqs_bp
from backend.routes.quotations import quotations_bp
from backend.routes.approvals import approvals_bp
from backend.routes.purchase_orders import purchase_orders_bp
from backend.routes.invoices import invoices_bp
from backend.routes.reports import reports_bp
from backend.routes.activity_logs import activity_logs_bp


def register_routes(app):
    app.register_blueprint(auth_bp)
    app.register_blueprint(vendors_bp)
    app.register_blueprint(rfqs_bp)
    app.register_blueprint(quotations_bp)
    app.register_blueprint(approvals_bp)
    app.register_blueprint(purchase_orders_bp)
    app.register_blueprint(invoices_bp)
    app.register_blueprint(reports_bp)
    app.register_blueprint(activity_logs_bp)
