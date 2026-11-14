import { Router, Request, Response } from 'express';
import {
  collection,
  doc,
  getDocs,
  setDoc,
  updateDoc,
  query,
  where,
  limit
} from 'firebase/firestore';
import { firestoreDb as db } from '../firestore.js';
import { BikeRider } from '../../src/types.js';

const router = Router();

// In-memory cache if Firestore is temporarily unreachable
let inMemoryRiders: BikeRider[] = [];

// GET /api/bike-riders - List all bike riders with optional area filter
router.get('/', async (req: Request, res: Response) => {
  try {
    const { area } = req.query;
    const ridersCol = collection(db, 'bikeRiders');
    let q = query(ridersCol, limit(100));
    if (area && typeof area === 'string' && area !== 'all' && area.trim().length > 0) {
      q = query(ridersCol, where('area', '==', area.trim()), limit(100));
    }

    const snapshot = await getDocs(q);
    const riders: BikeRider[] = [];
    snapshot.forEach((d) => {
      const data = d.data();
      riders.push({
        id: d.id,
        name: data.name || '',
        photoUrl: data.photoUrl || '',
        phoneNumber: data.phoneNumber || '',
        whatsappNumber: data.whatsappNumber || data.phoneNumber || '',
        area: data.area || 'Anywhere in Wukari',
        isAvailable: data.isAvailable !== false,
        createdAt: data.createdAt || new Date().toISOString(),
        userId: data.userId || ''
      });
    });

    // Sort: available first, then newest
    riders.sort((a, b) => {
      if (a.isAvailable === b.isAvailable) {
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      }
      return a.isAvailable ? -1 : 1;
    });

    inMemoryRiders = riders;
    res.json({ success: true, count: riders.length, riders });
  } catch (err: any) {
    console.warn('[GET /api/bike-riders error]:', err?.code || err?.message);
    if (inMemoryRiders.length > 0) {
      const { area } = req.query;
      let list = inMemoryRiders;
      if (area && typeof area === 'string' && area !== 'all') {
        list = list.filter((r) => r.area === area.trim());
      }
      return res.json({ success: true, count: list.length, riders: list });
    }
    res.status(503).json({
      success: false,
      code: err?.code || 'firestore/unavailable',
      error: `[${err?.code || 'firestore/error'}] ${err?.message || 'Unable to load bike riders.'}`
    });
  }
});

// POST /api/bike-riders - Register a new bike rider
router.post('/', async (req: Request, res: Response) => {
  try {
    const { name, photoUrl, phoneNumber, whatsappNumber, area, isAvailable, userId } = req.body;

    if (!name || !String(name).trim()) {
      return res.status(400).json({ success: false, error: 'Rider full name is required.' });
    }
    if (!phoneNumber || !String(phoneNumber).trim()) {
      return res.status(400).json({ success: false, error: 'Valid phone number is required.' });
    }
    if (!area || !String(area).trim()) {
      return res.status(400).json({ success: false, error: 'Operating area in Wukari is required.' });
    }

    const id = `rider-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    const now = new Date().toISOString();

    const newRider: BikeRider = {
      id,
      name: String(name).trim(),
      photoUrl: String(photoUrl || '').trim(),
      phoneNumber: String(phoneNumber).trim(),
      whatsappNumber: String(whatsappNumber || phoneNumber).trim(),
      area: String(area).trim(),
      isAvailable: isAvailable !== false,
      createdAt: now,
      ...(userId ? { userId: String(userId).trim() } : {})
    };

    // Save to Firestore
    const riderRef = doc(db, 'bikeRiders', id);
    await setDoc(riderRef, newRider);

    inMemoryRiders.unshift(newRider);

    res.json({
      success: true,
      rider: newRider,
      message: 'Bike rider registered successfully in Wukari directory!'
    });
  } catch (err: any) {
    console.error('[POST /api/bike-riders error]:', err);
    res.status(500).json({ success: false, error: err.message || 'Failed to register bike rider.' });
  }
});

// PATCH /api/bike-riders/:id/availability - Toggle rider online/offline
router.patch('/:id/availability', async (req: Request, res: Response) => {
  try {
    const { isAvailable } = req.body;
    const { id } = req.params;

    const riderRef = doc(db, 'bikeRiders', id);
    await updateDoc(riderRef, {
      isAvailable: Boolean(isAvailable),
      updatedAt: new Date().toISOString()
    });

    const cached = inMemoryRiders.find((r) => r.id === id);
    if (cached) cached.isAvailable = Boolean(isAvailable);

    res.json({ success: true, message: 'Availability updated successfully.' });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message || 'Failed to update availability.' });
  }
});

export default router;
