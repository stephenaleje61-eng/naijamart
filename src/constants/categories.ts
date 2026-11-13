import { Category } from '../types.js';

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

export const WUKARI_CATEGORY_IDS = DEFAULT_CATEGORIES.map((c) => c.id);

export function normalizeCategoryToWukari(raw?: string | null): string {
  const value = String(raw || '').toLowerCase().trim();
  if (!value) return 'hostel-items';

  if (WUKARI_CATEGORY_IDS.includes(value)) return value;

  if (
    value.includes('gas') ||
    value.includes('cooking') ||
    value.includes('kitchen') ||
    value.includes('cook') ||
    value.includes('stove') ||
    value.includes('cylinder') ||
    value.includes('pot') ||
    value.includes('kettle') ||
    value === 'home-kitchen'
  ) {
    return 'gas-cooking';
  }

  if (
    value.includes('textbook') ||
    value.includes('past') ||
    value.includes('question') ||
    value.includes('book') ||
    value.includes('education') ||
    value.includes('handout') ||
    value.includes('stationery') ||
    value.includes('calculator') ||
    value === 'books-education'
  ) {
    return 'textbooks-past-questions';
  }

  if (
    value.includes('food') ||
    value.includes('grocer') ||
    value.includes('provision') ||
    value.includes('snack') ||
    value.includes('meal') ||
    value.includes('drink') ||
    value === 'food-groceries'
  ) {
    return 'food';
  }

  if (
    value.includes('electronic') ||
    value.includes('phone') ||
    value.includes('tablet') ||
    value.includes('computer') ||
    value.includes('laptop') ||
    value.includes('pc') ||
    value.includes('gadget') ||
    value.includes('charger') ||
    value.includes('power') ||
    value === 'phones-tablets' ||
    value === 'computers'
  ) {
    return 'electronics';
  }

  if (
    value.includes('fashion') ||
    value.includes('cloth') ||
    value.includes('wear') ||
    value.includes('shirt') ||
    value.includes('shoe') ||
    value.includes('bag') ||
    value.includes('watch') ||
    value.includes('beauty') ||
    value.includes('skin') ||
    value.includes('hair') ||
    value.includes('perfume') ||
    value === 'shoes-bags' ||
    value === 'beauty-care'
  ) {
    return 'fashion';
  }

  return 'hostel-items';
}
