import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { medicinesRouter } from './routes/medicines';
import { adherenceRouter } from './routes/adherence';
import { settingsRouter } from './routes/settings';

dotenv.config();

const app = express();
const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 5000;
const CORS_ORIGIN = process.env.CORS_ORIGIN || '*';

// Middleware
app.use(cors({ origin: CORS_ORIGIN, credentials: true }));
app.use(express.json());

// Request logger for development
app.use((req: Request, _res: Response, next: NextFunction) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
  next();
});

// Health check endpoint
app.get('/api/health', (_req: Request, res: Response) => {
  res.json({
    status: 'ok',
    service: 'CareMeds REST API',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
  });
});

// Route registration
app.use('/api/medicines', medicinesRouter);
app.use('/api/adherence', adherenceRouter);
app.use('/api/settings', settingsRouter);

// 404 handler
app.use((_req: Request, res: Response) => {
  res.status(404).json({ error: 'Endpoint not found' });
});

// Global error handler
app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
  console.error('Unhandled server error:', err);
  res.status(500).json({ error: 'Internal server error', message: err.message });
});

// Start server
if (process.env.NODE_ENV !== 'test') {
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`========================================`);
    console.log(`  CareMeds Backend Server Running`);
    console.log(`  Local:   http://localhost:${PORT}/api/health`);
    console.log(`  Port:    ${PORT}`);
    console.log(`  Time:    ${new Date().toLocaleTimeString()}`);
    console.log(`========================================`);
  });
}

export default app;
