import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import multer from 'multer';

import * as authController from './controllers/authController.js';
import * as dashboardController from './controllers/dashboardController.js';
import * as chatController from './controllers/chatController.js';
import * as dataController from './controllers/dataController.js';
import * as analyticsController from './controllers/analyticsController.js';
import * as adminController from './controllers/adminController.js';
import { assistantStatus } from './services/geminiService.js';

const app = express();
const PORT = process.env.PORT || 8080;

// Multer memory storage for file uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 50 * 1024 * 1024 } // 50 MB limit
});

// Middleware
app.use(
  cors({
    origin: ['http://localhost:5173', 'http://127.0.0.1:5173', 'http://localhost:3000'],
    credentials: true
  })
);
app.use(cookieParser());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Health Check
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', service: 'ProcureIQ API Server', timestamp: new Date().toISOString() });
});

// Auth Endpoints
app.post('/api/auth/login', authController.login);
app.get('/api/auth/me', authController.getMe);
app.post('/api/auth/logout', authController.logout);

// Dashboard Overview
app.get('/api/dashboard/overview', dashboardController.getDashboardOverview);

// Chat / AI Assistant Query
app.post('/api/chat/query', chatController.handleChatQuery);
app.get('/api/chat/status', (_req, res) => res.json(assistantStatus()));

// Master Data
app.get('/api/vendors', dataController.getVendors);
app.get('/api/vendors/:id', dataController.getVendorById);
app.get('/api/items', dataController.getItems);
app.get('/api/items/:id', dataController.getItemById);
app.get('/api/purchase-orders', dataController.getPurchaseOrders);

// Analytics
app.get('/api/analytics/expenditure', analyticsController.getExpenditure);
app.get('/api/analytics/vendor-comparison', analyticsController.getVendorComparison);
app.get('/api/analytics/price-trends', analyticsController.getPriceTrends);

// Admin & Datasets
app.get('/api/admin/stats', adminController.getAdminStats);
app.delete('/api/admin/demo-data', adminController.removeUntouchedDemoData);
app.post('/api/admin/datasets/validate', adminController.validateDataset);
app.post('/api/admin/datasets/upload', upload.single('file'), adminController.uploadDataset);
app.post('/api/admin/datasets/batch-upload', adminController.batchUploadDatasets);
app.get('/api/admin/datasets', adminController.getDatasets);
app.delete('/api/admin/datasets/:id', adminController.deleteDataset);
app.get('/api/admin/users', adminController.getUsers);

// 404 handler
app.use('/api/*', (_req, res) => {
  res.status(404).json({ error: 'Endpoint not found' });
});

// Global Error Handler
app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error('Unhandled server error:', err);
  const status = (err as Error & { status?: number }).status;
  res.status(status === 413 || (err as any).code === 'LIMIT_FILE_SIZE' ? 413 : 500).json({ error: err.message || 'Internal server error' });
});

app.listen(PORT, () => {
  console.log(`ProcureIQ API Server running on http://localhost:${PORT}`);
});

export default app;
