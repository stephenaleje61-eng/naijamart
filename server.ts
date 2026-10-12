import express from 'express';
import cors from 'cors';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { db } from './server/db.js';
import authRoutes from './server/routes/authRoutes.js';
import productsRoutes from './server/routes/products.js';
import sellerRoutes from './server/routes/sellerRoutes.js';
import categoryRoutes from './server/routes/categoryRoutes.js';
import adminRoutes from './server/routes/adminRoutes.js';
import uploadRoutes from './server/routes/upload.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = Number(process.env.PORT) || 3000;
const isProd = process.env.NODE_ENV === 'production';

// 1. ADD CORS BEFORE ALL ROUTES
app.use(cors({ origin: '*' }));

// 1. ADD BODY PARSERS BEFORE ALL ROUTES
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Serve uploaded files statically with caching headers
const uploadsDir = path.resolve(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}
app.use('/uploads', express.static(uploadsDir, { maxAge: '1d' }));

// 7-DAY EXPIRATION BACKGROUND RUNNER
console.log('Initializing NaijaMart 7-Day Automatic Expiration Worker...');
db.purgeExpiredProducts('Server Startup Purge');
setInterval(() => {
  try {
    db.purgeExpiredProducts('Background Periodic Purge');
  } catch (err) {
    console.error('Error during automatic 7-day expiration cleanup:', err);
  }
}, 60 * 1000);

// API Routes mounted on both /api/* and root aliases so frontend calls never get 404 HTML
app.use('/api/auth', authRoutes);
app.use('/auth', authRoutes);

app.use('/api/products', productsRoutes);
app.use('/products', productsRoutes); // Alias in case frontend calls /products

app.use('/api/sellers', sellerRoutes);
app.use('/sellers', sellerRoutes);

app.use('/api/categories', categoryRoutes);
app.use('/categories', categoryRoutes);

app.use('/api/admin', adminRoutes);
app.use('/admin-api', adminRoutes);

app.use('/api/upload', uploadRoutes);
app.use('/upload', uploadRoutes);

app.get('/api/health', (_req, res) => {
  res.json({
    status: 'ok',
    app: 'NaijaMart',
    time: new Date().toISOString(),
    uptime: process.uptime(),
    cleanupStats: db.cleanupStats
  });
});

// Explicit JSON 404 for any missing /api or /products route - PREVENTS HTML 404 TO FETCH()
app.use(['/api/*', '/products/*'], (req, res) => {
  res.status(404).json({
    success: false,
    error: `API route not found: ${req.method} ${req.originalUrl}`
  });
});

// Global Express error handler - ALWAYS RETURNS JSON, NEVER HTML
app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error('[Global Express API Error]:', err);
  res.status(err.status || 500).json({
    success: false,
    error: err.message || 'Internal server error occurred on NaijaMart backend'
  });
});

async function startServer() {
  if (!isProd) {
    // Development mode with Vite dev middleware
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa'
    });
    app.use(vite.middlewares);
  } else {
    // Production mode: serve built assets from dist
    const distPath = path.resolve(__dirname, 'dist');
    if (fs.existsSync(distPath)) {
      app.use(express.static(distPath));
      app.get('*', (_req, res) => {
        res.sendFile(path.join(distPath, 'index.html'));
      });
    } else {
      console.warn('Production build dist not found. Please run npm run build.');
    }
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[NaijaMart] Server running at http://0.0.0.0:${PORT} in ${isProd ? 'production' : 'development'} mode`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start NaijaMart server:', err);
  process.exit(1);
});
