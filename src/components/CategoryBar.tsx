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
  Grid
} from 'lucide-react';
import { Category } from '../types.js';

interface CategoryBarProps {
  categories: Category[];
  selectedCategory: string;
  onSelectCategory: (categoryId: string) => void;
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
  onSelectCategory
}) => {
  return (
    <div className="bg-white border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex items-center gap-2 overflow-x-auto py-2.5 scrollbar-none scroll-smooth">
          {/* All Categories Option */}
          <button
            onClick={() => onSelectCategory('all')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition shrink-0 ${
              selectedCategory === 'all'
                ? 'bg-[#F68B1F] text-white shadow-sm'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            <Grid className="w-3.5 h-3.5" />
            <span>All Categories</span>
          </button>

          {/* Individual Category Buttons */}
          {categories.map((cat) => {
            const isSelected = selectedCategory === cat.id;
            return (
              <button
                key={cat.id}
                onClick={() => onSelectCategory(cat.id)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition shrink-0 ${
                  isSelected
                    ? 'bg-[#F68B1F] text-white font-bold shadow-sm'
                    : 'bg-gray-50 text-gray-700 hover:bg-orange-50 hover:text-[#F68B1F] border border-gray-100'
                }`}
              >
                <span className={isSelected ? 'text-white' : 'text-[#F68B1F]'}>
                  {getCategoryIcon(cat.icon)}
                </span>
                <span>{cat.name}</span>
                {cat.productCount !== undefined && cat.productCount > 0 && (
                  <span
                    className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
                      isSelected
                        ? 'bg-white/25 text-white'
                        : 'bg-gray-200 text-gray-600'
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
