export const NIGERIA_CAMPUS_MARKET_BRAND = {
  name: 'NIGERIA CAMPUS MARKET',
  shortName: 'NG Campus Market',
  slogan: 'Buy. Sell. Connect. Grow Across Nigerian Campuses.',
  tagline: 'Buy. Sell. Connect. Grow Across Nigerian Campuses.',
  positioning: "Nigeria's National University & Polytechnic Marketplace, Accommodation, Food, Academic & Student Network.",
  networkTagline: "Nigeria's National University & Polytechnic Marketplace Network.",
  adsTagline: 'Advertise Your Business Across Nigerian Campuses. Reach More Students. Grow Your Sales.',
  colors: {
    emeraldPrimary: '#087443',
    emeraldDark: '#065D36',
    darkNavy: '#10251D',
    royalNavy: '#10251D',
    royalNavyDark: '#0A1913',
    pureWhite: '#FFFFFF',
    premiumGold: '#D4A62A',
    goldBright: '#E0B43B',
    darkCharcoal: '#10251D',
    lightBackground: '#F4F8F5',
    lightGrey: '#F4F8F5',
    borderLight: '#D8E5DD'
  }
} as const;

// Backwards-compatible aliases for existing imports across modules
export const NIGERIA_UNIVERSITY_HUB_BRAND = NIGERIA_CAMPUS_MARKET_BRAND;
export const FU_MARKET_BRAND = NIGERIA_CAMPUS_MARKET_BRAND;
