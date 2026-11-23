import { CacheableResponsePlugin } from 'workbox-cacheable-response';
import { ExpirationPlugin } from 'workbox-expiration';
import { cleanupOutdatedCaches, matchPrecache, precacheAndRoute } from 'workbox-precaching';
import { NavigationRoute, registerRoute } from 'workbox-routing';
import { CacheFirst, NetworkOnly, StaleWhileRevalidate } from 'workbox-strategies';

const SW_CACHE_VERSION = 'ncm-v3-20261123';
const PAGES_CACHE = `ncm-pages-${SW_CACHE_VERSION}`;
const FIREBASE_IMAGES_CACHE = `ncm-firebase-images-${SW_CACHE_VERSION}`;
const UPLOADS_CACHE = `ncm-uploads-${SW_CACHE_VERSION}`;

const VALID_CACHES = new Set([PAGES_CACHE, FIREBASE_IMAGES_CACHE, UPLOADS_CACHE]);

interface PrecacheManifestItem {
  url: string;
  revision?: string | null;
}

declare global {
  interface Window {
    __WB_MANIFEST?: Array<string | PrecacheManifestItem>;
  }
}

interface SWGlobal {
  skipWaiting: () => Promise<void>;
  clients: {
    claim: () => Promise<void>;
  };
  addEventListener: (type: string, listener: (event: any) => void) => void;
}

const sw = globalThis as unknown as SWGlobal;

// Clean legacy Workbox precache versions automatically
cleanupOutdatedCaches();

// Precache static build assets injected by VitePWA (literal self.__WB_MANIFEST required by Workbox)
precacheAndRoute(self.__WB_MANIFEST || []);

sw.addEventListener('install', () => {
  sw.skipWaiting().catch(() => {});
});

sw.addEventListener('activate', (event: { waitUntil: (p: Promise<unknown>) => void }) => {
  event.waitUntil(
    (async () => {
      try {
        const cacheNames = await caches.keys();
        await Promise.all(
          cacheNames.map((cacheName) => {
            // Keep current workbox precache and current runtime caches; purge old broken caches
            if (cacheName.startsWith('workbox-precache-v2')) {
              return Promise.resolve(false);
            }
            if (!VALID_CACHES.has(cacheName)) {
              return caches.delete(cacheName);
            }
            return Promise.resolve(false);
          })
        );
      } catch {
        // Non-blocking cache cleanup
      }
      await sw.clients.claim();
    })()
  );
});

sw.addEventListener('message', (event: { data?: { type?: string } }) => {
  if (event?.data?.type === 'SKIP_WAITING') {
    sw.skipWaiting().catch(() => {});
  }
});

// 1. NEVER intercept or cache API, Auth, or Backend endpoints with HTML fallback
registerRoute(
  ({ url }) =>
    /^\/(api|auth|products|sellers|categories|fetch-products|upload|admin-api|bike-riders-api)(\/|$)/i.test(
      url.pathname
    ) ||
    /^https:\/\/(firestore\.googleapis\.com|identitytoolkit\.googleapis\.com|securetoken\.googleapis\.com)/i.test(
      url.href
    ),
  new NetworkOnly()
);

// 2. Network-First Navigation Handler:
// ALWAYS fetches the live website from the server first when online (4G, 3G, Wi-Fi).
// NEVER serves `/offline.html` unless the live network request genuinely fails.
// NEVER stores `/offline.html` under live page routes (`/` or `/marketplace`, etc.).
const navigationRoute = new NavigationRoute(
  async ({ request }) => {
    try {
      const liveResponse = await fetch(request);

      // Only cache valid live HTML responses (never cache offline.html as a normal page!)
      const contentType = liveResponse.headers.get('content-type') || '';
      const isOfflineDoc = new URL(liveResponse.url).pathname === '/offline.html';
      if (liveResponse.ok && contentType.includes('text/html') && !isOfflineDoc) {
        const cache = await caches.open(PAGES_CACHE);
        cache.put(request, liveResponse.clone()).catch(() => {});
      }

      return liveResponse;
    } catch {
      // Live network truly unreachable — try `/offline.html` from precache first,
      // then direct cache fallback, without modifying live route caches.
      const offlinePage =
        (await matchPrecache('/offline.html')) || (await caches.match('/offline.html'));
      if (offlinePage) {
        return offlinePage;
      }

      // Secondary fallback: cached app shell if offline.html was somehow absent
      const cachedPage =
        (await caches.match(request, { cacheName: PAGES_CACHE })) ||
        (await matchPrecache('/index.html')) ||
        (await caches.match('/index.html'));
      if (cachedPage) {
        return cachedPage;
      }

      return new Response(
        '<!doctype html><html><body style="font-family:sans-serif;padding:24px;text-align:center;"><h2>You are offline</h2><p>Check your internet connection and tap Retry.</p><button onclick="location.reload()">Retry Connection</button></body></html>',
        { status: 503, headers: { 'Content-Type': 'text/html; charset=utf-8' } }
      );
    }
  },
  {
    denylist: [/^\/api\//, /^\/auth\//, /^\/uploads\//, /^\/offline\.html$/]
  }
);

registerRoute(navigationRoute);

// 3. Firebase Storage Images CacheFirst
registerRoute(
  /^https:\/\/firebasestorage\.googleapis\.com\/.*/i,
  new CacheFirst({
    cacheName: FIREBASE_IMAGES_CACHE,
    plugins: [
      new ExpirationPlugin({
        maxEntries: 200,
        maxAgeSeconds: 60 * 60 * 24 * 30
      }),
      new CacheableResponsePlugin({
        statuses: [0, 200]
      })
    ]
  })
);

// 4. Local Product Uploads StaleWhileRevalidate
registerRoute(
  /\/uploads\/.*/i,
  new StaleWhileRevalidate({
    cacheName: UPLOADS_CACHE,
    plugins: [
      new ExpirationPlugin({
        maxEntries: 150,
        maxAgeSeconds: 60 * 60 * 24 * 14
      }),
      new CacheableResponsePlugin({
        statuses: [0, 200]
      })
    ]
  })
);
