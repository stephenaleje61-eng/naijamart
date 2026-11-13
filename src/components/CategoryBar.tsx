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
  Flame
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
    <div className="bg-white border-b border-[#E5E7EB]">
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex items-center gap-2 overflow-x-auto py-2.5 scrollbar-none scroll-smooth">
          <button
            type="button"
            onClick={() => onSelectCategory('all')}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition shrink-0 ${
              selectedCategory === 'all'
                ? 'bg-[#0B6B3A] text-white font-black shadow-sm'
                : 'bg-[#F5F5F5] text-[#111111] border border-[#E5E7EB] hover:border-[#0B6B3A]'
            }`}
          >
            <Grid className={`w-3.5 h-3.5 ${selectedCategory === 'all' ? 'text-[#F2B90D]' : 'text-[#0B6B3A]'}`} />
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
                    ? 'bg-[#0B6B3A] text-white font-black shadow-sm'
                    : 'bg-[#F5F5F5] text-[#111111] hover:border-[#0B6B3A] border border-[#E5E7EB]'
                }`}
              >
                <span className={isSelected ? 'text-[#F2B90D]' : 'text-[#0B6B3A]'}>
                  {getCategoryIcon(cat.icon)}
                </span>
                <span>{cat.name}</span>
                {cat.productCount !== undefined && cat.productCount > 0 && (
                  <span
                    className={`text-[10px] px-1.5 rounded-full font-mono font-black ${
                      isSelected ? 'bg-[#F2B90D] text-[#111111]' : 'bg-white text-[#0B6B3A] border border-[#E5E7EB]'
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
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-black whitespace-nowrap transition shrink-0 bg-[#F2B90D] hover:bg-[#FFC107] text-[#111111]"
              title="Wukari Okada Directory"
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
