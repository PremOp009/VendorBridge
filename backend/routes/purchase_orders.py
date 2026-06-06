from flask import Blueprint, request
from backend.extensions import db
from backend.models.purchase_order import PurchaseOrder
from backend.models.quotation import Quotation
from backend.models.activity_log import ActivityLog
from backend.middleware.auth_middleware import require_auth, require_role, get_current_user
from backend.utils.helpers import success_response, error_response, get_client_ip
from datetime import date as Date

purchase_orders_bp = Blueprint('purchase_orders', __name__, url_prefix='/api/purchase-orders')


@purchase_orders_bp.route('/', methods=['GET'])
@require_auth
def get_pos():
    page = request.args.get('page', 1, type=int)
    status = request.args.get('status', '')
    vendor_id = request.args.get('vendor_id', type=int)

    query = PurchaseOrder.query
    if status:
        query = query.filter_by(status=status)
    if vendor_id:
        query = query.filter_by(vendor_id=vendor_id)

    query = query.order_by(PurchaseOrder.created_at.desc())
    pagination = query.paginate(page=page, per_page=20, error_out=False)

    return success_response({
        'purchase_orders': [po.to_dict() for po in pagination.items],
        'total': pagination.total,
        'pages': pagination.pages,
    })


@purchase_orders_bp.route('/<int:po_id>', methods=['GET'])
@require_auth
def get_po(po_id):
    po = PurchaseOrder.query.get_or_404(po_id)
    data = po.to_dict()
    if po.quotation:
        data['quotation'] = po.quotation.to_dict()
    return success_response(data)


@purchase_orders_bp.route('/', methods=['POST'])
@require_role('admin', 'procurement_manager', 'finance_officer')
def create_po():
    data = request.get_json()
    if not data or not data.get('quotation_id'):
        return error_response('quotation_id is required')

    quotation = Quotation.query.get(data['quotation_id'])
    if not quotation:
        return error_response('Quotation not found', 404)
    if quotation.status != 'accepted':
        return error_response('Only accepted quotations can be converted to PO')

    # Check existing PO for this quotation
    existing = PurchaseOrder.query.filter_by(quotation_id=quotation.id).first()
    if existing:
        return error_response('PO already exists for this quotation')

    subtotal = float(quotation.price)
    tax = float(quotation.tax_amount)
    total = float(quotation.total_price)

    user = get_current_user()
    po = PurchaseOrder(
        po_number=PurchaseOrder.generate_po_number(),
        quotation_id=quotation.id,
        vendor_id=quotation.vendor_id,
        rfq_id=quotation.rfq_id,
        subtotal=subtotal,
        tax_amount=tax,
        total_amount=total,
        delivery_address=data.get('delivery_address', ''),
        expected_delivery=Date.fromisoformat(data['expected_delivery']) if data.get('expected_delivery') else None,
        status='issued',
        created_by=user.id if user else None,
    )

    db.session.add(po)
    db.session.commit()

    ActivityLog.log(user.id if user else None, 'CREATE_PO', 'purchase_orders',
                    'purchase_order', po.id, f'PO {po.po_number} created',
                    get_client_ip(request))

    return success_response(po.to_dict(), 'Purchase Order created', 201)


@purchase_orders_bp.route('/<int:po_id>', methods=['PUT'])
@require_role('admin', 'procurement_manager', 'finance_officer')
def update_po(po_id):
    po = PurchaseOrder.query.get_or_404(po_id)
    data = request.get_json() or {}

    if 'status' in data:
        po.status = data['status']
    if 'delivery_address' in data:
        po.delivery_address = data['delivery_address']
    if 'expected_delivery' in data and data['expected_delivery']:
        po.expected_delivery = Date.fromisoformat(data['expected_delivery'])

    db.session.commit()
    return success_response(po.to_dict(), 'PO updated successfully')


@purchase_orders_bp.route('/stats', methods=['GET'])
@require_auth
def po_stats():
    total = PurchaseOrder.query.count()
    total_spend = db.session.query(
        db.func.coalesce(db.func.sum(PurchaseOrder.total_amount), 0)
    ).filter(PurchaseOrder.status != 'cancelled').scalar()

    by_status = {}
    for s in PurchaseOrder.STATUSES:
        by_status[s] = PurchaseOrder.query.filter_by(status=s).count()

    return success_response({
        'total': total,
        'total_spend': float(total_spend),
        'by_status': by_status
    })
