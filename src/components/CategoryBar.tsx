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
  Trophy
} from 'lucide-react';
import { Category } from '../types.js';

interface CategoryBarProps {
  categories: Category[];
  selectedCategory: string;
  onSelectCategory: (categoryId: string) => void;
  onOpenBikeRiders?: () => void;
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

export const CategoryBar: React.FC<CategoryBarProps> = ({
  categories,
  selectedCategory,
  onSelectCategory,
  onOpenBikeRiders
}) => {
  return (
    <div className="bg-[#FFFFFF] border-b border-[#E5E7EB]">
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex items-center gap-2 overflow-x-auto py-2.5 scrollbar-none scroll-smooth">
          <button
            type="button"
            onClick={() => onSelectCategory('all')}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition shrink-0 ${
              selectedCategory === 'all'
                ? 'bg-[#087443] text-[#FFFFFF] font-black shadow-sm'
                : 'bg-[#F4F8F5] text-[#10251D] border border-[#E5E7EB] hover:border-[#087443]'
            }`}
          >
            <Grid
              className={`w-3.5 h-3.5 ${
                selectedCategory === 'all' ? 'text-[#D4A62A]' : 'text-[#087443]'
              }`}
            />
            <span>All Items</span>
          </button>

          {categories.map((cat) => {
            const isSelected = selectedCategory === cat.id;
            return (
              <button
                key={cat.id}
                type="button"
                onClick={() => onSelectCategory(cat.id)}
                className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition shrink-0 ${
                  isSelected
                    ? 'bg-[#087443] text-[#FFFFFF] font-black shadow-sm'
                    : 'bg-[#F4F8F5] text-[#10251D] hover:border-[#087443] border border-[#E5E7EB]'
                }`}
              >
                <span className={isSelected ? 'text-[#D4A62A]' : 'text-[#087443]'}>
                  {getCategoryIcon(cat.icon)}
                </span>
                <span>{cat.name}</span>
                {cat.productCount !== undefined && cat.productCount > 0 && (
                  <span
                    className={`text-[10px] px-1.5 rounded-full font-mono font-black ${
                      isSelected
                        ? 'bg-[#D4A62A] text-[#10251D]'
                        : 'bg-[#FFFFFF] text-[#087443] border border-[#E5E7EB]'
                    }`}
                  >
                    {cat.productCount}
                  </span>
                )}
              </button>
            );
          })}

          {onOpenBikeRiders && (
            <button
              type="button"
              onClick={onOpenBikeRiders}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-black whitespace-nowrap transition shrink-0 bg-[#D4A62A] hover:bg-[#E0B43B] text-[#10251D]"
              title="Campus Dispatch & Okada Riders Directory"
            >
              <Bike className="w-3.5 h-3.5" />
              <span>Okada Riders</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
