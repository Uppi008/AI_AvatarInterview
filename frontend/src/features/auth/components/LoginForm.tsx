import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { Link, useNavigate } from "react-router-dom";
import { z } from "zod";

import { useAppDispatch } from "@/app/hooks";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { login } from "@/features/auth/authSlice";

const schema = z.object({
  email: z.string().min(1, "Email is required").email("Enter a valid email address."),
  password: z.string().min(1, "Password is required"),
});

type FormValues = z.infer<typeof schema>;

export function LoginForm() {
  const { t } = useTranslation();
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const [formError, setFormError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({ resolver: zodResolver(schema) });

  const onSubmit = async (values: FormValues) => {
    setFormError(null);
    const result = await dispatch(login(values));
    if (login.fulfilled.match(result)) {
      navigate("/dashboard");
    } else {
      setFormError(result.payload ?? "Login failed.");
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4" noValidate>
      <Input
        label={t("common.email")}
        type="email"
        autoComplete="email"
        error={errors.email?.message}
        {...register("email")}
      />
      <Input
        label={t("common.password")}
        type="password"
        autoComplete="current-password"
        error={errors.password?.message}
        {...register("password")}
      />

      <div className="flex justify-end">
        <Link to="/forgot-password" className="text-sm font-medium text-brand-600 hover:underline">
          {t("auth.forgotPassword")}
        </Link>
      </div>

      {formError && <p className="text-sm text-red-600 dark:text-red-400">{formError}</p>}

      <Button type="submit" isLoading={isSubmitting} className="mt-2 w-full">
        {t("auth.logIn")}
      </Button>
    </form>
  );
}
