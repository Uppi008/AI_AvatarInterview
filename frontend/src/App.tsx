import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";

import { ProtectedRoute } from "@/components/ProtectedRoute";
import { Spinner } from "@/components/ui/Spinner";
import { AuthPage } from "@/features/auth/pages/AuthPage";
import { ForgotPasswordPage } from "@/features/auth/pages/ForgotPasswordPage";
import { ResetPasswordPage } from "@/features/auth/pages/ResetPasswordPage";
import { VerifyEmailPage } from "@/features/auth/pages/VerifyEmailPage";
import { DashboardPage } from "@/features/dashboard/pages/DashboardPage";
import { InterviewsPage } from "@/features/interviews/pages/InterviewsPage";
import { ResumePage } from "@/features/resume/pages/ResumePage";
import { SettingsPage } from "@/features/settings/pages/SettingsPage";
import { useAuthBootstrap } from "@/hooks/useAuthBootstrap";
import { useTheme } from "@/hooks/useTheme";

export default function App() {
  useTheme();
  const initialized = useAuthBootstrap();

  if (!initialized) {
    return (
      <div className="flex h-screen items-center justify-center bg-white dark:bg-slate-950">
        <Spinner />
      </div>
    );
  }

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<AuthPage />} />
        <Route path="/register" element={<AuthPage />} />
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
        <Route path="/reset-password" element={<ResetPasswordPage />} />
        <Route path="/verify-email" element={<VerifyEmailPage />} />

        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <DashboardPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/interviews"
          element={
            <ProtectedRoute>
              <InterviewsPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/resume"
          element={
            <ProtectedRoute>
              <ResumePage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/settings"
          element={
            <ProtectedRoute>
              <SettingsPage />
            </ProtectedRoute>
          }
        />

        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
