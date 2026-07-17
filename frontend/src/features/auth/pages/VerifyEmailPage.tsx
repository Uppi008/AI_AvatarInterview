import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Link, useSearchParams } from "react-router-dom";
import { CheckCircle2, XCircle } from "lucide-react";

import { AuthLayout } from "@/layouts/AuthLayout";
import { Spinner } from "@/components/ui/Spinner";

import { authApi } from "../authApi";

export function VerifyEmailPage() {
  const { t } = useTranslation();
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token") ?? "";
  const [status, setStatus] = useState<"verifying" | "success" | "error">("verifying");

  useEffect(() => {
    if (!token) {
      setStatus("error");
      return;
    }
    authApi
      .verifyEmail(token)
      .then(() => setStatus("success"))
      .catch(() => setStatus("error"));
  }, [token]);

  return (
    <AuthLayout>
      <div className="flex min-h-[calc(100vh-72px)] flex-col items-center justify-center px-6 text-center">
        {status === "verifying" && (
          <>
            <Spinner className="mb-4 h-8 w-8" />
            <p className="text-slate-600 dark:text-slate-300">{t("auth.verifyTitle")}</p>
          </>
        )}
        {status === "success" && (
          <>
            <CheckCircle2 className="mb-4 h-12 w-12 text-green-500" />
            <p className="mb-6 text-lg font-medium text-slate-900 dark:text-white">{t("auth.verifySuccess")}</p>
            <Link to="/login" className="font-medium text-brand-600 hover:underline">
              {t("auth.backToLogin")}
            </Link>
          </>
        )}
        {status === "error" && (
          <>
            <XCircle className="mb-4 h-12 w-12 text-red-500" />
            <p className="mb-6 text-lg font-medium text-slate-900 dark:text-white">{t("auth.verifyFailure")}</p>
            <Link to="/login" className="font-medium text-brand-600 hover:underline">
              {t("auth.backToLogin")}
            </Link>
          </>
        )}
      </div>
    </AuthLayout>
  );
}
