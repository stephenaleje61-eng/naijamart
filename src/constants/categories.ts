import { Category } from '../types.js';

// Core 6 FUWUKARI Categories (preserved intact for backward compatibility)
export const DEFAULT_CATEGORIES: Category[] = [
  {
    id: 'hostel-items',
    name: 'Hostel Items',
    slug: 'hostel-items',
    icon: 'BedDouble',
    description: 'Mattresses, standing fans, buckets, study tables, curtains & hostel essentials',
    featured: true
  },
  {
    id: 'textbooks-past-questions',
    name: 'Textbooks & Past Questions',
    slug: 'textbooks-past-questions',
    icon: 'BookOpen',
    description: 'Course handouts, past questions, scientific calculators, lab coats & textbooks',
    featured: true
  },
  {
    id: 'food',
    name: 'Food',
    slug: 'food',
    icon: 'Utensils',
    description: 'Fresh campus meals, provisions, snacks, garri, rice, indomie & cold drinks',
    featured: true
  },
  {
    id: 'electronics',
    name: 'Electronics',
    slug: 'electronics',
    icon: 'Smartphone',
    description: 'Smartphones, laptops, power banks, chargers, earphones & gadgets',
    featured: true
  },
  {
    id: 'fashion',
    name: 'Fashion',
    slug: 'fashion',
    icon: 'Shirt',
    description: 'Clothes, sneakers, bags, wristwatches, perfumes & student outfits',
    featured: true
  },
  {
    id: 'gas-cooking',
    name: 'Gas & Cooking',
    slug: 'gas-cooking',
    icon: 'Flame',
    description: 'Gas cylinders, camp gas burners, pots, electric kettles & kitchen utensils',
    featured: true
  }
];

// National Campus Marketplace Categories (12 expanded categories)
export const NATIONAL_CATEGORIES: Category[] = [
  {
    id: 'phones-accessories',
    name: 'Phones & Accessories',
    slug: 'phones-accessories',
    icon: 'Smartphone',
    description: 'Android phones, iPhones, power banks, chargers, AirPods & phone cases',
    featured: true
  },
  {
    id: 'laptops-computers',
    name: 'Laptops & Computers',
    slug: 'laptops-computers',
    icon: 'Laptop',
    description: 'Laptops, MacBooks, monitors, SSDs, keyboards, mice & computer accessories',
    featured: true
  },
  {
    id: 'fashion-clothing',
    name: 'Fashion & Clothing',
    slug: 'fashion-clothing',
    icon: 'Shirt',
    description: 'Casual wear, corporate outfits, hoodies, native wears, caps & apparel',
    featured: true
  },
  {
    id: 'shoes-bags',
    name: 'Shoes & Bags',
    slug: 'shoes-bags',
    icon: 'ShoppingBag',
    description: 'Sneakers, slides, leather shoes, school backpacks, tote bags & travel luggage',
    featured: true
  },
  {
    id: 'food-groceries',
    name: 'Food & Groceries',
    slug: 'food-groceries',
    icon: 'Utensils',
    description: 'Cooked meals, foodstuffs, provisions, snacks, drinks & hostel groceries',
    featured: true
  },
  {
    id: 'electronics',
    name: 'Electronics',
    slug: 'electronics',
    icon: 'Tv',
    description: 'Speakers, stabilizers, extension boxes, fans, bulbs & electronic devices',
    featured: true
  },
  {
    id: 'books-educational',
    name: 'Books & Educational Materials',
    slug: 'books-educational',
    icon: 'BookOpen',
    description: 'Textbooks, lecture handouts, past questions, calculators & lab gear',
    featured: true
  },
  {
    id: 'beauty-products',
    name: 'Beauty & Personal Care',
    slug: 'beauty-products',
    icon: 'Sparkles',
    description: 'Skincare, perfumes, wigs, hair products, soaps & personal care essentials',
    featured: false
  },
  {
    id: 'furniture',
    name: 'Furniture & Hostel Gear',
    slug: 'furniture',
    icon: 'BedDouble',
    description: 'Mattresses, reading tables, chairs, wardrobes, shelves & room furniture',
    featured: false
  },
  {
    id: 'home-appliances',
    name: 'Home Appliances',
    slug: 'home-appliances',
    icon: 'Refrigerator',
    description: 'Fridges, blenders, pressing irons, hot plates, kettles & home appliances',
    featured: false
  },
  {
    id: 'sports-equipment',
    name: 'Sports Equipment',
    slug: 'sports-equipment',
    icon: 'Trophy',
    description: 'Jerseys, football boots, balls, gym weights, skipping ropes & sports gear',
    featured: false
  },
  {
    id: 'other-products',
    name: 'Other Products',
    slug: 'other-products',
    icon: 'Package',
    description: 'Miscellaneous campus items, crafts, stationery & general student listings',
    featured: false
  }
];

export const ALL_MARKETPLACE_CATEGORIES: Category[] = (() => {
  const map = new Map<string, Category>();
  for (const cat of DEFAULT_CATEGORIES) {
    map.set(cat.id, cat);
  }
  for (const cat of NATIONAL_CATEGORIES) {
    if (!map.has(cat.id)) {
      map.set(cat.id, cat);
    }
  }
  return Array.from(map.values());
})();

export const WUKARI_CATEGORY_IDS = DEFAULT_CATEGORIES.map((c) => c.id);
export const ALL_VALID_CATEGORY_IDS = ALL_MARKETPLACE_CATEGORIES.map((c) => c.id);

export function normalizeProductCategoryId(raw?: string | null): string {
  const value = String(raw || '').toLowerCase().trim();
  if (!value) return 'hostel-items';
  if (ALL_VALID_CATEGORY_IDS.includes(value)) return value;

  if (
    value.includes('gas') ||
    value.includes('cooking') ||
    value.includes('stove') ||
    value.includes('cylinder')
  ) {
    return 'gas-cooking';
  }
  if (value.includes('laptop') || value.includes('computer') || value.includes('pc')) {
    return 'laptops-computers';
  }
  if (value.includes('phone') || value.includes('tablet') || value === 'phones-tablets') {
    return 'phones-accessories';
  }
  if (value.includes('shoe') || value.includes('sneaker') || value.includes('bag')) {
    return 'shoes-bags';
  }
  if (value.includes('beauty') || value.includes('skin') || value.includes('hair') || value.includes('perfume')) {
    return 'beauty-products';
  }
  if (value.includes('furniture') || value.includes('mattress') || value.includes('table') || value.includes('chair')) {
    return 'furniture';
  }
  if (value.includes('appliance') || value.includes('fridge') || value.includes('iron') || value.includes('blender')) {
    return 'home-appliances';
  }
  if (value.includes('sport') || value.includes('boot') || value.includes('jersey') || value.includes('gym')) {
    return 'sports-equipment';
  }
  if (
    value.includes('textbook') ||
    value.includes('past') ||
    value.includes('book') ||
    value.includes('education') ||
    value.includes('handout')
  ) {
    return 'textbooks-past-questions';
  }
  if (
    value.includes('food') ||
    value.includes('grocer') ||
    value.includes('provision') ||
    value.includes('snack') ||
    value.includes('meal')
  ) {
    return 'food';
  }
  if (value.includes('electronic') || value.includes('gadget') || value.includes('charger')) {
    return 'electronics';
  }
  if (value.includes('fashion') || value.includes('cloth') || value.includes('wear') || value.includes('shirt')) {
    return 'fashion';
  }
  return 'other-products';
}

// Keep legacy function name exported for compatibility
export function normalizeCategoryToWukari(raw?: string | null): string {
  return normalizeProductCategoryId(raw);
}

// Smart category matching across overlapping Wukari & National IDs
const CATEGORY_EQUIVALENCE_GROUPS: Record<string, string[]> = {
  food: ['food', 'food-groceries'],
  'food-groceries': ['food', 'food-groceries'],
  fashion: ['fashion', 'fashion-clothing', 'shoes-bags', 'beauty-products'],
  'fashion-clothing': ['fashion', 'fashion-clothing'],
  'textbooks-past-questions': ['textbooks-past-questions', 'books-educational'],
  'books-educational': ['textbooks-past-questions', 'books-educational'],
  electronics: ['electronics', 'phones-accessories', 'laptops-computers', 'home-appliances'],
  'phones-accessories': ['phones-accessories', 'electronics'],
  'laptops-computers': ['laptops-computers', 'electronics'],
  'hostel-items': ['hostel-items', 'furniture', 'home-appliances'],
  furniture: ['furniture', 'hostel-items'],
  'home-appliances': ['home-appliances', 'hostel-items', 'electronics'],
  'gas-cooking': ['gas-cooking', 'home-appliances']
};

export function matchesProductCategory(
  productCategoryId: string | undefined,
  selectedCategoryId: string | undefined
): boolean {
  if (!selectedCategoryId || selectedCategoryId === 'all') return true;
  const prodCat = normalizeProductCategoryId(productCategoryId);
  const targetCat = normalizeProductCategoryId(selectedCategoryId);
  if (prodCat === targetCat) return true;
  const equiv = CATEGORY_EQUIVALENCE_GROUPS[targetCat];
  return Array.isArray(equiv) ? equiv.includes(prodCat) : false;
}
