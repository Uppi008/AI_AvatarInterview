import { motion } from "framer-motion";
import { useTranslation } from "react-i18next";
import { BarChart3, Bot, CheckCircle2, Mic } from "lucide-react";

const points = ["auth.heroPoint1", "auth.heroPoint2", "auth.heroPoint3"] as const;

export function HeroSection() {
  const { t } = useTranslation();

  return (
    <div className="relative hidden h-full flex-col justify-center overflow-hidden bg-gradient-to-br from-brand-700 via-brand-600 to-indigo-800 px-12 py-16 text-white lg:flex">
      {/* Decorative floating orbs */}
      <motion.div
        className="absolute -right-24 -top-24 h-96 w-96 rounded-full bg-white/10 blur-3xl"
        animate={{ scale: [1, 1.15, 1] }}
        transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.div
        className="absolute -bottom-32 -left-16 h-80 w-80 rounded-full bg-brand-400/20 blur-3xl"
        animate={{ scale: [1, 1.1, 1] }}
        transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
      />

      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="relative z-10 max-w-lg"
      >
        <div className="mb-8 inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-1.5 text-sm font-medium backdrop-blur-sm">
          <Bot className="h-4 w-4" />
          AI_AvatarInterview
        </div>

        <h1 className="mb-4 text-4xl font-bold leading-tight tracking-tight">{t("auth.heroTitle")}</h1>
        <p className="mb-10 text-lg text-brand-100">{t("auth.heroSubtitle")}</p>

        <ul className="space-y-4">
          {points.map((key, i) => (
            <motion.li
              key={key}
              initial={{ opacity: 0, x: -12 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.4, delay: 0.2 + i * 0.1 }}
              className="flex items-start gap-3"
            >
              <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-brand-200" />
              <span className="text-brand-50">{t(key)}</span>
            </motion.li>
          ))}
        </ul>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.6 }}
          className="mt-12 flex items-center gap-6 rounded-2xl border border-white/15 bg-white/5 p-5 backdrop-blur-sm"
        >
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-white/15">
            <Mic className="h-6 w-6" />
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-1.5">
              {[...Array(3)].map((_, i) => (
                <motion.span
                  key={i}
                  className="h-6 w-1 rounded-full bg-white/70"
                  animate={{ scaleY: [0.4, 1, 0.4] }}
                  transition={{ duration: 1.2, repeat: Infinity, delay: i * 0.2 }}
                />
              ))}
            </div>
            <p className="mt-2 text-sm text-brand-100">{t("auth.listeningPlaceholder")}</p>
          </div>
          <BarChart3 className="h-5 w-5 text-brand-200" />
        </motion.div>
      </motion.div>
    </div>
  );
}
