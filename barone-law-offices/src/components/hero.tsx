import * as React from "react";
import * as Icons from "lucide-react";
import type { LucideIcon } from "lucide-react";

import { siteConfig } from "@/lib/site-config";
import { Button } from "@/components/ui/button";
import { FadeIn, Stagger, StaggerItem } from "@/components/motion";

function resolveIcon(name: string): LucideIcon {
  return (Icons as unknown as Record<string, LucideIcon>)[name] ?? Icons.Scale;
}

export function Hero() {
  // Compose the h1 from the full slogan, rendering the back half in gold.
  const tagline = siteConfig.taglineCaps;
  const pivot = tagline.indexOf("WHEN");
  const taglineLead = pivot > 0 ? tagline.slice(0, pivot).trimEnd() : tagline;
  const taglineGold = pivot > 0 ? tagline.slice(pivot) : "";

  return (
    <section
      id="top"
      className="relative flex min-h-screen flex-col overflow-hidden bg-navy"
    >
      {/* GROK IMAGINE IMAGE SLOT [hero-background]: replace with <Image src="/images/hero-background.jpg" .../>. Prompt in GROK_IMAGINE_PROMPTS.md */}
      <div
        aria-hidden="true"
        className="absolute inset-0 rounded-none border border-gold/20 bg-gradient-to-br from-navy-deep via-navy to-navy-deep"
      >
        <span className="absolute inset-0 flex items-center justify-center text-xs font-medium uppercase tracking-[0.4em] text-gold/30">
          Hero Background — Brockton Courthouse at Dusk
        </span>
      </div>

      {/*
        OPTIONAL VIDEO SLOT [hero-video]: to use a cinematic background loop
        instead of the still image, uncomment the block below and place the
        file at /videos/hero-video.mp4 (poster at /images/hero-background.jpg).

        <video
          className="absolute inset-0 h-full w-full object-cover"
          autoPlay
          muted
          loop
          playsInline
          poster="/images/hero-background.jpg"
          aria-hidden="true"
        >
          <source src="/videos/hero-video.mp4" type="video/mp4" />
        </video>
      */}

      {/* Readability overlay */}
      <div
        aria-hidden="true"
        className="absolute inset-0 bg-gradient-to-t from-navy-deep via-navy-deep/85 to-navy-deep/60"
      />

      {/* Content */}
      <div className="relative z-10 mx-auto flex w-full max-w-5xl flex-1 flex-col items-center justify-center px-4 pb-24 pt-32 text-center sm:px-6 lg:px-8">
        <FadeIn as="p" className="text-xs font-semibold uppercase tracking-[0.35em] text-gold sm:text-sm">
          {siteConfig.firm} &middot; Brockton, Massachusetts
        </FadeIn>

        <FadeIn as="h1" delay={0.1} className="mt-6 max-w-4xl font-serif text-4xl font-semibold leading-tight tracking-tight text-cream sm:text-6xl lg:text-7xl">
          {taglineLead}{" "}
          <span className="text-gold">{taglineGold}</span>
        </FadeIn>

        <FadeIn as="p" delay={0.2} className="mt-6 max-w-2xl font-sans text-base leading-relaxed text-cream/80 sm:text-lg">
          {siteConfig.yearsExperience} years of relentless criminal defense.{" "}
          {siteConfig.serviceArea}.
        </FadeIn>

        <FadeIn delay={0.3} className="mt-10 flex flex-col items-center gap-4 sm:flex-row">
          <Button
            variant="gold"
            size="xl"
            href="#contact"
            className="focus-visible:ring-offset-navy-deep"
          >
            Schedule Your Free Consultation
          </Button>
          <Button
            variant="outline"
            size="xl"
            href={siteConfig.phoneHref}
            className="border-gold/70 text-cream hover:bg-gold hover:text-navy-deep focus-visible:ring-offset-navy-deep"
          >
            Call {siteConfig.phone}
          </Button>
        </FadeIn>

        {/* Trust strip */}
        <Stagger as="ul" className="mt-14 flex flex-wrap items-center justify-center gap-x-8 gap-y-4 border-t border-cream/10 pt-8">
          {siteConfig.trustBadges.map((badge) => {
            const Icon = resolveIcon(badge.icon);
            return (
              <StaggerItem
                as="li"
                key={badge.label}
                className="flex items-center gap-2 text-xs font-medium uppercase tracking-[0.2em] text-cream/70"
              >
                <Icon className="size-4 text-gold" aria-hidden="true" />
                <span>{badge.label}</span>
              </StaggerItem>
            );
          })}
        </Stagger>
      </div>

      {/* Scroll cue */}
      <div className="relative z-10 flex justify-center pb-8">
        <a
          href="#about"
          aria-label="Scroll to learn more about the firm"
          className="group rounded-full p-2 text-gold/70 transition-colors hover:text-gold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold focus-visible:ring-offset-2 focus-visible:ring-offset-navy-deep"
        >
          <Icons.ChevronDown
            className="size-7 animate-bounce motion-reduce:animate-none"
            aria-hidden="true"
          />
        </a>
      </div>
    </section>
  );
}

export default Hero;
