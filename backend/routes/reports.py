from flask import Blueprint, request
from backend.extensions import db
from backend.models.purchase_order import PurchaseOrder
from backend.models.invoice import Invoice
from backend.models.vendor import Vendor
from backend.models.rfq import RFQ
from backend.models.approval import Approval
from backend.middleware.auth_middleware import require_auth
from backend.utils.helpers import success_response
from datetime import datetime, timedelta
from sqlalchemy import func, extract

reports_bp = Blueprint('reports', __name__, url_prefix='/api/reports')


@reports_bp.route('/dashboard', methods=['GET'])
@require_auth
def dashboard_stats():
    """All KPIs for the dashboard"""
    from backend.models.vendor import Vendor
    from backend.models.rfq import RFQ
    from backend.models.activity_log import ActivityLog

    active_vendors = Vendor.query.filter_by(status='active').count()
    active_rfqs = RFQ.query.filter(RFQ.status.in_(['published', 'draft'])).count()
    pending_approvals = Approval.query.filter_by(status='pending').count()
    total_pos = PurchaseOrder.query.count()
    total_spend = db.session.query(
        func.coalesce(func.sum(PurchaseOrder.total_amount), 0)
    ).filter(PurchaseOrder.status != 'cancelled').scalar()
    pending_invoices = Invoice.query.filter(Invoice.status.in_(['generated', 'sent'])).count()

    # Recent activity
    from backend.models.activity_log import ActivityLog
    recent = ActivityLog.query.order_by(ActivityLog.created_at.desc()).limit(10).all()

    return success_response({
        'active_vendors': active_vendors,
        'active_rfqs': active_rfqs,
        'pending_approvals': pending_approvals,
        'total_pos': total_pos,
        'total_spend': float(total_spend),
        'pending_invoices': pending_invoices,
        'recent_activity': [a.to_dict() for a in recent]
    })


@reports_bp.route('/monthly-spend', methods=['GET'])
@require_auth
def monthly_spend():
    """Monthly procurement spend for the last 12 months"""
    year = request.args.get('year', datetime.now().year, type=int)

    results = db.session.query(
        extract('month', PurchaseOrder.created_at).label('month'),
        func.coalesce(func.sum(PurchaseOrder.total_amount), 0).label('total')
    ).filter(
        extract('year', PurchaseOrder.created_at) == year,
        PurchaseOrder.status != 'cancelled'
    ).group_by('month').order_by('month').all()

    months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
              'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
    data = {m: 0 for m in months}
    for row in results:
        data[months[int(row.month) - 1]] = float(row.total)

    return success_response({
        'year': year,
        'labels': list(data.keys()),
        'values': list(data.values()),
    })


@reports_bp.route('/top-vendors', methods=['GET'])
@require_auth
def top_vendors():
    """Top vendors by spend"""
    limit = request.args.get('limit', 5, type=int)
    results = db.session.query(
        Vendor.company_name,
        Vendor.category,
        func.count(PurchaseOrder.id).label('po_count'),
        func.coalesce(func.sum(PurchaseOrder.total_amount), 0).label('total_spend')
    ).join(PurchaseOrder, Vendor.id == PurchaseOrder.vendor_id)\
     .filter(PurchaseOrder.status != 'cancelled')\
     .group_by(Vendor.id, Vendor.company_name, Vendor.category)\
     .order_by(func.sum(PurchaseOrder.total_amount).desc())\
     .limit(limit).all()

    return success_response({
        'vendors': [
            {
                'company_name': r.company_name,
                'category': r.category,
                'po_count': r.po_count,
                'total_spend': float(r.total_spend)
            }
            for r in results
        ]
    })


@reports_bp.route('/category-spend', methods=['GET'])
@require_auth
def category_spend():
    """Procurement spend by vendor category"""
    results = db.session.query(
        Vendor.category,
        func.coalesce(func.sum(PurchaseOrder.total_amount), 0).label('total')
    ).join(PurchaseOrder, Vendor.id == PurchaseOrder.vendor_id)\
     .filter(PurchaseOrder.status != 'cancelled')\
     .group_by(Vendor.category).all()

    return success_response({
        'labels': [r.category for r in results],
        'values': [float(r.total) for r in results]
    })


@reports_bp.route('/approval-rate', methods=['GET'])
@require_auth
def approval_rate():
    total = Approval.query.count()
    approved = Approval.query.filter_by(status='approved').count()
    rejected = Approval.query.filter_by(status='rejected').count()
    pending = Approval.query.filter_by(status='pending').count()

    return success_response({
        'total': total,
        'approved': approved,
        'rejected': rejected,
        'pending': pending,
        'approval_rate': round((approved / total * 100), 1) if total > 0 else 0,
    })


@reports_bp.route('/vendor-performance', methods=['GET'])
@require_auth
def vendor_performance():
    """Vendor ratings and delivery performance"""
    from backend.models.quotation import Quotation
    results = db.session.query(
        Vendor.company_name,
        Vendor.rating,
        func.count(Quotation.id).label('total_bids'),
        func.avg(Quotation.delivery_days).label('avg_delivery'),
        func.avg(Quotation.price).label('avg_price')
    ).outerjoin(Quotation, Vendor.id == Quotation.vendor_id)\
     .filter(Vendor.status == 'active')\
     .group_by(Vendor.id, Vendor.company_name, Vendor.rating)\
     .order_by(Vendor.rating.desc()).limit(10).all()

    return success_response({
        'vendors': [
            {
                'company_name': r.company_name,
                'rating': float(r.rating) if r.rating else 0,
                'total_bids': r.total_bids or 0,
                'avg_delivery': round(float(r.avg_delivery), 1) if r.avg_delivery else 0,
                'avg_price': round(float(r.avg_price), 2) if r.avg_price else 0,
            }
            for r in results
        ]
    })
