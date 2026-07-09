import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { globalKeyframes } from './design-system';
import './index.css';

// Les animations partagées (dont le support prefers-reduced-motion)
// vivent dans le Design System, pas dans un fichier CSS séparé qui
// pourrait diverger. Injectées une seule fois ici, globalement —
// c'est ce qui rend actif le support d'accessibilité déjà écrit dans
// design-system.js.
const styleTag = document.createElement('style');
styleTag.textContent = globalKeyframes;
document.head.appendChild(styleTag);

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
