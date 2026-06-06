from flask import Blueprint, request
from backend.extensions import db
from backend.models.approval import Approval
from backend.models.quotation import Quotation
from backend.models.activity_log import ActivityLog
from backend.middleware.auth_middleware import require_auth, require_role, get_current_user
from backend.utils.helpers import success_response, error_response, get_client_ip
from datetime import datetime, timezone

approvals_bp = Blueprint('approvals', __name__, url_prefix='/api/approvals')


@approvals_bp.route('/', methods=['GET'])
@require_auth
def get_approvals():
    status = request.args.get('status', '')
    page = request.args.get('page', 1, type=int)

    query = Approval.query
    if status:
        query = query.filter_by(status=status)

    query = query.order_by(Approval.created_at.desc())
    pagination = query.paginate(page=page, per_page=20, error_out=False)

    return success_response({
        'approvals': [a.to_dict() for a in pagination.items],
        'total': pagination.total,
        'pages': pagination.pages,
        'page': pagination.page,
    })


@approvals_bp.route('/<int:aid>', methods=['GET'])
@require_auth
def get_approval(aid):
    a = Approval.query.get_or_404(aid)
    return success_response(a.to_dict())


@approvals_bp.route('/', methods=['POST'])
@require_role('admin', 'procurement_manager')
def create_approval():
    """Submit quotation for approval"""
    data = request.get_json()
    if not data or not data.get('quotation_id'):
        return error_response('quotation_id is required')

    quotation = Quotation.query.get(data['quotation_id'])
    if not quotation:
        return error_response('Quotation not found', 404)

    existing = Approval.query.filter_by(quotation_id=data['quotation_id']).first()
    if existing:
        return error_response('Approval already exists for this quotation')

    approval = Approval(
        quotation_id=data['quotation_id'],
        status='pending',
        remarks=data.get('remarks', ''),
    )
    db.session.add(approval)

    quotation.status = 'under_review'
    db.session.commit()

    user = get_current_user()
    ActivityLog.log(user.id if user else None, 'CREATE_APPROVAL', 'approvals',
                    'approval', approval.id,
                    f'Approval request for Quotation #{data["quotation_id"]}',
                    get_client_ip(request))

    return success_response(approval.to_dict(), 'Approval request created', 201)


@approvals_bp.route('/<int:aid>/approve', methods=['PUT'])
@require_role('admin', 'procurement_manager', 'finance_officer')
def approve(aid):
    approval = Approval.query.get_or_404(aid)
    data = request.get_json() or {}

    user = get_current_user()
    approval.status = 'approved'
    approval.approved_by = user.id if user else None
    approval.remarks = data.get('remarks', approval.remarks)
    approval.approved_at = datetime.now(timezone.utc)

    # Update quotation status
    if approval.quotation:
        approval.quotation.status = 'accepted'

    db.session.commit()

    ActivityLog.log(user.id if user else None, 'APPROVE_QUOTATION', 'approvals',
                    'approval', aid,
                    f'Approval #{aid} approved by {user.full_name if user else "System"}',
                    get_client_ip(request))

    return success_response(approval.to_dict(), 'Approval granted')


@approvals_bp.route('/<int:aid>/reject', methods=['PUT'])
@require_role('admin', 'procurement_manager', 'finance_officer')
def reject(aid):
    approval = Approval.query.get_or_404(aid)
    data = request.get_json() or {}

    user = get_current_user()
    approval.status = 'rejected'
    approval.approved_by = user.id if user else None
    approval.remarks = data.get('remarks', 'Rejected')
    approval.approved_at = datetime.now(timezone.utc)

    if approval.quotation:
        approval.quotation.status = 'rejected'

    db.session.commit()

    ActivityLog.log(user.id if user else None, 'REJECT_QUOTATION', 'approvals',
                    'approval', aid,
                    f'Approval #{aid} rejected',
                    get_client_ip(request))

    return success_response(approval.to_dict(), 'Approval rejected')


@approvals_bp.route('/stats', methods=['GET'])
@require_auth
def approval_stats():
    pending = Approval.query.filter_by(status='pending').count()
    approved = Approval.query.filter_by(status='approved').count()
    rejected = Approval.query.filter_by(status='rejected').count()
    total = Approval.query.count()
    rate = round((approved / total * 100), 1) if total > 0 else 0

    return success_response({
        'pending': pending,
        'approved': approved,
        'rejected': rejected,
        'total': total,
        'approval_rate': rate
    })
