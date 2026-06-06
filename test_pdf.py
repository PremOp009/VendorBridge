import os
import io
from datetime import datetime
from reportlab.lib.pagesizes import A4
from reportlab.lib import colors
from reportlab.lib.units import mm, cm
from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer, Image
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.enums import TA_LEFT, TA_RIGHT, TA_CENTER
from reportlab.graphics.barcode import qr
from reportlab.graphics.shapes import Drawing, Rect, String, Line

def num_to_words(n):
    # Simple Indian numbering system converter
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

def create_badge(text, bg_color, text_color):
    d = Drawing(120, 20)
    d.add(Rect(0, 0, 120, 20, rx=10, ry=10, fillColor=bg_color, strokeColor=bg_color))
    d.add(String(60, 6, text, fontName="Helvetica-Bold", fontSize=11, fillColor=text_color, textAnchor="middle"))
    return d

def test_generate():
    doc = SimpleDocTemplate("test_invoice.pdf", pagesize=A4, rightMargin=15*mm, leftMargin=15*mm, topMargin=15*mm, bottomMargin=15*mm)
    story = []
    
    BRAND_BROWN = colors.HexColor('#674636')
    BRAND_CREAM = colors.HexColor('#FFF8E8')
    BRAND_MUTED = colors.HexColor('#AAB396')
    BRAND_SURFACE = colors.HexColor('#F7EED3')
    TEXT_DARK = colors.HexColor('#1e293b')
    TEXT_GRAY = colors.HexColor('#64748b')
    
    styles = getSampleStyleSheet()
    p_right = ParagraphStyle('right', fontSize=10, alignment=TA_RIGHT)
    
    # Header
    logo_p = Paragraph("<font size=32 color='#674636'><b>VB</b></font> <font size=20><b>VendorBridge</b></font><br/><font size=9 color='#64748b'>Smart Procurement. Stronger Business.</font>")
    inv_title = Paragraph("<font size=24 color='#674636'><b>INVOICE</b></font>", p_right)
    badge = create_badge("INV-2025-06-0157", BRAND_BROWN, colors.white)
    date_p = Paragraph("Date: 28 May 2025", p_right)
    
    header_data = [
        [logo_p, inv_title],
        ["", badge],
        ["", date_p]
    ]
    t = Table(header_data, colWidths=[100*mm, 80*mm])
    t.setStyle(TableStyle([('ALIGN', (1,0), (1,-1), 'RIGHT'), ('VALIGN', (0,0), (-1,-1), 'TOP')]))
    story.append(t)
    story.append(Spacer(1, 10))
    
    # HR
    d_hr = Drawing(180*mm, 1)
    d_hr.add(Line(0, 0, 180*mm, 0, strokeColor=BRAND_MUTED))
    story.append(d_hr)
    story.append(Spacer(1, 10))
    
    # Bill To / Details / QR
    bill_p = Paragraph("<font size=8 color='white'><b>BILL TO</b></font>")
    bill_bg = Drawing(50, 15); bill_bg.add(Rect(0,0,50,15, rx=5, ry=5, fillColor=BRAND_MUTED, strokeColor=BRAND_MUTED))
    bill_badge = Table([[bill_p]], colWidths=[50])
    bill_badge.setStyle(TableStyle([('BACKGROUND', (0,0), (0,0), BRAND_MUTED), ('LEFTPADDING', (0,0), (0,0), 5)]))
    
    bill_info = Paragraph("<b>TechNova Solutions Pvt. Ltd.</b><br/>2nd Floor, Prestige Tech Park,<br/>Outer Ring Road, Bengaluru,<br/>Karnataka - 560103, India<br/>GSTIN: 29AABCT1234Q1Z5", ParagraphStyle('info', fontSize=9, leading=12))
    
    meta_info = Paragraph("PO Number     : PO-2025-06-072<br/>RFQ Number    : RFQ-2025-05-031<br/>Order Date    : 20 May 2025<br/>Payment Terms : Net 15 Days<br/>Due Date      : 12 June 2025", ParagraphStyle('m', fontSize=9, leading=14))
    
    qr_code = qr.QrCodeWidget("http://vendorbridge.com/verify/INV-2025-06-0157")
    qr_code.barWidth = 80; qr_code.barHeight = 80
    qr_d = Drawing(80, 80); qr_d.add(qr_code)
    qr_txt = Paragraph("<font size=7>Scan to verify<br/>this invoice</font>", ParagraphStyle('q', alignment=TA_CENTER))
    
    info_t = Table([
        [bill_badge, "", ""],
        [bill_info, meta_info, [qr_d, qr_txt]]
    ], colWidths=[65*mm, 70*mm, 45*mm])
    info_t.setStyle(TableStyle([('VALIGN', (0,0), (-1,-1), 'TOP')]))
    story.append(info_t)
    
    doc.build(story)

test_generate()
