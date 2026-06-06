from backend.extensions import db
from datetime import datetime, timezone

# Junction table for RFQ <-> Vendors
rfq_vendors = db.Table('rfq_vendors',
    db.Column('id', db.Integer, primary_key=True),
    db.Column('rfq_id', db.Integer, db.ForeignKey('rfqs.id', ondelete='CASCADE'), nullable=False),
    db.Column('vendor_id', db.Integer, db.ForeignKey('vendors.id', ondelete='CASCADE'), nullable=False),
    db.Column('invited_at', db.DateTime(timezone=True), default=lambda: datetime.now(timezone.utc)),
    db.UniqueConstraint('rfq_id', 'vendor_id', name='uq_rfq_vendor')
)


class RFQ(db.Model):
    __tablename__ = 'rfqs'

    id = db.Column(db.Integer, primary_key=True)
    rfq_number = db.Column(db.String(30), unique=True, nullable=False)
    title = db.Column(db.String(255), nullable=False)
    description = db.Column(db.Text, nullable=True)
    category = db.Column(db.String(100), nullable=True)
    quantity = db.Column(db.Numeric(10, 2), nullable=True)
    unit = db.Column(db.String(50), nullable=True)
    budget_amount = db.Column(db.Numeric(15, 2), nullable=True)
    deadline = db.Column(db.Date, nullable=False)
    created_by = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=True)
    status = db.Column(db.String(30), default='draft')
    attachment_path = db.Column(db.String(500), nullable=True)
    created_at = db.Column(db.DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    updated_at = db.Column(db.DateTime(timezone=True), default=lambda: datetime.now(timezone.utc),
                           onupdate=lambda: datetime.now(timezone.utc))

    STATUSES = ['draft', 'published', 'closed', 'cancelled', 'awarded']

    creator = db.relationship('User', backref='rfqs', lazy=True)
    vendors = db.relationship('Vendor', secondary=rfq_vendors, backref='rfqs', lazy=True)
    quotations = db.relationship('Quotation', backref='rfq', lazy=True)

    @staticmethod
    def generate_rfq_number():
        from datetime import date
        year = date.today().year
        count = RFQ.query.filter(
            db.func.extract('year', RFQ.created_at) == year
        ).count() + 1
        return f"RFQ-{year}-{count:04d}"

    def to_dict(self, include_vendors=False):
        data = {
            'id': self.id,
            'rfq_number': self.rfq_number,
            'title': self.title,
            'description': self.description,
            'category': self.category,
            'quantity': float(self.quantity) if self.quantity else None,
            'unit': self.unit,
            'budget_amount': float(self.budget_amount) if self.budget_amount else None,
            'deadline': self.deadline.isoformat() if self.deadline else None,
            'created_by': self.created_by,
            'creator_name': self.creator.full_name if self.creator else None,
            'status': self.status,
            'attachment_path': self.attachment_path,
            'quotation_count': len(self.quotations),
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None,
        }
        if include_vendors:
            data['vendors'] = [v.to_dict() for v in self.vendors]
        return data

    def __repr__(self):
        return f'<RFQ {self.rfq_number}: {self.title}>'
