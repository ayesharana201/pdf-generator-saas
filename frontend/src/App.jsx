import { NavLink, Routes, Route, Navigate } from 'react-router-dom';
import GeneratePage from './pages/GeneratePage.jsx';
import HistoryPage from './pages/HistoryPage.jsx';
import TemplatesPage from './pages/TemplatesPage.jsx';
import AdminPage from './pages/AdminPage.jsx';
import ApiAccessPage from './pages/ApiAccessPage.jsx';
import ApiDocsPage from './pages/ApiDocsPage.jsx';

export default function App() {
  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-mark">PG</div>
          <div>
            <div className="brand-title">Doc Generator</div>
            <div className="brand-subtitle">PDF / eBook SaaS</div>
          </div>
        </div>
        <nav>
          <NavLink to="/generate" className={navClass}>Generate</NavLink>
          <NavLink to="/history" className={navClass}>History</NavLink>
          <NavLink to="/templates" className={navClass}>Templates</NavLink>
          <NavLink to="/api-access" className={navClass}>API Access</NavLink>
          
          <NavLink to="/admin" className={navClass}>Admin</NavLink>
        </nav>
      </aside>
      <main className="main-content">
        <Routes>
          <Route path="/" element={<Navigate to="/generate" replace />} />
          <Route path="/generate" element={<GeneratePage />} />
          <Route path="/history" element={<HistoryPage />} />
          <Route path="/templates" element={<TemplatesPage />} />
          <Route path="/api-access" element={<ApiAccessPage />} />
          <Route path="/api-docs" element={<ApiDocsPage />} />
          <Route path="/admin" element={<AdminPage />} />
        </Routes>
      </main>
    </div>
  );
}

function navClass({ isActive }) {
  return isActive ? 'nav-link active' : 'nav-link';
}
