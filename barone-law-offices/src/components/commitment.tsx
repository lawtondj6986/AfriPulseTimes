"use client";

import * as Icons from "lucide-react";
import type { LucideIcon } from "lucide-react";

import { FadeIn, Stagger, StaggerItem } from "@/components/motion";
import { commitmentPoints, siteConfig } from "@/lib/site-config";

function resolveIcon(iconName: string): LucideIcon {
  return (Icons as unknown as Record<string, LucideIcon>)[iconName] ?? Icons.ShieldCheck;
}

export function Commitment() {
  return (
    <section id="commitment" className="bg-cream py-20 md:py-28">
      <div className="mx-auto max-w-7xl px-6 lg:px-8">
        <div className="grid items-center gap-12 lg:grid-cols-2 lg:gap-20">
          {/* Image side */}
          <FadeIn className="order-last lg:order-first">
            {/* GROK IMAGINE IMAGE SLOT [consultation-scene]: replace with <Image src="/images/consultation-scene.jpg" .../>. Prompt in GROK_IMAGINE_PROMPTS.md */}
            <div
              className="flex aspect-[4/5] w-full items-center justify-center rounded-lg border border-gold/30 bg-gradient-to-br from-navy via-navy-deep to-navy shadow-lg"
              role="img"
              aria-label="A warm, supportive private consultation between attorney and client"
            >
              <span className="text-xs font-semibold uppercase tracking-[0.25em] text-gold/60">
                Consultation Scene
              </span>
            </div>
          </FadeIn>

          {/* Philosophy side */}
          <div>
            <FadeIn>
              <p className="text-sm font-semibold uppercase tracking-[0.2em] text-gold-dark">
                Our Commitment to You
              </p>
              <h2 className="mt-4 font-serif text-3xl font-semibold leading-tight tracking-tight text-navy md:text-4xl">
                You&rsquo;re never alone in this fight.
              </h2>
              <p className="mt-5 max-w-xl text-lg leading-relaxed text-charcoal/80">
                {siteConfig.tagline} It&rsquo;s more than a slogan — it&rsquo;s the
                promise behind every case {siteConfig.attorney.shortName} takes on.
              </p>
            </FadeIn>

            <Stagger as="ul" className="mt-10 space-y-8">
              {commitmentPoints.map((point) => {
                const Icon = resolveIcon(point.icon);
                return (
                  <StaggerItem key={point.title} as="li" className="flex items-start gap-5">
                    <span
                      className="mt-0.5 flex h-12 w-12 shrink-0 items-center justify-center rounded-full border border-gold/40 bg-gold/15 text-gold-dark"
                      aria-hidden="true"
                    >
                      <Icon className="h-5 w-5" />
                    </span>
                    <div>
                      <h3 className="font-serif text-lg font-semibold text-navy">
                        {point.title}
                      </h3>
                      <p className="mt-1.5 text-sm leading-relaxed text-charcoal/70">
                        {point.description}
                      </p>
                    </div>
                  </StaggerItem>
                );
              })}
            </Stagger>
          </div>
        </div>
      </div>
    </section>
  );
}

export default Commitment;
