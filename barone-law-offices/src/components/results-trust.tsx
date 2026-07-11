"use client";

import * as Icons from "lucide-react";
import type { LucideIcon } from "lucide-react";

import { FadeIn, Stagger, StaggerItem } from "@/components/motion";
import { Card, CardContent } from "@/components/ui/card";
import { results, trustBadges } from "@/lib/site-config";

function resolveIcon(iconName: string): LucideIcon {
  return (Icons as unknown as Record<string, LucideIcon>)[iconName] ?? Icons.ShieldCheck;
}

export function ResultsTrust() {
  return (
    <section id="results" className="bg-white py-20 md:py-28">
      <div className="mx-auto max-w-7xl px-6 lg:px-8">
        <FadeIn className="mx-auto max-w-2xl text-center">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-gold-dark">
            Client Results &amp; Trust Signals
          </p>
          <h2 className="mt-4 font-serif text-3xl font-semibold leading-tight tracking-tight text-navy md:text-4xl">
            A record built one verdict at a time.
          </h2>
        </FadeIn>

        <Stagger className="mt-14 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {results.map((result) => (
            <StaggerItem key={`${result.outcome}-${result.context}`}>
              <Card className="h-full border-navy/10 bg-cream/40 transition-shadow duration-300 hover:shadow-md">
                <CardContent className="flex h-full flex-col p-8">
                  <p className="font-serif text-2xl font-semibold leading-tight text-gold-dark md:text-3xl">
                    {result.outcome}
                  </p>
                  <div className="mt-4 h-px w-10 bg-gold/50" aria-hidden="true" />
                  <p className="mt-4 text-sm leading-relaxed text-charcoal/70">
                    {result.context}
                  </p>
                </CardContent>
              </Card>
            </StaggerItem>
          ))}
        </Stagger>

        <FadeIn>
          <p className="mx-auto mt-10 max-w-3xl text-center text-xs italic leading-relaxed text-charcoal/60">
            Prior results do not guarantee a similar outcome. Every case is
            different and must be judged on its own facts.
          </p>
        </FadeIn>

        <FadeIn delay={0.1}>
          <ul className="mt-14 flex flex-wrap items-center justify-center gap-3 md:gap-4">
            {trustBadges.map((badge) => {
              const Icon = resolveIcon(badge.icon);
              return (
                <li
                  key={badge.label}
                  className="inline-flex items-center gap-2.5 rounded-full border border-navy/15 bg-white px-5 py-2.5 shadow-sm"
                >
                  <Icon className="h-4 w-4 text-gold-dark" aria-hidden="true" />
                  <span className="text-xs font-semibold uppercase tracking-wider text-navy">
                    {badge.label}
                  </span>
                </li>
              );
            })}
          </ul>
        </FadeIn>

        <FadeIn delay={0.15} className="mt-16">
          {/* GROK IMAGINE IMAGE SLOT [courtroom]: replace with <Image src="/images/courtroom.jpg" .../>. Prompt in GROK_IMAGINE_PROMPTS.md */}
          <div
            className="flex h-40 w-full items-center justify-center rounded-lg border border-gold/30 bg-gradient-to-r from-navy-deep via-navy to-navy-deep md:h-48"
            role="img"
            aria-label="A dignified Massachusetts courtroom interior"
          >
            <span className="text-xs font-semibold uppercase tracking-[0.25em] text-gold/60">
              Courtroom
            </span>
          </div>
        </FadeIn>
      </div>
    </section>
  );
}

export default ResultsTrust;
