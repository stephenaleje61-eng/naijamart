import { Router, Request, Response } from 'express';
import { db } from '../db.js';

const router = Router();

const mapServerCategory = (rawId: string): string => {
  const v = String(rawId || '').toLowerCase().trim();
  if (['hostel-items', 'textbooks-past-questions', 'food', 'electronics', 'fashion', 'gas-cooking'].includes(v)) return v;
  if (v.includes('gas') || v.includes('kitchen') || v.includes('cook')) return 'gas-cooking';
  if (v.includes('book') || v.includes('textbook') || v.includes('education')) return 'textbooks-past-questions';
  if (v.includes('food') || v.includes('grocer')) return 'food';
  if (v.includes('phone') || v.includes('computer') || v.includes('electronic')) return 'electronics';
  if (v.includes('fashion') || v.includes('shoe') || v.includes('bag') || v.includes('beauty')) return 'fashion';
  return 'hostel-items';
};

// GET all categories with active product count
router.get('/', (_req: Request, res: Response) => {
  const activeProducts = db.products.filter(p => p.status === 'active');

  const categoriesWithCounts = db.categories.map(cat => {
    const count = activeProducts.filter(p => mapServerCategory(p.categoryId) === cat.id).length;
    return {
      ...cat,
      productCount: count
    };
  });

  res.json(categoriesWithCounts);
});

export default router;
