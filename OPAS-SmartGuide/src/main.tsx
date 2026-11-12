import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import { AIApplicationFiller } from './components/prefill/AIApplicationFiller.tsx';
import './index.css';

// /ai-fill is the public SmartGuide AI Application Filler page (no sign-in needed,
// because first-time applicants do not have an OPAS application yet).
const isAiFillPage = window.location.pathname.replace(/\/+$/, '') === '/ai-fill';

createRoot(document.getElementById('root')!).render(isAiFillPage ? <AIApplicationFiller /> : <App />);
