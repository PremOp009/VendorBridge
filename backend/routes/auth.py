from flask import Blueprint, request, jsonify
from flask_jwt_extended import create_access_token
from backend.extensions import db
from backend.models.user import User
from backend.models.activity_log import ActivityLog
from backend.utils.helpers import validate_email, success_response, error_response, get_client_ip
from datetime import datetime

auth_bp = Blueprint('auth', __name__, url_prefix='/api/auth')


@auth_bp.route('/register', methods=['POST'])
def register():
    data = request.get_json()
    if not data:
        return error_response('No data provided')

    required = ['first_name', 'last_name', 'email', 'password']
    for field in required:
        if not data.get(field, '').strip():
            return error_response(f'{field} is required')

    if not validate_email(data['email']):
        return error_response('Invalid email address')

    if len(data['password']) < 8:
        return error_response('Password must be at least 8 characters')

    if User.query.filter_by(email=data['email'].lower()).first():
        return error_response('Email already registered', 409)

    role = data.get('role', 'vendor')
    if role not in User.ROLES:
        role = 'vendor'

    user = User(
        first_name=data['first_name'].strip(),
        last_name=data['last_name'].strip(),
        email=data['email'].lower().strip(),
        role=role
    )
    user.set_password(data['password'])

    db.session.add(user)
    db.session.commit()

    ActivityLog.log(user.id, 'REGISTER', 'auth', 'user', user.id,
                    f'User {user.email} registered', get_client_ip(request))

    token = create_access_token(identity=str(user.id))
    return success_response({
        'token': token,
        'user': user.to_dict()
    }, 'Registration successful', 201)


@auth_bp.route('/login', methods=['POST'])
def login():
    data = request.get_json()
    if not data:
        return error_response('No data provided')

    email = data.get('email', '').lower().strip()
    password = data.get('password', '')

    if not email or not password:
        return error_response('Email and password are required')

    user = User.query.filter_by(email=email).first()

    if not user or not user.check_password(password):
        return error_response('Invalid email or password', 401)

    if not user.is_active:
        return error_response('Account is deactivated. Contact admin.', 403)

    token = create_access_token(identity=str(user.id))

    ActivityLog.log(user.id, 'LOGIN', 'auth', 'user', user.id,
                    f'User {user.email} logged in', get_client_ip(request))

    return success_response({
        'token': token,
        'user': user.to_dict()
    }, 'Login successful')


@auth_bp.route('/me', methods=['GET'])
def me():
    from backend.middleware.auth_middleware import require_auth, get_current_user
    from flask import g
    try:
        from flask_jwt_extended import verify_jwt_in_request, get_jwt_identity
        verify_jwt_in_request()
        user_id = get_jwt_identity()
        user = User.query.get(user_id)
        if not user:
            return error_response('User not found', 404)
        return success_response(user.to_dict())
    except Exception as e:
        return error_response('Not authenticated', 401)


@auth_bp.route('/change-password', methods=['PUT'])
def change_password():
    from flask_jwt_extended import verify_jwt_in_request, get_jwt_identity
    try:
        verify_jwt_in_request()
        user_id = get_jwt_identity()
    except Exception:
        return error_response('Not authenticated', 401)

    data = request.get_json()
    user = User.query.get(user_id)
    if not user:
        return error_response('User not found', 404)

    if not user.check_password(data.get('current_password', '')):
        return error_response('Current password is incorrect')

    new_password = data.get('new_password', '')
    if len(new_password) < 8:
        return error_response('New password must be at least 8 characters')

    user.set_password(new_password)
    db.session.commit()
    return success_response(message='Password changed successfully')
