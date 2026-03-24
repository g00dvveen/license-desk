import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { ConfigProvider } from "antd";
import ruRU from "antd/locale/ru_RU";
import { AuthProvider } from "./auth/AuthContext";
import ProtectedRoute from "./components/ProtectedRoute";
import Layout from "./components/Layout/Layout";
import LoginPage from "./pages/Login/LoginPage";
import AuthCallback from "./pages/Auth/AuthCallback";
import AssetListPage from "./pages/Assets/AssetListPage";
import AssetDetailPage from "./pages/Assets/AssetDetailPage";
import ReferencesLayout from "./pages/References/ReferencesLayout";
import OrganizationsPage from "./pages/References/OrganizationsPage";
import ProjectsPage from "./pages/References/ProjectsPage";
import AssetTypesPage from "./pages/References/AssetTypesPage";
import AssetTypeDetailPage from "./pages/References/AssetTypeDetailPage";
import CurrenciesPage from "./pages/References/CurrenciesPage";
import RenewalPeriodsPage from "./pages/References/RenewalPeriodsPage";
import UsersPage from "./pages/Users/UsersPage";
import AuditPage from "./pages/Audit/AuditPage";
import SettingsPage from "./pages/Settings/SettingsPage";
import NotificationsPage from "./pages/Notifications/NotificationsPage";
import ProfilePage from "./pages/Profile/ProfilePage";

const theme = {
  token: {
    colorPrimary: "#0a6ed1",
    colorSuccess: "#107e3e",
    colorWarning: "#e9730c",
    colorError: "#bb0000",
    colorInfo: "#0a6ed1",
    borderRadius: 4,
    fontFamily:
      '"72", "72full", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
    fontSize: 14,
    colorBgLayout: "#edeff0",
    colorBgContainer: "#ffffff",
    colorBorder: "#e4e4e4",
    colorText: "#32363a",
    colorTextSecondary: "#6a6d70",
    controlHeight: 36,
  },
  components: {
    Button: {
      borderRadius: 4,
      controlHeight: 36,
    },
    Input: {
      borderRadius: 4,
      controlHeight: 36,
    },
    Select: {
      borderRadius: 4,
      controlHeight: 36,
    },
    Table: {
      borderRadius: 0,
      headerBg: "#f5f6f7",
      headerColor: "#6a6d70",
      rowHoverBg: "#f8f9fa",
    },
    Card: {
      borderRadiusLG: 8,
    },
    Tabs: {
      itemColor: "#6a6d70",
      itemSelectedColor: "#0a6ed1",
      inkBarColor: "#0a6ed1",
    },
    Tag: {
      borderRadiusSM: 100,
    },
  },
};

function App() {
  return (
    <ConfigProvider locale={ruRU} theme={theme}>
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route path="/auth/callback" element={<AuthCallback />} />
            <Route element={<ProtectedRoute />}>
              <Route path="/" element={<Layout />}>
                <Route index element={<Navigate to="/assets" replace />} />
                <Route path="assets" element={<AssetListPage />} />
                <Route path="archived-assets" element={<AssetListPage archived />} />
                <Route path="assets/:id" element={<AssetDetailPage />} />
                <Route path="archived-assets/:id" element={<AssetDetailPage archived />} />
                <Route path="references" element={<ReferencesLayout />}>
                  <Route index element={<Navigate to="organizations" replace />} />
                  <Route path="organizations" element={<OrganizationsPage />} />
                  <Route path="projects" element={<ProjectsPage />} />
                  <Route path="asset-types" element={<AssetTypesPage />} />
                  <Route path="asset-types/:id" element={<AssetTypeDetailPage />} />
                  <Route path="currencies" element={<CurrenciesPage />} />
                  <Route path="renewal-periods" element={<RenewalPeriodsPage />} />
                </Route>
                <Route path="notifications" element={<NotificationsPage />} />
                <Route path="profile" element={<ProfilePage />} />
                <Route path="users" element={<UsersPage />} />
                <Route path="audit" element={<AuditPage />} />
                <Route path="settings" element={<SettingsPage />} />
              </Route>
            </Route>
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </ConfigProvider>
  );
}

export default App;
