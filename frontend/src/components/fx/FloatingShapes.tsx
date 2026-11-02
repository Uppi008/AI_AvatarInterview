import { cn } from "@/utils/cn";

/** CSS-3D decorative objects (styles in index.css). Purely visual. */
export function GlassCube({ size = 64, className }: { size?: number; className?: string }) {
  return (
    <div aria-hidden className={cn("[perspective:600px]", className)}>
      <div className="cube3d" style={{ ["--s" as string]: `${size}px` }}>
        <span />
        <span />
        <span />
        <span />
        <span />
        <span />
      </div>
    </div>
  );
}

export function OrbitRing({ size = 140, className }: { size?: number; className?: string }) {
  return (
    <div aria-hidden className={cn("[perspective:600px]", className)}>
      <div className="ring3d" style={{ width: size, height: size }} />
    </div>
  );
}

export function GlossySphere({ size = 36, className }: { size?: number; className?: string }) {
  return <div aria-hidden className={cn("sphere3d", className)} style={{ width: size, height: size }} />;
}
