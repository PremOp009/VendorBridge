from flask import Blueprint, request, jsonify
from backend.extensions import db
from backend.models.vendor import Vendor
from backend.models.activity_log import ActivityLog
from backend.middleware.auth_middleware import require_auth, require_role, get_current_user
from backend.utils.helpers import success_response, error_response, validate_email, get_client_ip
from sqlalchemy.exc import IntegrityError

vendors_bp = Blueprint('vendors', __name__, url_prefix='/api/vendors')


@vendors_bp.route('/', methods=['GET'])
@require_auth
def get_vendors():
    page = request.args.get('page', 1, type=int)
    per_page = request.args.get('per_page', 20, type=int)
    search = request.args.get('search', '')
    status = request.args.get('status', '')
    category = request.args.get('category', '')

    query = Vendor.query

    if search:
        query = query.filter(
            db.or_(
                Vendor.company_name.ilike(f'%{search}%'),
                Vendor.email.ilike(f'%{search}%'),
                Vendor.category.ilike(f'%{search}%')
            )
        )
    if status:
        query = query.filter_by(status=status)
    if category:
        query = query.filter_by(category=category)

    query = query.order_by(Vendor.created_at.desc())
    pagination = query.paginate(page=page, per_page=per_page, error_out=False)

    return success_response({
        'vendors': [v.to_dict() for v in pagination.items],
        'total': pagination.total,
        'pages': pagination.pages,
        'page': pagination.page,
    })


@vendors_bp.route('/<int:vendor_id>', methods=['GET'])
@require_auth
def get_vendor(vendor_id):
    vendor = Vendor.query.get_or_404(vendor_id)
    return success_response(vendor.to_dict())


@vendors_bp.route('/', methods=['POST'])
@require_role('admin', 'procurement_manager')
def create_vendor():
    data = request.get_json()
    if not data:
        return error_response('No data provided')

    required = ['company_name', 'category', 'email']
    for field in required:
        if not data.get(field, '').strip():
            return error_response(f'{field} is required')

    if not validate_email(data['email']):
        return error_response('Invalid email address')

    vendor = Vendor(
        company_name=data['company_name'].strip(),
        category=data['category'].strip(),
        gst_number=data.get('gst_number', '').strip() or None,
        email=data['email'].lower().strip(),
        phone=data.get('phone', '').strip() or None,
        address=data.get('address', '').strip() or None,
        city=data.get('city', '').strip() or None,
        state=data.get('state', '').strip() or None,
        country=data.get('country', 'India').strip(),
        pincode=data.get('pincode', '').strip() or None,
        rating=float(data.get('rating', 0)),
        status=data.get('status', 'active'),
        notes=data.get('notes', '').strip() or None,
    )

    db.session.add(vendor)
    db.session.commit()

    user = get_current_user()
    ActivityLog.log(user.id if user else None, 'CREATE_VENDOR', 'vendors',
                    'vendor', vendor.id, f'Vendor {vendor.company_name} added',
                    get_client_ip(request))

    return success_response(vendor.to_dict(), 'Vendor created successfully', 201)


@vendors_bp.route('/<int:vendor_id>', methods=['PUT'])
@require_role('admin', 'procurement_manager')
def update_vendor(vendor_id):
    vendor = Vendor.query.get_or_404(vendor_id)
    data = request.get_json()

    if not data:
        return error_response('No data provided')

    updatable = ['company_name', 'category', 'gst_number', 'email', 'phone',
                 'address', 'city', 'state', 'country', 'pincode', 'rating', 'status', 'notes']
    for field in updatable:
        if field in data:
            setattr(vendor, field, data[field] if data[field] != '' else None)

    db.session.commit()

    user = get_current_user()
    ActivityLog.log(user.id if user else None, 'UPDATE_VENDOR', 'vendors',
                    'vendor', vendor.id, f'Vendor {vendor.company_name} updated',
                    get_client_ip(request))

    return success_response(vendor.to_dict(), 'Vendor updated successfully')


@vendors_bp.route('/<int:vendor_id>', methods=['DELETE'])
@require_auth
def delete_vendor(vendor_id):
    vendor = Vendor.query.get_or_404(vendor_id)
    name = vendor.company_name
    
    try:
        db.session.delete(vendor)
        db.session.commit()
        msg = f'Vendor {name} deleted successfully'
    except IntegrityError:
        db.session.rollback()
        # Soft delete instead
        vendor.status = 'inactive'
        db.session.commit()
        msg = f'Vendor {name} was safely archived (marked inactive) because they have existing history.'

    user = get_current_user()
    ActivityLog.log(user.id if user else None, 'DELETE_VENDOR', 'vendors',
                    'vendor', vendor_id, msg,
                    get_client_ip(request))

    return success_response(message=msg)


@vendors_bp.route('/categories', methods=['GET'])
@require_auth
def get_categories():
    return success_response({'categories': Vendor.CATEGORIES})


@vendors_bp.route('/stats', methods=['GET'])
@require_auth
def vendor_stats():
    total = Vendor.query.count()
    active = Vendor.query.filter_by(status='active').count()
    inactive = Vendor.query.filter_by(status='inactive').count()
    by_category = db.session.query(
        Vendor.category, db.func.count(Vendor.id)
    ).group_by(Vendor.category).all()

    return success_response({
        'total': total,
        'active': active,
        'inactive': inactive,
        'by_category': [{'category': c, 'count': n} for c, n in by_category]
    })
