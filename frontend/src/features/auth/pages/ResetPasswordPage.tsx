import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { z } from "zod";

import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { AuthLayout } from "@/layouts/AuthLayout";
import { getApiErrorMessage } from "@/services/apiClient";

import { authApi } from "../authApi";

const schema = z.object({
  new_password: z.string().min(8, "Password must be at least 8 characters."),
});

type FormValues = z.infer<typeof schema>;

export function ResetPasswordPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token") ?? "";
  const [formError, setFormError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({ resolver: zodResolver(schema) });

  const onSubmit = async (values: FormValues) => {
    setFormError(null);
    try {
      await authApi.resetPassword(token, values.new_password);
      navigate("/login");
    } catch (error) {
      setFormError(getApiErrorMessage(error));
    }
  };

  return (
    <AuthLayout>
      <div className="flex min-h-[calc(100vh-72px)] items-center justify-center px-6">
        <div className="w-full max-w-sm">
          <h2 className="mb-1 text-2xl font-bold text-slate-900 dark:text-white">
            {t("auth.resetPasswordTitle")}
          </h2>

          {!token ? (
            <p className="mt-4 text-sm text-red-600 dark:text-red-400">{t("auth.verifyFailure")}</p>
          ) : (
            <form onSubmit={handleSubmit(onSubmit)} className="mt-8 flex flex-col gap-4" noValidate>
              <Input
                label={t("auth.newPassword")}
                type="password"
                autoComplete="new-password"
                error={errors.new_password?.message}
                {...register("new_password")}
              />
              {formError && <p className="text-sm text-red-600 dark:text-red-400">{formError}</p>}
              <Button type="submit" isLoading={isSubmitting} className="mt-2 w-full">
                {t("common.save")}
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
