import { AuthProvider } from "./AuthContext.jsx";
import { CatalogProvider } from "./CatalogContext.jsx";
import { NotificationProvider } from "./NotificationContext.jsx";
import { UIProvider } from "./UIContext.jsx";
import { UploadDraftProvider } from "./UploadDraftContext.jsx";
import CatalogErrorBoundary from "../components/ui/CatalogErrorBoundary.jsx";

export default function AppProviders({ children }) {
  return (
    <UIProvider>
      <AuthProvider>
        <NotificationProvider>
          <CatalogErrorBoundary>
            <CatalogProvider>
              <UploadDraftProvider>{children}</UploadDraftProvider>
            </CatalogProvider>
          </CatalogErrorBoundary>
        </NotificationProvider>
      </AuthProvider>
    </UIProvider>
  );
}
