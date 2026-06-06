import os
from flask import Blueprint, request, send_file, current_app
from backend.extensions import db
from backend.models.invoice import Invoice
from backend.models.purchase_order import PurchaseOrder
from backend.models.vendor import Vendor
from backend.models.activity_log import ActivityLog
from backend.middleware.auth_middleware import require_auth, require_role, get_current_user
from backend.utils.helpers import success_response, error_response, get_client_ip
from backend.services.pdf_service import save_invoice_pdf, generate_invoice_pdf
from backend.services.email_service import send_invoice_email
from datetime import datetime, timezone, date as Date, timedelta

invoices_bp = Blueprint('invoices', __name__, url_prefix='/api/invoices')


@invoices_bp.route('/', methods=['GET'])
@require_auth
def get_invoices():
    page = request.args.get('page', 1, type=int)
    status = request.args.get('status', '')
    vendor_id = request.args.get('vendor_id', type=int)

    query = Invoice.query
    if status:
        query = query.filter_by(status=status)
    if vendor_id:
        query = query.filter_by(vendor_id=vendor_id)

    query = query.order_by(Invoice.generated_at.desc())
    pagination = query.paginate(page=page, per_page=20, error_out=False)

    return success_response({
        'invoices': [inv.to_dict() for inv in pagination.items],
        'total': pagination.total,
        'pages': pagination.pages,
    })


@invoices_bp.route('/<int:inv_id>', methods=['GET'])
@require_auth
def get_invoice(inv_id):
    inv = Invoice.query.get_or_404(inv_id)
    return success_response(inv.to_dict())


@invoices_bp.route('/', methods=['POST'])
@require_role('admin', 'finance_officer', 'procurement_manager')
def generate_invoice():
    data = request.get_json()
    if not data or not data.get('po_id'):
        return error_response('po_id is required')

    po = PurchaseOrder.query.get(data['po_id'])
    if not po:
        return error_response('Purchase Order not found', 404)

    existing = Invoice.query.filter_by(po_id=po.id).first()
    if existing:
        return error_response('Invoice already exists for this PO')

    user = get_current_user()
    due_date = Date.today() + timedelta(days=30)

    invoice = Invoice(
        invoice_number=Invoice.generate_invoice_number(),
        po_id=po.id,
        vendor_id=po.vendor_id,
        subtotal=po.subtotal,
        tax_amount=po.tax_amount,
        total_amount=po.total_amount,
        status='generated',
        due_date=due_date,
        created_by=user.id if user else None,
    )

    db.session.add(invoice)
    db.session.flush()  # Get invoice.id

    # Generate PDF
    company_info = {
        'name': current_app.config.get('COMPANY_NAME', 'Your Company'),
        'address': current_app.config.get('COMPANY_ADDRESS', ''),
        'gst': current_app.config.get('COMPANY_GST', ''),
    }

    pdf_dir = current_app.config.get('PDF_FOLDER', 'pdfs')
    try:
        pdf_path = save_invoice_pdf(invoice, po, po.vendor, company_info, pdf_dir)
        invoice.pdf_path = pdf_path
    except Exception as e:
        current_app.logger.warning(f"PDF generation failed: {e}")

    db.session.commit()

    ActivityLog.log(user.id if user else None, 'GENERATE_INVOICE', 'invoices',
                    'invoice', invoice.id,
                    f'Invoice {invoice.invoice_number} generated for PO {po.po_number}',
                    get_client_ip(request))

    return success_response(invoice.to_dict(), 'Invoice generated successfully', 201)


@invoices_bp.route('/<int:inv_id>/download', methods=['GET'])
def download_invoice(inv_id):
    """Download invoice PDF — regenerate if missing"""
    invoice = Invoice.query.get_or_404(inv_id)
    po = PurchaseOrder.query.get(invoice.po_id)

    company_info = {
        'name': current_app.config.get('COMPANY_NAME', 'Your Company'),
        'address': current_app.config.get('COMPANY_ADDRESS', ''),
        'gst': current_app.config.get('COMPANY_GST', ''),
    }

    if invoice.pdf_path and os.path.exists(invoice.pdf_path):
        return send_file(invoice.pdf_path, as_attachment=True,
                         download_name=f"{invoice.invoice_number}.pdf")

    # Regenerate on-the-fly
    pdf_buffer = generate_invoice_pdf(invoice, po, po.vendor, company_info)
    return send_file(
        pdf_buffer, as_attachment=True,
        download_name=f"{invoice.invoice_number}.pdf",
        mimetype='application/pdf'
    )


@invoices_bp.route('/<int:inv_id>/email', methods=['POST'])
@require_role('admin', 'finance_officer', 'procurement_manager')
def email_invoice(inv_id):
    invoice = Invoice.query.get_or_404(inv_id)
    po = PurchaseOrder.query.get(invoice.po_id)
    vendor = Vendor.query.get(invoice.vendor_id)

    success, message = send_invoice_email(invoice, po, vendor, pdf_path=invoice.pdf_path)

    if success:
        invoice.email_sent = True
        invoice.email_sent_at = datetime.now(timezone.utc)
        invoice.status = 'sent'
        db.session.commit()

        user = get_current_user()
        ActivityLog.log(user.id if user else None, 'EMAIL_INVOICE', 'invoices',
                        'invoice', inv_id,
                        f'Invoice {invoice.invoice_number} emailed to {vendor.email}',
                        get_client_ip(request))

        return success_response(invoice.to_dict(), 'Invoice emailed successfully')
    else:
        return error_response(f'Failed to send email: {message}', 500)


@invoices_bp.route('/<int:inv_id>/status', methods=['PUT'])
@require_role('admin', 'finance_officer')
def update_invoice_status(inv_id):
    invoice = Invoice.query.get_or_404(inv_id)
    data = request.get_json() or {}
    new_status = data.get('status')

    if new_status not in Invoice.STATUSES:
        return error_response(f'Invalid status. Allowed: {Invoice.STATUSES}')

    invoice.status = new_status
    if new_status == 'paid':
        invoice.paid_at = datetime.now(timezone.utc)

    db.session.commit()
    return success_response(invoice.to_dict(), 'Invoice status updated')


@invoices_bp.route('/stats', methods=['GET'])
@require_auth
def invoice_stats():
    total = Invoice.query.count()
    paid = Invoice.query.filter_by(status='paid').count()
    pending = Invoice.query.filter(Invoice.status.in_(['generated', 'sent'])).count()
    total_value = db.session.query(
        db.func.coalesce(db.func.sum(Invoice.total_amount), 0)
    ).scalar()

    return success_response({
        'total': total,
        'paid': paid,
        'pending': pending,
        'total_value': float(total_value),
    })
