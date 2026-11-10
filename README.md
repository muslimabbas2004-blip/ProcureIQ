# ProcureIQ — Intelligent Procurement Analytics & Intelligence Platform

ProcureIQ is an executive-grade procurement intelligence platform designed to transform raw purchasing records, supplier data, and pricing histories into actionable business intelligence.

---

## ✨ Features

- **Executive Overview Dashboard**: High-level procurement KPIs, monthly spend trends (interactive Area/Bar toggle), spend-share progress bars, and recent purchase orders.
- **AI Procurement Assistant** — Ask about suppliers, spend, and unit prices. Common requests query the local data directly. Optional Ollama or Gemini planning supports more flexible questions.
- **Price Intelligence & Benchmarking**: Side-by-side unit price comparisons across suppliers, historical price ranges, and monthly average price trends.
- **Supplier Analytics** — Compare two suppliers with paired bars and see the underlying figures for spend, orders, item variety, and pricing.
- **Smart Multi-File Admin Console**:
  - Drag-and-drop 2–3+ files simultaneously (`.csv`, `.xlsx`, `.xls`).
  - Automatic dataset type detection (`Vendors`, `Item Master`, `Purchase Orders`, `PO Line Items`, `Quotations`, `Historical Purchases`).
  - Schema validation, data preview, and batch ingestion into the local data store.
- **Data Catalog & Export**: Searchable, sortable tables for materials, purchase orders, and vendor spending with instant CSV export.

---

## 🛠️ Tech Stack

- **Frontend**: React 18, TypeScript, Vite, Tailwind CSS, Lucide Icons, Recharts, PapaParse, XLSX
- **Backend** — Node.js, Express, TypeScript, TSX, Cookie-Parser, Multer, and a local data store with file persistence
- **Proxy**: Vite reverse proxy forwarding `/api` to port `8080`

---

## 🚀 Quick Start

### 1. Install Dependencies
```bash
npm ci
npm --prefix server ci
```

### 2. Run the Application
In two separate terminals:

```bash
# Terminal 1: Start Backend Server (port 8080)
cd server
npm run dev

# Terminal 2: Start Frontend App (port 5173)
npm run dev
```

Open your browser to [http://localhost:5173](http://localhost:5173).

### 3. Optional assistant model

The assistant handles common questions with the built-in planner. For local AI
planning, install Ollama, pull a model your machine can run, and set
`OLLAMA_MODEL` in `server/.env`. See [assistant setup](ASSISTANT.md) for model
configuration and verification.

---

## 🔑 Demo Accounts

| Role / Name | Email | Password |
| :--- | :--- | :--- |
| **Purchase Department** | `procurement@demo.com` (or `purchase@demo.com`) | `Demo@1234` |
| **Hemani Purchase (Administrator)** | `admin@demo.com` | `Demo@1234` |

---

## 🔌 API Endpoints Reference

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `POST` | `/api/auth/login` | Authenticate and issue session cookie |
| `GET` | `/api/auth/me` | Current authenticated user session |
| `POST` | `/api/auth/logout` | Clear user session |
| `GET` | `/api/dashboard/overview` | Executive KPI metrics and spend breakdown |
| `POST` | `/api/chat/query` | Natural language procurement AI query |
| `GET` | `/api/vendors` | Master vendors list with spend metrics |
| `GET` | `/api/items` | Item master catalog and average prices |
| `GET` | `/api/purchase-orders` | Purchase orders register |
| `GET` | `/api/analytics/expenditure` | Monthly spend & category breakdown |
| `GET` | `/api/analytics/vendor-comparison` | Supplier profiles and normalized comparison scores |
| `GET` | `/api/analytics/price-trends` | Item historical price trend and savings |
| `GET` | `/api/admin/stats` | Live database record counts |
| `POST` | `/api/admin/datasets/validate` | Schema validation |
| `POST` | `/api/admin/datasets/batch-upload` | Batch upload & ingest multiple datasets |
| `GET` | `/api/admin/datasets` | Audit log of imported datasets |
| `DELETE`| `/api/admin/datasets/:id` | Remove dataset from library |

---

## 📄 License
MIT
