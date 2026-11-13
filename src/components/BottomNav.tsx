import React from 'react';
import {
  ShoppingBag,
  MessageSquare,
  Users,
  Home,
  Bike,
  HelpCircle
} from 'lucide-react';

export type AppView = 'marketplace' | 'requests' | 'hux' | 'hub' | 'friends' | 'bike-riders';

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
      id: 'requests' as AppView,
      label: 'Needs',
      icon: HelpCircle,
      badge: null
    },
    {
      id: 'hux' as AppView,
      label: 'Agent',
      icon: Home,
      badge: null
    },
    {
      id: 'hub' as AppView,
      label: 'Hub',
      icon: MessageSquare,
      badge: null
    },
    {
      id: 'friends' as AppView,
      label: 'Chat',
      icon: Users,
      badge: pendingRequestsCount > 0 ? pendingRequestsCount : null
    },
    {
      id: 'bike-riders' as AppView,
      label: 'Bike',
      icon: Bike,
      badge: null
    }
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 bg-[#121212]/95 backdrop-blur-md border-t border-[#333333] shadow-2xl px-1 py-1.5 flex items-center justify-around sm:hidden">
      {navItems.map((item) => {
        const Icon = item.icon;
        const isActive = currentView === item.id;

        return (
          <button
            key={item.id}
            type="button"
            onClick={() => onNavigate(item.id)}
            className={`flex flex-col items-center justify-center py-1 px-2 rounded-xl transition-all relative ${
              isActive ? 'text-[#FFFFFF] font-black' : 'text-[#BDBDBD] hover:text-white font-semibold'
            }`}
          >
            <div className="relative">
              <Icon className={`w-5 h-5 ${isActive ? 'stroke-[2.5]' : 'stroke-2'}`} />
              {item.badge && (
                <span className="absolute -top-1.5 -right-2 bg-[#FFFFFF] text-black text-[9px] font-black px-1 rounded-full">
                  {item.badge}
                </span>
              )}
            </div>
            <span className="text-[10px] mt-0.5 tracking-tight">{item.label}</span>
          </button>
        );
      })}
    </nav>
  );
};
