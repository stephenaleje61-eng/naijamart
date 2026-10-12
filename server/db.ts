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
  state: string;
  city: string;
  quantity: number;
  status: 'active' | 'sold' | 'unavailable' | 'expired';
  views: number;
  whatsappClicks: number;
  isFeatured?: boolean;
  createdAt: string; // Server UTC
  expiresAt: string; // Exactly 7 days after createdAt
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

    // Seed realistic Nigerian demo sellers & products if database is empty
    if (this.data.products.length === 0) {
      this.seedInitialSellersAndProducts();
      modified = true;
    }

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

    // Initial products with realistic photos, valid 7-day expiration
    // Calculated from now - (X hours) so they have plenty of time remaining on 7-day clock
    const initialProducts: Product[] = [
      {
        id: 'prod-001',
        sellerId: 'seller-ikeja-01',
        sellerName: 'Chinedu Okeke',
        shopName: 'Ikeja Computer Village Hub',
        whatsappNumber: '08031234567',
        title: 'Apple iPhone 15 Pro Max 256GB Natural Titanium (Direct UK Used)',
        description: 'Clean UK used iPhone 15 Pro Max, 100% battery health, factory unlocked, complete with original type-C cable and box. No scratches, face ID and true tone active. Tested with 30-day warranty.',
        price: 1350000,
        originalPrice: 1480000,
        categoryId: 'phones-tablets',
        condition: 'used',
        images: [
          'https://images.unsplash.com/photo-1695048133142-1a20484d2569?w=800',
          'https://images.unsplash.com/photo-1695048065051-51ee68d0684f?w=800'
        ],
        state: 'Lagos',
        city: 'Ikeja',
        quantity: 4,
        status: 'active',
        views: 248,
        whatsappClicks: 32,
        isFeatured: true,
        createdAt: new Date(now - 1000 * 3600 * 18).toISOString(), // 18 hours ago
        expiresAt: new Date(now - 1000 * 3600 * 18 + SEVEN_DAYS_MS).toISOString(),
        updatedAt: new Date(now - 1000 * 3600 * 18).toISOString()
      },
      {
        id: 'prod-002',
        sellerId: 'seller-ikeja-01',
        sellerName: 'Chinedu Okeke',
        shopName: 'Ikeja Computer Village Hub',
        whatsappNumber: '08031234567',
        title: 'MacBook Air M2 13.6-inch (8GB RAM, 256GB SSD) - Space Grey',
        description: 'Sleek, lightweight powerhouse with Apple Silicon M2. Liquid Retina display, MagSafe 3 charging, 18-hour battery life. Brand new sealed in original Apple box.',
        price: 1120000,
        originalPrice: 1250000,
        categoryId: 'computers',
        condition: 'new',
        images: [
          'https://images.unsplash.com/photo-1517336714731-489689fd1ca8?w=800',
          'https://images.unsplash.com/photo-1611186871348-b1ce696e52c9?w=800'
        ],
        state: 'Lagos',
        city: 'Ikeja',
        quantity: 3,
        status: 'active',
        views: 185,
        whatsappClicks: 21,
        isFeatured: true,
        createdAt: new Date(now - 1000 * 3600 * 24).toISOString(), // 1 day ago
        expiresAt: new Date(now - 1000 * 3600 * 24 + SEVEN_DAYS_MS).toISOString(),
        updatedAt: new Date(now - 1000 * 3600 * 24).toISOString()
      },
      {
        id: 'prod-003',
        sellerId: 'seller-balogun-02',
        sellerName: 'Yetunde Adeleke',
        shopName: 'Yetty Chic & Fabric Empire',
        whatsappNumber: '08129876543',
        title: 'Original Premium 100% Cotton Senator Material (4 Yards) - Navy Blue',
        description: 'High-grade Irish cashmere wool senator fabric for men. Perfect drape, does not fade or stretch after washing. Ideal for agbada, kaftan, and executive corporate native wear.',
        price: 32000,
        originalPrice: 40000,
        categoryId: 'fashion',
        condition: 'new',
        images: [
          'https://images.unsplash.com/photo-1594938298603-c8148c4dae35?w=800',
          'https://images.unsplash.com/photo-1617137984095-74e4e5e3613f?w=800'
        ],
        state: 'Lagos',
        city: 'Lagos Island',
        quantity: 15,
        status: 'active',
        views: 310,
        whatsappClicks: 47,
        isFeatured: true,
        createdAt: new Date(now - 1000 * 3600 * 12).toISOString(),
        expiresAt: new Date(now - 1000 * 3600 * 12 + SEVEN_DAYS_MS).toISOString(),
        updatedAt: new Date(now - 1000 * 3600 * 12).toISOString()
      },
      {
        id: 'prod-004',
        sellerId: 'seller-balogun-02',
        sellerName: 'Yetunde Adeleke',
        shopName: 'Yetty Chic & Fabric Empire',
        whatsappNumber: '08129876543',
        title: 'Handcrafted Nigerian Genuine Leather Chelsea Boots - Tan Brown',
        description: 'Made by Aba master cobblers with imported cowhide leather. Goodyear welted sole, cushioned memory foam insole, durable rubber traction outsole. Sizes 40-46 available.',
        price: 45000,
        originalPrice: 55000,
        categoryId: 'shoes-bags',
        condition: 'new',
        images: [
          'https://images.unsplash.com/photo-1638247025967-b4e38f787b76?w=800',
          'https://images.unsplash.com/photo-1549298916-b41d501d3772?w=800'
        ],
        state: 'Lagos',
        city: 'Lagos Island',
        quantity: 10,
        status: 'active',
        views: 142,
        whatsappClicks: 19,
        isFeatured: false,
        createdAt: new Date(now - 1000 * 3600 * 6).toISOString(),
        expiresAt: new Date(now - 1000 * 3600 * 6 + SEVEN_DAYS_MS).toISOString(),
        updatedAt: new Date(now - 1000 * 3600 * 6).toISOString()
      },
      {
        id: 'prod-005',
        sellerId: 'seller-abuja-03',
        sellerName: 'Musa Ibrahim',
        shopName: 'Northern Harvest & Foodstuffs',
        whatsappNumber: '09055554433',
        title: 'Original Benue Tubers of Large Yam (Bundle of 5 Tubers)',
        description: 'Farm-fresh, sweet and dry Benue yams straight from Zaki Biam market. Pounding yam tested, no rotten parts. Fast delivery across Abuja and express waybill to other states.',
        price: 28000,
        originalPrice: 35000,
        categoryId: 'food-groceries',
        condition: 'new',
        images: [
          'https://images.unsplash.com/photo-1598170845058-32b9d6a5c317?w=800',
          'https://images.unsplash.com/photo-1518843875459-f738682238a6?w=800'
        ],
        state: 'Abuja (FCT)',
        city: 'Wuse 2',
        quantity: 20,
        status: 'active',
        views: 405,
        whatsappClicks: 63,
        isFeatured: true,
        createdAt: new Date(now - 1000 * 3600 * 30).toISOString(),
        expiresAt: new Date(now - 1000 * 3600 * 30 + SEVEN_DAYS_MS).toISOString(),
        updatedAt: new Date(now - 1000 * 3600 * 30).toISOString()
      },
      {
        id: 'prod-006',
        sellerId: 'seller-abuja-03',
        sellerName: 'Musa Ibrahim',
        shopName: 'Northern Harvest & Foodstuffs',
        whatsappNumber: '09055554433',
        title: 'Pure Unadulterated Nsukka Red Palm Oil (25 Litres Keg)',
        description: 'Zero coloring, thick aroma, clear residue-free red palm oil straight from local mill in Enugu/Nsukka. Pure traditional taste for egusi, ogbono, and ofada stew.',
        price: 36000,
        originalPrice: 42000,
        categoryId: 'food-groceries',
        condition: 'new',
        images: [
          'https://images.unsplash.com/photo-1474979266404-7eaacbcd87c5?w=800'
        ],
        state: 'Abuja (FCT)',
        city: 'Wuse 2',
        quantity: 12,
        status: 'active',
        views: 198,
        whatsappClicks: 29,
        isFeatured: false,
        createdAt: new Date(now - 1000 * 3600 * 40).toISOString(),
        expiresAt: new Date(now - 1000 * 3600 * 40 + SEVEN_DAYS_MS).toISOString(),
        updatedAt: new Date(now - 1000 * 3600 * 40).toISOString()
      },
      {
        id: 'prod-007',
        sellerId: 'seller-ph-04',
        sellerName: 'Emeka Nwachukwu',
        shopName: 'Garden City Smart Living',
        whatsappNumber: '07088990011',
        title: '3.5kVA / 24V Pure Sine Wave Hybrid Solar Inverter with MPPT',
        description: 'Heavy duty copper transformer inverter. Automatic switchover from NEPA to battery within 10ms. Runs freezers, TVs, fans, laptops, and lighting points seamlessly. 1-year warranty.',
        price: 495000,
        originalPrice: 550000,
        categoryId: 'furniture-appliances',
        condition: 'new',
        images: [
          'https://images.unsplash.com/photo-1509391365360-2e959784a276?w=800',
          'https://images.unsplash.com/photo-1513694203232-719a280e022f?w=800'
        ],
        state: 'Rivers',
        city: 'Port Harcourt',
        quantity: 5,
        status: 'active',
        views: 320,
        whatsappClicks: 44,
        isFeatured: true,
        createdAt: new Date(now - 1000 * 3600 * 8).toISOString(),
        expiresAt: new Date(now - 1000 * 3600 * 8 + SEVEN_DAYS_MS).toISOString(),
        updatedAt: new Date(now - 1000 * 3600 * 8).toISOString()
      },
      {
        id: 'prod-008',
        sellerId: 'seller-ph-04',
        sellerName: 'Emeka Nwachukwu',
        shopName: 'Garden City Smart Living',
        whatsappNumber: '07088990011',
        title: 'Sony PlayStation 5 Console (Disc Edition) with Extra DualSense Controller',
        description: 'Brand new European spec PS5 console. Comes with 825GB ultra-fast SSD, 2 DualSense wireless controllers, HDMI 2.1 cable, and God of War Ragnarök voucher.',
        price: 780000,
        originalPrice: 850000,
        categoryId: 'computers',
        condition: 'new',
        images: [
          'https://images.unsplash.com/photo-1606813907291-d86efa9b94db?w=800',
          'https://images.unsplash.com/photo-1607604276583-eef5d076aa5f?w=800'
        ],
        state: 'Rivers',
        city: 'Port Harcourt',
        quantity: 2,
        status: 'active',
        views: 290,
        whatsappClicks: 38,
        isFeatured: false,
        createdAt: new Date(now - 1000 * 3600 * 50).toISOString(),
        expiresAt: new Date(now - 1000 * 3600 * 50 + SEVEN_DAYS_MS).toISOString(),
        updatedAt: new Date(now - 1000 * 3600 * 50).toISOString()
      }
    ];

    this.data.products.push(...initialProducts);
  }

  // --- 7-DAY EXPIRATION ENGINE ---
  /**
   * Scans all products and permanently deletes any listing whose expiresAt <= now.
   * Also cleans up local uploaded image files from disk.
   */
  public purgeExpiredProducts(actor = 'System Background Worker'): { deletedCount: number; purgedIds: string[] } {
    const now = Date.now();
    const activeProducts = this.data.products;
    const expiredList = activeProducts.filter(p => new Date(p.expiresAt).getTime() <= now);

    if (expiredList.length === 0) {
      return { deletedCount: 0, purgedIds: [] };
    }

    const purgedIds: string[] = [];

    for (const prod of expiredList) {
      purgedIds.push(prod.id);

      // Clean up uploaded image files stored on disk if they point to local /uploads/
      if (Array.isArray(prod.images)) {
        for (const imgUrl of prod.images) {
          if (imgUrl && imgUrl.startsWith('/uploads/')) {
            const fileName = path.basename(imgUrl);
            const filePath = path.join(UPLOADS_DIR, fileName);
            try {
              if (fs.existsSync(filePath)) {
                fs.unlinkSync(filePath);
              }
            } catch (err) {
              console.error(`Failed to delete expired image file ${filePath}:`, err);
            }
          }
        }
      }

      // Remove any favourites for this product
      this.data.favourites = this.data.favourites.filter(f => f.productId !== prod.id);

      // Log audit entry
      this.data.auditLogs.unshift({
        id: `audit-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
        action: 'PRODUCT_EXPIRED_7DAYS_PURGED',
        actor,
        details: `Product "${prod.title}" (ID: ${prod.id}, Seller: ${prod.shopName}) reached 7-day expiration (published: ${prod.createdAt}, expired: ${prod.expiresAt}) and was permanently deleted.`,
        timestamp: new Date().toISOString()
      });
    }

    // Permanently remove expired products from the database
    const initialCount = this.data.products.length;
    this.data.products = this.data.products.filter(p => new Date(p.expiresAt).getTime() > now);
    const deletedCount = initialCount - this.data.products.length;

    this.data.cleanupStats.lastRun = new Date().toISOString();
    this.data.cleanupStats.totalExpiredDeleted += deletedCount;

    // Keep audit logs trimmed to last 200 items
    if (this.data.auditLogs.length > 200) {
      this.data.auditLogs = this.data.auditLogs.slice(0, 200);
    }

    this.save();

    console.log(`[7-Day Expiration Job] Purged ${deletedCount} expired products at ${new Date().toISOString()}`);
    return { deletedCount, purgedIds };
  }

  // Helper query for active, non-expired products
  public getActiveProducts(): Product[] {
    const now = Date.now();
    return this.data.products.filter(p => {
      const isExpired = new Date(p.expiresAt).getTime() <= now;
      return p.status === 'active' && !isExpired;
    });
  }

  // Get single product if not expired (or seller/admin can view)
  public getProductById(id: string, includeExpired = false): Product | undefined {
    const prod = this.data.products.find(p => p.id === id);
    if (!prod) return undefined;
    if (!includeExpired) {
      const now = Date.now();
      if (new Date(prod.expiresAt).getTime() <= now) {
        return undefined; // Expired products cannot be accessed through old direct links or public APIs
      }
    }
    return prod;
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
