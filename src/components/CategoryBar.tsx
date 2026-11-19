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
    <div className="bg-[#FFFFFF] border-b border-[#D9E5DF]">
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex items-center gap-2 overflow-x-auto py-2.5 scrollbar-none scroll-smooth">
          <button
            type="button"
            onClick={() => onSelectCategory('all')}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition shrink-0 cursor-pointer ${
              selectedCategory === 'all'
                ? 'bg-[#075B3B] text-[#FFFFFF] font-black shadow-sm'
                : 'bg-[#F4F7F5] text-[#202B26] border border-[#D9E5DF] hover:border-[#075B3B]'
            }`}
          >
            <Grid
              className={`w-3.5 h-3.5 ${
                selectedCategory === 'all' ? 'text-[#F2C94C]' : 'text-[#075B3B]'
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
                className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition shrink-0 cursor-pointer ${
                  isSelected
                    ? 'bg-[#075B3B] text-[#FFFFFF] font-black shadow-sm'
                    : 'bg-[#F4F7F5] text-[#202B26] hover:border-[#075B3B] border border-[#D9E5DF]'
                }`}
              >
                <span className={isSelected ? 'text-[#F2C94C]' : 'text-[#075B3B]'}>
                  {getCategoryIcon(cat.icon)}
                </span>
                <span>{cat.name}</span>
                {cat.productCount !== undefined && cat.productCount > 0 && (
                  <span
                    className={`text-[10px] px-1.5 rounded-full font-mono font-black ${
                      isSelected
                        ? 'bg-[#F2C94C] text-[#202B26]'
                        : 'bg-[#FFFFFF] text-[#075B3B] border border-[#D9E5DF]'
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
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-black whitespace-nowrap transition shrink-0 bg-[#F2C94C] hover:bg-[#F2C94C]/90 text-[#202B26] cursor-pointer"
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
