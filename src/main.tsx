import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { registerPlugin } from './core/pluginRegistry';
import yet610lPlugin from './plugins/yet-610l';
import App from './core/App';
import './index.css';

registerPlugin(yet610lPlugin);

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
