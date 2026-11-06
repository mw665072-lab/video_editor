"use client";

import Nav from "../components/landing/Nav";
import Hero from "../components/landing/Hero";
import Intro from "../components/landing/Intro";
import Features from "../components/landing/Features";
import Benefits from "../components/landing/Benefits";
import UseCases from "../components/landing/UseCases";
import HowItWorks from "../components/landing/HowItWorks";
import UploadSection from "../components/landing/UploadSection";
import FAQ from "../components/landing/FAQ";
import CTA from "../components/landing/CTA";
import Footer from "../components/landing/Footer";
import { FontLoader, NoiseOverlay } from "../components/landing/landingHelpers";
import { S } from "../components/landing/landingStyles";

export default function HomePage() {
  return (
    <div style={S.page}>
      <FontLoader />
      <NoiseOverlay />
      <Nav />
      <main style={{ paddingTop: 78, position: "relative", zIndex: 1 }}>
        <Hero />
        <Intro />
        <Features />
        <Benefits />
        <UseCases />
        <HowItWorks />
        <UploadSection />
        <FAQ />
        <CTA />
      </main>
      <Footer />
    </div>
  );
}
