import { Router, Request, Response } from 'express';
import { db } from '../db.js';

const router = Router();

// GET all categories with active product count
router.get('/', (_req: Request, res: Response) => {
  const now = Date.now();
  const activeProducts = db.products.filter(p => {
    const isExpired = new Date(p.expiresAt).getTime() <= now;
    return p.status === 'active' && !isExpired;
  });

  const categoriesWithCounts = db.categories.map(cat => {
    const count = activeProducts.filter(p => p.categoryId === cat.id).length;
    return {
      ...cat,
      productCount: count
    };
  });

  res.json(categoriesWithCounts);
});

export default router;
