"use client";

import { motion, useScroll, useSpring } from "framer-motion";

/** Hairline scroll-progress indicator along the top edge. */
export function ScrollProgress(): React.ReactElement {
  const { scrollYProgress } = useScroll();
  const scaleX = useSpring(scrollYProgress, { stiffness: 120, damping: 28, mass: 0.4 });

  return (
    <motion.div
      aria-hidden="true"
      className="fixed inset-x-0 top-0 z-[70] h-[2px] origin-left bg-gradient-to-r from-ocean via-electric to-glow"
      style={{ scaleX }}
    />
  );
}
