import { initializeApp, getApps, getApp } from 'firebase/app';
import {
  getFirestore,
  collection,
  doc,
  getDocs,
  getDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  where
} from 'firebase/firestore';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { Product, User, SellerProfile, Category } from './db.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load firebase-applet-config.json
const configPath = path.resolve(process.cwd(), 'firebase-applet-config.json');
let firebaseConfig: any = {};
try {
  if (fs.existsSync(configPath)) {
    firebaseConfig = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
  }
} catch (err) {
  console.error('[Firebase Server] Failed to read firebase-applet-config.json:', err);
}

const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
export const firestoreDb = firebaseConfig.firestoreDatabaseId
  ? getFirestore(app, firebaseConfig.firestoreDatabaseId)
  : getFirestore(app);

export class FirestoreSync {
  private static instance: FirestoreSync;
  public initialized = false;

  public static getInstance(): FirestoreSync {
    if (!FirestoreSync.instance) {
      FirestoreSync.instance = new FirestoreSync();
    }
    return FirestoreSync.instance;
  }

  // Load all products from Firestore
  async loadProducts(): Promise<Product[]> {
    try {
      const colRef = collection(firestoreDb, 'products');
      const snap = await getDocs(colRef);
      const list: Product[] = [];
      snap.forEach(d => {
        const p = d.data() as Product;
        list.push({ ...p, id: d.id });
      });
      console.log(`[FirestoreSync] Loaded ${list.length} permanent products from Cloud Firestore.`);
      return list;
    } catch (err) {
      console.error('[FirestoreSync] Failed to load products from Firestore:', err);
      return [];
    }
  }

  // Save or update a product in Firestore
  async saveProduct(product: Product): Promise<void> {
    try {
      const docRef = doc(firestoreDb, 'products', product.id);
      await setDoc(docRef, {
        ...product,
        updatedAt: new Date().toISOString()
      }, { merge: true });
      console.log(`[FirestoreSync] Saved product ${product.id} ("${product.title}") to permanent Firestore.`);
    } catch (err) {
      console.error(`[FirestoreSync] Error saving product ${product.id} to Firestore:`, err);
      throw err;
    }
  }

  // Delete product from Firestore
  async deleteProduct(productId: string): Promise<void> {
    try {
      const docRef = doc(firestoreDb, 'products', productId);
      await deleteDoc(docRef);
      console.log(`[FirestoreSync] Deleted product ${productId} from permanent Firestore.`);
    } catch (err) {
      console.error(`[FirestoreSync] Error deleting product ${productId} from Firestore:`, err);
      throw err;
    }
  }

  // Save User
  async saveUser(user: User): Promise<void> {
    try {
      const docRef = doc(firestoreDb, 'users', user.id);
      await setDoc(docRef, user, { merge: true });
      console.log(`[FirestoreSync] Saved user ${user.id} (${user.email}) to Firestore.`);
    } catch (err) {
      console.error(`[FirestoreSync] Error saving user to Firestore:`, err);
    }
  }

  // Save Seller Profile
  async saveSellerProfile(profile: SellerProfile): Promise<void> {
    try {
      const docRef = doc(firestoreDb, 'sellerProfiles', profile.id);
      await setDoc(docRef, profile, { merge: true });
      console.log(`[FirestoreSync] Saved seller profile ${profile.id} to Firestore.`);
    } catch (err) {
      console.error(`[FirestoreSync] Error saving seller profile to Firestore:`, err);
    }
  }

  // Migrate existing data from JSON to Firestore so nothing is lost
  async syncInitialData(localProducts: Product[], localUsers: User[], localProfiles: SellerProfile[]): Promise<void> {
    try {
      const existingProducts = await this.loadProducts();
      if (existingProducts.length === 0 && localProducts.length > 0) {
        console.log(`[FirestoreSync] Migrating ${localProducts.length} local products to Firestore...`);
        for (const p of localProducts) {
          await this.saveProduct(p);
        }
      }
      for (const u of localUsers) {
        await this.saveUser(u);
      }
      for (const s of localProfiles) {
        await this.saveSellerProfile(s);
      }
      this.initialized = true;
    } catch (err) {
      console.error('[FirestoreSync] Migration error:', err);
    }
  }
}

export const firestoreSync = FirestoreSync.getInstance();
