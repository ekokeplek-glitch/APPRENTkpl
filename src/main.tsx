import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';

// Request persistent storage if supported by browser (F-12)
if (typeof navigator !== 'undefined' && navigator.storage?.persist) {
  navigator.storage.persist().catch(() => {});
}

createRoot(document.getElementById('root')!).render(<App />);
