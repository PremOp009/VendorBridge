import os
from flask import Flask, jsonify
from flask_cors import CORS
from backend.extensions import db, jwt, mail, migrate
from backend.config.config import config


def create_app(config_name=None):
    if config_name is None:
        config_name = os.environ.get('FLASK_ENV', 'development')

    app = Flask(__name__)
    app.config.from_object(config.get(config_name, config['default']))

    # Ensure upload directories exist
    os.makedirs(app.config.get('UPLOAD_FOLDER', 'uploads'), exist_ok=True)
    os.makedirs(app.config.get('PDF_FOLDER', 'pdfs'), exist_ok=True)

    # Initialize extensions
    db.init_app(app)
    jwt.init_app(app)
    mail.init_app(app)
    migrate.init_app(app, db)

    # CORS — allow Live Server, direct file open (null), and any localhost
    CORS(app, origins="*", allow_headers=["Content-Type", "Authorization"],
         methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"])

    # Register all route blueprints
    from backend.routes import register_routes
    register_routes(app)

    # Import all models so migrations see them
    with app.app_context():
        from backend.models import (User, Vendor, RFQ, Quotation,
                                    Approval, PurchaseOrder, Invoice, ActivityLog)
        db.create_all()
        _seed_admin(app)

    # JWT error handlers
    @jwt.expired_token_loader
    def expired_token_callback(jwt_header, jwt_data):
        return jsonify({'error': 'Token has expired'}), 401

    @jwt.invalid_token_loader
    def invalid_token_callback(error):
        return jsonify({'error': 'Invalid token'}), 401

    @jwt.unauthorized_loader
    def missing_token_callback(error):
        return jsonify({'error': 'Authorization token required'}), 401

    # Global error handlers
    @app.errorhandler(404)
    def not_found(e):
        return jsonify({'error': 'Resource not found'}), 404

    @app.errorhandler(405)
    def method_not_allowed(e):
        return jsonify({'error': 'Method not allowed'}), 405

    @app.errorhandler(500)
    def internal_error(e):
        return jsonify({'error': 'Internal server error'}), 500

    @app.route('/api/health')
    def health():
        return jsonify({'status': 'ok', 'app': 'VendorBridge ERP'})

    return app


def _seed_admin(app):
    """Create default admin user on first run"""
    from backend.models.user import User
    from backend.models.vendor import Vendor
    from backend.extensions import db

    if User.query.count() == 0:
        admin = User(
            first_name='Admin',
            last_name='User',
            email='admin@vendorbridge.com',
            role='admin'
        )
        admin.set_password('Admin@1234')
        db.session.add(admin)

        pm = User(
            first_name='Raj',
            last_name='Sharma',
            email='procurement@vendorbridge.com',
            role='procurement_manager'
        )
        pm.set_password('Admin@1234')
        db.session.add(pm)

        finance = User(
            first_name='Priya',
            last_name='Patel',
            email='finance@vendorbridge.com',
            role='finance_officer'
        )
        finance.set_password('Admin@1234')
        db.session.add(finance)
        db.session.commit()
        app.logger.info("✅ Seeded default users")

    if Vendor.query.count() == 0:
        vendors = [
            Vendor(company_name='TechSupply India Pvt Ltd', category='IT Equipment',
                   gst_number='27AABCT1234A1ZX', email='contact@techsupply.in',
                   phone='+91-9876543210', city='Mumbai', state='Maharashtra',
                   rating=4.5, status='active'),
            Vendor(company_name='Stationery World', category='Office Supplies',
                   gst_number='29AABCS5678B2ZY', email='info@stationeryworld.com',
                   phone='+91-9876543211', city='Bangalore', state='Karnataka',
                   rating=4.2, status='active'),
            Vendor(company_name='BuildRight Contractors', category='Construction',
                   gst_number='07AABCB9012C3ZZ', email='projects@buildright.in',
                   phone='+91-9876543212', city='Delhi', state='Delhi',
                   rating=3.8, status='active'),
            Vendor(company_name='FurniturePlus India', category='Furniture',
                   gst_number='33AABCF3456D4ZW', email='sales@furnitureplus.in',
                   phone='+91-9876543213', city='Chennai', state='Tamil Nadu',
                   rating=4.7, status='active'),
            Vendor(company_name='CleanServ Solutions', category='Facilities Management',
                   gst_number='06AABCC7890E5ZV', email='service@cleanserv.in',
                   phone='+91-9876543214', city='Hyderabad', state='Telangana',
                   rating=4.0, status='active'),
        ]
        db.session.bulk_save_objects(vendors)
        db.session.commit()
        app.logger.info("✅ Seeded sample vendors")


# Entry point
app = create_app()

if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=5000)
