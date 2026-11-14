import fs from 'fs';
import path from 'path';
import bcrypt from 'bcryptjs';

const DATA_DIR = path.resolve(process.cwd(), 'data');
const DB_FILE = path.join(DATA_DIR, 'naijamart_db.json');
const UPLOADS_DIR = path.resolve(process.cwd(), 'uploads');

// Ensure directories exist
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}
if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

export interface User {
  id: string;
  name: string;
  email: string;
  passwordHash: string;
  role: 'buyer' | 'seller' | 'admin';
  phone?: string;
  whatsappNumber?: string;
  state?: string;
  city?: string;
  avatarUrl?: string;
  isSuspended?: boolean;
  suspensionReason?: string;
  createdAt: string;
}

export interface SellerProfile {
  id: string;
  userId: string;
  shopName: string;
  shopSlug: string;
  shopLogo?: string;
  coverImage?: string;
  description: string;
  whatsappNumber: string;
  state: string;
  city: string;
  address?: string;
  isVerified: boolean;
  isSuspended?: boolean;
  trustScore?: number;
  createdAt: string;
}

export interface Product {
  id: string;
  sellerId: string;
  sellerName: string;
  shopName: string;
  whatsappNumber: string;
  title: string;
  description: string;
  price: number;
  originalPrice?: number;
  categoryId: string;
  condition: 'new' | 'used';
  images: string[]; // Minimum 1 required
  imageUrl?: string;
  state: string;
  city: string;
  quantity: number;
  status: 'active' | 'sold' | 'unavailable' | 'expired';
  moderationStatus?: 'approved' | 'pending_review' | 'rejected';
  moderationFlags?: string[];
  views: number;
  whatsappClicks: number;
  isFeatured?: boolean;
  createdAt: string; // Server UTC
  expiresAt?: string; // Optional legacy field
  updatedAt: string;
}

export interface Category {
  id: string;
  name: string;
  slug: string;
  icon: string;
  description: string;
  featured?: boolean;
}

export interface Favourite {
  id: string;
  userId: string;
  productId: string;
  createdAt: string;
}

export interface Report {
  id: string;
  reporterEmail: string;
  reporterName?: string;
  productId?: string;
  productTitle?: string;
  sellerId?: string;
  reason: string;
  details: string;
  status: 'pending' | 'resolved' | 'dismissed';
  adminNotes?: string;
  createdAt: string;
}

export interface AuditLog {
  id: string;
  action: string;
  actor: string;
  details: string;
  timestamp: string;
}

export interface DatabaseSchema {
  users: User[];
  sellerProfiles: SellerProfile[];
  products: Product[];
  categories: Category[];
  favourites: Favourite[];
  reports: Report[];
  auditLogs: AuditLog[];
  cleanupStats: {
    lastRun: string;
    totalExpiredDeleted: number;
  };
}

const DEFAULT_CATEGORIES: Category[] = [
  { id: 'hostel-items', name: 'Hostel Items', slug: 'hostel-items', icon: 'BedDouble', description: 'Mattresses, standing fans, buckets, study tables, curtains & hostel essentials', featured: true },
  { id: 'textbooks-past-questions', name: 'Textbooks & Past Questions', slug: 'textbooks-past-questions', icon: 'BookOpen', description: 'Course handouts, past questions, scientific calculators, lab coats & textbooks', featured: true },
  { id: 'food', name: 'Food', slug: 'food', icon: 'Utensils', description: 'Fresh campus meals, provisions, snacks, garri, rice, indomie & cold drinks', featured: true },
  { id: 'electronics', name: 'Electronics', slug: 'electronics', icon: 'Smartphone', description: 'Smartphones, laptops, power banks, chargers, earphones & gadgets', featured: true },
  { id: 'fashion', name: 'Fashion', slug: 'fashion', icon: 'Shirt', description: 'Clothes, sneakers, bags, wristwatches, perfumes & student outfits', featured: true },
  { id: 'gas-cooking', name: 'Gas & Cooking', slug: 'gas-cooking', icon: 'Flame', description: 'Gas cylinders, camp gas burners, pots, electric kettles & kitchen utensils', featured: true }
];

export const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

class Database {
  private data: DatabaseSchema;
  public lastFirestoreError: { code: string; message: string } | null = null;

  constructor() {
    this.data = this.loadDatabase();
    this.ensureInitialData();
  }

  private loadDatabase(): DatabaseSchema {
    try {
      if (fs.existsSync(DB_FILE)) {
        const raw = fs.readFileSync(DB_FILE, 'utf-8');
        return JSON.parse(raw);
      }
    } catch (err) {
      console.error('Failed to parse DB file, restoring defaults:', err);
    }
    return {
      users: [],
      sellerProfiles: [],
      products: [],
      categories: DEFAULT_CATEGORIES,
      favourites: [],
      reports: [],
      auditLogs: [],
      cleanupStats: {
        lastRun: new Date().toISOString(),
        totalExpiredDeleted: 0
      }
    };
  }

  public save(): void {
    try {
      const tempFile = `${DB_FILE}.tmp.${Date.now()}`;
      fs.writeFileSync(tempFile, JSON.stringify(this.data, null, 2), 'utf-8');
      fs.renameSync(tempFile, DB_FILE);
    } catch (err) {
      console.error('Failed to save DB:', err);
    }
  }

  private ensureInitialData() {
    let modified = false;

    // Check categories — always keep synchronized with the 6 core FU MARKET categories
    const expectedIds = DEFAULT_CATEGORIES.map(c => c.id).join(',');
    const currentIds = (this.data.categories || []).map(c => c.id).join(',');
    if (currentIds !== expectedIds) {
      this.data.categories = DEFAULT_CATEGORIES;
      modified = true;
    }

    // Check admin user
    const adminExists = this.data.users.some(u => u.role === 'admin');
    if (!adminExists) {
      const salt = bcrypt.genSaltSync(10);
      const adminPasswordHash = bcrypt.hashSync('Admin123!', salt);
      const adminUser: User = {
        id: 'admin-001',
        name: 'FU MARKET Moderation Desk',
        email: 'admin@fumarket.ng',
        passwordHash: adminPasswordHash,
        role: 'admin',
        phone: '08006245262',
        state: 'Taraba',
        city: 'Wukari',
        createdAt: new Date().toISOString()
      };
      this.data.users.push(adminUser);
      modified = true;
    }

    // Do not seed fake or demo products: only real listings posted by users remain
    if (modified) {
      this.save();
    }
  }

  private lastRefreshAt = 0;
  private refreshInFlight: Promise<void> | null = null;

  // --- PERMANENT PRODUCTION PERSISTENCE ---
  public async initFirestoreSync(): Promise<void> {
    if (this.refreshInFlight) {
      return this.refreshInFlight;
    }

    this.refreshInFlight = (async () => {
      try {
        const { firestoreSync, formatServerFirestoreError } = await import('./firestore.js');
        // Load permanent products directly from primary Firestore + optional legacy (default) DB
        try {
          const firestoreProducts = await firestoreSync.loadProducts();
          const mergedMap = new Map<string, Product>();

          // Preserve any local products that have not yet been mirrored to the active Firestore DB
          const fsIds = new Set(firestoreProducts.map((p) => p.id));
          for (const localProd of this.data.products) {
            if (!localProd.id.startsWith('prod_live_seed')) {
              mergedMap.set(localProd.id, localProd);
              if (!fsIds.has(localProd.id)) {
                firestoreSync.saveProduct(localProd).catch((err) => {
                  console.warn(`[Database] Failed to push local product ${localProd.id} to Firestore:`, err?.message || err);
                });
              }
            }
          }

          for (const fsProd of firestoreProducts) {
            mergedMap.set(fsProd.id, fsProd);
          }

          this.data.products = Array.from(mergedMap.values()).sort(
            (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
          );
          this.lastFirestoreError = null;
          this.lastRefreshAt = Date.now();
        } catch (prodErr: any) {
          const formatted = formatServerFirestoreError(prodErr);
          this.lastFirestoreError = formatted;
          console.error('[Database] Firestore loadProducts failed (preserving local snapshot):', formatted.message);
        }

        const [usersResult, profilesResult] = await Promise.allSettled([
          firestoreSync.loadUsers(),
          firestoreSync.loadSellerProfiles()
        ]);

        if (usersResult.status === 'fulfilled') {
          const remoteUsers = usersResult.value;
          const remoteUserKeys = new Set<string>();
          for (const fu of remoteUsers) {
            remoteUserKeys.add(fu.id);
            if (fu.email) remoteUserKeys.add(fu.email.toLowerCase());
            if (!this.data.users.some((u) => u.id === fu.id || (fu.email && u.email?.toLowerCase() === fu.email.toLowerCase()))) {
              this.data.users.push(fu);
            }
          }
          // Backfill local registered users up into the active named Firestore DB if missing there
          for (const localUser of this.data.users) {
            if (localUser.id === 'admin-001' && localUser.role === 'admin') continue;
            const hasId = remoteUserKeys.has(localUser.id);
            const hasEmail = localUser.email && remoteUserKeys.has(localUser.email.toLowerCase());
            if (!hasId && !hasEmail) {
              firestoreSync.saveUser(localUser).catch((err) => {
                console.warn(`[Database] Could not backfill user ${localUser.email} to Firestore:`, err?.message || err);
              });
            }
          }
        }

        if (profilesResult.status === 'fulfilled') {
          const remoteProfiles = profilesResult.value;
          const remoteProfileKeys = new Set<string>();
          for (const fp of remoteProfiles) {
            remoteProfileKeys.add(fp.id);
            if (fp.userId) remoteProfileKeys.add(fp.userId);
            if (!this.data.sellerProfiles.some((p) => p.id === fp.id || p.userId === fp.userId)) {
              this.data.sellerProfiles.push(fp);
            }
          }
          // Backfill local seller profiles up into the active named Firestore DB if missing there
          for (const localProf of this.data.sellerProfiles) {
            if (!remoteProfileKeys.has(localProf.id) && !remoteProfileKeys.has(localProf.userId)) {
              firestoreSync.saveSellerProfile(localProf).catch((err) => {
                console.warn(`[Database] Could not backfill seller profile ${localProf.shopName}:`, err?.message || err);
              });
            }
          }
        }

        this.save();
        console.log(`[Database] Production sync active: ${this.data.products.length} genuine permanent products and ${this.data.users.length} users loaded.`);
      } catch (err: any) {
        const code = String(err?.code || 'firestore/sync-error');
        this.lastFirestoreError = { code, message: `[${code}] ${err?.message || String(err)}` };
        console.error('[Database] initFirestoreSync error:', err);
      } finally {
        this.refreshInFlight = null;
      }
    })();

    return this.refreshInFlight;
  }

  public async refreshFromFirestoreIfStale(maxAgeMs = 15000): Promise<void> {
    if (Date.now() - this.lastRefreshAt < maxAgeMs) return;
    await this.initFirestoreSync();
  }

  // Save product directly to both in-memory cache and Firestore permanent production storage
  public async persistProduct(product: Product): Promise<void> {
    const existingIndex = this.data.products.findIndex(p => p.id === product.id);
    if (existingIndex >= 0) {
      this.data.products[existingIndex] = product;
    } else {
      this.data.products.unshift(product);
    }
    this.save();

    try {
      const { firestoreSync } = await import('./firestore.js');
      await firestoreSync.saveProduct(product);
    } catch (err) {
      console.error(`[Database] Failed to persist product ${product.id} to Firestore:`, err);
      throw err;
    }
  }

  // Delete product from both in-memory cache and Firestore permanent storage
  public async removeProduct(productId: string): Promise<void> {
    this.data.products = this.data.products.filter(p => p.id !== productId);
    this.data.favourites = this.data.favourites.filter(f => f.productId !== productId);
    this.save();

    try {
      const { firestoreSync } = await import('./firestore.js');
      await firestoreSync.deleteProduct(productId);
    } catch (err) {
      console.error(`[Database] Failed to remove product ${productId} from Firestore:`, err);
    }
  }

  // Unintended expiration purge neutralized: products are permanent and never deleted automatically
  public purgeExpiredProducts(actor = 'System Background Worker'): { deletedCount: number; purgedIds: string[] } {
    console.log(`[Database] Automatic purge disabled: listings remain permanently stored in production database.`);
    return { deletedCount: 0, purgedIds: [] };
  }

  // Helper query for active products (never expires)
  public getActiveProducts(): Product[] {
    return this.data.products.filter(p => p.status === 'active');
  }

  // Get single product (never blocked by expiration)
  public getProductById(id: string): Product | undefined {
    return this.data.products.find(p => p.id === id);
  }

  // Raw accessors
  public get users() { return this.data.users; }
  public get sellerProfiles() { return this.data.sellerProfiles; }
  public get products() { return this.data.products; }
  public get categories() { return this.data.categories; }
  public get favourites() { return this.data.favourites; }
  public get reports() { return this.data.reports; }
  public get auditLogs() { return this.data.auditLogs; }
  public get cleanupStats() { return this.data.cleanupStats; }
}

export const db = new Database();
