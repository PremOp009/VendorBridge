from backend.extensions import db
from datetime import datetime, timezone


class Quotation(db.Model):
    __tablename__ = 'quotations'

    id = db.Column(db.Integer, primary_key=True)
    rfq_id = db.Column(db.Integer, db.ForeignKey('rfqs.id', ondelete='CASCADE'), nullable=False)
    vendor_id = db.Column(db.Integer, db.ForeignKey('vendors.id', ondelete='CASCADE'), nullable=False)
    price = db.Column(db.Numeric(15, 2), nullable=False)
    tax_percentage = db.Column(db.Numeric(5, 2), default=18.00)
    delivery_days = db.Column(db.Integer, nullable=False)
    validity_days = db.Column(db.Integer, default=30)
    notes = db.Column(db.Text, nullable=True)
    terms_conditions = db.Column(db.Text, nullable=True)
    status = db.Column(db.String(30), default='submitted')
    submitted_at = db.Column(db.DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    updated_at = db.Column(db.DateTime(timezone=True), default=lambda: datetime.now(timezone.utc),
                           onupdate=lambda: datetime.now(timezone.utc))

    __table_args__ = (db.UniqueConstraint('rfq_id', 'vendor_id', name='uq_quotation_rfq_vendor'),)

    STATUSES = ['draft', 'submitted', 'under_review', 'shortlisted', 'rejected', 'accepted']

    approvals = db.relationship('Approval', backref='quotation', lazy=True)
    purchase_orders = db.relationship('PurchaseOrder', backref='quotation', lazy=True)

    @property
    def total_price(self):
        if self.price and self.tax_percentage:
            return float(self.price) * (1 + float(self.tax_percentage) / 100)
        return float(self.price) if self.price else 0

    @property
    def tax_amount(self):
        if self.price and self.tax_percentage:
            return float(self.price) * float(self.tax_percentage) / 100
        return 0

    def to_dict(self, include_vendor=True, include_rfq=False):
        data = {
            'id': self.id,
            'rfq_id': self.rfq_id,
            'vendor_id': self.vendor_id,
            'price': float(self.price) if self.price else 0,
            'tax_percentage': float(self.tax_percentage) if self.tax_percentage else 18,
            'tax_amount': round(self.tax_amount, 2),
            'total_price': round(self.total_price, 2),
            'delivery_days': self.delivery_days,
            'validity_days': self.validity_days,
            'notes': self.notes,
            'terms_conditions': self.terms_conditions,
            'status': self.status,
            'submitted_at': self.submitted_at.isoformat() if self.submitted_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None,
        }
        if include_vendor and self.vendor:
            data['vendor'] = self.vendor.to_dict()
        if include_rfq and self.rfq:
            data['rfq'] = self.rfq.to_dict()
        return data

    def __repr__(self):
        return f'<Quotation RFQ#{self.rfq_id} Vendor#{self.vendor_id}>'
