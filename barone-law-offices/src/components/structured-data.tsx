import { siteConfig } from "@/lib/site-config";

const SITE_URL = "https://www.baronelaw.com";

/**
 * Emits JSON-LD structured data for the firm (LegalService/Attorney) and
 * Attorney Ted Barone (Person). All facts are sourced from site-config;
 * only the office geo coordinates are supplied here.
 */
export function StructuredData() {
  const attorneyId = `${SITE_URL}/#attorney`;
  const firmId = `${SITE_URL}/#legalservice`;

  const data = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": ["LegalService", "Attorney"],
        "@id": firmId,
        name: siteConfig.firm,
        description: `Criminal defense law firm led by ${siteConfig.attorney.name}, with ${siteConfig.yearsExperience} years of experience. ${siteConfig.serviceArea}.`,
        url: SITE_URL,
        telephone: siteConfig.phone,
        email: siteConfig.email,
        priceRange: "Free Consultation",
        areaServed: [
          "Brockton",
          "Boston",
          "South Shore",
          "Plymouth County",
          "New England",
        ],
        knowsLanguage: siteConfig.languages,
        address: {
          "@type": "PostalAddress",
          streetAddress: siteConfig.address.street,
          addressLocality: siteConfig.address.city,
          addressRegion: siteConfig.address.state,
          postalCode: siteConfig.address.zip,
          addressCountry: "US",
        },
        geo: {
          "@type": "GeoCoordinates",
          latitude: 42.0821,
          longitude: -71.0242,
        },
        openingHours: "Mo-Fr 09:00-17:00",
        founder: { "@id": attorneyId },
        employee: { "@id": attorneyId },
      },
      {
        "@type": "Person",
        "@id": attorneyId,
        name: siteConfig.attorney.name,
        jobTitle: "Criminal Defense Attorney",
        worksFor: { "@id": firmId },
        alumniOf: siteConfig.education.map((school) => ({
          "@type": "EducationalOrganization",
          name: school,
        })),
        knowsLanguage: siteConfig.languages,
      },
    ],
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
    />
  );
}

export default StructuredData;
