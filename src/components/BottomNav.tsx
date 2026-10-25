import React from 'react';
import {
  ShoppingBag,
  MessageSquare,
  Users,
  Home,
  Bike
} from 'lucide-react';

export type AppView = 'marketplace' | 'hub' | 'friends' | 'hux' | 'bike-riders';

interface BottomNavProps {
  currentView: AppView;
  onNavigate: (view: AppView) => void;
  pendingRequestsCount?: number;
}

export const BottomNav: React.FC<BottomNavProps> = ({
  currentView,
  onNavigate,
  pendingRequestsCount = 0
}) => {
  const navItems = [
    {
      id: 'marketplace' as AppView,
      label: 'Market',
      icon: ShoppingBag,
      badge: null
    },
    {
      id: 'hub' as AppView,
      label: 'Single Hub',
      icon: MessageSquare,
      badge: 'Live'
    },
    {
      id: 'friends' as AppView,
      label: 'Friends',
      icon: Users,
      badge: pendingRequestsCount > 0 ? pendingRequestsCount : null
    },
    {
      id: 'hux' as AppView,
      label: 'Hux Hub',
      icon: Home,
      badge: null
    },
    {
      id: 'bike-riders' as AppView,
      label: 'Bike Man',
      icon: Bike,
      badge: null
    }
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-gray-200 shadow-lg px-2 py-1.5 flex items-center justify-around sm:hidden">
      {navItems.map((item) => {
        const Icon = item.icon;
        const isActive = currentView === item.id;

        return (
          <button
            key={item.id}
            onClick={() => onNavigate(item.id)}
            className={`flex flex-col items-center justify-center py-1 px-2.5 rounded-xl transition-all relative ${
              isActive
                ? 'text-[#008751] font-black scale-105'
                : 'text-gray-500 hover:text-gray-900 font-semibold'
            }`}
          >
            <div className="relative">
              <Icon className={`w-5 h-5 ${isActive ? 'stroke-[2.5]' : 'stroke-2'}`} />
              {item.badge && (
                <span className="absolute -top-1.5 -right-2.5 bg-[#F68B1F] text-white text-[9px] font-black px-1 rounded-full animate-pulse">
                  {item.badge}
                </span>
              )}
            </div>
            <span className="text-[10px] mt-0.5 tracking-tight">{item.label}</span>
            {isActive && (
              <span className="w-1.5 h-1.5 rounded-full bg-[#008751] mt-0.5" />
            )}
          </button>
        );
      })}
    </nav>
  );
};
