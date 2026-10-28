"use client";

import { useRef, type ReactNode, type PointerEvent } from "react";
import { motion, useMotionValue, useReducedMotion, useSpring } from "framer-motion";

interface MagneticButtonProps {
  children: ReactNode;
  href: string;
  variant?: "primary" | "ghost";
  className?: string;
  onClick?: () => void;
}

/**
 * Buttons that lean gently toward the cursor — a physical, magnetic
 * invitation. Springs only engage on fine pointers without reduced motion.
 */
export function MagneticButton({
  children,
  href,
  variant = "primary",
  className = "",
  onClick,
}: MagneticButtonProps): React.ReactElement {
  const ref = useRef<HTMLAnchorElement>(null);
  const reduce = useReducedMotion();

  const rawX = useMotionValue(0);
  const rawY = useMotionValue(0);
  const x = useSpring(rawX, { stiffness: 180, damping: 16, mass: 0.28 });
  const y = useSpring(rawY, { stiffness: 180, damping: 16, mass: 0.28 });

  const handleMove = (e: PointerEvent<HTMLAnchorElement>) => {
    if (reduce || e.pointerType !== "mouse") return;
    const el = ref.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    rawX.set((e.clientX - rect.left - rect.width / 2) * 0.22);
    rawY.set((e.clientY - rect.top - rect.height / 2) * 0.3);
  };

  const handleLeave = () => {
    rawX.set(0);
    rawY.set(0);
  };

  const base =
    "group relative inline-flex h-12 items-center justify-center gap-2.5 rounded-full px-7 text-sm font-medium tracking-wide transition-colors duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-glow/70 focus-visible:ring-offset-2 focus-visible:ring-offset-black";
  const styles =
    variant === "primary"
      ? "bg-white text-black hover:bg-glow hover:shadow-[0_0_44px_rgba(101,230,255,0.35)]"
      : "border border-white/15 text-white/90 hover:border-glow/50 hover:text-glow";

  return (
    <motion.a
      ref={ref}
      href={href}
      onClick={onClick}
      onPointerMove={handleMove}
      onPointerLeave={handleLeave}
      style={{ x, y }}
      whileTap={{ scale: 0.96 }}
      className={`${base} ${styles} ${className}`}
    >
      {children}
    </motion.a>
  );
}
