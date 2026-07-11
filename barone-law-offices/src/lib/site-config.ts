/**
 * Single source of truth for all Barone Law Offices site content.
 * Downstream sections should import from this file only — do not hardcode
 * copy, phone numbers, or addresses inside components.
 */

export interface NavLink {
  label: string;
  href: string;
}

export interface PracticeArea {
  slug: string;
  title: string;
  description: string;
  /** lucide-react icon name, e.g. "Scale" */
  icon: string;
}

export interface DifferencePoint {
  title: string;
  description: string;
  /** lucide-react icon name */
  icon: string;
}

export interface CommitmentPoint {
  title: string;
  description: string;
  /** lucide-react icon name */
  icon: string;
}

export interface CaseResult {
  outcome: string;
  context: string;
}

export interface TrustBadge {
  label: string;
  /** lucide-react icon name */
  icon: string;
}

export interface Address {
  street: string;
  city: string;
  state: string;
  zip: string;
  full: string;
}

export interface SiteConfig {
  attorney: {
    name: string;
    shortName: string;
    credential: string;
  };
  firm: string;
  tagline: string;
  taglineCaps: string;
  yearsExperience: number;
  phone: string;
  phoneHref: string;
  tollFree: string;
  tollFreeHref: string;
  email: string;
  address: Address;
  serviceArea: string;
  education: string[];
  barAdmissions: string[];
  languages: string[];
  navLinks: NavLink[];
  practiceAreas: PracticeArea[];
  differencePoints: DifferencePoint[];
  commitmentPoints: CommitmentPoint[];
  results: CaseResult[];
  trustBadges: TrustBadge[];
  disclaimer: string;
  privacyNote: string;
}

export const navLinks: NavLink[] = [
  { label: "About", href: "#about" },
  { label: "Why Barone", href: "#difference" },
  { label: "Practice Areas", href: "#practice-areas" },
  { label: "Our Commitment", href: "#commitment" },
  { label: "Results", href: "#results" },
  { label: "Contact", href: "#contact" },
];

export const practiceAreas: PracticeArea[] = [
  {
    slug: "criminal-defense",
    title: "Criminal Defense",
    description:
      "Comprehensive defense across all major categories — assault, drug offenses, theft, weapons charges, and serious felonies — built on four decades of courtroom experience.",
    icon: "Scale",
  },
  {
    slug: "dui-dwi-defense",
    title: "DUI / DWI Defense",
    description:
      "An OUI arrest puts your license and your freedom on the line. Get a defense strategy focused on protecting both from day one.",
    icon: "Car",
  },
  {
    slug: "domestic-violence-defense",
    title: "Domestic Violence Defense & Restraining Orders",
    description:
      "Level-headed, discreet representation in 209A restraining order matters and domestic charges, when emotions run high and the stakes are personal.",
    icon: "ShieldAlert",
  },
  {
    slug: "white-collar-crime",
    title: "White Collar Crime",
    description:
      "Fraud, embezzlement, and federal investigations handled discreetly — protecting your reputation, your career, and your future.",
    icon: "Briefcase",
  },
  {
    slug: "juvenile-law",
    title: "Juvenile Law",
    description:
      "A young person's mistake should not define their life. Focused advocacy to protect a juvenile's record, education, and future.",
    icon: "Users",
  },
  {
    slug: "criminal-appeals",
    title: "Criminal Appeals & Post-Conviction Relief",
    description:
      "When the first result was wrong, the fight is not over. Experienced appellate advocacy for a second look at your case.",
    icon: "Gavel",
  },
  {
    slug: "expungement-record-sealing",
    title: "Expungement & Record Sealing",
    description:
      "Clear the past and move forward. Guidance through Massachusetts expungement and record-sealing so old charges stop holding you back.",
    icon: "FileCheck",
  },
];

export const differencePoints: DifferencePoint[] = [
  {
    title: "A Proven Track Record",
    description:
      "Decades of not-guilty verdicts, dismissals, and favorable resolutions earned in courtrooms across Massachusetts — the kind of record built one case at a time.",
    icon: "Trophy",
  },
  {
    title: "A Network of Expert Witnesses",
    description:
      "Access to seasoned investigators, psychiatrists, and forensic experts who help test the government's case and build yours.",
    icon: "Network",
  },
  {
    title: "State and Federal Court Experience",
    description:
      "Aggressive yet strategic defense in Massachusetts state courts and Federal Courts throughout New England, including the First Circuit.",
    icon: "Building2",
  },
  {
    title: "Four Decades in the Courtroom",
    description:
      "44 years of criminal defense practice means there is very little Ted Barone hasn't seen — and very little that surprises him at trial.",
    icon: "Award",
  },
  {
    title: "Personal Attention, Always",
    description:
      "When you hire Barone Law Offices, you work directly with Ted Barone. Your case is never handed off, and your questions never go unanswered.",
    icon: "UserCheck",
  },
];

export const commitmentPoints: CommitmentPoint[] = [
  {
    title: "You're Never Alone",
    description:
      "Facing a criminal charge is frightening and isolating. From the first call to the final resolution, you have an experienced advocate standing beside you.",
    icon: "HeartHandshake",
  },
  {
    title: "Client-Centered, Judgment-Free",
    description:
      "Good people find themselves in hard situations. You will be heard, respected, and defended — never judged.",
    icon: "Handshake",
  },
  {
    title: "Available When It Matters",
    description:
      "Arrests and arraignments don't keep business hours. When a critical moment arrives, you can reach your attorney.",
    icon: "PhoneCall",
  },
  {
    title: "Clear, Honest Communication",
    description:
      "You will always know where your case stands, what your options are, and what happens next — in plain language, not legalese.",
    icon: "MessageSquare",
  },
];

export const results: CaseResult[] = [
  {
    outcome: "Not Guilty",
    context: "Felony assault charge tried to verdict before a jury",
  },
  {
    outcome: "Dismissed",
    context: "Drug possession charges dismissed after a successful motion to suppress",
  },
  {
    outcome: "No Indictment",
    context: "Grand jury declined to indict following a pre-charge defense investigation",
  },
  {
    outcome: "Charges Reduced",
    context: "Felony charge resolved as a misdemeanor, avoiding jail time",
  },
  {
    outcome: "Case Won on Appeal",
    context: "Conviction vacated by the appellate court and relief granted",
  },
  {
    outcome: "Record Sealed",
    context: "Prior charges sealed, restoring employment and housing opportunities",
  },
];

export const trustBadges: TrustBadge[] = [
  { label: "44+ Years Experience", icon: "Award" },
  { label: "Massachusetts Bar", icon: "Landmark" },
  { label: "Federal Court Experience", icon: "Building2" },
  { label: "Multilingual", icon: "Languages" },
];

export const disclaimer =
  "This website is attorney advertising and is for general informational purposes only; it does not constitute legal advice and does not create an attorney-client relationship. Prior results do not guarantee a similar outcome. Every case is different and must be judged on its own facts. Contacting Barone Law Offices through this website does not establish an attorney-client relationship. Please do not send confidential information until such a relationship has been established in writing.";

export const privacyNote =
  "Your inquiry is kept confidential to the extent permitted by law, but please do not include sensitive case details in this form.";

/** Returns the copyright line for the footer, e.g. "© 2026 Barone Law Offices. All rights reserved." */
export function copyright(year: number = new Date().getFullYear()): string {
  return `© ${year} Barone Law Offices. All rights reserved.`;
}

export const siteConfig: SiteConfig = {
  attorney: {
    name: 'Theodore "Ted" Barone',
    shortName: "Ted Barone",
    credential: "Attorney at Law",
  },
  firm: "Barone Law Offices",
  tagline: "You're Not Alone When You Got Barone!",
  taglineCaps: "YOU'RE NOT ALONE WHEN YOU GOT BARONE!",
  yearsExperience: 44,
  phone: "(508) 584-0411",
  phoneHref: "tel:+15085840411",
  tollFree: "(877) 718-4400",
  tollFreeHref: "tel:+18777184400",
  email: "intake@baronelaw.com",
  address: {
    street: "130 Liberty St, Unit 2B",
    city: "Brockton",
    state: "MA",
    zip: "02301",
    full: "130 Liberty St, Unit 2B, Brockton, MA 02301",
  },
  serviceArea:
    "Serving Boston, the South Shore, Plymouth County, and Federal Courts throughout New England",
  education: [
    "Boston College — B.A.",
    "Tufts University — M.S.",
    "Cleveland State University School of Law — J.D., 1980",
  ],
  barAdmissions: [
    "Massachusetts (1981)",
    "U.S. District Courts",
    "U.S. Court of Appeals, First Circuit",
  ],
  languages: ["English", "Italian", "Spanish"],
  navLinks,
  practiceAreas,
  differencePoints,
  commitmentPoints,
  results,
  trustBadges,
  disclaimer,
  privacyNote,
};

export default siteConfig;
