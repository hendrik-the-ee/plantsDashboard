import { SignedIn, SignedOut, UserButton } from '@clerk/clerk-react';
import { Link, Navigate, Route, Routes } from 'react-router-dom';
import AuthTokenBridge from './components/AuthTokenBridge.jsx';
import Dashboard from './pages/Dashboard.jsx';
import EditPlant from './pages/EditPlant.jsx';
import NewPlant from './pages/NewPlant.jsx';
import PlantDetail from './pages/PlantDetail.jsx';
import Settings from './pages/Settings.jsx';
import SignInPage from './pages/SignIn.jsx';
import SignUpPage from './pages/SignUp.jsx';

function AppShell() {
  return (
    <div className="container">
      <AuthTokenBridge />
      <nav className="nav">
        <Link to="/">Plants</Link>
        <Link to="/settings">Settings</Link>
        <div className="nav-spacer" />
        <UserButton afterSignOutUrl="/sign-in" />
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

export default function App() {
  return (
    <>
      <SignedOut>
        <Routes>
          <Route path="/sign-in/*" element={<SignInPage />} />
          <Route path="/sign-up/*" element={<SignUpPage />} />
          <Route path="*" element={<Navigate to="/sign-in" replace />} />
        </Routes>
      </SignedOut>
      <SignedIn>
        <AppShell />
      </SignedIn>
    </>
  );
}
