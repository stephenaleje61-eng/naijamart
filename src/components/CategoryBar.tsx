import React from 'react';
import {
  Smartphone,
  Laptop,
  Shirt,
  Briefcase,
  Sparkles,
  Utensils,
  Tv,
  Apple,
  Car,
  HardHat,
  Wheat,
  Baby,
  Dumbbell,
  BookOpen,
  Package,
  Grid,
  Bike
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
    case 'Smartphone': return <Smartphone className="w-4 h-4" />;
    case 'Laptop': return <Laptop className="w-4 h-4" />;
    case 'Shirt': return <Shirt className="w-4 h-4" />;
    case 'Briefcase': return <Briefcase className="w-4 h-4" />;
    case 'Sparkles': return <Sparkles className="w-4 h-4" />;
    case 'Utensils': return <Utensils className="w-4 h-4" />;
    case 'Tv': return <Tv className="w-4 h-4" />;
    case 'Apple': return <Apple className="w-4 h-4" />;
    case 'Car': return <Car className="w-4 h-4" />;
    case 'HardHat': return <HardHat className="w-4 h-4" />;
    case 'Wheat': return <Wheat className="w-4 h-4" />;
    case 'Baby': return <Baby className="w-4 h-4" />;
    case 'Dumbbell': return <Dumbbell className="w-4 h-4" />;
    case 'BookOpen': return <BookOpen className="w-4 h-4" />;
    default: return <Package className="w-4 h-4" />;
  }
};

export const CategoryBar: React.FC<CategoryBarProps> = ({
  categories,
  selectedCategory,
  onSelectCategory,
  onOpenBikeRiders
}) => {
  return (
    <div className="bg-[#121212] border-b border-[#333333]">
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex items-center gap-2 overflow-x-auto py-2.5 scrollbar-none scroll-smooth">
          <button
            type="button"
            onClick={() => onSelectCategory('all')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition shrink-0 ${
              selectedCategory === 'all'
                ? 'bg-[#FFFFFF] text-black font-black'
                : 'bg-[#1C1C1C] text-[#BDBDBD] border border-[#333333] hover:text-white'
            }`}
          >
            <Grid className="w-3.5 h-3.5" />
            <span>All Categories</span>
          </button>

          {onOpenBikeRiders && (
            <button
              type="button"
              onClick={onOpenBikeRiders}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition shrink-0 bg-[#1C1C1C] hover:border-[#FFFFFF] text-[#FFFFFF] border border-[#FFFFFF]/40"
              title="Wukari Okada Directory"
            >
              <Bike className="w-3.5 h-3.5" />
              <span>Wukari Bike Riders</span>
            </button>
          )}

          {categories.map((cat) => {
            const isSelected = selectedCategory === cat.id;
            return (
              <button
                key={cat.id}
                type="button"
                onClick={() => onSelectCategory(cat.id)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition shrink-0 ${
                  isSelected
                    ? 'bg-[#FFFFFF] text-black font-black'
                    : 'bg-[#1C1C1C] text-[#BDBDBD] hover:text-white hover:border-[#FFFFFF]/60 border border-[#333333]'
                }`}
              >
                <span className={isSelected ? 'text-black' : 'text-[#FFFFFF]'}>
                  {getCategoryIcon(cat.icon)}
                </span>
                <span>{cat.name}</span>
                {cat.productCount !== undefined && cat.productCount > 0 && (
                  <span
                    className={`text-[10px] px-1.5 rounded-full font-mono ${
                      isSelected ? 'bg-black/20 text-black' : 'bg-[#121212] text-[#BDBDBD]'
                    }`}
                  >
                    {cat.productCount}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};
