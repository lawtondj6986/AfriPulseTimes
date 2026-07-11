import * as Icons from "lucide-react";
import type { LucideIcon } from "lucide-react";

import { practiceAreas } from "@/lib/site-config";
import { Button } from "@/components/ui/button";
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

export function PracticeAreas() {
  return (
    <section id="practice-areas" className="bg-cream py-20 md:py-28">
      <div className="mx-auto max-w-6xl px-6">
        <FadeIn className="mx-auto max-w-2xl text-center">
          <p className="text-sm font-semibold uppercase tracking-[0.25em] text-gold-dark">
            Practice Areas
          </p>
          <h2 className="mt-3 font-serif text-3xl font-bold tracking-tight text-navy md:text-4xl">
            Areas of Practice
          </h2>
          <p className="mt-4 text-base leading-relaxed text-charcoal/70">
            Focused criminal defense for the charges that put your freedom,
            record, and reputation at risk.
          </p>
        </FadeIn>

        <Stagger className="mt-14 grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
          {practiceAreas.map((area) => {
            const Icon = resolveIcon(area.icon);
            return (
              <StaggerItem key={area.slug} className="h-full">
                <Card className="group relative h-full overflow-hidden border-navy/10 transition-all duration-300 hover:-translate-y-1 hover:border-gold/60 hover:shadow-lg">
                  <span
                    className="absolute inset-x-0 top-0 h-0.5 origin-left scale-x-0 bg-gold transition-transform duration-300 group-hover:scale-x-100"
                    aria-hidden="true"
                  />
                  <CardHeader>
                    <span className="mb-3 flex h-12 w-12 items-center justify-center rounded-md bg-gold/15 text-gold-dark transition-colors duration-300 group-hover:bg-gold group-hover:text-navy-deep">
                      <Icon className="h-6 w-6" aria-hidden="true" />
                    </span>
                    <CardTitle>{area.title}</CardTitle>
                    <CardDescription>{area.description}</CardDescription>
                  </CardHeader>
                </Card>
              </StaggerItem>
            );
          })}
        </Stagger>

        <FadeIn delay={0.15} className="mt-14 flex flex-col items-center gap-5 text-center">
          <p className="max-w-xl text-sm leading-relaxed text-charcoal/60">
            Every case is different. The best way to understand your options is
            a confidential conversation about the facts of yours.
          </p>
          <Button variant="outline" size="lg" href="#contact">
            Discuss Your Case
          </Button>
        </FadeIn>
      </div>
    </section>
  );
}

export default PracticeAreas;
