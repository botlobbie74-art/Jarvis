import React from 'react';
import './App.css';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import MarketingHome from './pages/MarketingHome';
import Landing from './pages/Landing';
import Dashboard from './pages/Dashboard';
import Pricing from './pages/Pricing';
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
