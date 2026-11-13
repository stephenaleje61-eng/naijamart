import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';

if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
  navigator.serviceWorker
    .getRegistrations()
    .then((regs) => {
      for (const reg of regs) {
        if (reg.active?.scriptURL.includes('dev-sw.js') || reg.installing?.scriptURL.includes('dev-sw.js')) {
          reg.unregister().catch(() => {});
        }
      }
    })
    .catch(() => {});
}

createRoot(document.getElementById('root')!).render(<App />);
