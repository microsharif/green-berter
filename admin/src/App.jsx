import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { AdminAuthProvider } from "./context/AdminAuthContext.jsx";
import { ToastProvider } from "./context/ToastContext.jsx";
import ProtectedRoute from "./components/auth/ProtectedRoute.jsx";
import AdminLayout from "./components/layout/AdminLayout.jsx";
import { PERMISSIONS } from "./constants/permissions.js";
import LoginPage from "./pages/LoginPage.jsx";
import OverviewPage from "./pages/OverviewPage.jsx";
import UsersPage from "./pages/UsersPage.jsx";
import UserDetailPage from "./pages/UserDetailPage.jsx";
import ListingsPage from "./pages/ListingsPage.jsx";
import ListingDetailPage from "./pages/ListingDetailPage.jsx";
import CatalogPage from "./pages/CatalogPage.jsx";
import ForbiddenPage from "./pages/ForbiddenPage.jsx";
import NotFoundPage from "./pages/NotFoundPage.jsx";

export default function App() {
  return (
    <BrowserRouter>
      <ToastProvider>
        <AdminAuthProvider>
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route path="/forbidden" element={<ForbiddenPage />} />

            <Route
              element={
                <ProtectedRoute>
                  <AdminLayout />
                </ProtectedRoute>
              }
            >
              <Route
                index
                element={
                  <ProtectedRoute permission={PERMISSIONS.ANALYTICS_READ}>
                    <OverviewPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="users"
                element={
                  <ProtectedRoute permission={PERMISSIONS.USERS_READ}>
                    <UsersPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="users/:id"
                element={
                  <ProtectedRoute permission={PERMISSIONS.USERS_READ}>
                    <UserDetailPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="listings"
                element={
                  <ProtectedRoute permission={PERMISSIONS.LISTINGS_READ}>
                    <ListingsPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="listings/:id"
                element={
                  <ProtectedRoute permission={PERMISSIONS.LISTINGS_READ}>
                    <ListingDetailPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="catalog"
                element={
                  <ProtectedRoute permission={PERMISSIONS.CATALOG_READ}>
                    <CatalogPage />
                  </ProtectedRoute>
                }
              />
              <Route path="*" element={<NotFoundPage />} />
            </Route>

            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </AdminAuthProvider>
      </ToastProvider>
    </BrowserRouter>
  );
}
