import Image from "next/image";
import { GraduationCap, Landmark, Languages } from "lucide-react";

import { siteConfig } from "@/lib/site-config";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { FadeIn } from "@/components/motion";

export function About() {
  const { attorney, yearsExperience, education, barAdmissions, languages } =
    siteConfig;

  return (
    <section id="about" className="bg-cream py-20 md:py-28">
      <div className="mx-auto max-w-6xl px-6">
        <div className="grid items-start gap-12 lg:grid-cols-2 lg:gap-16">
          {/* Left column — portrait */}
          <FadeIn className="relative mx-auto w-full max-w-md lg:mx-0 lg:max-w-none">
            {/* Attorney headshot — to update, replace the file at public/images/ted-headshot.jpg */}
            <div className="relative aspect-[4/5] w-full overflow-hidden rounded-lg border border-gold/30 bg-navy shadow-xl">
              <Image
                src="/images/ted-headshot.jpg"
                alt={`Portrait of ${attorney.name}, ${attorney.credential} at Barone Law Offices`}
                fill
                sizes="(max-width: 1024px) 100vw, 40vw"
                priority
                className="object-cover object-[center_20%]"
              />
              {/* Subtle bottom gradient so the gold badge and border read cleanly */}
              <div
                className="pointer-events-none absolute inset-x-0 bottom-0 h-1/4 bg-gradient-to-t from-navy-deep/40 to-transparent"
                aria-hidden="true"
              />
            </div>
            {/* Gold years-of-experience accent overlapping the corner */}
            <div className="absolute -bottom-5 -right-4 flex flex-col items-center rounded-md bg-gold px-5 py-3 text-navy-deep shadow-lg md:-right-6">
              <span className="font-serif text-3xl font-bold leading-none">
                {yearsExperience}
              </span>
              <span className="mt-1 text-[0.65rem] font-semibold uppercase tracking-widest">
                Years
              </span>
            </div>
          </FadeIn>

          {/* Right column — bio and credentials */}
          <div>
            <FadeIn>
              <p className="text-sm font-semibold uppercase tracking-[0.25em] text-gold-dark">
                About
              </p>
              <h2 className="mt-3 font-serif text-3xl font-bold tracking-tight text-navy md:text-4xl">
                Meet Attorney {attorney.shortName}
              </h2>
            </FadeIn>

            <FadeIn delay={0.1} className="mt-6 space-y-4 text-base leading-relaxed text-charcoal/80">
              <p>
                For {yearsExperience} years, {attorney.name},{" "}
                {attorney.credential}, has stood between his clients and the
                full weight of the criminal justice system — defending the
                accused in Massachusetts state courts and Federal Courts
                throughout New England.
              </p>
              <p>
                Ted is a battle-tested trial lawyer with a simple philosophy:
                every client deserves a defense built with skill, urgency, and
                genuine care. He knows that behind every case number is a
                person whose freedom, family, and future are on the line — and
                he treats each one that way.
              </p>
              <p>
                A criminal charge can feel like the loneliest moment of your
                life. It doesn&apos;t have to be. You are not facing this
                alone.
              </p>
            </FadeIn>

            <div className="mt-10 space-y-8">
              <FadeIn delay={0.15}>
                <div className="flex items-start gap-4">
                  <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-md bg-gold/15 text-gold-dark">
                    <GraduationCap className="h-5 w-5" aria-hidden="true" />
                  </span>
                  <div>
                    <h3 className="font-serif text-lg font-semibold text-navy">
                      Education
                    </h3>
                    <ul className="mt-2 space-y-1 text-sm leading-relaxed text-charcoal/70">
                      {education.map((item) => (
                        <li key={item}>{item}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              </FadeIn>

              <FadeIn delay={0.2}>
                <div className="flex items-start gap-4">
                  <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-md bg-gold/15 text-gold-dark">
                    <Landmark className="h-5 w-5" aria-hidden="true" />
                  </span>
                  <div>
                    <h3 className="font-serif text-lg font-semibold text-navy">
                      Bar Admissions
                    </h3>
                    <ul className="mt-2 space-y-1 text-sm leading-relaxed text-charcoal/70">
                      {barAdmissions.map((item) => (
                        <li key={item}>{item}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              </FadeIn>

              <FadeIn delay={0.25}>
                <div className="flex items-start gap-4">
                  <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-md bg-gold/15 text-gold-dark">
                    <Languages className="h-5 w-5" aria-hidden="true" />
                  </span>
                  <div>
                    <h3 className="font-serif text-lg font-semibold text-navy">
                      Languages
                    </h3>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {languages.map((language) => (
                        <Badge key={language} variant="outline">
                          {language}
                        </Badge>
                      ))}
                    </div>
                  </div>
                </div>
              </FadeIn>
            </div>

            <FadeIn delay={0.3} className="mt-10">
              <Button variant="gold" size="lg" href="#contact">
                Schedule a Free Consultation
              </Button>
            </FadeIn>
          </div>
        </div>
      </div>
    </section>
  );
}

export default About;
