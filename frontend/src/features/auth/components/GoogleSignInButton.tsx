import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";

import { useAppDispatch } from "@/app/hooks";
import { useTheme } from "@/hooks/useTheme";

import { googleLogin } from "../authSlice";

const CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID;
const GIS_SRC = "https://accounts.google.com/gsi/client";

interface GoogleIdApi {
  initialize: (config: { client_id: string; callback: (response: { credential: string }) => void }) => void;
  renderButton: (el: HTMLElement, options: Record<string, unknown>) => void;
}

declare global {
  interface Window {
    google?: { accounts: { id: GoogleIdApi } };
  }
}

let scriptPromise: Promise<void> | null = null;

function loadGoogleScript(): Promise<void> {
  if (window.google?.accounts) return Promise.resolve();
  scriptPromise ??= new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = GIS_SRC;
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => {
      scriptPromise = null;
      reject(new Error("Google sign-in couldn't load."));
    };
    document.head.appendChild(script);
  });
  return scriptPromise;
}

/** "Continue with Google". Renders nothing unless VITE_GOOGLE_CLIENT_ID is set. */
export function GoogleSignInButton() {
  const { t } = useTranslation();
  const { theme } = useTheme();
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const containerRef = useRef<HTMLDivElement>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!CLIENT_ID) return;
    let cancelled = false;
    loadGoogleScript()
      .then(() => {
        const container = containerRef.current;
        if (cancelled || !container || !window.google) return;
        window.google.accounts.id.initialize({
          client_id: CLIENT_ID,
          callback: async ({ credential }) => {
            setError(null);
            const result = await dispatch(googleLogin(credential));
            if (googleLogin.fulfilled.match(result)) navigate("/dashboard");
            else setError(result.payload ?? "Google sign-in failed.");
          },
        });
        container.innerHTML = "";
        window.google.accounts.id.renderButton(container, {
          theme: theme === "dark" ? "filled_black" : "outline",
          size: "large",
          shape: "pill",
          text: "continue_with",
          width: Math.min(container.offsetWidth || 320, 400),
        });
      })
      .catch((err: Error) => !cancelled && setError(err.message));
    return () => {
      cancelled = true;
    };
  }, [dispatch, navigate, theme]);

  if (!CLIENT_ID) return null;

  return (
    <div className="mt-5 flex flex-col gap-3">
      <div className="flex items-center gap-3 text-xs font-medium uppercase tracking-wide text-slate-400">
        <span className="h-px flex-1 bg-slate-200 dark:bg-slate-700" />
        {t("auth.or", "or")}
        <span className="h-px flex-1 bg-slate-200 dark:bg-slate-700" />
      </div>
      <div ref={containerRef} className="flex min-h-[44px] justify-center" />
      {error && <p className="text-center text-sm text-red-600 dark:text-red-400">{error}</p>}
    </div>
  );
}
