import type { Metadata, Viewport } from "next";
import { Playfair_Display, Inter } from "next/font/google";
import { cn } from "@/lib/utils";
import StructuredData from "@/components/structured-data";
import "./globals.css";

const playfair = Playfair_Display({
  weight: ["500", "600", "700"],
  subsets: ["latin"],
  variable: "--font-serif",
  display: "swap",
});

const inter = Inter({
  weight: ["400", "500", "600", "700"],
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
});

const SITE_URL = "https://www.baronelaw.com";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default:
      "Barone Law Offices | Ted Barone, Criminal Defense Attorney — Brockton, MA",
    template: "%s | Barone Law Offices",
  },
  description:
    "With 44 years of criminal defense experience, Attorney Ted Barone defends clients in Brockton, Boston, the South Shore, Plymouth County, and Federal Courts throughout New England. You're Not Alone When You Got Barone! Free consultation.",
  keywords: [
    "criminal defense attorney Brockton MA",
    "OUI/DUI lawyer Massachusetts",
    "DUI defense Brockton",
    "criminal lawyer Plymouth County",
    "domestic violence defense attorney",
    "209A restraining order lawyer",
    "white collar crime attorney Boston",
    "juvenile defense lawyer Massachusetts",
    "criminal appeals attorney New England",
    "expungement and record sealing Massachusetts",
    "federal criminal defense lawyer",
    "Ted Barone attorney",
    "Barone Law Offices",
  ],
  authors: [{ name: 'Theodore "Ted" Barone' }],
  alternates: {
    canonical: "/",
  },
  openGraph: {
    type: "website",
    locale: "en_US",
    url: SITE_URL,
    siteName: "Barone Law Offices",
    title:
      "Barone Law Offices | Ted Barone, Criminal Defense Attorney — Brockton, MA",
    description:
      "44 years of criminal defense experience serving Brockton, Boston, the South Shore, Plymouth County, and Federal Courts throughout New England. You're Not Alone When You Got Barone!",
    images: [
      {
        url: "/images/og-image.jpg",
        width: 1200,
        height: 630,
        alt: "Barone Law Offices — Criminal Defense Attorney, Brockton, MA",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title:
      "Barone Law Offices | Ted Barone, Criminal Defense Attorney — Brockton, MA",
    description:
      "44 years of criminal defense experience serving Brockton, Boston, the South Shore, Plymouth County, and Federal Courts throughout New England.",
    images: ["/images/og-image.jpg"],
  },
  robots: {
    index: true,
    follow: true,
  },
};

export const viewport: Viewport = {
  themeColor: "#0F172A",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={cn(playfair.variable, inter.variable)}>
      <body className="font-sans bg-cream text-charcoal antialiased">
        {children}
        <StructuredData />
      </body>
    </html>
  );
}
