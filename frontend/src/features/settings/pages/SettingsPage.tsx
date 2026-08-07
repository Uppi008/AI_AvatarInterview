import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { z } from "zod";

import { Alert } from "@/components/ui/Alert";
import { AvatarButton } from "@/components/ui/Avatar";
import { Button } from "@/components/ui/Button";
import { Card, CardHeader, CardTitle } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { ThemeToggle } from "@/components/ThemeToggle";
import { authApi } from "@/features/auth/authApi";
import type { StudentProfile } from "@/features/auth/types";
import { DashboardLayout } from "@/layouts/DashboardLayout";
import { getApiErrorMessage } from "@/services/apiClient";

const profileSchema = z.object({
  full_name: z.string().min(2, "Enter your full name."),
  phone_number: z.string().optional(),
  institution: z.string().optional(),
  graduation_year: z.string().optional(),
  bio: z.string().optional(),
});

const passwordSchema = z
  .object({
    old_password: z.string().min(1, "Current password is required."),
    new_password: z.string().min(8, "Password must be at least 8 characters."),
    new_password_confirm: z.string(),
  })
  .refine((data) => data.new_password === data.new_password_confirm, {
    message: "Passwords do not match.",
    path: ["new_password_confirm"],
  });

type ProfileFormValues = z.infer<typeof profileSchema>;
type PasswordFormValues = z.infer<typeof passwordSchema>;

export function SettingsPage() {
  const { t } = useTranslation();
  const [profile, setProfile] = useState<StudentProfile | null>(null);
  const [profileMessage, setProfileMessage] = useState<string | null>(null);
  const [passwordMessage, setPasswordMessage] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const photoInputRef = useRef<HTMLInputElement>(null);

  const profileForm = useForm<ProfileFormValues>({ resolver: zodResolver(profileSchema) });
  const passwordForm = useForm<PasswordFormValues>({ resolver: zodResolver(passwordSchema) });

  useEffect(() => {
    void authApi.getMe().then(({ data }) => {
      setProfile(data);
      profileForm.reset({
        full_name: data.user.full_name,
        phone_number: data.phone_number,
        institution: data.institution,
        graduation_year: data.graduation_year ? String(data.graduation_year) : "",
        bio: data.bio,
      });
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const onSaveProfile = async (values: ProfileFormValues) => {
    setProfileMessage(null);
    const { data } = await authApi.updateMe({
      user: { full_name: values.full_name } as StudentProfile["user"],
      phone_number: values.phone_number,
      institution: values.institution,
      graduation_year: values.graduation_year ? Number(values.graduation_year) : null,
      bio: values.bio,
    });
    setProfile(data);
    setProfileMessage("Profile updated.");
  };

  const onPhotoSelected = async (file: File) => {
    const formData = new FormData();
    formData.append("profile_photo", file);
    const { data } = await authApi.updateMe(formData);
    setProfile(data);
  };

  const onChangePassword = async (values: PasswordFormValues) => {
    setPasswordError(null);
    setPasswordMessage(null);
    try {
      await authApi.changePassword(values.old_password, values.new_password);
      setPasswordMessage("Password changed successfully.");
      passwordForm.reset();
    } catch (err) {
      setPasswordError(getApiErrorMessage(err));
    }
  };

  return (
    <DashboardLayout>
      <div className="flex flex-col gap-6">
        <Card>
          <CardHeader>
            <CardTitle>{t("nav.settings")}</CardTitle>
          </CardHeader>

          <div className="mb-6 flex items-center gap-4">
            <AvatarButton
              src={profile?.profile_photo}
              name={profile?.user.full_name}
              size="lg"
              onClick={() => photoInputRef.current?.click()}
              aria-label="Change photo"
            />
            <div>
              <Button variant="outline" size="sm" onClick={() => photoInputRef.current?.click()}>
                Change photo
              </Button>
              <input
                ref={photoInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) void onPhotoSelected(file);
                  e.target.value = "";
                }}
              />
            </div>
          </div>

          <form onSubmit={profileForm.handleSubmit(onSaveProfile)} className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Input label={t("common.fullName")} {...profileForm.register("full_name")} error={profileForm.formState.errors.full_name?.message} />
            <Input label="Phone number" {...profileForm.register("phone_number")} />
            <Input label="Institution" {...profileForm.register("institution")} />
            <Input label="Graduation year" type="number" {...profileForm.register("graduation_year")} />
            <div className="sm:col-span-2">
              <label className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">Bio</label>
              <textarea
                {...profileForm.register("bio")}
                rows={3}
                className="w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
              />
            </div>
            {profileMessage && (
              <div className="sm:col-span-2">
                <Alert tone="success">{profileMessage}</Alert>
              </div>
            )}
            <div className="sm:col-span-2">
              <Button type="submit" isLoading={profileForm.formState.isSubmitting}>
                {t("common.save")}
              </Button>
            </div>
          </form>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Appearance & language</CardTitle>
          </CardHeader>
          <div className="flex items-center justify-between">
            <span className="text-sm text-slate-600 dark:text-slate-300">Dark mode</span>
            <ThemeToggle />
          </div>
          <div className="mt-4 flex items-center justify-between">
            <span className="text-sm text-slate-600 dark:text-slate-300">Language</span>
            <LanguageSwitcher />
          </div>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Change password</CardTitle>
          </CardHeader>
          <form onSubmit={passwordForm.handleSubmit(onChangePassword)} className="flex flex-col gap-4 sm:max-w-sm">
            <Input
              label="Current password"
              type="password"
              {...passwordForm.register("old_password")}
              error={passwordForm.formState.errors.old_password?.message}
            />
            <Input
              label={t("auth.newPassword")}
              type="password"
              {...passwordForm.register("new_password")}
              error={passwordForm.formState.errors.new_password?.message}
            />
            <Input
              label={t("auth.confirmPassword")}
              type="password"
              {...passwordForm.register("new_password_confirm")}
              error={passwordForm.formState.errors.new_password_confirm?.message}
            />
            {passwordError && <Alert tone="error">{passwordError}</Alert>}
            {passwordMessage && <Alert tone="success">{passwordMessage}</Alert>}
            <Button type="submit" isLoading={passwordForm.formState.isSubmitting} className="w-full">
              {t("common.save")}
            </Button>
          </form>
        </Card>
      </div>
    </DashboardLayout>
  );
}
