from flask import current_app
from flask_mail import Message
from backend.extensions import mail
import traceback


def send_invoice_email(invoice, purchase_order, vendor, pdf_path=None, pdf_buffer=None):
    """
    Send invoice email to vendor with PDF attachment.
    Returns (success: bool, message: str)
    """
    try:
        subject = f"Invoice {invoice.invoice_number} from VendorBridge"

        html_body = f"""
        <html>
        <body style="font-family: 'Segoe UI', Arial, sans-serif; background: #FFF8E8; margin:0; padding:0;">
          <div style="max-width: 600px; margin: 30px auto; background: white; border-radius: 12px;
                      box-shadow: 0 4px 20px rgba(103,70,54,0.1); overflow: hidden;">

            <!-- Header -->
            <div style="background: #674636; padding: 30px 40px;">
              <h1 style="color: #FFF8E8; margin:0; font-size: 24px; letter-spacing: 1px;">VendorBridge</h1>
              <p style="color: #F7EED3; margin: 5px 0 0; font-size: 13px;">Procurement & Vendor Management ERP</p>
            </div>

            <!-- Body -->
            <div style="padding: 35px 40px;">
              <h2 style="color: #674636; margin-top:0;">Invoice #{invoice.invoice_number}</h2>

              <p style="color: #1e293b; line-height: 1.6;">
                Dear <strong>{vendor.company_name}</strong>,
              </p>
              <p style="color: #1e293b; line-height: 1.6;">
                Please find attached the invoice for Purchase Order
                <strong>{purchase_order.po_number}</strong>.
                Kindly review and process the payment at your earliest convenience.
              </p>

              <!-- Summary Box -->
              <div style="background: #FFF8E8; border-left: 4px solid #674636;
                           border-radius: 8px; padding: 20px 25px; margin: 25px 0;">
                <table style="width: 100%; border-collapse: collapse;">
                  <tr>
                    <td style="color: #AAB396; font-size: 13px; padding: 4px 0;">Invoice Number</td>
                    <td style="color: #1e293b; font-weight: bold; text-align: right;">{invoice.invoice_number}</td>
                  </tr>
                  <tr>
                    <td style="color: #AAB396; font-size: 13px; padding: 4px 0;">Purchase Order</td>
                    <td style="color: #1e293b; font-weight: bold; text-align: right;">{purchase_order.po_number}</td>
                  </tr>
                  <tr>
                    <td style="color: #AAB396; font-size: 13px; padding: 4px 0;">Subtotal</td>
                    <td style="color: #1e293b; text-align: right;">₹{float(invoice.subtotal):,.2f}</td>
                  </tr>
                  <tr>
                    <td style="color: #AAB396; font-size: 13px; padding: 4px 0;">GST</td>
                    <td style="color: #1e293b; text-align: right;">₹{float(invoice.tax_amount):,.2f}</td>
                  </tr>
                  <tr style="border-top: 2px solid #AAB396;">
                    <td style="color: #674636; font-weight: bold; font-size: 15px; padding-top: 10px;">Total Payable</td>
                    <td style="color: #674636; font-weight: bold; font-size: 15px;
                                text-align: right; padding-top: 10px;">₹{float(invoice.total_amount):,.2f}</td>
                  </tr>
                </table>
              </div>

              <p style="color: #64748b; font-size: 13px; line-height: 1.6;">
                If you have any questions regarding this invoice, please contact our procurement team.
              </p>

              <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #F7EED3;">
                <p style="color: #AAB396; font-size: 12px; margin: 0;">
                  This is an automated email from VendorBridge ERP. Please do not reply directly.
                </p>
              </div>
            </div>
          </div>
        </body>
        </html>
        """

        msg = Message(
            subject=subject,
            recipients=[vendor.email],
            html=html_body
        )

        # Attach PDF
        if pdf_path and os.path.exists(pdf_path):
            with open(pdf_path, 'rb') as f:
                msg.attach(
                    f"{invoice.invoice_number}.pdf",
                    'application/pdf',
                    f.read()
                )
        elif pdf_buffer:
            msg.attach(
                f"{invoice.invoice_number}.pdf",
                'application/pdf',
                pdf_buffer.read()
            )

        mail.send(msg)
        return True, "Email sent successfully"

    except Exception as e:
        traceback.print_exc()
        return False, str(e)


import os
