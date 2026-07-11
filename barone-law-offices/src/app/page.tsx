import Navbar from "@/components/navbar";
import Hero from "@/components/hero";
import About from "@/components/about";
import BaroneDifference from "@/components/barone-difference";
import PracticeAreas from "@/components/practice-areas";
import Commitment from "@/components/commitment";
import ResultsTrust from "@/components/results-trust";
import ConsultationCta from "@/components/consultation-cta";
import Contact from "@/components/contact";
import Footer from "@/components/footer";

export default function HomePage() {
  return (
    <>
      <Navbar />
      <main>
        <Hero />
        <About />
        <BaroneDifference />
        <PracticeAreas />
        <Commitment />
        <ResultsTrust />
        <ConsultationCta />
        <Contact />
      </main>
      <Footer />
    </>
  );
}
