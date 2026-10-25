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
  { id: 'phones-tablets', name: 'Phones & Tablets', slug: 'phones-tablets', icon: 'Smartphone', description: 'Smartphones, feature phones, iPads and accessories', featured: true },
  { id: 'computers', name: 'Computers & Accessories', slug: 'computers', icon: 'Laptop', description: 'Laptops, desktops, monitors, printers and PC parts', featured: true },
  { id: 'fashion', name: 'Fashion & Clothing', slug: 'fashion', icon: 'Shirt', description: 'Ankara, senator suits, dresses, shirts, jeans and traditional wear', featured: true },
  { id: 'shoes-bags', name: 'Shoes, Bags & Accessories', slug: 'shoes-bags', icon: 'Briefcase', description: 'Sneakers, sandals, leather bags, wristwatches and jewelry', featured: true },
  { id: 'beauty-care', name: 'Beauty & Personal Care', slug: 'beauty-care', icon: 'Sparkles', description: 'Skincare, perfumes, hair extensions, makeup and grooming', featured: true },
  { id: 'home-kitchen', name: 'Home & Kitchen', slug: 'home-kitchen', icon: 'Utensils', description: 'Cookware, blenders, gas cookers, decor and tableware', featured: true },
  { id: 'furniture-appliances', name: 'Furniture & Appliances', slug: 'furniture-appliances', icon: 'Tv', description: 'Refrigerators, generators, air conditioners, sofas and beds', featured: true },
  { id: 'food-groceries', name: 'Food & Groceries', slug: 'food-groceries', icon: 'Apple', description: 'Gari, yam, palm oil, rice, crayfish, spices and packaged foods', featured: true },
  { id: 'vehicles-auto', name: 'Cars & Vehicle Accessories', slug: 'vehicles-auto', icon: 'Car', description: 'Cars, bikes, batteries, tires, car audio and spare parts', featured: true },
  { id: 'building-materials', name: 'Building Materials', slug: 'building-materials', icon: 'HardHat', description: 'Cement, tiles, roofing, plumbing and electrical supplies' },
  { id: 'agriculture', name: 'Agriculture & Farm Products', slug: 'agriculture', icon: 'Wheat', description: 'Livestock, poultry, seeds, fertilizers and farm machinery' },
  { id: 'baby-kids', name: 'Baby & Children Products', slug: 'baby-kids', icon: 'Baby', description: 'Baby gear, diapers, clothing, strollers and educational toys' },
  { id: 'sports-fitness', name: 'Sports & Fitness', slug: 'sports-fitness', icon: 'Dumbbell', description: 'Jerseys, gym gear, footballs, bicycles and fitness trackers' },
  { id: 'books-education', name: 'Books & Educational Materials', slug: 'books-education', icon: 'BookOpen', description: 'JAMB/WAEC textbooks, novels, stationery and study guides' },
  { id: 'other-goods', name: 'Other Permitted Goods', slug: 'other-goods', icon: 'Package', description: 'Musical instruments, craft, hobbies and other legal marketplace goods' }
];

export const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

class Database {
  private data: DatabaseSchema;

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

    // Check categories
    if (!this.data.categories || this.data.categories.length === 0) {
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
        name: 'NaijaMart Moderation Desk',
        email: 'admin@naijamart.ng',
        passwordHash: adminPasswordHash,
        role: 'admin',
        phone: '08006245262',
        state: 'Lagos',
        city: 'Ikeja',
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

  private seedInitialSellersAndProducts() {
    const salt = bcrypt.genSaltSync(10);
    const defaultPassword = bcrypt.hashSync('Password123!', salt);
    const now = Date.now();

    const sellerUsers: User[] = [
      {
        id: 'seller-ikeja-01',
        name: 'Chinedu Okeke',
        email: 'ikejatech@naijamart.demo',
        passwordHash: defaultPassword,
        role: 'seller',
        phone: '08031234567',
        whatsappNumber: '08031234567',
        state: 'Lagos',
        city: 'Ikeja',
        avatarUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150',
        createdAt: new Date(now - 86400000 * 2).toISOString()
      },
      {
        id: 'seller-balogun-02',
        name: 'Yetunde Adeleke',
        email: 'yetundefashion@naijamart.demo',
        passwordHash: defaultPassword,
        role: 'seller',
        phone: '08129876543',
        whatsappNumber: '08129876543',
        state: 'Lagos',
        city: 'Lagos Island',
        avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150',
        createdAt: new Date(now - 86400000 * 3).toISOString()
      },
      {
        id: 'seller-abuja-03',
        name: 'Musa Ibrahim',
        email: 'abujagrocery@naijamart.demo',
        passwordHash: defaultPassword,
        role: 'seller',
        phone: '09055554433',
        whatsappNumber: '09055554433',
        state: 'Abuja (FCT)',
        city: 'Wuse 2',
        avatarUrl: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150',
        createdAt: new Date(now - 86400000 * 1).toISOString()
      },
      {
        id: 'seller-ph-04',
        name: 'Emeka Nwachukwu',
        email: 'phgadgets@naijamart.demo',
        passwordHash: defaultPassword,
        role: 'seller',
        phone: '07088990011',
        whatsappNumber: '07088990011',
        state: 'Rivers',
        city: 'Port Harcourt',
        avatarUrl: 'https://images.unsplash.com/photo-1492562080023-ab3db95bfbce?w=150',
        createdAt: new Date(now - 86400000 * 2).toISOString()
      }
    ];

    const profiles: SellerProfile[] = [
      {
        id: 'profile-ikeja-01',
        userId: 'seller-ikeja-01',
        shopName: 'Ikeja Computer Village Hub',
        shopSlug: 'ikeja-computer-village-hub',
        shopLogo: 'https://images.unsplash.com/photo-1550751827-4bd374c3f58b?w=200',
        coverImage: 'https://images.unsplash.com/photo-1519389950473-47ba0277781c?w=800',
        description: 'Direct importer of brand new and direct UK/US used iPhones, Samsung Galaxy, and M-series MacBooks. Physical shop at Otigba Street, Computer Village, Ikeja.',
        whatsappNumber: '08031234567',
        state: 'Lagos',
        city: 'Ikeja',
        address: '14 Otigba Street, Computer Village, Ikeja',
        isVerified: true,
        createdAt: new Date(now - 86400000 * 2).toISOString()
      },
      {
        id: 'profile-balogun-02',
        userId: 'seller-balogun-02',
        shopName: 'Yetty Chic & Fabric Empire',
        shopSlug: 'yetty-chic-fabric-empire',
        shopLogo: 'https://images.unsplash.com/photo-1490481651871-ab68de25d43d?w=200',
        coverImage: 'https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=800',
        description: 'Authentic Swiss & Austrian lace, Kampala adire, Senator fabrics, ready-to-wear caftans and tailored African outfits. Bulk discounts available!',
        whatsappNumber: '08129876543',
        state: 'Lagos',
        city: 'Lagos Island',
        address: 'Shop 24, Balogun Business Complex, Lagos Island',
        isVerified: true,
        createdAt: new Date(now - 86400000 * 3).toISOString()
      },
      {
        id: 'profile-abuja-03',
        userId: 'seller-abuja-03',
        shopName: 'Northern Harvest & Foodstuffs',
        shopSlug: 'northern-harvest-foodstuffs',
        shopLogo: 'https://images.unsplash.com/photo-1542838132-92c53300491e?w=200',
        coverImage: 'https://images.unsplash.com/photo-1488459716781-31db52582fe9?w=800',
        description: 'Premium Benue yam tubers, unadulterated cold-pressed palm oil from Nsukka, fresh honey, dried catfish, and Kano brown beans delivered to your doorstep.',
        whatsappNumber: '09055554433',
        state: 'Abuja (FCT)',
        city: 'Wuse 2',
        address: 'Plot 102 Aminu Kano Crescent, Wuse 2, Abuja',
        isVerified: true,
        createdAt: new Date(now - 86400000 * 1).toISOString()
      },
      {
        id: 'profile-ph-04',
        userId: 'seller-ph-04',
        shopName: 'Garden City Smart Living',
        shopSlug: 'garden-city-smart-living',
        shopLogo: 'https://images.unsplash.com/photo-1526738549149-8e07eca6c147?w=200',
        coverImage: 'https://images.unsplash.com/photo-1518770660439-4636190af475?w=800',
        description: 'Inverters, solar panels, smart TVs, home audio, and gaming consoles in Port Harcourt. Fast inspection and testing on pickup.',
        whatsappNumber: '07088990011',
        state: 'Rivers',
        city: 'Port Harcourt',
        address: '88 Olu Obasanjo Road, Port Harcourt',
        isVerified: true,
        createdAt: new Date(now - 86400000 * 2).toISOString()
      }
    ];

    this.data.users.push(...sellerUsers);
    this.data.sellerProfiles.push(...profiles);

    // Real Firestore-only products: no mock or hardcoded products
    this.data.products = [];
  }

  // --- PERMANENT PRODUCTION PERSISTENCE ---
  public async initFirestoreSync(): Promise<void> {
    try {
      const { firestoreSync } = await import('./firestore.js');
      // Load permanent products directly from Firestore
      const firestoreProducts = await firestoreSync.loadProducts();
      this.data.products = firestoreProducts || [];
      this.save();
      console.log(`[Database] Production sync active: ${this.data.products.length} genuine permanent products loaded.`);
    } catch (err) {
      console.error('[Database] initFirestoreSync error:', err);
    }
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
