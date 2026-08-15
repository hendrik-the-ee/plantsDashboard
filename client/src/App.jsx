import { Link, Navigate, Route, Routes } from 'react-router-dom';
import Dashboard from './pages/Dashboard.jsx';
import EditPlant from './pages/EditPlant.jsx';
import NewPlant from './pages/NewPlant.jsx';
import PlantDetail from './pages/PlantDetail.jsx';
import Settings from './pages/Settings.jsx';

export default function App() {
  return (
    <div className="container">
      <nav className="nav">
        <Link to="/">Plants</Link>
        <Link to="/settings">Settings</Link>
      </nav>
      <main>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/plants/new" element={<NewPlant />} />
          <Route path="/plants/:id" element={<PlantDetail />} />
          <Route path="/plants/:id/edit" element={<EditPlant />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
    </div>
  );
}
