import { Clock, Mail, MapPin, Phone } from "lucide-react";

import { ContactForm } from "./contact-form";
import { FadeIn } from "@/components/motion";
import { privacyNote, siteConfig } from "@/lib/site-config";

const mapSrc =
  process.env.NEXT_PUBLIC_GOOGLE_MAPS_EMBED_URL ??
  `https://www.google.com/maps?q=${encodeURIComponent(siteConfig.address.full)}&output=embed`;

export function Contact() {
  return (
    <section id="contact" className="bg-white py-20 md:py-28">
      <div className="mx-auto max-w-7xl px-6 lg:px-8">
        <FadeIn className="mx-auto max-w-2xl text-center">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-gold-dark">
            Get In Touch
          </p>
          <h2 className="mt-4 font-serif text-3xl font-semibold leading-tight tracking-tight text-navy md:text-4xl">
            Schedule Your Free Consultation
          </h2>
          <p className="mt-5 text-lg leading-relaxed text-charcoal/80">
            {siteConfig.tagline} Reach out today — every consultation is
            confidential, and every question deserves a straight answer.
          </p>
        </FadeIn>

        <div className="mt-14 grid gap-12 lg:grid-cols-2 lg:gap-16">
          {/* Form */}
          <FadeIn>
            <div className="rounded-lg border border-navy/10 bg-cream/60 p-6 shadow-sm sm:p-8">
              <ContactForm />
            </div>
            <p className="mt-4 text-xs leading-relaxed text-charcoal/60">
              {privacyNote}
            </p>
          </FadeIn>

          {/* Contact details + map */}
          <FadeIn delay={0.1}>
            <div className="flex h-full flex-col gap-8">
              <ul className="space-y-6">
                <li className="flex items-start gap-4">
                  <span
                    className="mt-0.5 flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-gold/40 bg-gold/15 text-gold-dark"
                    aria-hidden="true"
                  >
                    <Phone className="h-5 w-5" />
                  </span>
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.15em] text-charcoal/60">
                      Call Us
                    </p>
                    <a
                      href={siteConfig.phoneHref}
                      className="mt-1 block font-serif text-lg font-semibold text-navy hover:text-gold-dark"
                    >
                      {siteConfig.phone}
                    </a>
                    <a
                      href={siteConfig.tollFreeHref}
                      className="mt-0.5 block text-sm text-charcoal/80 hover:text-gold-dark"
                    >
                      Toll-free: {siteConfig.tollFree}
                    </a>
                  </div>
                </li>

                <li className="flex items-start gap-4">
                  <span
                    className="mt-0.5 flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-gold/40 bg-gold/15 text-gold-dark"
                    aria-hidden="true"
                  >
                    <Mail className="h-5 w-5" />
                  </span>
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.15em] text-charcoal/60">
                      Email
                    </p>
                    <a
                      href={`mailto:${siteConfig.email}`}
                      className="mt-1 block font-serif text-lg font-semibold text-navy hover:text-gold-dark"
                    >
                      {siteConfig.email}
                    </a>
                  </div>
                </li>

                <li className="flex items-start gap-4">
                  <span
                    className="mt-0.5 flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-gold/40 bg-gold/15 text-gold-dark"
                    aria-hidden="true"
                  >
                    <MapPin className="h-5 w-5" />
                  </span>
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.15em] text-charcoal/60">
                      Office
                    </p>
                    <p className="mt-1 font-serif text-lg font-semibold text-navy">
                      {siteConfig.address.full}
                    </p>
                    <p className="mt-0.5 text-sm leading-relaxed text-charcoal/70">
                      {siteConfig.serviceArea}
                    </p>
                  </div>
                </li>

                <li className="flex items-start gap-4">
                  <span
                    className="mt-0.5 flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-gold/40 bg-gold/15 text-gold-dark"
                    aria-hidden="true"
                  >
                    <Clock className="h-5 w-5" />
                  </span>
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.15em] text-charcoal/60">
                      Available When It Matters
                    </p>
                    <p className="mt-1 text-sm leading-relaxed text-charcoal/70">
                      Arrests and arraignments don&rsquo;t keep business hours. Call
                      any time — when a critical moment arrives, you can reach your
                      attorney.
                    </p>
                  </div>
                </li>
              </ul>

              <div className="mt-auto overflow-hidden rounded-lg border-2 border-gold/50 shadow-md">
                <iframe
                  title="Barone Law Offices location map"
                  src={mapSrc}
                  loading="lazy"
                  referrerPolicy="no-referrer-when-downgrade"
                  className="h-64 w-full border-0 md:h-80"
                  allowFullScreen
                />
              </div>
            </div>
          </FadeIn>
        </div>
      </div>
    </section>
  );
}

export default Contact;
