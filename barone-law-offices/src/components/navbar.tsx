"use client";

import * as React from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { Menu, Phone, X } from "lucide-react";

import { siteConfig, navLinks } from "@/lib/site-config";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const MOBILE_PANEL_ID = "mobile-nav-panel";

export function Navbar() {
  const [scrolled, setScrolled] = React.useState(false);
  const [open, setOpen] = React.useState(false);
  const shouldReduceMotion = useReducedMotion();
  const toggleRef = React.useRef<HTMLButtonElement>(null);

  React.useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 30);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Close the mobile panel on Escape and return focus to the toggle.
  React.useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
        toggleRef.current?.focus();
      }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open]);

  const closePanel = () => setOpen(false);

  const solid = scrolled || open;

  return (
    <header
      className={cn(
        "fixed inset-x-0 top-0 z-50 transition-all duration-300",
        solid
          ? "border-b border-gold/40 bg-navy/95 shadow-lg shadow-navy-deep/30 backdrop-blur"
          : "border-b border-transparent bg-transparent"
      )}
    >
      <nav
        aria-label="Primary"
        className="mx-auto flex h-20 max-w-7xl items-center justify-between gap-6 px-4 sm:px-6 lg:px-8"
      >
        {/* Wordmark */}
        <a
          href="#top"
          className="group flex flex-col rounded-sm leading-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold focus-visible:ring-offset-2 focus-visible:ring-offset-navy"
          aria-label={`${siteConfig.firm} — back to top`}
        >
          <span className="font-serif text-2xl font-semibold tracking-wide text-cream transition-colors group-hover:text-gold-light">
            BARONE
          </span>
          <span className="mt-1 text-[0.65rem] font-medium uppercase tracking-[0.35em] text-gold">
            Law Offices
          </span>
        </a>

        {/* Desktop links */}
        <ul className="hidden items-center gap-7 lg:flex">
          {navLinks.map((link) => (
            <li key={link.href}>
              <a
                href={link.href}
                className="group relative rounded-sm py-2 text-sm font-medium tracking-wide text-cream/90 transition-colors hover:text-cream focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold focus-visible:ring-offset-2 focus-visible:ring-offset-navy"
              >
                {link.label}
                <span
                  aria-hidden="true"
                  className="absolute inset-x-0 -bottom-0.5 h-px origin-left scale-x-0 bg-gold transition-transform duration-300 group-hover:scale-x-100 group-focus-visible:scale-x-100"
                />
              </a>
            </li>
          ))}
        </ul>

        {/* Desktop CTAs */}
        <div className="hidden items-center gap-4 lg:flex">
          <a
            href={siteConfig.phoneHref}
            className="flex items-center gap-2 rounded-sm text-sm font-semibold tracking-wide text-gold transition-colors hover:text-gold-light focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold focus-visible:ring-offset-2 focus-visible:ring-offset-navy"
          >
            <Phone className="size-4" aria-hidden="true" />
            <span>{siteConfig.phone}</span>
          </a>
          <Button
            variant="gold"
            href="#contact"
            className="focus-visible:ring-offset-navy"
          >
            Free Consultation
          </Button>
        </div>

        {/* Mobile hamburger */}
        <button
          ref={toggleRef}
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-label={open ? "Close navigation menu" : "Open navigation menu"}
          aria-expanded={open}
          aria-controls={MOBILE_PANEL_ID}
          className="inline-flex h-11 w-11 items-center justify-center rounded-md text-cream transition-colors hover:text-gold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold focus-visible:ring-offset-2 focus-visible:ring-offset-navy lg:hidden"
        >
          {open ? (
            <X className="size-6" aria-hidden="true" />
          ) : (
            <Menu className="size-6" aria-hidden="true" />
          )}
        </button>
      </nav>

      {/* Mobile panel */}
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            id={MOBILE_PANEL_ID}
            key="mobile-panel"
            initial={
              shouldReduceMotion ? { opacity: 0 } : { height: 0, opacity: 0 }
            }
            animate={
              shouldReduceMotion
                ? { opacity: 1 }
                : { height: "auto", opacity: 1 }
            }
            exit={
              shouldReduceMotion ? { opacity: 0 } : { height: 0, opacity: 0 }
            }
            transition={{ duration: 0.3, ease: [0.21, 0.47, 0.32, 0.98] }}
            className="overflow-hidden border-t border-gold/30 bg-navy lg:hidden"
          >
            <div className="space-y-1 px-4 py-6 sm:px-6">
              <ul className="space-y-1">
                {navLinks.map((link) => (
                  <li key={link.href}>
                    <a
                      href={link.href}
                      onClick={closePanel}
                      className="block rounded-md px-3 py-3 font-serif text-lg text-cream transition-colors hover:bg-navy-light hover:text-gold-light focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold"
                    >
                      {link.label}
                    </a>
                  </li>
                ))}
              </ul>
              <div className="flex flex-col gap-3 border-t border-cream/10 px-3 pt-5">
                <Button
                  variant="gold"
                  size="lg"
                  href="#contact"
                  onClick={closePanel}
                  className="w-full focus-visible:ring-offset-navy"
                >
                  Free Consultation
                </Button>
                <Button
                  variant="outline"
                  size="lg"
                  href={siteConfig.phoneHref}
                  onClick={closePanel}
                  className="w-full border-gold/60 text-gold hover:bg-gold hover:text-navy-deep focus-visible:ring-offset-navy"
                >
                  <Phone aria-hidden="true" />
                  Call {siteConfig.phone}
                </Button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}

export default Navbar;
