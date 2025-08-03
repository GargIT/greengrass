import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import CssBaseline from "@mui/material/CssBaseline";
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";
import { AdapterDateFns } from "@mui/x-date-pickers/AdapterDateFns";
import { sv } from "date-fns/locale";
import { useState, useEffect } from "react";

// Theme
import { ThemeContextProvider } from "./theme";

// Components
import Layout from "./components/Layout";
import ProtectedRoute from "./components/ProtectedRoute";
import Dashboard from "./pages/Dashboard";
import Households from "./pages/Households";
import UtilityServices from "./pages/UtilityServices";
import HouseholdServiceConnections from "./pages/HouseholdServiceConnections";
import MeterReadings from "./pages/MeterReadings";
import Billing from "./pages/Billing";
import Reports from "./pages/Reports";
import Login from "./pages/Login";

function App() {
  console.log("App component is rendering");
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    console.log("useEffect running");
    // Check if user is already logged in
    const token = localStorage.getItem("accessToken");
    const user = localStorage.getItem("user");

    if (token && user) {
      setIsAuthenticated(true);
    }
    setLoading(false);
    console.log("useEffect finished, loading set to false");
  }, []);

  const handleLogout = async () => {
    try {
      const refreshToken = localStorage.getItem("refreshToken");

      // Call logout endpoint
      if (refreshToken) {
        await fetch("/api/auth/logout", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${localStorage.getItem("accessToken")}`,
          },
          body: JSON.stringify({ refreshToken }),
        });
      }
    } catch (error) {
      console.error("Logout error:", error);
    } finally {
      // Clear local storage and update state
      localStorage.removeItem("accessToken");
      localStorage.removeItem("refreshToken");
      localStorage.removeItem("user");
      setIsAuthenticated(false);
    }
  };

  console.log(
    "App rendering, loading:",
    loading,
    "isAuthenticated:",
    isAuthenticated
  );

  if (loading) {
    console.log("Showing loading screen");
    return (
      <ThemeContextProvider>
        <CssBaseline />
        <div style={{ padding: "20px", color: "green" }}>Loading...</div>
      </ThemeContextProvider>
    );
  }

  if (!isAuthenticated) {
    console.log("Showing login screen");
    return (
      <ThemeContextProvider>
        <LocalizationProvider dateAdapter={AdapterDateFns} adapterLocale={sv}>
          <CssBaseline />
          <Login onLogin={() => setIsAuthenticated(true)} />
        </LocalizationProvider>
      </ThemeContextProvider>
    );
  }

  return (
    <ThemeContextProvider>
      <LocalizationProvider dateAdapter={AdapterDateFns} adapterLocale={sv}>
        <CssBaseline />
        <Router>
          <Routes>
            <Route
              path="/"
              element={
                <Layout onLogout={handleLogout} fullWidth>
                  <Dashboard />
                </Layout>
              }
            />
            <Route
              path="/households"
              element={
                <Layout onLogout={handleLogout} fullWidth>
                  <ProtectedRoute requiredRole="ADMIN">
                    <Households />
                  </ProtectedRoute>
                </Layout>
              }
            />
            <Route
              path="/utility-services"
              element={
                <Layout onLogout={handleLogout} fullWidth>
                  <ProtectedRoute requiredRole="ADMIN">
                    <UtilityServices />
                  </ProtectedRoute>
                </Layout>
              }
            />
            <Route
              path="/household-service-connections"
              element={
                <Layout onLogout={handleLogout} fullWidth>
                  <ProtectedRoute requiredRole="ADMIN">
                    <HouseholdServiceConnections />
                  </ProtectedRoute>
                </Layout>
              }
            />
            <Route
              path="/meter-readings"
              element={
                <Layout onLogout={handleLogout} fullWidth>
                  <MeterReadings />
                </Layout>
              }
            />
            <Route
              path="/billing"
              element={
                <Layout onLogout={handleLogout} fullWidth>
                  <Billing />
                </Layout>
              }
            />
            <Route
              path="/reports"
              element={
                <Layout onLogout={handleLogout} fullWidth>
                  <ProtectedRoute allowedRoles={["ADMIN", "MEMBER"]}>
                    <Reports />
                  </ProtectedRoute>
                </Layout>
              }
            />
          </Routes>
        </Router>
      </LocalizationProvider>
    </ThemeContextProvider>
  );
}

export default App;
