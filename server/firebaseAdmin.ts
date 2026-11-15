import fs from 'fs';
import path from 'path';
import { createRemoteJWKSet, jwtVerify } from 'jose';

type FirebaseAdminApp = ReturnType<typeof import('firebase-admin')['initializeApp']>;

let firebaseAdminModule: typeof import('firebase-admin') | null = null;
let initializedApp: FirebaseAdminApp | null = null;
let initAttempted = false;
let projectId = 'zangamarket1';
let firebaseApiKey = '';

try {
  const cfgPath = path.resolve(process.cwd(), 'firebase-applet-config.json');
  if (fs.existsSync(cfgPath)) {
    const cfg = JSON.parse(fs.readFileSync(cfgPath, 'utf-8'));
    if (cfg?.projectId) projectId = String(cfg.projectId).trim();
    if (cfg?.apiKey) firebaseApiKey = String(cfg.apiKey).trim();
  }
} catch {
  // Use defaults
}

const JWKS_URL = new URL(
  'https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com'
);
const firebaseJWKS = createRemoteJWKSet(JWKS_URL);

async function getAdminApp(): Promise<FirebaseAdminApp | null> {
  if (initializedApp) return initializedApp;
  if (initAttempted) return null;
  initAttempted = true;

  const rawServiceAccount = process.env.FIREBASE_SERVICE_ACCOUNT_KEY?.trim();
  const credentialsPath = process.env.GOOGLE_APPLICATION_CREDENTIALS?.trim();

  if (!rawServiceAccount && !credentialsPath) {
    return null;
  }

  try {
    const adminMod = await import('firebase-admin');
    firebaseAdminModule = adminMod;
    const adminDefault = (adminMod as any).default || adminMod;

    if (adminDefault.apps && adminDefault.apps.length > 0) {
      initializedApp = adminDefault.apps[0];
      return initializedApp;
    }

    if (rawServiceAccount) {
      let jsonStr = rawServiceAccount;
      if (!jsonStr.startsWith('{')) {
        jsonStr = Buffer.from(jsonStr, 'base64').toString('utf-8');
      }
      const parsedCred = JSON.parse(jsonStr);
      initializedApp = adminDefault.initializeApp({
        credential: adminDefault.credential.cert(parsedCred),
        projectId: parsedCred.project_id || projectId
      });
      return initializedApp;
    }

    if (credentialsPath && fs.existsSync(credentialsPath)) {
      const parsedCred = JSON.parse(fs.readFileSync(credentialsPath, 'utf-8'));
      initializedApp = adminDefault.initializeApp({
        credential: adminDefault.credential.cert(parsedCred),
        projectId: parsedCred.project_id || projectId
      });
      return initializedApp;
    }
  } catch (err) {
    console.warn('[FirebaseAdmin] Optional Admin SDK initialization skipped:', (err as Error).message);
    initializedApp = null;
  }

  return null;
}

export interface CryptographicFirebaseUser {
  uid: string;
  email: string;
  emailVerified: boolean;
  displayName?: string;
  authTime?: number;
  ceoAdminClaim?: boolean;
  roleClaim?: string;
  verificationMethod: 'firebase_admin_sdk' | 'jose_jwks_plus_lookup';
}

export async function verifyFirebaseIdTokenCryptographic(
  idToken: string
): Promise<CryptographicFirebaseUser | null> {
  const token = String(idToken || '').trim();
  if (!token || token.split('.').length !== 3) return null;

  // 1. Prefer Firebase Admin SDK verification with revocation check when configured
  const adminApp = await getAdminApp();
  if (adminApp) {
    try {
      const { getAuth } = await import('firebase-admin/auth');
      const decoded = await getAuth(adminApp).verifyIdToken(token, true);
      if (!decoded?.uid || !decoded?.email) return null;
      return {
        uid: decoded.uid,
        email: String(decoded.email),
        emailVerified: Boolean(decoded.email_verified),
        displayName: typeof decoded.name === 'string' ? decoded.name : undefined,
        authTime: typeof decoded.auth_time === 'number' ? decoded.auth_time : undefined,
        ceoAdminClaim: decoded.ceoAdmin === true,
        roleClaim: typeof decoded.role === 'string' ? decoded.role : undefined,
        verificationMethod: 'firebase_admin_sdk'
      };
    } catch {
      return null;
    }
  }

  // 2. Cryptographic RS256 JWKS verification via `jose` + Identity Toolkit accounts:lookup
  try {
    const expectedIssuer = `https://securetoken.google.com/${projectId}`;
    const { payload } = await jwtVerify(token, firebaseJWKS, {
      issuer: expectedIssuer,
      audience: projectId
    });

    const uid = typeof payload.sub === 'string' ? payload.sub : '';
    const emailFromJwt = typeof payload.email === 'string' ? payload.email : '';
    if (!uid) return null;

    // Cross-verify live account status via Identity Toolkit if API key is present
    if (firebaseApiKey) {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 5000);
      try {
        const res = await fetch(
          `https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${encodeURIComponent(firebaseApiKey)}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ idToken: token }),
            signal: controller.signal
          }
        );
        if (!res.ok) return null;
        const data: any = await res.json();
        const fbUser = Array.isArray(data?.users) ? data.users[0] : null;
        if (!fbUser || fbUser.localId !== uid || !fbUser.email || fbUser.disabled) {
          return null;
        }
        return {
          uid,
          email: String(fbUser.email),
          emailVerified: Boolean(fbUser.emailVerified),
          displayName: fbUser.displayName ? String(fbUser.displayName) : undefined,
          authTime: typeof payload.auth_time === 'number' ? payload.auth_time : undefined,
          ceoAdminClaim: payload.ceoAdmin === true ? true : undefined,
          roleClaim: typeof payload.role === 'string' ? payload.role : undefined,
          verificationMethod: 'jose_jwks_plus_lookup'
        };
      } finally {
        clearTimeout(timer);
      }
    }

    if (!emailFromJwt) return null;
    return {
      uid,
      email: emailFromJwt,
      emailVerified: payload.email_verified === true,
      displayName: typeof payload.name === 'string' ? payload.name : undefined,
      authTime: typeof payload.auth_time === 'number' ? payload.auth_time : undefined,
      ceoAdminClaim: payload.ceoAdmin === true ? true : undefined,
      roleClaim: typeof payload.role === 'string' ? payload.role : undefined,
      verificationMethod: 'jose_jwks_plus_lookup'
    };
  } catch {
    return null;
  }
}

export async function ensureCeoCustomClaim(
  uid: string,
  email: string,
  authorizedEmail: string
): Promise<{
  adminSdkConfigured: boolean;
  claimStatus: 'active' | 'pending_service_account' | 'failed';
  message: string;
}> {
  if (email.toLowerCase().trim() !== authorizedEmail.toLowerCase().trim()) {
    return {
      adminSdkConfigured: false,
      claimStatus: 'failed',
      message: 'Target account does not match authorized CEO email.'
    };
  }

  const adminApp = await getAdminApp();
  if (!adminApp) {
    return {
      adminSdkConfigured: false,
      claimStatus: 'pending_service_account',
      message:
        'Verified via cryptographic RS256 JWKS + Firebase Identity Toolkit. Set FIREBASE_SERVICE_ACCOUNT_KEY to also attach custom claim { ceoAdmin: true }.'
    };
  }

  try {
    const { getAuth } = await import('firebase-admin/auth');
    const authAdmin = getAuth(adminApp);
    const userRecord = await authAdmin.getUser(uid);
    const currentClaims = userRecord.customClaims || {};
    if (currentClaims.ceoAdmin !== true || currentClaims.role !== 'CEO_SUPER_ADMIN') {
      await authAdmin.setCustomUserClaims(uid, {
        ...currentClaims,
        ceoAdmin: true,
        role: 'CEO_SUPER_ADMIN'
      });
    }
    return {
      adminSdkConfigured: true,
      claimStatus: 'active',
      message: 'Firebase Admin SDK custom claim { ceoAdmin: true, role: "CEO_SUPER_ADMIN" } is active.'
    };
  } catch (err) {
    console.warn('[FirebaseAdmin] Could not set custom claims:', (err as Error).message);
    return {
      adminSdkConfigured: true,
      claimStatus: 'failed',
      message: 'Failed to update custom claims via Admin SDK.'
    };
  }
}

export function isFirebaseAdminConfigured(): boolean {
  return Boolean(
    process.env.FIREBASE_SERVICE_ACCOUNT_KEY?.trim() ||
      process.env.GOOGLE_APPLICATION_CREDENTIALS?.trim()
  );
}
