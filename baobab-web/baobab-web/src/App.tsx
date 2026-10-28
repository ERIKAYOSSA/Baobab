import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { I18nProvider } from "@/lib/i18n/I18nProvider";
import { AuthProvider } from "@/lib/auth/AuthProvider";
import { Toaster } from "@/components/ui/sonner";
import { TabsLayout } from "@/layouts/TabsLayout";
import { LandingPage } from "@/pages/LandingPage";
import { OnboardingPage } from "@/pages/OnboardingPage";
import { TreePage } from "@/pages/TreePage";
import { DiscoverPage } from "@/pages/DiscoverPage";
import { NotificationsPage } from "@/pages/NotificationsPage";
import { ProfilePage } from "@/pages/ProfilePage";
import { InvitePage } from "@/pages/InvitePage";
import { LoginPage } from "@/pages/LoginPage";

export default function App() {
  return (
    <I18nProvider>
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<LandingPage />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/onboarding" element={<OnboardingPage />} />
            <Route path="/invite/:code" element={<InvitePage />} />
            <Route element={<TabsLayout />}>
              <Route path="/tree" element={<TreePage />} />
              <Route path="/discover" element={<DiscoverPage />} />
              <Route path="/notifications" element={<NotificationsPage />} />
              <Route path="/me" element={<ProfilePage />} />
            </Route>
            <Route path="/profile" element={<Navigate to="/me" replace />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </BrowserRouter>
        <Toaster position="top-center" richColors />
      </AuthProvider>
    </I18nProvider>
  );
}
