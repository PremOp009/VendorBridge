from backend.extensions import db
from datetime import datetime, timezone


class Vendor(db.Model):
    __tablename__ = 'vendors'

    id = db.Column(db.Integer, primary_key=True)
    company_name = db.Column(db.String(255), nullable=False)
    category = db.Column(db.String(100), nullable=False)
    gst_number = db.Column(db.String(20), nullable=True)
    email = db.Column(db.String(255), nullable=False)
    phone = db.Column(db.String(20), nullable=True)
    address = db.Column(db.Text, nullable=True)
    city = db.Column(db.String(100), nullable=True)
    state = db.Column(db.String(100), nullable=True)
    country = db.Column(db.String(100), default='India')
    pincode = db.Column(db.String(10), nullable=True)
    rating = db.Column(db.Numeric(3, 2), default=0.00)
    status = db.Column(db.String(20), default='active')
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=True)
    notes = db.Column(db.Text, nullable=True)
    created_at = db.Column(db.DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    updated_at = db.Column(db.DateTime(timezone=True), default=lambda: datetime.now(timezone.utc),
                           onupdate=lambda: datetime.now(timezone.utc))

    CATEGORIES = ['IT Equipment', 'Office Supplies', 'Construction', 'Furniture',
                  'Facilities Management', 'Logistics', 'Marketing', 'Software', 'Consulting', 'Other']
    STATUSES = ['active', 'inactive', 'blacklisted', 'pending']

    user = db.relationship('User', backref='vendor', lazy=True)
    quotations = db.relationship('Quotation', backref='vendor', lazy=True)

    def to_dict(self):
        return {
            'id': self.id,
            'company_name': self.company_name,
            'category': self.category,
            'gst_number': self.gst_number,
            'email': self.email,
            'phone': self.phone,
            'address': self.address,
            'city': self.city,
            'state': self.state,
            'country': self.country,
            'pincode': self.pincode,
            'rating': float(self.rating) if self.rating else 0.0,
            'status': self.status,
            'user_id': self.user_id,
            'notes': self.notes,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None,
        }

    def __repr__(self):
        return f'<Vendor {self.company_name}>'
