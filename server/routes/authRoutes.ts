import { Router, Response } from 'express';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { db, User, SellerProfile } from '../db.js';
import { generateToken, requireAuth, AuthenticatedRequest } from '../auth.js';

const router = Router();

// Register new user (buyer or seller)
router.post('/register', async (req, res) => {
  try {
    const {
      name,
      email,
      password,
      role = 'buyer',
      phone,
      whatsappNumber,
      state,
      city,
      shopName,
      shopDescription
    } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ error: 'Name, email, and password are required.' });
    }

    if (password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters long.' });
    }

    const normalizedEmail = email.toLowerCase().trim();
    const existing = db.users.find(u => u.email === normalizedEmail);
    if (existing) {
      return res.status(400).json({ error: 'An account with this email address already exists.' });
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);
    const userId = `user-${Date.now()}-${crypto.randomBytes(4).toString('hex')}`;

    const newUser: User = {
      id: userId,
      name: name.trim(),
      email: normalizedEmail,
      passwordHash,
      role: role === 'seller' ? 'seller' : 'buyer',
      phone: phone?.trim(),
      whatsappNumber: whatsappNumber?.trim() || phone?.trim(),
      state: state?.trim() || 'Lagos',
      city: city?.trim() || 'Ikeja',
      createdAt: new Date().toISOString()
    };

    db.users.push(newUser);

    let sellerProfile: SellerProfile | undefined;
    if (newUser.role === 'seller') {
      const formattedShopName = (shopName || `${name}'s Shop`).trim();
      const shopSlug = formattedShopName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
      const profileId = `profile-${Date.now()}-${crypto.randomBytes(4).toString('hex')}`;

      sellerProfile = {
        id: profileId,
        userId: newUser.id,
        shopName: formattedShopName,
        shopSlug: `${shopSlug}-${Date.now().toString().slice(-4)}`,
        description: shopDescription?.trim() || `Welcome to ${formattedShopName} on NaijaMart. Chat with us on WhatsApp for fast orders and swift delivery!`,
        whatsappNumber: newUser.whatsappNumber || newUser.phone || '',
        state: newUser.state || 'Lagos',
        city: newUser.city || 'Ikeja',
        isVerified: false,
        createdAt: new Date().toISOString()
      };

      db.sellerProfiles.push(sellerProfile);
    }

    db.save();

    const token = generateToken({
      userId: newUser.id,
      email: newUser.email,
      role: newUser.role,
      name: newUser.name
    });

    res.status(201).json({
      message: 'Account created successfully!',
      token,
      user: {
        id: newUser.id,
        name: newUser.name,
        email: newUser.email,
        role: newUser.role,
        phone: newUser.phone,
        whatsappNumber: newUser.whatsappNumber,
        state: newUser.state,
        city: newUser.city,
        createdAt: newUser.createdAt
      },
      sellerProfile
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Registration failed.' });
  }
});

// Login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required.' });
    }

    const normalizedEmail = email.toLowerCase().trim();
    const user = db.users.find(u => u.email === normalizedEmail);
    if (!user) {
      return res.status(401).json({ error: 'Invalid email or password.' });
    }

    const validPassword = await bcrypt.compare(password, user.passwordHash);
    if (!validPassword) {
      return res.status(401).json({ error: 'Invalid email or password.' });
    }

    const token = generateToken({
      userId: user.id,
      email: user.email,
      role: user.role,
      name: user.name
    });

    const sellerProfile = db.sellerProfiles.find(p => p.userId === user.id);

    res.json({
      message: 'Login successful!',
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        phone: user.phone,
        whatsappNumber: user.whatsappNumber,
        state: user.state,
        city: user.city,
        avatarUrl: user.avatarUrl,
        createdAt: user.createdAt
      },
      sellerProfile
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Login failed.' });
  }
});

// Get current logged-in user profile
router.get('/me', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  const user = req.user!;
  const sellerProfile = db.sellerProfiles.find(p => p.userId === user.id);
  const favourites = db.favourites.filter(f => f.userId === user.id).map(f => f.productId);

  res.json({
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      phone: user.phone,
      whatsappNumber: user.whatsappNumber,
      state: user.state,
      city: user.city,
      avatarUrl: user.avatarUrl,
      createdAt: user.createdAt
    },
    sellerProfile,
    favourites
  });
});

// Update Profile
router.put('/profile', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  const user = req.user!;
  const { name, phone, whatsappNumber, state, city, avatarUrl } = req.body;

  if (name) user.name = name.trim();
  if (phone !== undefined) user.phone = phone.trim();
  if (whatsappNumber !== undefined) user.whatsappNumber = whatsappNumber.trim();
  if (state !== undefined) user.state = state.trim();
  if (city !== undefined) user.city = city.trim();
  if (avatarUrl !== undefined) user.avatarUrl = avatarUrl;

  // Also update corresponding sellerProfile WhatsApp number and location if exists
  const sellerProfile = db.sellerProfiles.find(p => p.userId === user.id);
  if (sellerProfile) {
    if (whatsappNumber) sellerProfile.whatsappNumber = whatsappNumber.trim();
    if (state) sellerProfile.state = state.trim();
    if (city) sellerProfile.city = city.trim();
  }

  db.save();

  res.json({
    message: 'Profile updated successfully',
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      phone: user.phone,
      whatsappNumber: user.whatsappNumber,
      state: user.state,
      city: user.city,
      avatarUrl: user.avatarUrl
    },
    sellerProfile
  });
});

// Password recovery / reset
router.post('/forgot-password', (req, res) => {
  const { email } = req.body;
  if (!email) {
    return res.status(400).json({ error: 'Please enter your registered email address.' });
  }

  const user = db.users.find(u => u.email === email.toLowerCase().trim());
  if (!user) {
    // For privacy, don't disclose whether email exists
    return res.json({ message: 'If this email is registered on NaijaMart, a password recovery code will be dispatched.' });
  }

  // Create temporary reset token for this demo
  const resetToken = crypto.randomBytes(16).toString('hex');
  res.json({
    message: 'Password reset link generated. In production, an email is sent.',
    resetToken,
    instructions: 'You can now proceed to set a new password.'
  });
});

router.post('/reset-password', async (req, res) => {
  const { email, newPassword } = req.body;
  if (!email || !newPassword || newPassword.length < 6) {
    return res.status(400).json({ error: 'Email and new password (min 6 characters) are required.' });
  }

  const user = db.users.find(u => u.email === email.toLowerCase().trim());
  if (!user) {
    return res.status(404).json({ error: 'User not found.' });
  }

  const salt = await bcrypt.genSalt(10);
  user.passwordHash = await bcrypt.hash(newPassword, salt);
  db.save();

  res.json({ message: 'Password has been updated successfully! You can now log in.' });
});

export default router;
