from backend.extensions import db
from datetime import datetime, timezone


class Approval(db.Model):
    __tablename__ = 'approvals'

    id = db.Column(db.Integer, primary_key=True)
    quotation_id = db.Column(db.Integer, db.ForeignKey('quotations.id', ondelete='CASCADE'), nullable=False)
    approved_by = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=True)
    remarks = db.Column(db.Text, nullable=True)
    status = db.Column(db.String(20), default='pending')
    approved_at = db.Column(db.DateTime(timezone=True), nullable=True)
    created_at = db.Column(db.DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

    STATUSES = ['pending', 'approved', 'rejected', 'revision_requested']

    approver = db.relationship('User', backref='approvals', lazy=True)

    def to_dict(self):
        return {
            'id': self.id,
            'quotation_id': self.quotation_id,
            'approved_by': self.approved_by,
            'approver_name': self.approver.full_name if self.approver else None,
            'remarks': self.remarks,
            'status': self.status,
            'approved_at': self.approved_at.isoformat() if self.approved_at else None,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'quotation': self.quotation.to_dict() if self.quotation else None,
        }

    def __repr__(self):
        return f'<Approval Quotation#{self.quotation_id} {self.status}>'
