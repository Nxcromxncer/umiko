"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Menu, X } from "lucide-react";

const LINKS = [
  { id: "home", label: "Home" },
  { id: "experience", label: "Experience" },
  { id: "about", label: "About" },
  { id: "contact", label: "Contact" },
] as const;

type LinkId = (typeof LINKS)[number]["id"];

/**
 * Minimal fixed navigation — transparent over the hero, frosted after
 * scrolling. Tracks the active section with an IntersectionObserver and
 * animates a shared underline between links.
 */
export function NavigationBar(): React.ReactElement {
  const [scrolled, setScrolled] = useState(false);
  const [active, setActive] = useState<LinkId>("home");
  const [menuOpen, setMenuOpen] = useState(false);
  const observerRef = useRef<IntersectionObserver | null>(null);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 48);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    observerRef.current = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setActive(entry.target.id as LinkId);
          }
        }
      },
      { rootMargin: "-42% 0px -52% 0px" },
    );
    LINKS.forEach(({ id }) => {
      const el = document.getElementById(id);
      if (el) observerRef.current?.observe(el);
    });
    return () => observerRef.current?.disconnect();
  }, []);

  // Lock body scroll while the mobile menu is open.
  useEffect(() => {
    document.body.style.overflow = menuOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [menuOpen]);

  const linkHref = (id: string) => `#${id}`;

  return (
    <>
      <motion.header
        initial={{ y: -70, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.9, delay: 0.35, ease: [0.16, 1, 0.3, 1] }}
        className={`fixed inset-x-0 top-0 z-[60] transition-[background-color,border-color,backdrop-filter] duration-500 ${
          scrolled
            ? "border-b border-white/[0.06] bg-black/60 backdrop-blur-xl"
            : "border-b border-transparent bg-transparent"
        }`}
      >
        <nav
          aria-label="Primary"
          className="mx-auto flex h-16 w-full max-w-7xl items-center justify-between px-6 md:h-[4.5rem] md:px-10"
        >
          {/* Brand */}
          <a
            href="#home"
            className="group flex items-baseline gap-1.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-glow/70 focus-visible:ring-offset-2 focus-visible:ring-offset-black"
          >
            <span className="text-[15px] font-semibold tracking-[0.42em] text-white">
              UMIKO
            </span>
            <span className="h-1.5 w-1.5 rounded-full bg-glow transition-transform duration-300 group-hover:scale-150" />
          </a>

          {/* Desktop links */}
          <ul className="hidden items-center gap-9 md:flex">
            {LINKS.map((link) => {
              const isActive = active === link.id;
              return (
                <li key={link.id} className="relative">
                  <a
                    href={linkHref(link.id)}
                    aria-current={isActive ? "true" : undefined}
                    className={`relative pb-1.5 text-[13px] font-medium tracking-[0.14em] transition-colors duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-glow/70 ${
                      isActive ? "text-glow" : "text-mist hover:text-white"
                    }`}
                  >
                    {link.label.toUpperCase()}
                    {isActive && (
                      <motion.span
                        layoutId="nav-underline"
                        className="absolute inset-x-0 -bottom-0.5 h-px bg-glow/80"
                        transition={{ type: "spring", stiffness: 380, damping: 32 }}
                      />
                    )}
                  </a>
                </li>
              );
            })}
          </ul>

          <div className="flex items-center gap-5">
            {/* System status */}
            <div className="hidden items-center gap-2.5 lg:flex" aria-label="System status">
              <span className="relative flex h-1.5 w-1.5">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-glow opacity-60 [animation-duration:2.4s]" />
                <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-glow" />
              </span>
              <span className="font-mono text-[10px] tracking-[0.28em] text-mist">
                OCEAN SYSTEM ACTIVE
              </span>
            </div>

            {/* Mobile menu toggle */}
            <button
              type="button"
              onClick={() => setMenuOpen(true)}
              aria-expanded={menuOpen}
              aria-controls="mobile-menu"
              aria-label="Open navigation menu"
              className="flex h-10 w-10 items-center justify-center rounded-full text-white/80 transition-colors hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-glow/70 md:hidden"
            >
              <Menu className="h-5 w-5" strokeWidth={1.5} />
            </button>
          </div>
        </nav>
      </motion.header>

      {/* Mobile menu overlay */}
      <AnimatePresence>
        {menuOpen && (
          <motion.div
            id="mobile-menu"
            role="dialog"
            aria-modal="true"
            aria-label="Navigation menu"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="fixed inset-0 z-[80] flex flex-col bg-black/95 backdrop-blur-2xl md:hidden"
          >
            <div className="flex h-16 items-center justify-between px-6">
              <span className="text-[15px] font-semibold tracking-[0.42em] text-white">UMIKO</span>
              <button
                type="button"
                onClick={() => setMenuOpen(false)}
                aria-label="Close navigation menu"
                className="flex h-10 w-10 items-center justify-center rounded-full text-white/80 transition-colors hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-glow/70"
              >
                <X className="h-5 w-5" strokeWidth={1.5} />
              </button>
            </div>

            <motion.ul
              className="flex flex-1 flex-col justify-center gap-2 px-8"
              initial="hidden"
              animate="visible"
              variants={{ visible: { transition: { staggerChildren: 0.08, delayChildren: 0.1 } } }}
            >
              {LINKS.map((link, idx) => (
                <motion.li
                  key={link.id}
                  variants={{
                    hidden: { opacity: 0, y: 22 },
                    visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: [0.16, 1, 0.3, 1] } },
                  }}
                >
                  <a
                    href={linkHref(link.id)}
                    onClick={() => setMenuOpen(false)}
                    className={`flex items-baseline gap-4 py-4 text-3xl font-light tracking-tight transition-colors ${
                      active === link.id ? "text-glow" : "text-white/85 hover:text-white"
                    }`}
                  >
                    <span className="font-mono text-[11px] tracking-[0.3em] text-mist">
                      0{idx + 1}
                    </span>
                    {link.label}
                  </a>
                </motion.li>
              ))}
            </motion.ul>

            <div className="flex items-center gap-2.5 px-8 pb-[max(2rem,env(safe-area-inset-bottom))]">
              <span className="h-1.5 w-1.5 rounded-full bg-glow" />
              <span className="font-mono text-[10px] tracking-[0.28em] text-mist">
                OCEAN SYSTEM ACTIVE
              </span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
