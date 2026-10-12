import { Router, Request, Response } from 'express';
import { db } from '../db.js';
import { requireAuth, requireSeller, AuthenticatedRequest } from '../auth.js';

const router = Router();

// GET public seller storefront by ID or Shop Slug
router.get('/storefront/:identifier', (req: Request, res: Response) => {
  const { identifier } = req.params;
  const profile = db.sellerProfiles.find(
    s => s.userId === identifier || s.id === identifier || s.shopSlug === identifier
  );

  if (!profile) {
    return res.status(404).json({ error: 'Seller storefront not found.' });
  }

  const sellerUser = db.users.find(u => u.id === profile.userId);
  const now = Date.now();

  // Active non-expired products
  const products = db.products.filter(p => {
    const isExpired = new Date(p.expiresAt).getTime() <= now;
    return p.sellerId === profile.userId && p.status === 'active' && !isExpired;
  });

  res.json({
    seller: {
      id: profile.id,
      userId: profile.userId,
      shopName: profile.shopName,
      shopSlug: profile.shopSlug,
      shopLogo: profile.shopLogo || sellerUser?.avatarUrl,
      coverImage: profile.coverImage,
      description: profile.description,
      whatsappNumber: profile.whatsappNumber,
      state: profile.state,
      city: profile.city,
      address: profile.address,
      isVerified: profile.isVerified,
      createdAt: profile.createdAt,
      totalListings: products.length
    },
    products
  });
});

// GET authenticated seller's own listings (including expiring soon warnings and stats)
router.get('/my-listings', requireSeller, (req: AuthenticatedRequest, res: Response) => {
  const user = req.user!;
  const now = Date.now();

  const allSellerProducts = db.products.filter(p => p.sellerId === user.id);

  // Map with 7-day countdown details and expiration alerts
  const enrichedListings = allSellerProducts.map(p => {
    const expiresTime = new Date(p.expiresAt).getTime();
    const remainingMs = Math.max(0, expiresTime - now);
    const remainingHours = Math.floor(remainingMs / (1000 * 3600));
    const remainingDays = Math.floor(remainingHours / 24);
    const isExpired = remainingMs === 0;
    const isExpiringSoon = remainingHours <= 24 && !isExpired; // Less than 24 hours warning

    return {
      ...p,
      remainingMs,
      remainingHours,
      remainingDays,
      isExpired,
      isExpiringSoon
    };
  });

  // Calculate seller stats
  const totalViews = allSellerProducts.reduce((sum, p) => sum + (p.views || 0), 0);
  const totalWhatsAppClicks = allSellerProducts.reduce((sum, p) => sum + (p.whatsappClicks || 0), 0);
  const activeCount = enrichedListings.filter(p => p.status === 'active' && !p.isExpired).length;
  const expiringSoonCount = enrichedListings.filter(p => p.isExpiringSoon).length;

  res.json({
    listings: enrichedListings,
    stats: {
      totalProducts: allSellerProducts.length,
      activeCount,
      expiringSoonCount,
      totalViews,
      totalWhatsAppClicks
    }
  });
});

// UPDATE Seller Shop Profile
router.put('/profile', requireSeller, (req: AuthenticatedRequest, res: Response) => {
  const user = req.user!;
  let profile = db.sellerProfiles.find(s => s.userId === user.id);

  if (!profile) {
    // Auto-create if missing
    profile = {
      id: `profile-${Date.now()}`,
      userId: user.id,
      shopName: `${user.name}'s Shop`,
      shopSlug: `${user.name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-${Date.now().toString().slice(-4)}`,
      description: 'Welcome to my official shop on NaijaMart!',
      whatsappNumber: user.whatsappNumber || user.phone || '',
      state: user.state || 'Lagos',
      city: user.city || 'Ikeja',
      isVerified: false,
      createdAt: new Date().toISOString()
    };
    db.sellerProfiles.push(profile);
  }

  const { shopName, description, shopLogo, coverImage, whatsappNumber, state, city, address } = req.body;

  if (shopName) {
    profile.shopName = shopName.trim();
    profile.shopSlug = shopName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
  }
  if (description !== undefined) profile.description = description.trim();
  if (shopLogo !== undefined) profile.shopLogo = shopLogo;
  if (coverImage !== undefined) profile.coverImage = coverImage;
  if (whatsappNumber !== undefined) {
    profile.whatsappNumber = whatsappNumber.trim();
    user.whatsappNumber = whatsappNumber.trim();
  }
  if (state !== undefined) {
    profile.state = state.trim();
    user.state = state.trim();
  }
  if (city !== undefined) {
    profile.city = city.trim();
    user.city = city.trim();
  }
  if (address !== undefined) profile.address = address.trim();

  // Also update shopName in any existing active products for consistency
  for (const prod of db.products) {
    if (prod.sellerId === user.id) {
      prod.shopName = profile.shopName;
      prod.whatsappNumber = profile.whatsappNumber;
    }
  }

  db.save();

  res.json({
    message: 'Storefront updated successfully.',
    profile
  });
});

export default router;
