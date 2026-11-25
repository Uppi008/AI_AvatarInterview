import { lazy, Suspense } from "react";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";

import { ProtectedRoute } from "@/components/ProtectedRoute";
import { Spinner } from "@/components/ui/Spinner";
import { useAuthBootstrap } from "@/hooks/useAuthBootstrap";
import { useTheme } from "@/hooks/useTheme";

// Each page is its own chunk, so the first load only downloads the page being opened.
const AuthPage = lazy(() => import("@/features/auth/pages/AuthPage").then((m) => ({ default: m.AuthPage })));
const ForgotPasswordPage = lazy(() => import("@/features/auth/pages/ForgotPasswordPage").then((m) => ({ default: m.ForgotPasswordPage })));
const ResetPasswordPage = lazy(() => import("@/features/auth/pages/ResetPasswordPage").then((m) => ({ default: m.ResetPasswordPage })));
const VerifyEmailPage = lazy(() => import("@/features/auth/pages/VerifyEmailPage").then((m) => ({ default: m.VerifyEmailPage })));
const AvatarSelectionPage = lazy(() => import("@/features/avatars/pages/AvatarSelectionPage").then((m) => ({ default: m.AvatarSelectionPage })));
const CareerLabPage = lazy(() => import("@/features/career/pages/CareerLabPage").then((m) => ({ default: m.CareerLabPage })));
const DashboardPage = lazy(() => import("@/features/dashboard/pages/DashboardPage").then((m) => ({ default: m.DashboardPage })));
const NotFoundPage = lazy(() => import("@/features/errors/pages/NotFoundPage").then((m) => ({ default: m.NotFoundPage })));
const InterviewSessionPage = lazy(() => import("@/features/interviews/pages/InterviewSessionPage").then((m) => ({ default: m.InterviewSessionPage })));
const CompareInterviewsPage = lazy(() => import("@/features/interviews/pages/CompareInterviewsPage").then((m) => ({ default: m.CompareInterviewsPage })));
const AdminStudentsPage = lazy(() => import("@/features/admin/pages/AdminStudentsPage").then((m) => ({ default: m.AdminStudentsPage })));
const SharedReportPage = lazy(() => import("@/features/reports/pages/SharedReportPage").then((m) => ({ default: m.SharedReportPage })));
const InterviewsPage = lazy(() => import("@/features/interviews/pages/InterviewsPage").then((m) => ({ default: m.InterviewsPage })));
const LiveInterviewPage = lazy(() => import("@/features/interviews/pages/LiveInterviewPage").then((m) => ({ default: m.LiveInterviewPage })));
const ReportPage = lazy(() => import("@/features/reports/pages/ReportPage").then((m) => ({ default: m.ReportPage })));
const ResumePage = lazy(() => import("@/features/resume/pages/ResumePage").then((m) => ({ default: m.ResumePage })));
const SettingsPage = lazy(() => import("@/features/settings/pages/SettingsPage").then((m) => ({ default: m.SettingsPage })));

function PageFallback() {
  return (
    <div className="flex h-screen items-center justify-center bg-slate-50 dark:bg-slate-950">
      <Spinner />
    </div>
  );
}

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
      <Suspense fallback={<PageFallback />}>
        <Routes>
          <Route path="/login" element={<AuthPage />} />
          <Route path="/register" element={<AuthPage />} />
          <Route path="/forgot-password" element={<ForgotPasswordPage />} />
          <Route path="/reset-password" element={<ResetPasswordPage />} />
          <Route path="/verify-email" element={<VerifyEmailPage />} />
          <Route path="/shared/report/:token" element={<SharedReportPage />} />

          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <DashboardPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/avatars"
            element={
              <ProtectedRoute>
                <AvatarSelectionPage />
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
            path="/interviews/compare"
            element={
              <ProtectedRoute>
                <CompareInterviewsPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin"
            element={
              <ProtectedRoute>
                <AdminStudentsPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/interviews/:id"
            element={
              <ProtectedRoute>
                <InterviewSessionPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/interviews/:id/live"
            element={
              <ProtectedRoute>
                <LiveInterviewPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/interviews/:id/report"
            element={
              <ProtectedRoute>
                <ReportPage />
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

          <Route
            path="/career-lab"
            element={
              <ProtectedRoute>
                <CareerLabPage />
              </ProtectedRoute>
            }
          />
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </Suspense>
    </BrowserRouter>
  );
}
