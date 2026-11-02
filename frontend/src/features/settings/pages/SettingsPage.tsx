import { zodResolver } from "@hookform/resolvers/zod";
import { motion } from "framer-motion";
import {
  BadgeCheck,
  Camera,
  Eye,
  EyeOff,
  Globe,
  KeyRound,
  Mail,
  Moon,
  Palette,
  ShieldCheck,
  Sun,
  UserRound,
} from "lucide-react";
import { type ComponentProps, type ReactNode, forwardRef, useEffect, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { z } from "zod";

import { PageHero } from "@/components/fx/PageHero";
import { Alert } from "@/components/ui/Alert";
import { Avatar } from "@/components/ui/Avatar";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { authApi } from "@/features/auth/authApi";
import type { StudentProfile } from "@/features/auth/types";
import { useTheme } from "@/hooks/useTheme";
import { DashboardLayout } from "@/layouts/DashboardLayout";
import { getApiErrorMessage } from "@/services/apiClient";
import { cn } from "@/utils/cn";

const BIO_MAX = 500;
const CURRENT_YEAR = new Date().getFullYear();

const profileSchema = z.object({
  full_name: z.string().trim().min(2, "Enter your full name."),
  phone_number: z.string().max(20, "Phone number is too long.").optional(),
  institution: z.string().max(255).optional(),
  graduation_year: z
    .string()
    .optional()
    .refine(
      (v) => !v || (/^\d{4}$/.test(v) && Number(v) >= 1950 && Number(v) <= CURRENT_YEAR + 10),
      "Enter a valid year."
    ),
  bio: z.string().max(BIO_MAX, `Keep your bio under ${BIO_MAX} characters.`).optional(),
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

const fadeUp = (delay = 0) => ({
  initial: { opacity: 0, y: 14 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.4, ease: "easeOut" as const, delay },
});

function SectionHeader({ icon, title, description }: { icon: ReactNode; title: string; description: string }) {
  return (
    <div className="mb-6 flex items-start gap-3.5">
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-600 ring-1 ring-inset ring-brand-600/10 dark:bg-brand-900/40 dark:text-brand-300">
        {icon}
      </span>
      <div>
        <h2 className="text-base font-semibold text-slate-900 dark:text-white">{title}</h2>
        <p className="mt-0.5 text-sm text-slate-500 dark:text-slate-400">{description}</p>
      </div>
    </div>
  );
}

const PasswordField = forwardRef<
  HTMLInputElement,
  { label: string; error?: string } & ComponentProps<typeof Input>
>(({ label, error, ...props }, ref) => {
  const [visible, setVisible] = useState(false);
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={props.name} className="text-sm font-medium text-slate-700 dark:text-slate-300">
        {label}
      </label>
      <div className="relative">
        {/* The error text is rendered below the wrapper (not by Input) so the
            eye button stays vertically centered on the input itself. */}
        <Input
          ref={ref}
          {...props}
          type={visible ? "text" : "password"}
          className={cn(
            "w-full pr-11",
            error && "border-red-400 focus:border-red-500 focus:ring-red-500/20"
          )}
          aria-invalid={Boolean(error)}
        />
        <button
          type="button"
          onClick={() => setVisible((v) => !v)}
          aria-label={visible ? "Hide password" : "Show password"}
          className="absolute inset-y-0 right-0 flex w-11 items-center justify-center text-slate-400 transition-colors hover:text-slate-600 dark:hover:text-slate-200"
        >
          {visible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
        </button>
      </div>
      {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}
    </div>
  );
});
PasswordField.displayName = "PasswordField";

function passwordStrength(password: string): { score: number; label: string } {
  if (!password) return { score: 0, label: "" };
  let score = 0;
  if (password.length >= 8) score++;
  if (/[a-z]/.test(password) && /[A-Z]/.test(password)) score++;
  if (/\d/.test(password)) score++;
  if (/[^A-Za-z0-9]/.test(password)) score++;
  return { score, label: ["Too weak", "Weak", "Fair", "Good", "Strong"][score] };
}

const STRENGTH_COLORS = ["bg-red-500", "bg-red-500", "bg-amber-500", "bg-lime-500", "bg-emerald-500"];

export function SettingsPage() {
  const { t } = useTranslation();
  const { theme, toggleTheme } = useTheme();
  const [profile, setProfile] = useState<StudentProfile | null>(null);
  const [profileMessage, setProfileMessage] = useState<string | null>(null);
  const [profileError, setProfileError] = useState<string | null>(null);
  const [photoUploading, setPhotoUploading] = useState(false);
  const [passwordMessage, setPasswordMessage] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const photoInputRef = useRef<HTMLInputElement>(null);

  const profileForm = useForm<ProfileFormValues>({ resolver: zodResolver(profileSchema) });
  const passwordForm = useForm<PasswordFormValues>({ resolver: zodResolver(passwordSchema) });

  const bioLength = profileForm.watch("bio")?.length ?? 0;
  const strength = passwordStrength(passwordForm.watch("new_password") ?? "");

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
    setProfileError(null);
    try {
      const { data } = await authApi.updateMe({
        user: { full_name: values.full_name } as StudentProfile["user"],
        phone_number: values.phone_number,
        institution: values.institution,
        graduation_year: values.graduation_year ? Number(values.graduation_year) : null,
        bio: values.bio,
      });
      setProfile(data);
      profileForm.reset(values);
      setProfileMessage("Profile updated.");
    } catch (err) {
      setProfileError(getApiErrorMessage(err));
    }
  };

  const onPhotoSelected = async (file: File) => {
    setProfileError(null);
    setPhotoUploading(true);
    try {
      const formData = new FormData();
      formData.append("profile_photo", file);
      const { data } = await authApi.updateMe(formData);
      setProfile(data);
    } catch (err) {
      setProfileError(getApiErrorMessage(err, "Couldn't upload that photo."));
    } finally {
      setPhotoUploading(false);
    }
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

  const isDark = theme === "dark";
  const user = profile?.user;
  const { errors: profileErrors, isDirty, isSubmitting: profileSaving } = profileForm.formState;

  return (
    <DashboardLayout>
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-6">
        {/* Profile hero */}
        <PageHero
          eyebrow={t("nav.settings")}
          title={user?.full_name || " "}
          leading={
            <>
              <button
                type="button"
                onClick={() => photoInputRef.current?.click()}
                aria-label="Change photo"
                className="group relative h-24 w-24 shrink-0 rounded-full ring-4 ring-white/25 transition hover:ring-white/50"
              >
                <Avatar src={profile?.profile_photo} name={user?.full_name} className="h-full w-full text-3xl" />
                <span className="absolute inset-0 flex items-center justify-center rounded-full bg-black/0 text-white opacity-0 transition group-hover:bg-black/40 group-hover:opacity-100">
                  <Camera className="h-6 w-6" />
                </span>
                <span className="absolute -bottom-0.5 -right-0.5 flex h-8 w-8 items-center justify-center rounded-full bg-white text-brand-700 shadow-md">
                  {photoUploading ? (
                    <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                  ) : (
                    <Camera className="h-4 w-4" />
                  )}
                </span>
              </button>
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
            </>
          }
        >
          <div className="flex flex-wrap items-center gap-2">
            {user?.email && (
              <span className="inline-flex max-w-full items-center gap-1.5 truncate rounded-full bg-white/15 px-3 py-1 text-xs font-medium ring-1 ring-inset ring-white/25 backdrop-blur-sm">
                <Mail className="h-3.5 w-3.5 shrink-0" />
                <span className="truncate">{user.email}</span>
              </span>
            )}
            {user && (
              <span
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium ring-1 ring-inset backdrop-blur-sm",
                  user.is_email_verified
                    ? "bg-emerald-400/20 text-emerald-50 ring-emerald-300/40"
                    : "bg-amber-400/20 text-amber-50 ring-amber-300/40"
                )}
              >
                <BadgeCheck className="h-3.5 w-3.5" />
                {user.is_email_verified ? "Verified" : "Email not verified"}
              </span>
            )}
          </div>
        </PageHero>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-5">
          {/* Profile form */}
          <motion.div {...fadeUp(0.05)} className="lg:col-span-3">
            <Card className="h-full p-6 sm:p-8">
              <SectionHeader
                icon={<UserRound className="h-5 w-5" />}
                title="Personal information"
                description="This is how you appear across your interviews and reports."
              />
              <form onSubmit={profileForm.handleSubmit(onSaveProfile)} className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                <div className="sm:col-span-2">
                  <Input
                    label={t("common.fullName")}
                    placeholder="Your full name"
                    {...profileForm.register("full_name")}
                    error={profileErrors.full_name?.message}
                  />
                </div>
                <Input
                  label="Phone number"
                  type="tel"
                  placeholder="+91 98765 43210"
                  {...profileForm.register("phone_number")}
                  error={profileErrors.phone_number?.message}
                />
                <Input
                  label="Graduation year"
                  inputMode="numeric"
                  placeholder={String(CURRENT_YEAR)}
                  {...profileForm.register("graduation_year")}
                  error={profileErrors.graduation_year?.message}
                />
                <div className="sm:col-span-2">
                  <Input
                    label="Institution"
                    placeholder="College or university"
                    {...profileForm.register("institution")}
                    error={profileErrors.institution?.message}
                  />
                </div>
                <div className="sm:col-span-2">
                  <div className="mb-1.5 flex items-baseline justify-between">
                    <label htmlFor="bio" className="text-sm font-medium text-slate-700 dark:text-slate-300">
                      Bio
                    </label>
                    <span className={cn("text-xs", bioLength > BIO_MAX ? "text-red-600" : "text-slate-400")}>
                      {bioLength}/{BIO_MAX}
                    </span>
                  </div>
                  <textarea
                    id="bio"
                    {...profileForm.register("bio")}
                    rows={4}
                    placeholder="A line or two about your goals, skills, or the roles you're preparing for."
                    className="w-full resize-y rounded-lg border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
                  />
                  {profileErrors.bio && <p className="mt-1.5 text-sm text-red-600 dark:text-red-400">{profileErrors.bio.message}</p>}
                </div>

                {(profileMessage || profileError) && (
                  <div className="sm:col-span-2">
                    {profileError ? <Alert tone="error">{profileError}</Alert> : <Alert tone="success">{profileMessage}</Alert>}
                  </div>
                )}

                <div className="flex items-center justify-end gap-3 border-t border-slate-100 pt-5 sm:col-span-2 dark:border-slate-800">
                  {isDirty && <span className="mr-auto text-xs text-slate-500 dark:text-slate-400">Unsaved changes</span>}
                  <Button
                    type="button"
                    variant="ghost"
                    disabled={!isDirty || profileSaving}
                    onClick={() => profileForm.reset()}
                  >
                    Cancel
                  </Button>
                  <Button type="submit" isLoading={profileSaving} disabled={!isDirty}>
                    {t("common.save")}
                  </Button>
                </div>
              </form>
            </Card>
          </motion.div>

          <div className="flex flex-col gap-6 lg:col-span-2">
            {/* Appearance & language */}
            <motion.div {...fadeUp(0.1)}>
              <Card className="p-6 sm:p-8">
                <SectionHeader
                  icon={<Palette className="h-5 w-5" />}
                  title="Appearance & language"
                  description="Personalize how the app looks and speaks."
                />
                <div className="divide-y divide-slate-100 dark:divide-slate-800">
                  <div className="flex items-center justify-between gap-4 pb-4">
                    <div className="flex items-center gap-3">
                      {isDark ? <Moon className="h-4 w-4 text-slate-400" /> : <Sun className="h-4 w-4 text-amber-500" />}
                      <div>
                        <p className="text-sm font-medium text-slate-900 dark:text-slate-100">Dark mode</p>
                        <p className="text-xs text-slate-500 dark:text-slate-400">{isDark ? "On" : "Off"}</p>
                      </div>
                    </div>
                    <button
                      type="button"
                      role="switch"
                      aria-checked={isDark}
                      aria-label="Toggle dark mode"
                      onClick={toggleTheme}
                      className={cn(
                        "relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600",
                        isDark ? "bg-brand-600" : "bg-slate-300"
                      )}
                    >
                      <span
                        className={cn(
                          "inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform",
                          isDark ? "translate-x-5.5" : "translate-x-0.5"
                        )}
                      />
                    </button>
                  </div>
                  <div className="flex flex-wrap items-center justify-between gap-4 pt-4">
                    <div className="flex items-center gap-3">
                      <Globe className="h-4 w-4 text-slate-400" />
                      <div>
                        <p className="text-sm font-medium text-slate-900 dark:text-slate-100">Language</p>
                        <p className="text-xs text-slate-500 dark:text-slate-400">English, Hindi, or Telugu</p>
                      </div>
                    </div>
                    <LanguageSwitcher />
                  </div>
                </div>
              </Card>
            </motion.div>

            {/* Security */}
            <motion.div {...fadeUp(0.15)} className="flex-1">
              <Card className="h-full p-6 sm:p-8">
                <SectionHeader
                  icon={<ShieldCheck className="h-5 w-5" />}
                  title="Security"
                  description="Use a strong password you don't use anywhere else."
                />
                <form onSubmit={passwordForm.handleSubmit(onChangePassword)} className="flex flex-col gap-4">
                  <PasswordField
                    label="Current password"
                    autoComplete="current-password"
                    {...passwordForm.register("old_password")}
                    error={passwordForm.formState.errors.old_password?.message}
                  />
                  <div>
                    <PasswordField
                      label={t("auth.newPassword")}
                      autoComplete="new-password"
                      {...passwordForm.register("new_password")}
                      error={passwordForm.formState.errors.new_password?.message}
                    />
                    {strength.label && (
                      <div className="mt-2">
                        <div className="flex gap-1">
                          {[1, 2, 3, 4].map((i) => (
                            <span
                              key={i}
                              className={cn(
                                "h-1.5 flex-1 rounded-full transition-colors",
                                i <= strength.score ? STRENGTH_COLORS[strength.score] : "bg-slate-200 dark:bg-slate-700"
                              )}
                            />
                          ))}
                        </div>
                        <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{strength.label}</p>
                      </div>
                    )}
                  </div>
                  <PasswordField
                    label={t("auth.confirmPassword")}
                    autoComplete="new-password"
                    {...passwordForm.register("new_password_confirm")}
                    error={passwordForm.formState.errors.new_password_confirm?.message}
                  />
                  {passwordError && <Alert tone="error">{passwordError}</Alert>}
                  {passwordMessage && <Alert tone="success">{passwordMessage}</Alert>}
                  <Button type="submit" isLoading={passwordForm.formState.isSubmitting} className="mt-1 w-full">
                    <KeyRound className="h-4 w-4" />
                    Update password
                  </Button>
                </form>
              </Card>
            </motion.div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
