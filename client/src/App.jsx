import { BrowserRouter, Routes, Route } from "react-router-dom";
import AppProviders from "./context/AppProviders.jsx";
import { NavigationProgressProvider } from "./context/NavigationProgressContext.jsx";
import ToastHost from "./components/ui/ToastHost.jsx";
import MainLayout from "./components/layout/MainLayout.jsx";
import ScrollToTop from "./components/layout/ScrollToTop.jsx";
import ScrollToTopButton from "./components/layout/ScrollToTopButton.jsx";
import NavigationProgressBar from "./components/ui/NavigationProgressBar.jsx";
import ProtectedRoute from "./components/auth/ProtectedRoute.jsx";
import HomePage from "./pages/HomePage.jsx";
import ProductsPage from "./pages/ProductsPage.jsx";
import ProductDetailPage from "./pages/ProductDetailPage.jsx";
import UploadPage from "./pages/UploadPage.jsx";
import ContactPage from "./pages/ContactPage.jsx";
import AboutUsPage from "./pages/AboutUsPage.jsx";
import PrivacyPolicyPage from "./pages/PrivacyPolicyPage.jsx";
import TermsConditionsPage from "./pages/TermsConditionsPage.jsx";
import FaqPage from "./pages/FaqPage.jsx";
import UserProfilePage from "./pages/UserProfilePage.jsx";
import MembershipPage from "./pages/MembershipPage.jsx";
import MembershipCheckoutPage from "./pages/MembershipCheckoutPage.jsx";
import MembershipReceiptPage from "./pages/MembershipReceiptPage.jsx";
import LoginPage from "./pages/LoginPage.jsx";
import RegisterPage from "./pages/RegisterPage.jsx";
import ForgotPasswordPage from "./pages/ForgotPasswordPage.jsx";

export default function App() {
  return (
    <BrowserRouter>
      <NavigationProgressProvider>
        <AppProviders>
          <>
            <NavigationProgressBar />
            <ScrollToTop />
            <ScrollToTopButton />
            <Routes>
            <Route element={<MainLayout />}>
              <Route path="/" element={<HomePage />} />
              <Route path="/products" element={<ProductsPage />} />
              <Route path="/products/:productId" element={<ProductDetailPage />} />
              <Route
                path="/upload"
                element={
                  <ProtectedRoute>
                    <UploadPage />
                  </ProtectedRoute>
                }
              />
              <Route path="/contact" element={<ContactPage />} />
              <Route path="/about-us" element={<AboutUsPage />} />
              <Route path="/privacy-policy" element={<PrivacyPolicyPage />} />
              <Route path="/terms-conditions" element={<TermsConditionsPage />} />
              <Route path="/faq" element={<FaqPage />} />
              <Route path="/membership" element={<MembershipPage />} />
              <Route
                path="/membership/checkout"
                element={
                  <ProtectedRoute>
                    <MembershipCheckoutPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/membership/receipt/:orderId"
                element={
                  <ProtectedRoute>
                    <MembershipReceiptPage />
                  </ProtectedRoute>
                }
              />
            </Route>
            <Route
              path="/profile"
              element={
                <ProtectedRoute>
                  <UserProfilePage />
                </ProtectedRoute>
              }
            />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />
            <Route path="/forgot-password" element={<ForgotPasswordPage />} />
          </Routes>
          <ToastHost />
        </>
      </AppProviders>
      </NavigationProgressProvider>
    </BrowserRouter>
  );
}
