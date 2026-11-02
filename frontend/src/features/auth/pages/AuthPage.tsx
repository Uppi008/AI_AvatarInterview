import { useTranslation } from "react-i18next";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";

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
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
            className="w-full max-w-md rounded-3xl border border-white/70 bg-white/75 p-8 shadow-[inset_0_1px_0_rgba(255,255,255,0.9),0_30px_70px_-30px_rgba(49,46,129,0.35)] backdrop-blur-2xl dark:border-white/[0.07] dark:bg-slate-900/70 dark:shadow-[0_30px_70px_-30px_rgba(0,0,0,0.8)] sm:p-10"
          >
            <div className="mb-8 flex rounded-xl bg-slate-100/80 p-1 dark:bg-slate-800/70">
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
          </motion.div>
        </div>
      </div>
    </AuthLayout>
  );
}
