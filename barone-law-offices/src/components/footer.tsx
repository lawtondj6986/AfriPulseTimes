import { Mail, MapPin, Phone } from "lucide-react";

import {
  copyright,
  disclaimer,
  navLinks,
  siteConfig,
} from "@/lib/site-config";

export function Footer() {
  return (
    <footer className="bg-navy-deep text-cream/80">
      <div className="mx-auto max-w-7xl px-6 py-16 lg:px-8">
        <div className="grid gap-12 md:grid-cols-2 lg:grid-cols-4">
          {/* Brand */}
          <div>
            <p className="font-serif text-2xl font-semibold tracking-tight text-cream">
              Barone <span className="text-gold">Law Offices</span>
            </p>
            <p className="mt-4 text-sm leading-relaxed text-cream/70">
              {siteConfig.yearsExperience}+ years of criminal defense —{" "}
              {siteConfig.attorney.shortName} personally standing beside every
              client, in state and federal courtrooms across New England.
            </p>
            <p className="mt-6 font-serif text-sm font-semibold tracking-[0.12em] text-gold">
              {siteConfig.taglineCaps}
            </p>
          </div>

          {/* Quick links */}
          <nav aria-label="Footer">
            <h3 className="text-sm font-semibold uppercase tracking-[0.2em] text-gold">
              Quick Links
            </h3>
            <ul className="mt-5 space-y-3">
              {navLinks.map((link) => (
                <li key={link.href}>
                  <a
                    href={link.href}
                    className="text-sm text-cream/80 transition-colors hover:text-gold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold/60"
                  >
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          </nav>

          {/* Practice areas */}
          <div>
            <h3 className="text-sm font-semibold uppercase tracking-[0.2em] text-gold">
              Practice Areas
            </h3>
            <ul className="mt-5 space-y-3">
              {siteConfig.practiceAreas.slice(0, 5).map((area) => (
                <li key={area.slug}>
                  <a
                    href="#practice-areas"
                    className="text-sm text-cream/80 transition-colors hover:text-gold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold/60"
                  >
                    {area.title}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h3 className="text-sm font-semibold uppercase tracking-[0.2em] text-gold">
              Contact
            </h3>
            <ul className="mt-5 space-y-4">
              <li>
                <a
                  href={siteConfig.phoneHref}
                  className="flex items-start gap-3 text-sm text-cream/80 transition-colors hover:text-gold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold/60"
                >
                  <Phone className="mt-0.5 h-4 w-4 shrink-0 text-gold" aria-hidden="true" />
                  <span>{siteConfig.phone}</span>
                </a>
              </li>
              <li>
                <a
                  href={siteConfig.tollFreeHref}
                  className="flex items-start gap-3 text-sm text-cream/80 transition-colors hover:text-gold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold/60"
                >
                  <Phone className="mt-0.5 h-4 w-4 shrink-0 text-gold" aria-hidden="true" />
                  <span>Toll-free: {siteConfig.tollFree}</span>
                </a>
              </li>
              <li>
                <a
                  href={`mailto:${siteConfig.email}`}
                  className="flex items-start gap-3 text-sm text-cream/80 transition-colors hover:text-gold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold/60"
                >
                  <Mail className="mt-0.5 h-4 w-4 shrink-0 text-gold" aria-hidden="true" />
                  <span>{siteConfig.email}</span>
                </a>
              </li>
              <li>
                <a
                  href={`https://www.google.com/maps?q=${encodeURIComponent(siteConfig.address.full)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-start gap-3 text-sm text-cream/80 transition-colors hover:text-gold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold/60"
                >
                  <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-gold" aria-hidden="true" />
                  <span>
                    {siteConfig.address.street}
                    <br />
                    {siteConfig.address.city}, {siteConfig.address.state}{" "}
                    {siteConfig.address.zip}
                  </span>
                </a>
              </li>
            </ul>
          </div>
        </div>

        {/* Gold rule */}
        <div className="mt-14 h-px w-full bg-gold/40" aria-hidden="true" />

        {/* Legal */}
        <div className="mt-8 space-y-5">
          <p className="text-xs leading-relaxed text-cream/70">{disclaimer}</p>
          <div className="flex flex-col gap-3 text-xs text-cream/70 sm:flex-row sm:items-center sm:justify-between">
            <p>
              <a
                href="/privacy"
                className="underline underline-offset-2 transition-colors hover:text-gold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold/60"
              >
                Privacy Policy
              </a>
              <span aria-hidden="true" className="mx-2">
                |
              </span>
              Attorney Advertising
            </p>
            <p>{copyright()}</p>
          </div>
          <p className="text-center font-serif text-xs tracking-[0.18em] text-gold/80">
            {siteConfig.taglineCaps}
          </p>
        </div>
      </div>
    </footer>
  );
}

export default Footer;
