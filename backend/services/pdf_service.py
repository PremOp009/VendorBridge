import os
import io
from datetime import datetime
from reportlab.lib.pagesizes import A4
from reportlab.lib import colors
from reportlab.lib.units import mm, cm
from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer, HRFlowable
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.enums import TA_LEFT, TA_RIGHT, TA_CENTER
from reportlab.graphics.barcode import qr
from reportlab.graphics.shapes import Drawing, Rect, String, Line

def num_to_words(n):
    if n == 0: return "Zero"
    ones = ["", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine", "Ten", "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen", "Sixteen", "Seventeen", "Eighteen", "Nineteen"]
    tens = ["", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"]
    def convert_lt_100(num):
        if num < 20: return ones[num]
        return tens[num // 10] + (" " + ones[num % 10] if num % 10 != 0 else "")
    def convert(num):
        if num == 0: return ""
        elif num < 100: return convert_lt_100(num)
        elif num < 1000: return ones[num // 100] + " Hundred" + (" and " + convert_lt_100(num % 100) if num % 100 != 0 else "")
        elif num < 100000: return convert(num // 1000) + " Thousand" + (" " + convert(num % 1000) if num % 1000 != 0 else "")
        elif num < 10000000: return convert(num // 100000) + " Lakh" + (" " + convert(num % 100000) if num % 100000 != 0 else "")
        else: return convert(num // 10000000) + " Crore" + (" " + convert(num % 10000000) if num % 10000000 != 0 else "")
    return "INR " + convert(int(n)).strip() + " Only"

def create_badge(text, bg_color, text_color, width=120, height=20, rx=10, fontSize=11):
    d = Drawing(width, height)
    d.add(Rect(0, 0, width, height, rx=rx, ry=rx, fillColor=bg_color, strokeColor=bg_color))
    d.add(String(width/2.0, height/2.0 - 4, text, fontName="Helvetica-Bold", fontSize=fontSize, fillColor=text_color, textAnchor="middle"))
    return d

def generate_invoice_pdf(invoice, purchase_order, vendor, company_info):
    buffer = io.BytesIO()
    doc = SimpleDocTemplate(
        buffer, pagesize=A4, rightMargin=15*mm, leftMargin=15*mm, topMargin=15*mm, bottomMargin=15*mm
    )

    BRAND_BROWN = colors.HexColor('#674636')
    BRAND_CREAM = colors.HexColor('#FFF8E8')
    BRAND_MUTED = colors.HexColor('#AAB396')
    BRAND_SURFACE = colors.HexColor('#F7EED3')
    ACCENT_BLUE = colors.HexColor('#2563eb')
    TEXT_DARK = colors.HexColor('#1e293b')
    TEXT_GRAY = colors.HexColor('#64748b')
    SUCCESS_GREEN = colors.HexColor('#E4E5D4')
    WARNING_BG = colors.HexColor('#F8D7DA')
    WARNING_TEXT = colors.HexColor('#721C24')
    FOOTER_BG = colors.HexColor('#4A3226')

    styles = getSampleStyleSheet()
    p_right = ParagraphStyle('right', fontSize=10, alignment=TA_RIGHT)
    p_left = ParagraphStyle('left', fontSize=10, alignment=TA_LEFT)
    p_center = ParagraphStyle('center', fontSize=10, alignment=TA_CENTER)
    
    story = []

    # 1. HEADER (Logo & Invoice Number)
    logo_p = Paragraph("<font size=32 color='#674636'><b>VB</b></font> <font size=20><b>VendorBridge</b></font><br/><font size=9 color='#64748b'>Smart Procurement. Stronger Business.</font>")
    inv_title = Paragraph("<font size=24 color='#674636'><b>INVOICE</b></font>", p_right)
    badge = create_badge(invoice.invoice_number, BRAND_BROWN, colors.white, 130, 22)
    inv_date = invoice.generated_at.strftime('%d %b %Y') if invoice.generated_at else datetime.now().strftime('%d %b %Y')
    date_p = Paragraph(f"<font size=10 color='#674636'>Date: {inv_date}</font>", p_right)
    
    header_table = Table([
        [logo_p, inv_title],
        ["", badge],
        ["", date_p]
    ], colWidths=[100*mm, 80*mm])
    header_table.setStyle(TableStyle([('ALIGN', (1,0), (1,-1), 'RIGHT'), ('VALIGN', (0,0), (-1,-1), 'TOP')]))
    story.append(header_table)
    story.append(Spacer(1, 4*mm))

    # HR
    story.append(HRFlowable(width='100%', thickness=1, color=BRAND_SURFACE))
    story.append(Spacer(1, 4*mm))

    # 2. META INFO (Bill To / Meta / QR)
    bill_badge = create_badge("BILL TO", BRAND_MUTED, colors.white, 60, 16, 5, 9)
    # Using placeholder icon since we can't load images easily
    icon_p = Paragraph("<font size=20 color='#AAB396'>🏢</font>")
    bill_info = Paragraph(f"<b>{company_info.get('name', 'VendorBridge')}</b><br/>{company_info.get('address', '').replace(', ', '<br/>')}<br/>GSTIN: {company_info.get('gst', 'N/A')}", ParagraphStyle('info', fontSize=9, leading=12))
    
    meta_info = Paragraph(f"""
        <font color='#64748b'>PO Number</font> &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;: {purchase_order.po_number}<br/>
        <font color='#64748b'>RFQ Number</font> &nbsp;&nbsp;&nbsp;&nbsp;: {purchase_order.quotation.rfq.rfq_number if purchase_order.quotation and purchase_order.quotation.rfq else 'N/A'}<br/>
        <font color='#64748b'>Order Date</font> &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;: {purchase_order.created_at.strftime('%d %b %Y')}<br/>
        <font color='#64748b'>Payment Terms</font> : Net 15 Days<br/>
        <font color='#64748b'>Due Date</font> &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;: {invoice.due_date.strftime('%d %b %Y') if invoice.due_date else ''}
    """, ParagraphStyle('m', fontSize=9, leading=14))
    
    qr_code = qr.QrCodeWidget(f"http://vendorbridge.com/verify/{invoice.invoice_number}")
    qr_code.barWidth = 60; qr_code.barHeight = 60
    qr_d = Drawing(60, 60); qr_d.add(qr_code)
    qr_txt = Paragraph("<font size=7 color='#64748b'>Scan to verify<br/>this invoice</font>", p_center)
    
    info_table = Table([
        [bill_badge, "", ""],
        [Table([[icon_p, bill_info]], colWidths=[15*mm, 55*mm], style=[('VALIGN',(0,0),(-1,-1),'TOP')]), meta_info, [qr_d, qr_txt]]
    ], colWidths=[70*mm, 70*mm, 40*mm])
    info_table.setStyle(TableStyle([('VALIGN', (0,0), (-1,-1), 'TOP'), ('BOTTOMPADDING', (0,0), (-1,-1), 0)]))
    story.append(info_table)
    story.append(Spacer(1, 4*mm))
    story.append(HRFlowable(width='100%', thickness=1, color=BRAND_SURFACE))
    story.append(Spacer(1, 4*mm))

    # 3. SUPPLIER AND SHIPPING DETAILS
    sup_badge = create_badge("SUPPLIER / VENDOR", BRAND_MUTED, colors.white, 120, 16, 5, 9)
    ship_badge = create_badge("SHIPPING DETAILS", BRAND_MUTED, colors.white, 120, 16, 5, 9)
    
    sup_icon = Paragraph("<font size=20 color='#AAB396'>🏪</font>")
    sup_info = Paragraph(f"<b>{vendor.company_name}</b><br/>{vendor.address or ''}<br/>{vendor.city or ''}, {vendor.state or ''}<br/>GSTIN: {vendor.gst_number or 'N/A'}", ParagraphStyle('info', fontSize=9, leading=12))
    
    ship_icon = Paragraph("<font size=20 color='#AAB396'>🚚</font>")
    ship_info = Paragraph(f"<b>{company_info.get('name', 'VendorBridge')}</b><br/>{company_info.get('address', '').replace(', ', '<br/>')}", ParagraphStyle('info', fontSize=9, leading=12))

    details_table = Table([
        [sup_badge, ship_badge],
        [Table([[sup_icon, sup_info]], colWidths=[15*mm, 70*mm], style=[('VALIGN',(0,0),(-1,-1),'TOP')]),
         Table([[ship_icon, ship_info]], colWidths=[15*mm, 70*mm], style=[('VALIGN',(0,0),(-1,-1),'TOP')])]
    ], colWidths=[90*mm, 90*mm])
    details_table.setStyle(TableStyle([('VALIGN', (0,0), (-1,-1), 'TOP')]))
    story.append(details_table)
    story.append(Spacer(1, 6*mm))

    # 4. ITEMS TABLE
    rfq = purchase_order.quotation.rfq if (purchase_order.quotation and purchase_order.quotation.rfq) else None
    item_desc = rfq.title if rfq else 'Procurement Services'
    qty = rfq.quantity if rfq else 1
    price = float(purchase_order.subtotal) / float(qty) if qty else float(purchase_order.subtotal)

    items_data = [
        ['#', 'Item Description', 'Model / SKU', 'Quantity', 'Unit Price (₹)', 'Amount (₹)'],
        ['1', item_desc, rfq.category if rfq else '-', str(qty), f"{price:,.2f}", f"{float(purchase_order.subtotal):,.2f}"]
    ]
    items_table = Table(items_data, colWidths=[10*mm, 60*mm, 35*mm, 20*mm, 25*mm, 30*mm])
    items_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), BRAND_BROWN),
        ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
        ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, 0), 9),
        ('FONTSIZE', (0, 1), (-1, -1), 9),
        ('ALIGN', (3, 0), (-1, -1), 'CENTER'),
        ('ALIGN', (0, 0), (2, -1), 'LEFT'),
        ('GRID', (0, 0), (-1, -1), 0.5, BRAND_SURFACE),
        ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, BRAND_CREAM]),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
        ('TOPPADDING', (0, 0), (-1, -1), 6),
    ]))
    story.append(items_table)
    story.append(Spacer(1, 4*mm))

    # 5. TOTALS AND AMOUNT IN WORDS
    subtotal = float(invoice.subtotal)
    tax = float(invoice.tax_amount)
    shipping = 2000.00 # hardcoded placeholder as per image
    total = float(invoice.total_amount) + shipping

    words_p = Paragraph("<font size=8 color='#64748b'><b>AMOUNT IN WORDS</b></font><br/>" + num_to_words(total), ParagraphStyle('w', fontSize=9, leading=12))
    
    totals_data = [
        [words_p, 'Subtotal', f"{subtotal:,.2f}"],
        ['', 'CGST (9%)', f"{tax/2:,.2f}"],
        ['', 'SGST (9%)', f"{tax/2:,.2f}"],
        ['', 'Shipping & Handling', f"{shipping:,.2f}"],
        ['', Paragraph("<b>Grand Total (₹)</b>"), Paragraph(f"<b>{total:,.2f}</b>")]
    ]
    totals_table = Table(totals_data, colWidths=[90*mm, 50*mm, 40*mm])
    totals_table.setStyle(TableStyle([
        ('ALIGN', (1, 0), (-1, -1), 'RIGHT'),
        ('FONTSIZE', (1, 0), (-1, -1), 9),
        ('VALIGN', (0, 0), (-1, -1), 'TOP'),
        ('BACKGROUND', (1, 4), (2, 4), SUCCESS_GREEN),
        ('BOTTOMPADDING', (1, 0), (-1, -1), 3),
        ('TOPPADDING', (1, 0), (-1, -1), 3),
        ('SPAN', (0, 0), (0, -1)),
    ]))
    story.append(totals_table)
    story.append(Spacer(1, 6*mm))
    story.append(HRFlowable(width='100%', thickness=1, color=BRAND_SURFACE))
    story.append(Spacer(1, 4*mm))

    # 6. TRACKING & STATUS
    track_left = Paragraph(f"""
        <b>TRACKING DETAILS</b><br/><br/>
        <font color='#64748b'>Tracking ID</font> &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;: <font backColor='#F7EED3'> VB-TRACK-{invoice.invoice_number} </font><br/>
        <font color='#64748b'>Courier Partner</font> : BlueDart Express<br/>
        <font color='#64748b'>AWB Number</font> &nbsp;&nbsp;&nbsp;&nbsp;: BD132486753IN<br/>
        <font color='#64748b'>Estimated Deliv</font> : {invoice.due_date.strftime('%d %b %Y') if invoice.due_date else ''}
    """, ParagraphStyle('t', fontSize=9, leading=14))
    
    # Fake a visual progress bar with unicode/text
    track_right = Paragraph(f"""
        Current Status: <font backColor='#16a34a' color='white'> In Transit </font><br/><br/>
        [✓] Order Picked --- [🚚] <b>In Transit</b> --- [📍] Out for Delivery --- [✅] Delivered
    """, ParagraphStyle('t2', fontSize=9, leading=14, alignment=TA_CENTER))

    track_table = Table([[track_left, track_right]], colWidths=[90*mm, 90*mm])
    track_table.setStyle(TableStyle([('VALIGN', (0,0), (-1,-1), 'TOP')]))
    story.append(track_table)
    story.append(Spacer(1, 4*mm))
    story.append(HRFlowable(width='100%', thickness=1, color=BRAND_SURFACE))
    story.append(Spacer(1, 4*mm))

    # 7. PAYMENT DETAILS & NOTES
    pay_icon = Paragraph("<font size=20 color='#AAB396'>🏦</font>")
    pay_info = Paragraph(f"""
        <b>PAYMENT DETAILS</b><br/>
        <font color='#64748b'>Bank Name</font> &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;: HDFC Bank<br/>
        <font color='#64748b'>Account Name</font> &nbsp;&nbsp;&nbsp;: {vendor.company_name}<br/>
        <font color='#64748b'>Account Number</font> : 50200012345678<br/>
        <font color='#64748b'>IFSC Code</font> &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;: HDFC0001234
    """, ParagraphStyle('p', fontSize=9, leading=14))
    
    notes_info = Paragraph("""
        <b>NOTES</b><br/>
        • Please make payment within the due date to avoid late fees.<br/>
        • All products are tested and certified refurbished.<br/>
        • For any queries, contact support@vendorbridge.com
    """, ParagraphStyle('n', fontSize=9, leading=14))

    pay_table = Table([[Table([[pay_icon, pay_info]], colWidths=[15*mm, 75*mm]), notes_info]], colWidths=[90*mm, 90*mm])
    pay_table.setStyle(TableStyle([('VALIGN', (0,0), (-1,-1), 'TOP')]))
    story.append(pay_table)
    story.append(Spacer(1, 8*mm))

    # 8. ZERO LIABILITY WARNING
    warn_text = Paragraph("<font color='#721C24'><b>ZEROLIABILITY WARNING</b><br/>VendorBridge acts as a facilitator between buyers and vendors only.<br/>VendorBridge is not responsible for product quality, delivery delays, damages, warranties, refunds, or any disputes between buyer and vendor.</font>", ParagraphStyle('w', fontSize=9, leading=14))
    warn_icon = Paragraph("<font size=24 color='#721C24'>⚠️</font>")
    warn_table = Table([[warn_icon, warn_text, warn_icon]], colWidths=[15*mm, 150*mm, 15*mm])
    warn_table.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,-1), WARNING_BG),
        ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
        ('ALIGN', (0,0), (0,-1), 'CENTER'),
        ('ALIGN', (2,0), (2,-1), 'CENTER'),
        ('BOX', (0,0), (-1,-1), 1, colors.HexColor('#F5C6CB')),
        ('TOPPADDING', (0,0), (-1,-1), 10),
        ('BOTTOMPADDING', (0,0), (-1,-1), 10),
    ]))
    story.append(warn_table)
    story.append(Spacer(1, 8*mm))

    # 9. FOOTER
    footer_text = Paragraph("<font color='white'>🌐 www.vendorbridge.com &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; ✉ support@vendorbridge.com &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; 📞 +91 80 1234 5678</font>", ParagraphStyle('f', alignment=TA_CENTER, fontSize=9))
    footer_table = Table([[footer_text]], colWidths=[180*mm])
    footer_table.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,-1), FOOTER_BG),
        ('TOPPADDING', (0,0), (-1,-1), 8),
        ('BOTTOMPADDING', (0,0), (-1,-1), 8),
    ]))
    story.append(footer_table)

    doc.build(story)
    buffer.seek(0)
    return buffer

def save_invoice_pdf(invoice, purchase_order, vendor, company_info, output_dir):
    os.makedirs(output_dir, exist_ok=True)
    filename = f"{invoice.invoice_number}.pdf"
    filepath = os.path.join(output_dir, filename)

    pdf_buffer = generate_invoice_pdf(invoice, purchase_order, vendor, company_info)
    with open(filepath, 'wb') as f:
        f.write(pdf_buffer.read())

    return filepath
