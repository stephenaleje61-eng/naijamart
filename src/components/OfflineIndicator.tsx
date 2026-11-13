import React, { useEffect, useState } from 'react';
import { WifiOff } from 'lucide-react';

export function useOnlineStatus() {
  const [isOnline, setIsOnline] = useState(
    typeof navigator !== 'undefined' ? navigator.onLine : true
  );

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return isOnline;
}

export const OfflineIndicator: React.FC = () => {
  const isOnline = useOnlineStatus();

  if (isOnline) return null;

  return (
    <div className="fixed bottom-20 sm:bottom-5 left-4 z-50 flex items-center gap-2 rounded-xl bg-[#14532D] border-2 border-[#F2B90D] px-3.5 py-2 text-xs font-bold text-white shadow-2xl">
      <WifiOff className="w-4 h-4 text-[#F2B90D] animate-pulse" />
      <span>Offline Mode — Viewing cached FU MARKET data</span>
    </div>
  );
};
