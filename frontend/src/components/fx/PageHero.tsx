import type { ReactNode } from "react";
import { motion, useMotionValue, useReducedMotion, useSpring, useTransform } from "framer-motion";

import { cn } from "@/utils/cn";

import { GlassCube, GlossySphere, OrbitRing } from "./FloatingShapes";

interface PageHeroProps {
  title: ReactNode;
  eyebrow?: ReactNode;
  subtitle?: ReactNode;
  /** Shown left of the text (e.g. an avatar). */
  leading?: ReactNode;
  /** Extra content under the subtitle (badges, buttons). */
  children?: ReactNode;
  /** Shown on the right (e.g. a score ring or CTA). */
  aside?: ReactNode;
  className?: string;
}

/**
 * The gradient banner at the top of every app page, with a parallax 3D scene:
 * floating glass shapes sit on a deeper layer than the text, so both shift by
 * different amounts as the cursor moves -- reads as real depth.
 */
export function PageHero({ title, eyebrow, subtitle, leading, children, aside, className }: PageHeroProps) {
  const reduceMotion = useReducedMotion();
  const mx = useMotionValue(0);
  const my = useMotionValue(0);
  const sx = useSpring(mx, { stiffness: 80, damping: 18 });
  const sy = useSpring(my, { stiffness: 80, damping: 18 });

  const deepX = useTransform(sx, (v) => v * -36);
  const deepY = useTransform(sy, (v) => v * -24);
  const midX = useTransform(sx, (v) => v * -16);
  const midY = useTransform(sy, (v) => v * -12);
  const nearX = useTransform(sx, (v) => v * 6);
  const nearY = useTransform(sy, (v) => v * 4);
  const tiltX = useTransform(sy, (v) => v * -4);
  const tiltY = useTransform(sx, (v) => v * 5);

  return (
    <div className={cn("[perspective:1400px]", className)}>
      <motion.section
        initial={{ opacity: 0, y: 18, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
        style={reduceMotion ? undefined : { rotateX: tiltX, rotateY: tiltY }}
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
        className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-brand-600 via-indigo-600 to-indigo-800 p-6 text-white shadow-[0_30px_60px_-20px_rgba(49,46,129,0.55),0_0_0_1px_rgba(255,255,255,0.08)_inset] [transform-style:preserve-3d] sm:p-8"
      >
        {/* Backdrop texture */}
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_1px_1px,rgba(255,255,255,0.14)_1px,transparent_0)] bg-[size:22px_22px]" />
        <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/60 to-transparent" />

        {/* Deep layer: glows + orbit ring */}
        <motion.div aria-hidden style={{ x: deepX, y: deepY }} className="pointer-events-none absolute inset-0">
          <div className="absolute -right-16 -top-20 h-64 w-64 rounded-full bg-fuchsia-400/25 blur-3xl" />
          <div className="absolute -bottom-28 left-1/4 h-56 w-56 rounded-full bg-sky-400/20 blur-3xl" />
          <OrbitRing size={190} className="absolute -bottom-16 right-[18%] hidden opacity-70 md:block" />
        </motion.div>

        {/* Mid layer: glass cube + sphere */}
        <motion.div aria-hidden style={{ x: midX, y: midY }} className="pointer-events-none absolute inset-0 hidden sm:block">
          {/* Kept to the top/bottom padding bands so they never sit on text or actions. */}
          <GlassCube size={44} className="absolute right-[37%] top-2 opacity-75" />
          <GlossySphere size={16} className="absolute bottom-1 left-[46%] opacity-90" />
          <GlossySphere size={12} className="absolute right-[6%] top-3 opacity-80 [animation-delay:-2s]" />
        </motion.div>

        {/* Near layer: content */}
        <motion.div
          style={{ x: nearX, y: nearY }}
          className="relative z-10 flex flex-col gap-6 md:flex-row md:items-center md:justify-between"
        >
          <div className="flex min-w-0 flex-col gap-5 sm:flex-row sm:items-center">
            {leading}
            <div className="min-w-0">
              {eyebrow && <p className="text-sm font-medium text-brand-100">{eyebrow}</p>}
              <h1 className="mt-1 text-2xl font-bold tracking-tight [text-shadow:0_2px_12px_rgba(30,27,75,0.35)] sm:text-3xl">
                {title}
              </h1>
              {subtitle && <div className="mt-2 max-w-2xl text-brand-100">{subtitle}</div>}
              {children && <div className="mt-4">{children}</div>}
            </div>
          </div>
          {aside && <div className="shrink-0">{aside}</div>}
        </motion.div>
      </motion.section>
    </div>
  );
}
