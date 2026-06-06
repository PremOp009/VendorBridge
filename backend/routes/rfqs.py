from flask import Blueprint, request
from backend.extensions import db
from backend.models.rfq import RFQ
from backend.models.vendor import Vendor
from backend.models.activity_log import ActivityLog
from backend.middleware.auth_middleware import require_auth, require_role, get_current_user
from backend.utils.helpers import success_response, error_response, get_client_ip
from datetime import date as Date

rfqs_bp = Blueprint('rfqs', __name__, url_prefix='/api/rfqs')


@rfqs_bp.route('/', methods=['GET'])
@require_auth
def get_rfqs():
    page = request.args.get('page', 1, type=int)
    per_page = request.args.get('per_page', 20, type=int)
    status = request.args.get('status', '')
    search = request.args.get('search', '')

    query = RFQ.query
    if status:
        query = query.filter_by(status=status)
    if search:
        query = query.filter(RFQ.title.ilike(f'%{search}%'))

    query = query.order_by(RFQ.created_at.desc())
    pagination = query.paginate(page=page, per_page=per_page, error_out=False)

    return success_response({
        'rfqs': [r.to_dict(include_vendors=True) for r in pagination.items],
        'total': pagination.total,
        'pages': pagination.pages,
        'page': pagination.page,
    })


@rfqs_bp.route('/<int:rfq_id>', methods=['GET'])
@require_auth
def get_rfq(rfq_id):
    rfq = RFQ.query.get_or_404(rfq_id)
    return success_response(rfq.to_dict(include_vendors=True))


@rfqs_bp.route('/', methods=['POST'])
@require_auth
def create_rfq():
    data = request.get_json()
    if not data:
        return error_response('No data provided')

    required = ['title', 'deadline']
    for field in required:
        if not data.get(field, ''):
            return error_response(f'{field} is required')

    user = get_current_user()
    rfq = RFQ(
        rfq_number=RFQ.generate_rfq_number(),
        title=data['title'].strip(),
        description=data.get('description', ''),
        category=data.get('category', ''),
        quantity=data.get('quantity'),
        unit=data.get('unit', ''),
        budget_amount=data.get('budget_amount'),
        deadline=Date.fromisoformat(data['deadline']),
        created_by=user.id if user else None,
        status=data.get('status', 'draft'),
    )

    # Assign vendors
    vendor_ids = data.get('vendor_ids', [])
    for vid in vendor_ids:
        v = Vendor.query.get(vid)
        if v:
            rfq.vendors.append(v)

    db.session.add(rfq)
    db.session.commit()

    ActivityLog.log(user.id if user else None, 'CREATE_RFQ', 'rfqs',
                    'rfq', rfq.id, f'RFQ {rfq.rfq_number}: {rfq.title} created',
                    get_client_ip(request))

    return success_response(rfq.to_dict(include_vendors=True), 'RFQ created successfully', 201)


@rfqs_bp.route('/<int:rfq_id>', methods=['PUT'])
@require_auth
def update_rfq(rfq_id):
    rfq = RFQ.query.get_or_404(rfq_id)
    data = request.get_json()

    for field in ['title', 'description', 'category', 'status']:
        if field in data:
            setattr(rfq, field, data[field])

    if 'quantity' in data:
        rfq.quantity = data['quantity']
    if 'budget_amount' in data:
        rfq.budget_amount = data['budget_amount']
    if 'deadline' in data:
        rfq.deadline = Date.fromisoformat(data['deadline'])

    if 'vendor_ids' in data:
        rfq.vendors = []
        for vid in data['vendor_ids']:
            v = Vendor.query.get(vid)
            if v:
                rfq.vendors.append(v)

    db.session.commit()

    user = get_current_user()
    ActivityLog.log(user.id if user else None, 'UPDATE_RFQ', 'rfqs',
                    'rfq', rfq.id, f'RFQ {rfq.rfq_number} updated',
                    get_client_ip(request))

    return success_response(rfq.to_dict(include_vendors=True), 'RFQ updated successfully')


@rfqs_bp.route('/<int:rfq_id>', methods=['DELETE'])
@require_auth
def delete_rfq(rfq_id):
    rfq = RFQ.query.get_or_404(rfq_id)
    number = rfq.rfq_number
    db.session.delete(rfq)
    db.session.commit()

    user = get_current_user()
    ActivityLog.log(user.id if user else None, 'DELETE_RFQ', 'rfqs',
                    'rfq', rfq_id, f'RFQ {number} deleted', get_client_ip(request))

    return success_response(message='RFQ deleted successfully')


@rfqs_bp.route('/stats', methods=['GET'])
@require_auth
def rfq_stats():
    from backend.models.rfq import RFQ
    stats = {}
    for s in RFQ.STATUSES:
        stats[s] = RFQ.query.filter_by(status=s).count()
    stats['total'] = RFQ.query.count()
    return success_response(stats)
