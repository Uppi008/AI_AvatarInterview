import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { z } from "zod";

import { useAppDispatch } from "@/app/hooks";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { register as registerUser } from "@/features/auth/authSlice";

const schema = z
  .object({
    full_name: z.string().min(2, "Enter your full name."),
    email: z.string().min(1, "Email is required").email("Enter a valid email address."),
    password: z.string().min(8, "Password must be at least 8 characters."),
    password_confirm: z.string(),
  })
  .refine((data) => data.password === data.password_confirm, {
    message: "Passwords do not match.",
    path: ["password_confirm"],
  });

type FormValues = z.infer<typeof schema>;

export function RegisterForm() {
  const { t } = useTranslation();
  const dispatch = useAppDispatch();
  const [formError, setFormError] = useState<string | null>(null);
  const [registered, setRegistered] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({ resolver: zodResolver(schema) });

  const onSubmit = async (values: FormValues) => {
    setFormError(null);
    const result = await dispatch(registerUser(values));
    if (registerUser.fulfilled.match(result)) {
      setRegistered(true);
    } else {
      setFormError(result.payload ?? "Registration failed.");
    }
  };

  if (registered) {
    return (
      <Alert tone="success" className="p-5">
        Check your inbox — we've sent a verification link to finish creating your account.
      </Alert>
    );
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4" noValidate>
      <Input
        label={t("common.fullName")}
        autoComplete="name"
        error={errors.full_name?.message}
        {...register("full_name")}
      />
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
        autoComplete="new-password"
        error={errors.password?.message}
        {...register("password")}
      />
      <Input
        label={t("auth.confirmPassword")}
        type="password"
        autoComplete="new-password"
        error={errors.password_confirm?.message}
        {...register("password_confirm")}
      />

      {formError && <p className="text-sm text-red-600 dark:text-red-400">{formError}</p>}

      <Button type="submit" isLoading={isSubmitting} className="mt-2 w-full">
        {t("auth.signUp")}
      </Button>
    </form>
  );
}
