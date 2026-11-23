import React from 'react';
import {
  Home,
  ShoppingBag,
  GraduationCap,
  ClipboardList,
  User as UserIcon
} from 'lucide-react';

export type AppView =
  | 'home'
  | 'marketplace'
  | 'social'
  | 'community'
  | 'requests'
  | 'hux'
  | 'hub'
  | 'friends'
  | 'bike-riders'
  | 'food'
  | 'jobs'
  | 'books'
  | 'deals'
  | 'giveaways'
  | 'referrals'
  | 'ambassadors'
  | 'leaderboards'
  | 'gpa'
  | 'orders'
  | 'account'
  | 'settings';

interface BottomNavProps {
  currentView: AppView;
  onNavigate: (view: AppView) => void;
  onOpenUniversities?: () => void;
  pendingRequestsCount?: number;
  ordersBadgeCount?: number;
}

export const BottomNav: React.FC<BottomNavProps> = ({
  currentView,
  onNavigate,
  onOpenUniversities,
  ordersBadgeCount = 0
}) => {
  const isMarketActive = currentView === 'marketplace' || currentView === 'food' || currentView === 'books' || currentView === 'deals';
  const isHomeActive = currentView === 'home';
  const isNetworkActive = currentView === 'community' || currentView === 'social';
  const isOrdersActive = currentView === 'orders';
  const isAccountActive = currentView === 'account' || currentView === 'friends';

  return (
    <nav
      aria-label="Mobile Campus Navigation"
      className="fixed bottom-0 left-0 right-0 z-40 h-16 bg-[#FFFFFF] border-t border-[#EEEEEE] shadow-[0_-4px_20px_rgba(0,0,0,0.06)] px-1.5 flex items-center justify-around sm:hidden"
    >
      <button
        type="button"
        onClick={() => onNavigate('home')}
        className={`min-h-[44px] min-w-[54px] flex flex-col items-center justify-center py-1 px-2 rounded-xl transition-all whitespace-nowrap shrink-0 cursor-pointer ${
          isHomeActive ? 'text-[#FFFFFF] font-black bg-[#FF6A00] shadow-xs' : 'text-[#303030] hover:text-[#F68B1F] font-semibold'
        }`}
      >
        <Home className={`w-4 h-4 ${isHomeActive ? 'stroke-[2.5]' : 'stroke-2'}`} />
        <span className="text-[10px] mt-0.5 tracking-tight">Home</span>
      </button>

      <button
        type="button"
        onClick={() => onNavigate('marketplace')}
        className={`min-h-[44px] min-w-[54px] flex flex-col items-center justify-center py-1 px-2 rounded-xl transition-all whitespace-nowrap shrink-0 cursor-pointer ${
          isMarketActive ? 'text-[#FFFFFF] font-black bg-[#FF6A00] shadow-xs' : 'text-[#303030] hover:text-[#F68B1F] font-semibold'
        }`}
      >
        <ShoppingBag className={`w-4 h-4 ${isMarketActive ? 'stroke-[2.5]' : 'stroke-2'}`} />
        <span className="text-[10px] mt-0.5 tracking-tight">Market</span>
      </button>

      <button
        type="button"
        onClick={() => {
          if (onOpenUniversities) {
            onOpenUniversities();
          } else {
            onNavigate('community');
          }
        }}
        className={`min-h-[44px] min-w-[54px] flex flex-col items-center justify-center py-1 px-2 rounded-xl transition-all whitespace-nowrap shrink-0 cursor-pointer ${
          isNetworkActive ? 'text-[#FFFFFF] font-black bg-[#FF6A00] shadow-xs' : 'text-[#303030] hover:text-[#F68B1F] font-semibold'
        }`}
      >
        <GraduationCap className={`w-4 h-4 ${isNetworkActive ? 'text-[#FFFFFF]' : 'text-[#F68B1F]'}`} />
        <span className="text-[10px] mt-0.5 tracking-tight">Campuses</span>
      </button>

      <button
        type="button"
        onClick={() => onNavigate('orders')}
        className={`min-h-[44px] min-w-[54px] flex flex-col items-center justify-center py-1 px-2 rounded-xl transition-all relative whitespace-nowrap shrink-0 cursor-pointer ${
          isOrdersActive ? 'text-[#FFFFFF] font-black bg-[#FF6A00] shadow-xs' : 'text-[#303030] hover:text-[#F68B1F] font-semibold'
        }`}
      >
        <div className="relative">
          <ClipboardList className={`w-4 h-4 ${isOrdersActive ? 'stroke-[2.5]' : 'stroke-2'}`} />
          {ordersBadgeCount > 0 && (
            <span className="absolute -top-1.5 -right-2 bg-[#FF6A00] text-[#FFFFFF] border border-white text-[9px] font-black px-1 rounded-full tabular-nums">
              {ordersBadgeCount}
            </span>
          )}
        </div>
        <span className="text-[10px] mt-0.5 tracking-tight">Orders</span>
      </button>

      <button
        type="button"
        onClick={() => onNavigate('account')}
        className={`min-h-[44px] min-w-[54px] flex flex-col items-center justify-center py-1 px-2 rounded-xl transition-all whitespace-nowrap shrink-0 cursor-pointer ${
          isAccountActive ? 'text-[#FFFFFF] font-black bg-[#FF6A00] shadow-xs' : 'text-[#303030] hover:text-[#F68B1F] font-semibold'
        }`}
      >
        <UserIcon className={`w-4 h-4 ${isAccountActive ? 'stroke-[2.5]' : 'stroke-2'}`} />
        <span className="text-[10px] mt-0.5 tracking-tight">Account</span>
      </button>
    </nav>
  );
};
