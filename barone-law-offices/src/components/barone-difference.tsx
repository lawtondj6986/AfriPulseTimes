import * as Icons from "lucide-react";
import type { LucideIcon } from "lucide-react";

import { differencePoints } from "@/lib/site-config";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { FadeIn, Stagger, StaggerItem } from "@/components/motion";

function resolveIcon(iconName: string): LucideIcon {
  return (Icons as unknown as Record<string, LucideIcon>)[iconName] ?? Icons.Scale;
}

export function BaroneDifference() {
  return (
    <section id="difference" className="bg-white py-20 md:py-28">
      <div className="mx-auto max-w-6xl px-6">
        <FadeIn className="mx-auto max-w-2xl text-center">
          <p className="text-sm font-semibold uppercase tracking-[0.25em] text-gold-dark">
            Why Barone
          </p>
          <h2 className="mt-3 font-serif text-3xl font-bold tracking-tight text-navy md:text-4xl">
            The Barone Difference
          </h2>
          <p className="mt-4 text-base leading-relaxed text-charcoal/70">
            Aggressive, strategic, and deeply experienced — the difference
            between a defense and a defense that wins.
          </p>
        </FadeIn>

        <Stagger className="mt-14 grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
          {differencePoints.map((point) => {
            const Icon = resolveIcon(point.icon);
            return (
              <StaggerItem key={point.title} className="h-full">
                <Card className="group h-full border-navy/10 transition-all duration-300 hover:-translate-y-1 hover:border-gold/60 hover:shadow-lg">
                  <CardHeader>
                    <span className="mb-3 flex h-12 w-12 items-center justify-center rounded-md bg-gold/15 text-gold-dark transition-colors duration-300 group-hover:bg-gold group-hover:text-navy-deep">
                      <Icon className="h-6 w-6" aria-hidden="true" />
                    </span>
                    <CardTitle>{point.title}</CardTitle>
                    <CardDescription>{point.description}</CardDescription>
                  </CardHeader>
                </Card>
              </StaggerItem>
            );
          })}
        </Stagger>
      </div>
    </section>
  );
}

export default BaroneDifference;
