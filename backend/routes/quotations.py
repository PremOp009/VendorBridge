from flask import Blueprint, request
from backend.extensions import db
from backend.models.quotation import Quotation
from backend.models.rfq import RFQ
from backend.models.vendor import Vendor
from backend.models.activity_log import ActivityLog
from backend.middleware.auth_middleware import require_auth, require_role, get_current_user
from backend.utils.helpers import success_response, error_response, get_client_ip
from backend.services.ai_service import score_quotations

quotations_bp = Blueprint('quotations', __name__, url_prefix='/api/quotations')


@quotations_bp.route('/', methods=['GET'])
@require_auth
def get_quotations():
    rfq_id = request.args.get('rfq_id', type=int)
    vendor_id = request.args.get('vendor_id', type=int)
    status = request.args.get('status', '')

    query = Quotation.query
    if rfq_id:
        query = query.filter_by(rfq_id=rfq_id)
    if vendor_id:
        query = query.filter_by(vendor_id=vendor_id)
    if status:
        query = query.filter_by(status=status)

    quotations = query.order_by(Quotation.submitted_at.desc()).all()
    return success_response({'quotations': [q.to_dict() for q in quotations]})


@quotations_bp.route('/<int:qid>', methods=['GET'])
@require_auth
def get_quotation(qid):
    q = Quotation.query.get_or_404(qid)
    return success_response(q.to_dict(include_rfq=True))


@quotations_bp.route('/', methods=['POST'])
@require_auth
def create_quotation():
    data = request.get_json()
    if not data:
        return error_response('No data provided')

    required = ['rfq_id', 'vendor_id', 'price', 'delivery_days']
    for field in required:
        if data.get(field) is None:
            return error_response(f'{field} is required')

    rfq = RFQ.query.get(data['rfq_id'])
    if not rfq:
        return error_response('RFQ not found', 404)
    if rfq.status not in ['published', 'draft']:
        return error_response('RFQ is not open for quotations')

    existing = Quotation.query.filter_by(
        rfq_id=data['rfq_id'], vendor_id=data['vendor_id']
    ).first()
    if existing:
        return error_response('Quotation already submitted for this RFQ')

    q = Quotation(
        rfq_id=data['rfq_id'],
        vendor_id=data['vendor_id'],
        price=float(data['price']),
        tax_percentage=float(data.get('tax_percentage', 18)),
        delivery_days=int(data['delivery_days']),
        validity_days=int(data.get('validity_days', 30)),
        notes=data.get('notes', ''),
        terms_conditions=data.get('terms_conditions', ''),
        status=data.get('status', 'submitted'),
    )

    db.session.add(q)
    db.session.commit()

    user = get_current_user()
    ActivityLog.log(user.id if user else None, 'SUBMIT_QUOTATION', 'quotations',
                    'quotation', q.id,
                    f'Quotation submitted for RFQ {rfq.rfq_number}',
                    get_client_ip(request))

    return success_response(q.to_dict(), 'Quotation submitted successfully', 201)


@quotations_bp.route('/<int:qid>', methods=['PUT'])
@require_auth
def update_quotation(qid):
    q = Quotation.query.get_or_404(qid)
    data = request.get_json()

    updatable = ['price', 'tax_percentage', 'delivery_days', 'validity_days',
                 'notes', 'terms_conditions', 'status']
    for field in updatable:
        if field in data:
            setattr(q, field, data[field])

    db.session.commit()
    return success_response(q.to_dict(), 'Quotation updated successfully')


@quotations_bp.route('/<int:qid>', methods=['DELETE'])
@require_role('admin', 'procurement_manager')
def delete_quotation(qid):
    q = Quotation.query.get_or_404(qid)
    db.session.delete(q)
    db.session.commit()
    return success_response(message='Quotation deleted')


@quotations_bp.route('/compare/<int:rfq_id>', methods=['GET'])
@require_auth
def compare_quotations(rfq_id):
    """AI-scored quotation comparison for an RFQ"""
    rfq = RFQ.query.get_or_404(rfq_id)
    quotations = Quotation.query.filter_by(rfq_id=rfq_id).all()

    raw = [q.to_dict() for q in quotations]
    scored = score_quotations(raw)

    return success_response({
        'rfq': rfq.to_dict(),
        'quotations': scored,
        'total': len(scored)
    })
