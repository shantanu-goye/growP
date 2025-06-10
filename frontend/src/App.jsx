import React from "react";
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import ResponsiveLayout from "./layout/Layout";
import Login from "./pages/Login";
import TermsOfService from "./pages/TermsOfService";
import PrivacyPolicy from "./pages/PrivacyPolicy";
import LiabilityDisclaimer from "./pages/LiabilityDisclaimer";

// Graceful logout
const logout = () => {
  localStorage.removeItem("token");
  localStorage.removeItem("user");
  localStorage.removeItem("tokenExpiry");
};

// Auth check with expiry
const isAuthenticated = () => {
  const token = localStorage.getItem("token");
  const expiry = localStorage.getItem("tokenExpiry");

  if (!token || !expiry) {
    logout();
    return false;
  }

  const now = Date.now();
  if (now > parseInt(expiry)) {
    logout();
    return false;
  }

  return true;
};

// Protected route wrapper
const ProtectedRoute = ({ children }) => {
  return isAuthenticated() ? children : <Navigate to="/login" replace />;
};

function App() {
  return (
    <Router>
      <Routes>
        {/* Public Routes */}
        <Route path="/login" element={<Login />} />
        <Route path="/privacy-policy" element={<PrivacyPolicy />} />
        <Route path="/terms-of-service" element={<TermsOfService />} />
        <Route path="/liability-disclaimer" element={<LiabilityDisclaimer />} />

        {/* Protected Dashboard Route */}
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <ResponsiveLayout />
            </ProtectedRoute>
          }
        />

        {/* Root Redirect */}
        <Route
          path="/"
          element={<Navigate to={isAuthenticated() ? "/dashboard" : "/login"} replace />}
        />
      </Routes>
    </Router>
  );
}

export default App;
