import { useTranslation } from "react-i18next";
import { Link, useLocation, useNavigate } from "react-router-dom";

import { AuthLayout } from "@/layouts/AuthLayout";
import { cn } from "@/utils/cn";

import { HeroSection } from "../components/HeroSection";
import { LoginForm } from "../components/LoginForm";
import { RegisterForm } from "../components/RegisterForm";

export function AuthPage() {
  const { t } = useTranslation();
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const mode: "login" | "register" = pathname === "/register" ? "register" : "login";

  return (
    <AuthLayout>
      <div className="grid min-h-[calc(100vh-72px)] lg:grid-cols-2">
        <HeroSection />

        <div className="flex items-center justify-center px-6 py-12">
          <div className="w-full max-w-sm">
            <div className="mb-8 flex rounded-xl bg-slate-100 p-1 dark:bg-slate-900">
              <button
                type="button"
                onClick={() => navigate("/login")}
                className={cn(
                  "flex-1 rounded-lg py-2 text-sm font-semibold transition-colors",
                  mode === "login"
                    ? "bg-white text-slate-900 shadow-sm dark:bg-slate-800 dark:text-white"
                    : "text-slate-500 dark:text-slate-400"
                )}
              >
                {t("auth.logIn")}
              </button>
              <button
                type="button"
                onClick={() => navigate("/register")}
                className={cn(
                  "flex-1 rounded-lg py-2 text-sm font-semibold transition-colors",
                  mode === "register"
                    ? "bg-white text-slate-900 shadow-sm dark:bg-slate-800 dark:text-white"
                    : "text-slate-500 dark:text-slate-400"
                )}
              >
                {t("auth.signUp")}
              </button>
            </div>

            <h2 className="mb-1 text-2xl font-bold text-slate-900 dark:text-white">
              {mode === "login" ? t("auth.loginTitle") : t("auth.signupTitle")}
            </h2>
            <p className="mb-8 text-sm text-slate-500 dark:text-slate-400">
              {mode === "login" ? t("auth.loginSubtitle") : t("auth.signupSubtitle")}
            </p>

            {mode === "login" ? <LoginForm /> : <RegisterForm />}

            <p className="mt-6 text-center text-sm text-slate-500 dark:text-slate-400">
              {mode === "login" ? (
                <>
                  {t("auth.noAccount")}{" "}
                  <Link to="/register" className="font-medium text-brand-600 hover:underline">
                    {t("auth.signUp")}
                  </Link>
                </>
              ) : (
                <>
                  {t("auth.haveAccount")}{" "}
                  <Link to="/login" className="font-medium text-brand-600 hover:underline">
                    {t("auth.logIn")}
                  </Link>
                </>
              )}
            </p>
          </div>
        </div>
      </div>
    </AuthLayout>
  );
}
