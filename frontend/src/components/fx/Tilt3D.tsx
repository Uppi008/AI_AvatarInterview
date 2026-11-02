import { type ReactNode, useRef } from "react";
import { motion, useMotionTemplate, useMotionValue, useReducedMotion, useSpring, useTransform } from "framer-motion";

import { cn } from "@/utils/cn";

interface Tilt3DProps {
  children: ReactNode;
  className?: string;
  /** Maximum rotation in degrees at the card's edges. */
  max?: number;
  /** Cursor-following light reflection. */
  glare?: boolean;
  /** Corner radius of the glare layer; match the child's radius. */
  rounded?: string;
}

/**
 * Wraps a card so it tilts toward the cursor in 3D with a moving glare.
 * Inert on touch devices (no hover) and when the user prefers reduced motion.
 */
export function Tilt3D({ children, className, max = 8, glare = true, rounded = "rounded-2xl" }: Tilt3DProps) {
  const ref = useRef<HTMLDivElement>(null);
  const reduceMotion = useReducedMotion();

  // -0.5..0.5 across the card, springy so movement feels physical.
  const px = useMotionValue(0);
  const py = useMotionValue(0);
  const sx = useSpring(px, { stiffness: 220, damping: 20 });
  const sy = useSpring(py, { stiffness: 220, damping: 20 });
  const rotateY = useTransform(sx, [-0.5, 0.5], [-max, max]);
  const rotateX = useTransform(sy, [-0.5, 0.5], [max, -max]);
  const glareX = useTransform(sx, [-0.5, 0.5], [0, 100]);
  const glareY = useTransform(sy, [-0.5, 0.5], [0, 100]);
  const glareOpacity = useMotionValue(0);
  const glareBg = useMotionTemplate`radial-gradient(circle at ${glareX}% ${glareY}%, rgba(255,255,255,0.35), transparent 55%)`;

  if (reduceMotion) return <div className={className}>{children}</div>;

  return (
    <div className={cn("[perspective:1000px]", className)}>
      <motion.div
        ref={ref}
        className="relative h-full [transform-style:preserve-3d]"
        style={{ rotateX, rotateY }}
        onPointerMove={(e) => {
          if (e.pointerType !== "mouse" || !ref.current) return;
          const rect = ref.current.getBoundingClientRect();
          px.set((e.clientX - rect.left) / rect.width - 0.5);
          py.set((e.clientY - rect.top) / rect.height - 0.5);
          glareOpacity.set(1);
        }}
        onPointerLeave={() => {
          px.set(0);
          py.set(0);
          glareOpacity.set(0);
        }}
      >
        {children}
        {glare && (
          <motion.div
            aria-hidden
            className={cn("pointer-events-none absolute inset-0 z-10 mix-blend-soft-light transition-opacity duration-300", rounded)}
            style={{ background: glareBg, opacity: glareOpacity }}
          />
        )}
      </motion.div>
    </div>
  );
}
