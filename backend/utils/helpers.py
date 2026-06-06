import os
import re
from datetime import datetime


def validate_email(email):
    pattern = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
    return bool(re.match(pattern, email))


def validate_phone(phone):
    pattern = r'^\+?[\d\s\-\(\)]{7,20}$'
    return bool(re.match(pattern, phone))


def validate_gst(gst):
    if not gst:
        return True  # Optional
    pattern = r'^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$'
    return bool(re.match(pattern, gst))


def success_response(data=None, message='Success', status_code=200):
    response = {'success': True, 'message': message}
    if data is not None:
        response['data'] = data
    return response, status_code


def error_response(message='An error occurred', status_code=400, errors=None):
    response = {'success': False, 'error': message}
    if errors:
        response['errors'] = errors
    return response, status_code


def paginate_query(query, page=1, per_page=20):
    pagination = query.paginate(page=page, per_page=per_page, error_out=False)
    return {
        'items': pagination.items,
        'total': pagination.total,
        'pages': pagination.pages,
        'page': pagination.page,
        'per_page': pagination.per_page,
        'has_next': pagination.has_next,
        'has_prev': pagination.has_prev,
    }


def format_currency(amount, currency='₹'):
    if amount is None:
        return f'{currency}0.00'
    return f'{currency}{float(amount):,.2f}'


def get_client_ip(request):
    if request.environ.get('HTTP_X_FORWARDED_FOR'):
        return request.environ['HTTP_X_FORWARDED_FOR'].split(',')[0].strip()
    return request.environ.get('REMOTE_ADDR', '127.0.0.1')


def ensure_dir(path):
    os.makedirs(path, exist_ok=True)
    return path
