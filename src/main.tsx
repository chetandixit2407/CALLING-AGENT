import { initGlobalErrorSuppression } from './utils/errorSuppressor';
import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';

// Initialize suppression for normal WebRTC meeting completion ejection notifications
initGlobalErrorSuppression();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
