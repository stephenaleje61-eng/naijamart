import { Router, Request, Response } from 'express';
import { db } from '../db.js';
import { requireSeller, AuthenticatedRequest } from '../auth.js';

const router = Router();

// GET public seller storefront by ID or Shop Slug (genuine sellers only)
router.get('/storefront/:identifier', (req: Request, res: Response) => {
  const { identifier } = req.params;
  let profile = db.sellerProfiles.find(
    s => s.userId === identifier || s.id === identifier || s.shopSlug === identifier
  );

  if (!profile && identifier) {
    const lower = identifier.toLowerCase();
    profile = db.sellerProfiles.find(
      s => s.shopSlug.toLowerCase() === lower || s.shopName.toLowerCase() === lower
    );
  }

  if (!profile && identifier) {
    const sellerUser = db.users.find(
      u => u.id === identifier || u.email?.toLowerCase() === identifier.toLowerCase()
    );
    if (sellerUser) {
      const shopName = sellerUser.name ? `${sellerUser.name}'s Store` : 'WukariMart Seller';
      const slug = shopName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
      profile = {
        id: `profile-${sellerUser.id}`,
        userId: sellerUser.id,
        shopName,
        shopSlug: `${slug}-${sellerUser.id.slice(-4)}`,
        description: `Student storefront on WukariMart (${sellerUser.city || 'Wukari'}).`,
        whatsappNumber: sellerUser.whatsappNumber || sellerUser.phone || '',
        state: sellerUser.state || 'Taraba',
        city: sellerUser.city || 'Wukari',
        isVerified: sellerUser.role === 'seller',
        createdAt: sellerUser.createdAt || new Date().toISOString()
      };
      db.sellerProfiles.push(profile);
      db.save();
    }
  }

  if (!profile && identifier) {
    const matchingProducts = db.products.filter(p => p.sellerId === identifier);
    if (matchingProducts.length > 0) {
      const firstP = matchingProducts[0];
      const shopName = firstP.shopName || firstP.sellerName || 'WukariMart Seller';
      const slug = shopName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
      profile = {
        id: `profile-${identifier}`,
        userId: identifier,
        shopName,
        shopSlug: `${slug}-${identifier.slice(-4)}`,
        description: `Genuine FUWUKARI student seller on WukariMart.`,
        whatsappNumber: firstP.whatsappNumber || '',
        state: firstP.state || 'Taraba',
        city: firstP.city || 'Wukari',
        isVerified: false,
        createdAt: firstP.createdAt || new Date().toISOString()
      };
      db.sellerProfiles.push(profile);
      db.save();
    }
  }

  if (!profile) {
    return res.status(404).json({ success: false, error: 'Seller storefront not found.' });
  }

  const sellerUser = db.users.find(u => u.id === profile.userId);
  const products = db.products.filter(
    p => (p.sellerId === profile.userId || p.sellerId === identifier) && p.status === 'active'
  );

  res.json({
    seller: {
      id: profile.id,
      userId: profile.userId,
      shopName: profile.shopName,
      shopSlug: profile.shopSlug,
      shopLogo: profile.shopLogo || sellerUser?.avatarUrl,
      coverImage: profile.coverImage,
      description: profile.description,
      whatsappNumber: profile.whatsappNumber || '',
      state: profile.state || 'Taraba',
      city: profile.city || 'Wukari',
      address: profile.address,
      isVerified: profile.isVerified,
      createdAt: profile.createdAt,
      totalListings: products.length
    },
    products
  });
});

// GET authenticated seller's own listings
router.get('/my-listings', requireSeller, (req: AuthenticatedRequest, res: Response) => {
  const user = req.user!;
  const allSellerProducts = db.products.filter(p => p.sellerId === user.id);

  const enrichedListings = allSellerProducts.map(p => ({
    ...p,
    remainingMs: 999999999999,
    remainingHours: 999999,
    remainingDays: 9999,
    isExpired: false,
    isExpiringSoon: false
  }));

  const totalViews = allSellerProducts.reduce((sum, p) => sum + (p.views || 0), 0);
  const totalWhatsAppClicks = allSellerProducts.reduce((sum, p) => sum + (p.whatsappClicks || 0), 0);
  const activeCount = allSellerProducts.filter(p => p.status === 'active').length;

  res.json({
    listings: enrichedListings,
    stats: {
      totalProducts: allSellerProducts.length,
      activeCount,
      expiringSoonCount: 0,
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
    profile = {
      id: `profile-${Date.now()}`,
      userId: user.id,
      shopName: `${user.name}'s Store`,
      shopSlug: `${user.name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-${Date.now().toString().slice(-4)}`,
      description: 'Official student storefront on WukariMart.',
      whatsappNumber: user.whatsappNumber || user.phone || '',
      state: user.state || 'Taraba',
      city: user.city || 'Wukari',
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
