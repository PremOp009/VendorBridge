from backend.extensions import db
from datetime import datetime, timezone


class ActivityLog(db.Model):
    __tablename__ = 'activity_logs'

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=True)
    action = db.Column(db.String(100), nullable=False)
    module = db.Column(db.String(50), nullable=False)
    entity_type = db.Column(db.String(50), nullable=True)
    entity_id = db.Column(db.Integer, nullable=True)
    description = db.Column(db.Text, nullable=True)
    ip_address = db.Column(db.String(45), nullable=True)
    created_at = db.Column(db.DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

    user = db.relationship('User', backref='activity_logs', lazy=True)

    def to_dict(self):
        return {
            'id': self.id,
            'user_id': self.user_id,
            'user_name': f"{self.user.first_name} {self.user.last_name}" if self.user else 'System',
            'action': self.action,
            'module': self.module,
            'entity_type': self.entity_type,
            'entity_id': self.entity_id,
            'description': self.description,
            'ip_address': self.ip_address,
            'created_at': self.created_at.isoformat() if self.created_at else None
        }

    @staticmethod
    def log(user_id, action, module, entity_type=None, entity_id=None, description=None, ip_address=None):
        log = ActivityLog(
            user_id=user_id,
            action=action,
            module=module,
            entity_type=entity_type,
            entity_id=entity_id,
            description=description,
            ip_address=ip_address
        )
        db.session.add(log)
        try:
            db.session.commit()
        except Exception:
            db.session.rollback()
