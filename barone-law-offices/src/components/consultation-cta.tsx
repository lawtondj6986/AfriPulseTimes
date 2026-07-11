"use client";

import { FadeIn } from "@/components/motion";
import { Button } from "@/components/ui/button";
import { siteConfig } from "@/lib/site-config";

/** Split the caps tagline so the final phrase can be rendered in gold. */
function splitTagline(tagline: string): { lead: string; emphasis: string } {
  const words = tagline.trim().split(/\s+/);
  const cut = Math.max(1, words.length - 3);
  return {
    lead: words.slice(0, cut).join(" "),
    emphasis: words.slice(cut).join(" "),
  };
}

export function ConsultationCta() {
  const { lead, emphasis } = splitTagline(siteConfig.taglineCaps);

  return (
    <section
      id="consult"
      className="relative overflow-hidden bg-navy-deep py-20 md:py-28"
    >
      {/* GROK IMAGINE IMAGE SLOT [cta-background]: replace with <Image src="/images/cta-background.jpg" .../>. Prompt in GROK_IMAGINE_PROMPTS.md */}
      <div
        className="absolute inset-0 bg-gradient-to-br from-navy via-navy-deep to-navy"
        aria-hidden="true"
      />
      {/* Subtle gold radial and edge accents */}
      <div
        className="pointer-events-none absolute inset-0"
        aria-hidden="true"
        style={{
          background:
            "radial-gradient(ellipse 70% 55% at 50% 0%, rgba(200, 164, 78, 0.14), transparent 65%)",
        }}
      />
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-gold/50 to-transparent"
        aria-hidden="true"
      />
      <div
        className="pointer-events-none absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-gold/30 to-transparent"
        aria-hidden="true"
      />

      <div className="relative mx-auto max-w-4xl px-6 text-center lg:px-8">
        <FadeIn>
          <h2 className="font-serif text-3xl font-semibold leading-tight tracking-tight text-cream sm:text-4xl md:text-5xl">
            {lead} <span className="text-gold">{emphasis}</span>
          </h2>
        </FadeIn>

        <FadeIn delay={0.1}>
          <p className="mx-auto mt-6 max-w-2xl text-lg leading-relaxed text-cream/80">
            Your consultation is free and completely confidential — backed by{" "}
            {siteConfig.yearsExperience} years of fighting for clients in
            courtrooms across Massachusetts and New England.
          </p>
        </FadeIn>

        <FadeIn delay={0.2}>
          <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
            <Button variant="gold" size="xl" href="#contact">
              Schedule Your Free Consultation
            </Button>
            <Button
              variant="outline"
              size="xl"
              href={siteConfig.phoneHref}
              className="border-cream/60 text-cream hover:border-cream hover:bg-cream hover:text-navy-deep"
            >
              Call {siteConfig.phone}
            </Button>
          </div>
        </FadeIn>

        <FadeIn delay={0.3}>
          <p className="mt-8 text-sm tracking-wide text-cream/60">
            Toll-free:{" "}
            <a
              href={siteConfig.tollFreeHref}
              className="font-semibold text-cream/80 underline-offset-4 transition-colors hover:text-gold hover:underline"
            >
              {siteConfig.tollFree}
            </a>
          </p>
        </FadeIn>
      </div>
    </section>
  );
}

export default ConsultationCta;
