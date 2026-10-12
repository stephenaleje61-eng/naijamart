import { Router, Request, Response, NextFunction } from 'express';
import crypto from 'crypto';
import path from 'path';
import fs from 'fs';
import multer from 'multer';
import { db, Product, SEVEN_DAYS_MS } from '../db.js';
import { requireAuth, AuthenticatedRequest, verifyToken } from '../auth.js';

const router = Router();

const uploadsDir = path.resolve(process.cwd(), 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Multer storage for handling direct multipart/form-data on POST /api/products
const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase() || '.jpg';
    const randomHex = crypto.randomBytes(6).toString('hex');
    cb(null, `naijamart-${Date.now()}-${randomHex}${ext}`);
  }
});

const uploadMiddleware = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }
}).array('images', 6);

// Middleware that conditionally runs multer if multipart/form-data, else skips
const handleUploadOrJson = (req: Request, res: Response, next: NextFunction) => {
  const contentType = req.headers['content-type'] || '';
  if (contentType.includes('multipart/form-data')) {
    uploadMiddleware(req, res, (err) => {
      if (err) {
        console.error('[Multer Error on /api/products]:', err);
        return res.status(400).json({ success: false, error: `Image upload error: ${err.message}` });
      }
      next();
    });
  } else {
    next();
  }
};

// Optional auth helper: attaches user if token provided, but doesn't crash if omitted
const optionalAuth = (req: AuthenticatedRequest, _res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.substring(7);
    const payload = verifyToken(token);
    if (payload) {
      const user = db.users.find(u => u.id === payload.userId);
      if (user) {
        req.user = user;
      }
    }
  }
  next();
};

// Helper to normalize Nigerian phone number for WhatsApp
export function formatWhatsAppLink(phone: string, text: string): string {
  if (!phone) return '';
  let cleaned = phone.replace(/[^0-9]/g, '');
  if (cleaned.startsWith('0')) {
    cleaned = '234' + cleaned.substring(1);
  } else if (!cleaned.startsWith('234')) {
    cleaned = '234' + cleaned;
  }
  return `https://wa.me/${cleaned}?text=${encodeURIComponent(text)}`;
}

// GET all public active products with filters and search
router.get('/', (req: Request, res: Response) => {
  try {
    const now = Date.now();
    let list = db.products.filter(p => {
      const isExpired = new Date(p.expiresAt).getTime() <= now;
      return p.status === 'active' && !isExpired;
    });

    const {
      q,
      category,
      condition,
      state,
      city,
      minPrice,
      maxPrice,
      sellerId,
      sort = 'newest',
      limit = 50,
      page = 1
    } = req.query;

    // Search keyword
    if (q && typeof q === 'string') {
      const query = q.toLowerCase().trim();
      list = list.filter(p =>
        p.title.toLowerCase().includes(query) ||
        p.description.toLowerCase().includes(query) ||
        p.shopName.toLowerCase().includes(query) ||
        p.city.toLowerCase().includes(query) ||
        p.state.toLowerCase().includes(query)
      );
    }

    // Category filter
    if (category && typeof category === 'string' && category !== 'all') {
      list = list.filter(p => p.categoryId.toLowerCase() === category.toLowerCase());
    }

    // Condition filter
    if (condition && (condition === 'new' || condition === 'used')) {
      list = list.filter(p => p.condition === condition);
    }

    // State filter (supports exact name e.g. "Lagos", "FCT - Abuja", etc.)
    if (state && typeof state === 'string' && state !== 'all') {
      list = list.filter(p => p.state.toLowerCase() === state.toLowerCase());
    }

    // City filter
    if (city && typeof city === 'string' && city !== 'all') {
      list = list.filter(p => p.city.toLowerCase() === city.toLowerCase());
    }

    // Min price
    if (minPrice && !isNaN(Number(minPrice))) {
      list = list.filter(p => p.price >= Number(minPrice));
    }

    // Max price
    if (maxPrice && !isNaN(Number(maxPrice))) {
      list = list.filter(p => p.price <= Number(maxPrice));
    }

    // Seller storefront filter
    if (sellerId && typeof sellerId === 'string') {
      list = list.filter(p => p.sellerId === sellerId);
    }

    // Sorting
    if (sort === 'price-asc') {
      list.sort((a, b) => a.price - b.price);
    } else if (sort === 'price-desc') {
      list.sort((a, b) => b.price - a.price);
    } else if (sort === 'popular') {
      list.sort((a, b) => (b.views + b.whatsappClicks * 3) - (a.views + a.whatsappClicks * 3));
    } else {
      // default 'newest'
      list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    }

    // Pagination
    const pageNum = Math.max(1, Number(page) || 1);
    const pageSize = Math.min(100, Math.max(1, Number(limit) || 20));
    const total = list.length;
    const totalPages = Math.ceil(total / pageSize);
    const startIndex = (pageNum - 1) * pageSize;
    const items = list.slice(startIndex, startIndex + pageSize);

    res.json({
      success: true,
      items,
      pagination: {
        total,
        page: pageNum,
        pageSize,
        totalPages
      }
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message || 'Failed to fetch products' });
  }
});

// GET Flash Deals
router.get('/flash-deals', (_req: Request, res: Response) => {
  try {
    const now = Date.now();
    const deals = db.products
      .filter(p => {
        const isExpired = new Date(p.expiresAt).getTime() <= now;
        return p.status === 'active' && !isExpired && p.originalPrice && p.originalPrice > p.price;
      })
      .sort((a, b) => {
        const discountA = (a.originalPrice! - a.price) / a.originalPrice!;
        const discountB = (b.originalPrice! - b.price) / b.originalPrice!;
        return discountB - discountA;
      })
      .slice(0, 10);

    res.json(deals);
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET Trending products
router.get('/trending', (_req: Request, res: Response) => {
  try {
    const now = Date.now();
    const trending = db.products
      .filter(p => {
        const isExpired = new Date(p.expiresAt).getTime() <= now;
        return p.status === 'active' && !isExpired;
      })
      .sort((a, b) => (b.views + b.whatsappClicks * 2) - (a.views + a.whatsappClicks * 2))
      .slice(0, 12);

    res.json(trending);
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET single product by ID
router.get('/:id', (req: Request, res: Response) => {
  try {
    const product = db.products.find(p => p.id === req.params.id);
    if (!product) {
      return res.status(404).json({ success: false, error: 'Product not found.' });
    }

    const now = Date.now();
    const isExpired = new Date(product.expiresAt).getTime() <= now;

    if (isExpired) {
      return res.status(410).json({
        success: false,
        error: 'This listing has expired.',
        message: 'Product listings on NaijaMart automatically expire after 7 days to maintain fresh stock.',
        isExpired: true
      });
    }

    const seller = db.sellerProfiles.find(s => s.userId === product.sellerId);
    const sellerUser = db.users.find(u => u.id === product.sellerId);

    const remainingMs = Math.max(0, new Date(product.expiresAt).getTime() - now);
    const remainingHours = Math.floor(remainingMs / (1000 * 3600));

    res.json({
      success: true,
      ...product,
      remainingMs,
      remainingHours,
      sellerProfile: seller || null,
      sellerJoinDate: sellerUser?.createdAt || product.createdAt
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Increment View count
router.post('/:id/view', (req: Request, res: Response) => {
  const product = db.products.find(p => p.id === req.params.id);
  if (product) {
    product.views = (product.views || 0) + 1;
    db.save();
    return res.json({ success: true, views: product.views });
  }
  res.status(404).json({ success: false, error: 'Product not found.' });
});

// Track WhatsApp Chat button click & return formatted link
router.post('/:id/whatsapp-click', (req: Request, res: Response) => {
  const product = db.products.find(p => p.id === req.params.id);
  if (!product) {
    return res.status(404).json({ success: false, error: 'Product not found.' });
  }

  product.whatsappClicks = (product.whatsappClicks || 0) + 1;
  db.save();

  const appOrigin = process.env.APP_URL || `${req.protocol}://${req.get('host')}`;
  const productLink = `${appOrigin}/#product-${product.id}`;
  const prefilledMessage = `Hello ${product.shopName || 'Seller'}, I found your product "${product.title}" (₦${product.price.toLocaleString()}) on NaijaMart. Is it still available? Listing link: ${productLink}`;

  const link = formatWhatsAppLink(product.whatsappNumber, prefilledMessage);

  res.json({
    success: true,
    whatsappClicks: product.whatsappClicks,
    link,
    whatsappNumber: product.whatsappNumber,
    message: prefilledMessage
  });
});

// CREATE Product listing: POST /api/products
// Handles BOTH multipart/form-data with multer AND json bodies
router.post('/', handleUploadOrJson, optionalAuth, (req: AuthenticatedRequest, res: Response) => {
  try {
    // 5. ADD LOGGING for debug
    console.log('[POST /api/products] Body received:', req.body);
    console.log('[POST /api/products] Files received:', req.files);

    const {
      title,
      description,
      price,
      originalPrice,
      category,
      categoryId = category,
      condition = 'new',
      whatsapp,
      whatsappNumber = whatsapp,
      state = 'Lagos',
      city = 'Ikeja',
      quantity = 1
    } = req.body;

    if (!title || !description || !price) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: title, description, and price are required.'
      });
    }

    const parsedPrice = Number(price);
    if (isNaN(parsedPrice) || parsedPrice <= 0) {
      return res.status(400).json({
        success: false,
        error: 'Please enter a valid numeric price in Nigerian Naira (₦).'
      });
    }

    // Process uploaded files or image URLs
    const validImages: string[] = [];

    // Check if files were uploaded via multipart form
    if (req.files && Array.isArray(req.files) && req.files.length > 0) {
      const files = req.files as Express.Multer.File[];
      files.forEach(f => validImages.push(`/uploads/${f.filename}`));
    }

    // Check if images were passed in body (array or string)
    if (req.body.images) {
      if (Array.isArray(req.body.images)) {
        req.body.images.forEach((img: any) => {
          if (typeof img === 'string' && img.trim().length > 0) {
            validImages.push(img.trim());
          }
        });
      } else if (typeof req.body.images === 'string') {
        try {
          const parsed = JSON.parse(req.body.images);
          if (Array.isArray(parsed)) {
            parsed.forEach((img: any) => {
              if (typeof img === 'string' && img.trim().length > 0) validImages.push(img.trim());
            });
          } else {
            validImages.push(req.body.images.trim());
          }
        } catch {
          if (req.body.images.trim().length > 0) {
            validImages.push(req.body.images.trim());
          }
        }
      }
    }

    // 4. Temporary testing requirement: If no images, provide default high quality product image
    const finalImages = validImages.length > 0
      ? validImages
      : ['https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=800'];

    // Identify user or fall back to default active merchant
    const user = req.user || db.users.find(u => u.role === 'seller') || db.users[0];
    const sellerProfile = db.sellerProfiles.find(s => s.userId === user?.id) || db.sellerProfiles[0];

    const sellerPhone = (
      whatsappNumber ||
      whatsapp ||
      sellerProfile?.whatsappNumber ||
      user?.whatsappNumber ||
      user?.phone ||
      '08031234567'
    ).trim();

    const now = new Date();
    const createdAt = now.toISOString();
    const expiresAt = new Date(now.getTime() + SEVEN_DAYS_MS).toISOString();

    const newProduct: Product = {
      id: `prod-${Date.now()}-${crypto.randomBytes(3).toString('hex')}`,
      sellerId: user?.id || 'seller-ikeja-01',
      sellerName: user?.name || 'Verified Merchant',
      shopName: sellerProfile?.shopName || 'NaijaMart Merchant',
      whatsappNumber: sellerPhone,
      title: String(title).trim(),
      description: String(description).trim(),
      price: parsedPrice,
      originalPrice: originalPrice ? Number(originalPrice) : undefined,
      categoryId: String(categoryId || 'phones-tablets').trim(),
      condition: condition === 'used' ? 'used' : 'new',
      images: finalImages,
      state: String(state).trim(),
      city: String(city).trim(),
      quantity: Math.max(1, Number(quantity) || 1),
      status: 'active',
      views: 0,
      whatsappClicks: 0,
      createdAt,
      expiresAt,
      updatedAt: createdAt
    };

    db.products.unshift(newProduct);
    db.save();

    console.log('[POST /api/products] Successfully created product:', newProduct.id, newProduct.title);

    // Return strictly JSON
    return res.status(201).json({
      success: true,
      message: 'Product published successfully! It will remain live for exactly 7 days.',
      product: newProduct
    });
  } catch (err: any) {
    console.error('[POST /api/products Error]:', err);
    return res.status(500).json({
      success: false,
      error: err.message || 'Failed to create product listing.'
    });
  }
});

// UPDATE Product listing (Seller only - must own product, or Admin)
// CRITICAL: NEVER RESET 7-DAY EXPIRATION COUNTDOWN ON EDIT
router.put('/:id', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  try {
    const user = req.user!;
    const product = db.products.find(p => p.id === req.params.id);

    if (!product) {
      return res.status(404).json({ success: false, error: 'Product not found.' });
    }

    if (product.sellerId !== user.id && user.role !== 'admin') {
      return res.status(403).json({ success: false, error: 'Forbidden: You can only edit your own products.' });
    }

    const {
      title,
      description,
      price,
      originalPrice,
      category,
      categoryId = category,
      condition,
      images,
      whatsapp,
      whatsappNumber = whatsapp,
      state,
      city,
      quantity,
      status
    } = req.body;

    if (images !== undefined) {
      if (Array.isArray(images) && images.length > 0) {
        product.images = images.filter((img: any) => typeof img === 'string' && img.trim().length > 0);
      }
    }

    if (title) product.title = title.trim();
    if (description) product.description = description.trim();
    if (price !== undefined && !isNaN(Number(price))) product.price = Number(price);
    if (originalPrice !== undefined) product.originalPrice = originalPrice ? Number(originalPrice) : undefined;
    if (categoryId) product.categoryId = categoryId.trim();
    if (condition) product.condition = condition === 'used' ? 'used' : 'new';
    if (whatsappNumber) product.whatsappNumber = whatsappNumber.trim();
    if (state) product.state = state.trim();
    if (city) product.city = city.trim();
    if (quantity !== undefined) product.quantity = Number(quantity);
    if (status && ['active', 'sold', 'unavailable'].includes(status)) {
      product.status = status;
    }

    // Preserve 7-day expiration (never reset countdown)
    product.updatedAt = new Date().toISOString();

    db.save();

    res.json({
      success: true,
      message: 'Product updated successfully.',
      product
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message || 'Failed to update product.' });
  }
});

// DELETE Product listing
router.delete('/:id', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  try {
    const user = req.user!;
    const productIndex = db.products.findIndex(p => p.id === req.params.id);

    if (productIndex === -1) {
      return res.status(404).json({ success: false, error: 'Product not found.' });
    }

    const product = db.products[productIndex];
    if (product.sellerId !== user.id && user.role !== 'admin') {
      return res.status(403).json({ success: false, error: 'Forbidden: You can only delete your own products.' });
    }

    db.products.splice(productIndex, 1);
    db.save();

    res.json({ success: true, message: 'Product deleted successfully.' });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Toggle Favourite
router.post('/:id/favourite', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  try {
    const user = req.user!;
    const productId = req.params.id;

    const existingIndex = db.favourites.findIndex(f => f.userId === user.id && f.productId === productId);
    if (existingIndex > -1) {
      db.favourites.splice(existingIndex, 1);
      db.save();
      return res.json({ success: true, favourited: false, message: 'Removed from saved items' });
    } else {
      db.favourites.push({
        id: `fav-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
        userId: user.id,
        productId,
        createdAt: new Date().toISOString()
      });
      db.save();
      return res.json({ success: true, favourited: true, message: 'Added to saved items' });
    }
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Report a product
router.post('/:id/report', (req: Request, res: Response) => {
  try {
    const { reason, details, reporterEmail, reporterName } = req.body;
    const product = db.products.find(p => p.id === req.params.id);

    if (!reason || !details) {
      return res.status(400).json({ success: false, error: 'Reason and details are required to submit a report.' });
    }

    const report = {
      id: `rep-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
      reporterEmail: (reporterEmail || 'anonymous@buyer.ng').trim(),
      reporterName: (reporterName || 'Concerned Buyer').trim(),
      productId: product?.id,
      productTitle: product?.title,
      sellerId: product?.sellerId,
      reason: reason.trim(),
      details: details.trim(),
      status: 'pending' as const,
      createdAt: new Date().toISOString()
    };

    db.reports.unshift(report);
    db.save();

    res.json({
      success: true,
      message: 'Report submitted. Our trust & safety team will review this listing immediately.'
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

export default router;
