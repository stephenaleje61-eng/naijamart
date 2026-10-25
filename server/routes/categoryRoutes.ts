import { Router, Request, Response } from 'express';
import { db } from '../db.js';

const router = Router();

// GET all categories with active product count
router.get('/', (_req: Request, res: Response) => {
  const activeProducts = db.products.filter(p => p.status === 'active');

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
