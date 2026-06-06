from flask import Blueprint, request
from backend.models.activity_log import ActivityLog
from backend.middleware.auth_middleware import require_auth, require_role
from backend.utils.helpers import success_response

activity_logs_bp = Blueprint('activity_logs', __name__, url_prefix='/api/activity-logs')


@activity_logs_bp.route('/', methods=['GET'])
@require_auth
def get_logs():
    page = request.args.get('page', 1, type=int)
    per_page = request.args.get('per_page', 30, type=int)
    module = request.args.get('module', '')
    user_id = request.args.get('user_id', type=int)

    query = ActivityLog.query
    if module:
        query = query.filter_by(module=module)
    if user_id:
        query = query.filter_by(user_id=user_id)

    query = query.order_by(ActivityLog.created_at.desc())
    pagination = query.paginate(page=page, per_page=per_page, error_out=False)

    return success_response({
        'logs': [log.to_dict() for log in pagination.items],
        'total': pagination.total,
        'pages': pagination.pages,
        'page': pagination.page,
    })


@activity_logs_bp.route('/modules', methods=['GET'])
@require_auth
def get_modules():
    from backend.extensions import db
    modules = db.session.query(ActivityLog.module).distinct().all()
    return success_response({'modules': [m[0] for m in modules]})
