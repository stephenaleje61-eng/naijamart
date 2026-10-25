import { Category } from '../types.js';

export const DEFAULT_CATEGORIES: Category[] = [
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
  { id: 'generator-solar', name: 'Generators & Solar Energy', slug: 'generator-solar', icon: 'Zap', description: 'Lutian, Mikano, solar panels, inverters and batteries', featured: true },
  { id: 'services-jobs', name: 'Artisans & Local Services', slug: 'services-jobs', icon: 'Wrench', description: 'Plumbers, electricians, tailors, dispatch riders and tutors' }
];
