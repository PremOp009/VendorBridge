from backend.extensions import db
from datetime import datetime, timezone


class PurchaseOrder(db.Model):
    __tablename__ = 'purchase_orders'

    id = db.Column(db.Integer, primary_key=True)
    po_number = db.Column(db.String(30), unique=True, nullable=False)
    quotation_id = db.Column(db.Integer, db.ForeignKey('quotations.id'), nullable=False)
    vendor_id = db.Column(db.Integer, db.ForeignKey('vendors.id'), nullable=False)
    rfq_id = db.Column(db.Integer, db.ForeignKey('rfqs.id'), nullable=True)
    subtotal = db.Column(db.Numeric(15, 2), nullable=False)
    tax_amount = db.Column(db.Numeric(15, 2), default=0.00)
    total_amount = db.Column(db.Numeric(15, 2), nullable=False)
    delivery_address = db.Column(db.Text, nullable=True)
    expected_delivery = db.Column(db.Date, nullable=True)
    status = db.Column(db.String(30), default='issued')
    created_by = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=True)
    created_at = db.Column(db.DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    updated_at = db.Column(db.DateTime(timezone=True), default=lambda: datetime.now(timezone.utc),
                           onupdate=lambda: datetime.now(timezone.utc))

    STATUSES = ['draft', 'issued', 'acknowledged', 'in_progress', 'delivered', 'cancelled']

    vendor = db.relationship('Vendor', backref='purchase_orders', lazy=True)
    creator = db.relationship('User', backref='purchase_orders', lazy=True)
    invoices = db.relationship('Invoice', backref='purchase_order', lazy=True)

    @staticmethod
    def generate_po_number():
        from datetime import date
        year = date.today().year
        count = PurchaseOrder.query.filter(
            db.func.extract('year', PurchaseOrder.created_at) == year
        ).count() + 1
        return f"PO-{year}-{count:04d}"

    def to_dict(self):
        return {
            'id': self.id,
            'po_number': self.po_number,
            'quotation_id': self.quotation_id,
            'vendor_id': self.vendor_id,
            'rfq_id': self.rfq_id,
            'vendor_name': self.vendor.company_name if self.vendor else None,
            'subtotal': float(self.subtotal) if self.subtotal else 0,
            'tax_amount': float(self.tax_amount) if self.tax_amount else 0,
            'total_amount': float(self.total_amount) if self.total_amount else 0,
            'delivery_address': self.delivery_address,
            'expected_delivery': self.expected_delivery.isoformat() if self.expected_delivery else None,
            'status': self.status,
            'created_by': self.created_by,
            'creator_name': self.creator.full_name if self.creator else None,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None,
            'invoice_count': len(self.invoices),
        }

    def __repr__(self):
        return f'<PO {self.po_number}>'
