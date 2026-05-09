import React from 'react';
import './App.css';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import MarketingHome from './pages/MarketingHome';
import Landing from './pages/Landing';
import Dashboard from './pages/Dashboard';
import Pricing from './pages/Pricing';
import ActivityView from './components/ActivityView';
import { Toaster } from './components/ui/toaster';

const ProtectedRoute = ({ children }) => {
  const { user, loading } = useAuth();
  if (loading) return null;
  if (!user) return <Navigate to="/login" replace />;
  return children;
};

const PublicRoute = ({ children }) => {
  const { user, loading } = useAuth();
  if (loading) return null;
  if (user) return <Navigate to="/app" replace />;
  return children;
};

const BillingRedirect = () => {
  const location = useLocation();
  return <Navigate to={`/app/billing${location.search}`} replace />;
};

function App() {
  return (
    <div className="App">
      <BrowserRouter>
        <ThemeProvider>
          <AuthProvider>
            <Routes>
              <Route path="/" element={<MarketingHome />} />
              <Route path="/login" element={<PublicRoute><Landing /></PublicRoute>} />
              <Route path="/pricing" element={<Pricing />} />
              <Route path="/app" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
              <Route path="/app/billing" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
              <Route path="/billing" element={<ProtectedRoute><BillingRedirect /></ProtectedRoute>} />
              <Route path="/activity" element={<ActivityView />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
            <Toaster />
          </AuthProvider>
        </ThemeProvider>
      </BrowserRouter>
    </div>
  );
}

export default App;
