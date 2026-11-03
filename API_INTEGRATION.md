# API integration
Set `VITE_USE_MOCK=false` and `VITE_API_BASE_URL`; replace mock bodies in `src/services/*` using `http()` from `services/api.ts`.
Endpoints: POST /api/auth/login · GET /api/dashboard/overview · POST /api/chat/query ({question,history}->AiAnswer) · GET /api/vendors(/:id) · GET /api/items(/:id) · GET /api/purchase-orders · GET /api/analytics/{expenditure,vendor-comparison,price-trends} · POST /api/admin/datasets/{upload,validate} · GET /api/admin/datasets · DELETE /api/admin/datasets/:id · GET /api/admin/users.
Types are in `src/types`. All authN/authZ, file validation, and audit logging must be enforced server-side; frontend role checks are UI only.
