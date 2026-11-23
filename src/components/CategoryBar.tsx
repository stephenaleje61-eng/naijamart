import React from 'react';
import {
  Smartphone,
  Laptop,
  Shirt,
  Utensils,
  BookOpen,
  Package,
  Grid,
  Bike,
  BedDouble,
  Flame,
  ShoppingBag,
  Tv,
  Sparkles,
  Refrigerator,
  Trophy,
  Briefcase
} from 'lucide-react';
import { Category } from '../types.js';

interface CategoryBarProps {
  categories: Category[];
  selectedCategory: string;
  onSelectCategory: (categoryId: string) => void;
  onOpenBikeRiders?: () => void;
  onOpenServices?: () => void;
}

export const getCategoryIcon = (iconName: string) => {
  switch (iconName) {
    case 'BedDouble':
      return <BedDouble className="w-4 h-4" />;
    case 'BookOpen':
      return <BookOpen className="w-4 h-4" />;
    case 'Utensils':
      return <Utensils className="w-4 h-4" />;
    case 'Smartphone':
      return <Smartphone className="w-4 h-4" />;
    case 'Laptop':
      return <Laptop className="w-4 h-4" />;
    case 'Shirt':
      return <Shirt className="w-4 h-4" />;
    case 'Flame':
      return <Flame className="w-4 h-4" />;
    case 'ShoppingBag':
      return <ShoppingBag className="w-4 h-4" />;
    case 'Tv':
      return <Tv className="w-4 h-4" />;
    case 'Sparkles':
      return <Sparkles className="w-4 h-4" />;
    case 'Refrigerator':
      return <Refrigerator className="w-4 h-4" />;
    case 'Trophy':
      return <Trophy className="w-4 h-4" />;
    default:
      return <Package className="w-4 h-4" />;
  }
};

const FEATURED_ORDER = [
  'hostel-items',
  'textbooks-past-questions',
  'electronics',
  'phones-accessories',
  'fashion',
  'food'
];

export const CategoryBar: React.FC<CategoryBarProps> = ({
  categories,
  selectedCategory,
  onSelectCategory,
  onOpenBikeRiders,
  onOpenServices
}) => {
  const orderedCategories = [...categories].sort((a, b) => {
    const idxA = FEATURED_ORDER.indexOf(a.id);
    const idxB = FEATURED_ORDER.indexOf(b.id);
    if (idxA !== -1 && idxB !== -1) return idxA - idxB;
    if (idxA !== -1) return -1;
    if (idxB !== -1) return 1;
    return 0;
  });

  return (
    <div className="bg-[#FFFFFF] border-b border-[#EEEEEE]">
      <div className="max-w-7xl mx-auto px-3 sm:px-4">
        <div className="flex items-center gap-2 overflow-x-auto py-2.5 scrollbar-none scroll-smooth">
          <button
            type="button"
            onClick={() => onSelectCategory('all')}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition shrink-0 cursor-pointer ${
              selectedCategory === 'all'
                ? 'bg-[#FF6A00] text-[#FFFFFF] font-black shadow-xs'
                : 'bg-[#F7F7F7] text-[#303030] border border-[#EEEEEE] hover:border-[#F68B1F] hover:text-[#FF6A00]'
            }`}
          >
            <Grid
              className={`w-3.5 h-3.5 ${
                selectedCategory === 'all' ? 'text-[#FFFFFF]' : 'text-[#F68B1F]'
              }`}
            />
            <span>All Items</span>
          </button>

          {orderedCategories.map((cat) => {
            const isSelected = selectedCategory === cat.id;
            return (
              <button
                key={cat.id}
                type="button"
                onClick={() => onSelectCategory(cat.id)}
                className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition shrink-0 cursor-pointer ${
                  isSelected
                    ? 'bg-[#FF6A00] text-[#FFFFFF] font-black shadow-xs'
                    : 'bg-[#F7F7F7] text-[#303030] border border-[#EEEEEE] hover:border-[#F68B1F] hover:text-[#FF6A00]'
                }`}
              >
                <span className={isSelected ? 'text-[#FFFFFF]' : 'text-[#F68B1F]'}>
                  {getCategoryIcon(cat.icon)}
                </span>
                <span>{cat.name}</span>
                {cat.productCount !== undefined && cat.productCount > 0 && (
                  <span
                    className={`text-[10px] px-1.5 rounded-full font-mono font-black ${
                      isSelected
                        ? 'bg-[#FFFFFF] text-[#FF6A00]'
                        : 'bg-[#FFFFFF] text-[#303030] border border-[#EEEEEE]'
                    }`}
                  >
                    {cat.productCount}
                  </span>
                )}
              </button>
            );
          })}

          {onOpenServices && (
            <button
              type="button"
              onClick={onOpenServices}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition shrink-0 bg-[#F7F7F7] text-[#303030] border border-[#EEEEEE] hover:border-[#F68B1F] hover:text-[#FF6A00] cursor-pointer"
              title="Student Businesses & Campus Services"
            >
              <Briefcase className="w-3.5 h-3.5 text-[#F68B1F]" />
              <span>Services</span>
            </button>
          )}

          {onOpenBikeRiders && (
            <button
              type="button"
              onClick={onOpenBikeRiders}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-black whitespace-nowrap transition shrink-0 bg-[#222222] hover:bg-[#303030] text-[#FFFFFF] cursor-pointer"
              title="Campus Dispatch & Okada Riders Directory"
            >
              <Bike className="w-3.5 h-3.5 text-[#F68B1F]" />
              <span>Okada Riders</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
