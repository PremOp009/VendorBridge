# 🌉 VendorBridge ERP

A modern **Procurement & Vendor Management ERP** system built with Flask + Vanilla JS.

---

## 🚀 Quick Start

### 1. Backend Setup

```bash
cd VendorBridge

# Create virtual environment (already done)
python -m venv venv

# Activate it
venv\Scripts\activate          # Windows
# source venv/bin/activate     # Mac/Linux

# Install dependencies
pip install -r backend/requirements.txt

# Start the backend
python -m flask --app backend.app run --host=0.0.0.0 --port=5000 --debug
```

### 2. Frontend — Open in Browser

Open `frontend/index.html` using **VS Code Live Server** (port 5500) or any static server.

> ⚠️ The frontend expects the backend on `http://localhost:5000`

---

## 🔐 Demo Accounts

| Role | Email | Password |
|------|-------|----------|
| Administrator | admin@vendorbridge.com | Admin@1234 |
| Procurement Manager | procurement@vendorbridge.com | Admin@1234 |
| Finance Officer | finance@vendorbridge.com | Admin@1234 |

---

## 📦 Database

**Default**: SQLite (`vendorbridge_dev.db`) — auto-created on first run. No setup needed!

**For PostgreSQL**:
1. Install PostgreSQL
2. Create database: `CREATE DATABASE vendorbridge;`
3. Update `backend/.env`:
   ```
   DATABASE_URL=postgresql://user:password@localhost:5432/vendorbridge
   ```
4. Uncomment `psycopg2-binary` in `requirements.txt` and reinstall

---

## 📧 Email Configuration

To enable invoice email sending, update `backend/.env`:
```
MAIL_SERVER=smtp.gmail.com
MAIL_PORT=587
MAIL_USE_TLS=True
MAIL_USERNAME=your-gmail@gmail.com
MAIL_PASSWORD=your-app-password    # Gmail App Password
```

---

## 🗂 Project Structure

```
VendorBridge/
├── backend/              Flask REST API
│   ├── app.py            App factory + auto-seeding
│   ├── extensions.py     Flask extensions
│   ├── models/           SQLAlchemy ORM models
│   ├── routes/           Blueprint API routes
│   ├── services/         PDF, Email, AI services
│   ├── middleware/       JWT auth decorators
│   └── utils/            Helpers
│
├── frontend/             Vanilla JS SPA
│   ├── index.html        SPA shell
│   ├── css/              Design system (main, components, pages)
│   ├── js/               Core modules (router, API client, auth)
│   ├── pages/            12 page modules
│   └── components/       Sidebar, topbar, modal, toast
│
├── database/             
│   └── schema.sql        PostgreSQL schema + seed data
│
└── run.py               Quick start script
```

---

## 🌟 Features

| Module | Features |
|--------|---------|
| 🔐 Authentication | JWT, 4 roles, register/login |
| 📊 Dashboard | KPI cards, Chart.js analytics |
| 🏢 Vendors | CRUD, GST, ratings, categories |
| 📋 RFQs | Create, assign vendors, track status |
| 💬 Quotations | Pricing, delivery, terms |
| ⚖️ Comparison | AI scoring (price 40% + delivery 30% + rating 30%) |
| ✅ Approvals | Approve/reject with remarks, audit trail |
| 📄 Purchase Orders | Auto-numbered PO-YYYY-NNNN |
| 🧾 Invoices | PDF (ReportLab), email, print |
| 📈 Reports | 5 Chart.js charts, spend analytics |
| 🔔 Activity Logs | Full audit trail |

---

## 🎨 Theme

- **Background**: `#FFF8E8` (warm cream)
- **Surface**: `#F7EED3` (light cream)
- **Muted**: `#AAB396` (sage)
- **Primary**: `#674636` (warm brown)
- **Sidebar**: Dark espresso `#2a1a12`
