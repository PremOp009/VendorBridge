from backend.extensions import db
from datetime import datetime, timezone


class Invoice(db.Model):
    __tablename__ = 'invoices'

    id = db.Column(db.Integer, primary_key=True)
    invoice_number = db.Column(db.String(30), unique=True, nullable=False)
    po_id = db.Column(db.Integer, db.ForeignKey('purchase_orders.id'), nullable=False)
    vendor_id = db.Column(db.Integer, db.ForeignKey('vendors.id'), nullable=False)
    subtotal = db.Column(db.Numeric(15, 2), nullable=False)
    tax_amount = db.Column(db.Numeric(15, 2), default=0.00)
    total_amount = db.Column(db.Numeric(15, 2), nullable=False)
    pdf_path = db.Column(db.String(500), nullable=True)
    email_sent = db.Column(db.Boolean, default=False)
    email_sent_at = db.Column(db.DateTime(timezone=True), nullable=True)
    status = db.Column(db.String(20), default='generated')
    due_date = db.Column(db.Date, nullable=True)
    paid_at = db.Column(db.DateTime(timezone=True), nullable=True)
    generated_at = db.Column(db.DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    created_by = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=True)

    STATUSES = ['draft', 'generated', 'sent', 'paid', 'overdue', 'cancelled']

    vendor = db.relationship('Vendor', backref='invoices', lazy=True)
    creator = db.relationship('User', backref='invoices', lazy=True)

    @staticmethod
    def generate_invoice_number():
        from datetime import date
        year = date.today().year
        count = Invoice.query.filter(
            db.func.extract('year', Invoice.generated_at) == year
        ).count() + 1
        return f"INV-{year}-{count:04d}"

    def to_dict(self):
        return {
            'id': self.id,
            'invoice_number': self.invoice_number,
            'po_id': self.po_id,
            'po_number': self.purchase_order.po_number if self.purchase_order else None,
            'vendor_id': self.vendor_id,
            'vendor_name': self.vendor.company_name if self.vendor else None,
            'vendor_email': self.vendor.email if self.vendor else None,
            'subtotal': float(self.subtotal) if self.subtotal else 0,
            'tax_amount': float(self.tax_amount) if self.tax_amount else 0,
            'total_amount': float(self.total_amount) if self.total_amount else 0,
            'pdf_path': self.pdf_path,
            'email_sent': self.email_sent,
            'email_sent_at': self.email_sent_at.isoformat() if self.email_sent_at else None,
            'status': self.status,
            'due_date': self.due_date.isoformat() if self.due_date else None,
            'paid_at': self.paid_at.isoformat() if self.paid_at else None,
            'generated_at': self.generated_at.isoformat() if self.generated_at else None,
            'created_by': self.created_by,
        }

    def __repr__(self):
        return f'<Invoice {self.invoice_number}>'
