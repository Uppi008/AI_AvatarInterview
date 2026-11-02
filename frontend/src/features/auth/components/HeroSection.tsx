import {
  motion,
  useMotionValue,
  useReducedMotion,
  useSpring,
  useTransform,
} from "framer-motion";
import { useTranslation } from "react-i18next";
import { Bot, CheckCircle2, Mic, Sparkles } from "lucide-react";

import {
  GlassCube,
  GlossySphere,
  OrbitRing,
} from "@/components/fx/FloatingShapes";

const points = [
  "auth.heroPoint1",
  "auth.heroPoint2",
  "auth.heroPoint3",
] as const;

const BARS = [
  { label: "Technical", value: 88 },
  { label: "Communication", value: 79 },
  { label: "Confidence", value: 84 },
];

/**
 * Left half of the auth screen: copy plus a parallax 3D scene of floating
 * glass panels (a sample scorecard and a live-question bubble). Layers sit at
 * different translateZ depths and shift by different amounts with the cursor.
 */
export function HeroSection() {
  const { t } = useTranslation();
  const reduceMotion = useReducedMotion();
  const mx = useMotionValue(0);
  const my = useMotionValue(0);
  const sx = useSpring(mx, { stiffness: 60, damping: 16 });
  const sy = useSpring(my, { stiffness: 60, damping: 16 });
  const sceneRotY = useTransform(sx, (v) => v * 18 - 14);
  const sceneRotX = useTransform(sy, (v) => v * -14 + 8);
  const farX = useTransform(sx, (v) => v * -40);
  const farY = useTransform(sy, (v) => v * -30);

  return (
    <div
      className="relative hidden h-full flex-col justify-center overflow-hidden bg-gradient-to-br from-brand-700 via-brand-600 to-indigo-900 px-12 py-16 text-white lg:flex"
      onPointerMove={(e) => {
        if (reduceMotion || e.pointerType !== "mouse") return;
        const rect = e.currentTarget.getBoundingClientRect();
        mx.set((e.clientX - rect.left) / rect.width - 0.5);
        my.set((e.clientY - rect.top) / rect.height - 0.5);
      }}
      onPointerLeave={() => {
        mx.set(0);
        my.set(0);
      }}
    >
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_1px_1px,rgba(255,255,255,0.12)_1px,transparent_0)] bg-[size:24px_24px]" />

      {/* Far layer: glows, orbit, cube */}
      <motion.div
        aria-hidden
        style={{ x: farX, y: farY }}
        className="pointer-events-none absolute inset-0"
      >
        <div className="absolute -right-24 -top-24 h-96 w-96 rounded-full bg-fuchsia-400/25 blur-3xl" />
        <div className="absolute -bottom-32 -left-16 h-80 w-80 rounded-full bg-sky-400/20 blur-3xl" />
        <OrbitRing
          size={260}
          className="absolute -right-10 bottom-10 opacity-60"
        />
        <GlassCube
          size={70}
          className="absolute right-[12%] top-[12%] opacity-80"
        />
        <GlossySphere
          size={44}
          className="absolute bottom-[18%] left-[46%] opacity-90"
        />
        <GlossySphere
          size={16}
          className="absolute left-[38%] top-[14%] opacity-80 [animation-delay:-3s]"
        />
      </motion.div>

      <div className="relative z-10 grid grid-cols-1 items-center gap-10 2xl:grid-cols-[1fr_auto]">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="max-w-lg"
        >
          <div className="mb-8 inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-1.5 text-sm font-medium ring-1 ring-inset ring-white/20 backdrop-blur-sm">
            <Bot className="h-4 w-4" />
            AI_AvatarInterview
          </div>

          <h1 className="mb-4 text-4xl font-bold leading-tight tracking-tight [text-shadow:0_4px_24px_rgba(30,27,75,0.45)]">
            {t("auth.heroTitle")}
          </h1>
          <p className="mb-10 text-lg text-brand-100">
            {t("auth.heroSubtitle")}
          </p>

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
        </motion.div>

        {/* 3D scene of floating glass panels */}
        <div aria-hidden className="hidden [perspective:1200px] 2xl:block">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.8, delay: 0.3, ease: [0.22, 1, 0.36, 1] }}
            style={
              reduceMotion
                ? { rotateY: -14, rotateX: 8 }
                : { rotateY: sceneRotY, rotateX: sceneRotX }
            }
            className="relative h-[360px] w-[300px] [transform-style:preserve-3d]"
          >
            {/* Scorecard panel */}
            <div className="absolute left-0 top-6 w-64 rounded-2xl border border-white/25 bg-white/10 p-5 shadow-[0_40px_80px_-30px_rgba(15,23,42,0.7)] backdrop-blur-md [transform:translateZ(40px)]">
              <div className="flex items-center gap-3">
                <div className="relative h-14 w-14">
                  <svg viewBox="0 0 36 36" className="h-full w-full -rotate-90">
                    <circle
                      cx="18"
                      cy="18"
                      r="15.5"
                      fill="none"
                      stroke="rgba(255,255,255,0.18)"
                      strokeWidth="3.5"
                    />
                    <motion.circle
                      cx="18"
                      cy="18"
                      r="15.5"
                      fill="none"
                      stroke="white"
                      strokeWidth="3.5"
                      strokeLinecap="round"
                      strokeDasharray={97.4}
                      initial={{ strokeDashoffset: 97.4 }}
                      animate={{ strokeDashoffset: 97.4 * 0.16 }}
                      transition={{
                        duration: 1.4,
                        delay: 0.8,
                        ease: "easeOut",
                      }}
                    />
                  </svg>
                  <span className="absolute inset-0 flex items-center justify-center text-sm font-bold">
                    84
                  </span>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-wide text-brand-100">
                    Overall score
                  </p>
                  <p className="font-semibold">Strong hire</p>
                </div>
              </div>
              <div className="mt-4 space-y-2.5">
                {BARS.map((bar, i) => (
                  <div key={bar.label}>
                    <div className="mb-1 flex justify-between text-[11px] text-brand-100">
                      <span>{bar.label}</span>
                      <span className="font-semibold text-white">
                        {bar.value}
                      </span>
                    </div>
                    <div className="h-1.5 overflow-hidden rounded-full bg-white/15">
                      <motion.div
                        className="h-full rounded-full bg-gradient-to-r from-sky-300 to-white"
                        initial={{ width: 0 }}
                        animate={{ width: `${bar.value}%` }}
                        transition={{
                          duration: 1,
                          delay: 1 + i * 0.15,
                          ease: "easeOut",
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Live question bubble, floating in front */}
            {/* Depth lives on the wrapper: framer-motion's inline transform for
                the bob would otherwise replace the translateZ. */}
            <div className="absolute bottom-4 right-0 w-60 [transform:translateZ(110px)]">
              <motion.div
                animate={reduceMotion ? undefined : { y: [0, -8, 0] }}
                transition={{
                  duration: 5,
                  repeat: Infinity,
                  ease: "easeInOut",
                }}
                className="rounded-2xl border border-white/30 bg-indigo-500/40 p-4 shadow-[0_30px_60px_-20px_rgba(15,23,42,0.75)] backdrop-blur-md"
              >
                <div className="flex items-center gap-2 text-xs font-medium text-brand-100">
                  <Sparkles className="h-3.5 w-3.5 text-amber-300" />
                  Next question
                </div>
                <p className="mt-1.5 text-sm leading-snug">
                  Walk me through a project you're most proud of.
                </p>
                <div className="mt-3 flex items-center gap-2 rounded-xl bg-white/10 px-3 py-2">
                  <Mic className="h-4 w-4" />
                  <div className="flex items-end gap-0.5">
                    {[...Array(5)].map((_, i) => (
                      <motion.span
                        key={i}
                        className="h-4 w-1 origin-bottom rounded-full bg-white/80"
                        animate={
                          reduceMotion ? undefined : { scaleY: [0.3, 1, 0.3] }
                        }
                        transition={{
                          duration: 1.1,
                          repeat: Infinity,
                          delay: i * 0.12,
                        }}
                      />
                    ))}
                  </div>
                  <span className="ml-auto text-[11px] text-brand-100">
                    {t("auth.listeningPlaceholder")}
                  </span>
                </div>
              </motion.div>
            </div>

            {/* Small depth chip behind */}
            <div className="absolute right-6 top-0 rounded-xl border border-white/20 bg-white/10 px-3 py-2 text-xs font-medium backdrop-blur-sm [transform:translateZ(-60px)]">
              EN · हि · తె
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
