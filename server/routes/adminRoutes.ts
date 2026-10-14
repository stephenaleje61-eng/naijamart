import { Router, Response } from 'express';
import { db } from '../db.js';
import { requireAdmin, AuthenticatedRequest } from '../auth.js';

const router = Router();

// GET Admin Dashboard Overview Metrics
router.get('/metrics', requireAdmin, (_req: AuthenticatedRequest, res: Response) => {
  const now = Date.now();
  const allProducts = db.products;
  const activeProducts = allProducts.filter(p => p.status === 'active' && new Date(p.expiresAt).getTime() > now);
  const totalViews = allProducts.reduce((sum, p) => sum + (p.views || 0), 0);
  const totalWhatsAppClicks = allProducts.reduce((sum, p) => sum + (p.whatsappClicks || 0), 0);

  const sellers = db.users.filter(u => u.role === 'seller');
  const buyers = db.users.filter(u => u.role === 'buyer');
  const pendingReports = db.reports.filter(r => r.status === 'pending');

  res.json({
    metrics: {
      totalProducts: allProducts.length,
      activeProducts: activeProducts.length,
      totalSellers: sellers.length,
      totalBuyers: buyers.length,
      totalViews,
      totalWhatsAppClicks,
      pendingReports: pendingReports.length,
      totalExpiredPurged: db.cleanupStats.totalExpiredDeleted,
      lastCleanupRun: db.cleanupStats.lastRun
    },
    cleanupStats: db.cleanupStats,
    recentAuditLogs: db.auditLogs.slice(0, 20)
  });
});

// GET all products for moderation (including status & expiration)
router.get('/products', requireAdmin, (_req: AuthenticatedRequest, res: Response) => {
  const now = Date.now();
  const list = db.products.map(p => ({
    ...p,
    isExpired: new Date(p.expiresAt).getTime() <= now,
    remainingHours: Math.max(0, Math.floor((new Date(p.expiresAt).getTime() - now) / 3600000))
  }));

  res.json({ products: list });
});

// Moderation: Remove prohibited/fraudulent product
router.delete('/products/:id', requireAdmin, (req: AuthenticatedRequest, res: Response) => {
  const user = req.user!;
  const productIndex = db.products.findIndex(p => p.id === req.params.id);

  if (productIndex === -1) {
    return res.status(404).json({ error: 'Product not found.' });
  }

  const removed = db.products.splice(productIndex, 1)[0];

  // Log action
  db.auditLogs.unshift({
    id: `audit-${Date.now()}`,
    action: 'ADMIN_REMOVED_PRODUCT',
    actor: `${user.name} (${user.email})`,
    details: `Moderator deleted product "${removed.title}" (ID: ${removed.id}) from shop "${removed.shopName}".`,
    timestamp: new Date().toISOString()
  });

  db.save();

  res.json({ message: 'Product removed from marketplace by administrator.' });
});

// Moderation: Toggle featured product
router.post('/products/:id/toggle-featured', requireAdmin, (req: AuthenticatedRequest, res: Response) => {
  const product = db.products.find(p => p.id === req.params.id);
  if (!product) {
    return res.status(404).json({ error: 'Product not found.' });
  }

  product.isFeatured = !product.isFeatured;
  db.save();

  res.json({ isFeatured: product.isFeatured, message: `Product is now ${product.isFeatured ? 'Featured' : 'Standard'}.` });
});

// Moderate product: Approve or Reject
router.post('/products/:id/moderate', requireAdmin, (req: AuthenticatedRequest, res: Response) => {
  const user = req.user!;
  const { status, notes } = req.body;
  const product = db.products.find(p => p.id === req.params.id);

  if (!product) {
    return res.status(404).json({ error: 'Product not found.' });
  }

  if (!['approved', 'rejected', 'pending_review'].includes(status)) {
    return res.status(400).json({ error: 'Invalid moderation status. Must be approved, rejected, or pending_review.' });
  }

  product.moderationStatus = status;
  db.auditLogs.unshift({
    id: `audit-${Date.now()}`,
    action: `MODERATION_${status.toUpperCase()}`,
    actor: `${user.name} (${user.email})`,
    details: `Product "${product.title}" moderation status set to ${status}. Notes: ${notes || 'None'}`,
    timestamp: new Date().toISOString()
  });

  db.save();

  res.json({
    success: true,
    message: `Product "${product.title}" has been ${status}.`,
    product
  });
});

// GET all users (with suspension status and role details)
router.get('/users', requireAdmin, (_req: AuthenticatedRequest, res: Response) => {
  const users = db.users.map(u => ({
    id: u.id,
    name: u.name,
    email: u.email,
    role: u.role,
    phone: u.phone,
    whatsappNumber: u.whatsappNumber,
    state: u.state,
    city: u.city,
    isSuspended: !!u.isSuspended,
    suspensionReason: u.suspensionReason,
    createdAt: u.createdAt
  }));

  res.json({ users });
});

// Toggle User/Seller Suspension
router.post('/users/:id/toggle-suspend', requireAdmin, (req: AuthenticatedRequest, res: Response) => {
  const admin = req.user!;
  const { reason } = req.body;
  const targetUser = db.users.find(u => u.id === req.params.id);

  if (!targetUser) {
    return res.status(404).json({ error: 'User account not found.' });
  }

  if (targetUser.role === 'admin') {
    return res.status(400).json({ error: 'Administrator accounts cannot be suspended.' });
  }

  targetUser.isSuspended = !targetUser.isSuspended;
  if (targetUser.isSuspended) {
    targetUser.suspensionReason = reason || 'Suspended by Trust & Safety administrator for suspected fraud.';
  } else {
    delete targetUser.suspensionReason;
  }

  // Update seller profile suspension too if seller
  const sellerProf = db.sellerProfiles.find(s => s.userId === targetUser.id);
  if (sellerProf) {
    sellerProf.isSuspended = targetUser.isSuspended;
  }

  // Log action
  db.auditLogs.unshift({
    id: `audit-${Date.now()}`,
    action: targetUser.isSuspended ? 'ADMIN_SUSPENDED_USER' : 'ADMIN_UNSUSPENDED_USER',
    actor: `${admin.name} (${admin.email})`,
    details: `Admin ${targetUser.isSuspended ? 'suspended' : 're-activated'} account "${targetUser.name}" (${targetUser.email}). Reason: ${targetUser.suspensionReason || 'N/A'}`,
    timestamp: new Date().toISOString()
  });

  db.save();

  res.json({
    success: true,
    isSuspended: targetUser.isSuspended,
    message: `Account "${targetUser.name}" is now ${targetUser.isSuspended ? 'SUSPENDED' : 'ACTIVE'}.`
  });
});

// Toggle Seller Verification Badge
router.post('/sellers/:userId/toggle-verify', requireAdmin, (req: AuthenticatedRequest, res: Response) => {
  const profile = db.sellerProfiles.find(s => s.userId === req.params.userId);
  if (!profile) {
    return res.status(404).json({ error: 'Seller profile not found.' });
  }

  profile.isVerified = !profile.isVerified;
  db.save();

  res.json({ isVerified: profile.isVerified, message: `Seller verification status updated to: ${profile.isVerified ? 'VERIFIED' : 'UNVERIFIED'}.` });
});

// GET Reports
router.get('/reports', requireAdmin, (_req: AuthenticatedRequest, res: Response) => {
  res.json({ reports: db.reports });
});

// Resolve or Dismiss Report
router.post('/reports/:id/resolve', requireAdmin, (req: AuthenticatedRequest, res: Response) => {
  const { status, adminNotes } = req.body;
  const report = db.reports.find(r => r.id === req.params.id);

  if (!report) {
    return res.status(404).json({ error: 'Report not found.' });
  }

  report.status = status === 'dismissed' ? 'dismissed' : 'resolved';
  if (adminNotes) report.adminNotes = adminNotes;

  db.save();
  res.json({ message: `Report marked as ${report.status}.`, report });
});

// Trigger 7-Day Automatic Expiration Purge Manually
router.post('/trigger-cleanup', requireAdmin, (req: AuthenticatedRequest, res: Response) => {
  const user = req.user!;
  const result = db.purgeExpiredProducts(`Manual Admin Purge by ${user.name}`);

  res.json({
    message: `7-Day Cleanup executed successfully. ${result.deletedCount} expired listing(s) permanently removed.`,
    deletedCount: result.deletedCount,
    purgedIds: result.purgedIds,
    cleanupStats: db.cleanupStats
  });
});

export default router;

