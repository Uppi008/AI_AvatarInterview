import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { z } from "zod";

import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { AuthLayout } from "@/layouts/AuthLayout";
import { getApiErrorMessage } from "@/services/apiClient";

import { authApi } from "../authApi";

const schema = z.object({
  email: z.string().min(1, "Email is required").email("Enter a valid email address."),
});

type FormValues = z.infer<typeof schema>;

export function ForgotPasswordPage() {
  const { t } = useTranslation();
  const [sent, setSent] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({ resolver: zodResolver(schema) });

  const onSubmit = async (values: FormValues) => {
    setFormError(null);
    try {
      await authApi.forgotPassword(values.email);
      setSent(true);
    } catch (error) {
      setFormError(getApiErrorMessage(error));
    }
  };

  return (
    <AuthLayout>
      <div className="flex min-h-[calc(100vh-72px)] items-center justify-center px-6">
        <div className="w-full max-w-sm">
          <h2 className="mb-1 text-2xl font-bold text-slate-900 dark:text-white">{t("auth.resetTitle")}</h2>
          <p className="mb-8 text-sm text-slate-500 dark:text-slate-400">{t("auth.resetSubtitle")}</p>

          {sent ? (
            <div className="rounded-xl border border-green-200 bg-green-50 p-5 text-sm text-green-800 dark:border-green-900 dark:bg-green-950/40 dark:text-green-300">
              If that email exists, a reset link is on its way.
            </div>
          ) : (
            <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4" noValidate>
              <Input
                label={t("common.email")}
                type="email"
                autoComplete="email"
                error={errors.email?.message}
                {...register("email")}
              />
              {formError && <p className="text-sm text-red-600 dark:text-red-400">{formError}</p>}
              <Button type="submit" isLoading={isSubmitting} className="mt-2 w-full">
                {t("auth.sendResetLink")}
              </Button>
            </form>
          )}

          <p className="mt-6 text-center text-sm">
            <Link to="/login" className="font-medium text-brand-600 hover:underline">
              {t("auth.backToLogin")}
            </Link>
          </p>
        </div>
      </div>
    </AuthLayout>
  );
}
