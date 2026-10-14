import { Router, Request, Response } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
import { requireAuth, AuthenticatedRequest } from '../auth.js';

const router = Router();
const UPLOADS_DIR = path.resolve(process.cwd(), 'uploads');

if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

// Multer storage configuration
const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, UPLOADS_DIR);
  },
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase() || '.jpg';
    const randomHex = crypto.randomBytes(8).toString('hex');
    const safeName = `naijamart-${Date.now()}-${randomHex}${ext}`;
    cb(null, safeName);
  }
});

// File filter for images only
const fileFilter = (
  _req: Request,
  file: Express.Multer.File,
  cb: multer.FileFilterCallback
) => {
  const allowedMimes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/avif'];
  if (allowedMimes.includes(file.mimetype.toLowerCase())) {
    cb(null, true);
  } else {
    cb(new Error('Only valid image files (JPEG, PNG, WebP, GIF, AVIF) are allowed.'));
  }
};

const upload = multer({
  storage,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB max per image
  },
  fileFilter
});

// Upload single or multiple images (up to 6 photos per product)
router.post('/', (req: Request, res: Response) => {
  upload.array('images', 6)(req, res, (err) => {
    if (err instanceof multer.MulterError) {
      if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({ error: 'Image file too large. Maximum size is 10MB per image.' });
      }
      return res.status(400).json({ error: `Upload error: ${err.message}` });
    } else if (err) {
      return res.status(400).json({ error: err.message || 'Image upload failed.' });
    }

    const files = req.files as Express.Multer.File[];
    if (!files || files.length === 0) {
      return res.status(400).json({ error: 'No image file uploaded. At least one image is mandatory.' });
    }

    const uploadedUrls = files.map(file => ({
      url: `/uploads/${file.filename}`,
      originalName: file.originalname,
      size: file.size,
      mimetype: file.mimetype
    }));

    res.json({
      success: true,
      count: uploadedUrls.length,
      files: uploadedUrls,
      urls: uploadedUrls.map(f => f.url)
    });
  });
});

// Delete an uploaded file (e.g. if user removes from preview before saving)
router.delete('/:filename', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  const filename = path.basename(req.params.filename);
  const filePath = path.join(UPLOADS_DIR, filename);

  try {
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
      return res.json({ success: true, message: 'Image deleted.' });
    }
    return res.status(404).json({ error: 'Image file not found.' });
  } catch (err: any) {
    return res.status(500).json({ error: 'Failed to delete image: ' + err.message });
  }
});

export default router;
