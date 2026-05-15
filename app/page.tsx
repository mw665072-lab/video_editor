"use client";

import Nav from "../components/landing/Nav";
import Hero from "../components/landing/Hero";
import CreatorTools from "../components/landing/CreatorTools";
import Stats from "../components/landing/Stats";
import Features from "../components/landing/Features";
import HowItWorks from "../components/landing/HowItWorks";
import UploadSection from "../components/landing/UploadSection";
import CTA from "../components/landing/CTA";
import Footer from "../components/landing/Footer";
import { FontLoader, NoiseOverlay } from "../components/landing/landingHelpers";
import { S } from "../components/landing/landingStyles";

export default function ClipAIPage() {
  return (
    <div style={S.page}>
      <FontLoader />
      <NoiseOverlay />
      <Nav />
      <main style={{ paddingTop: 70 }}>
        <Hero />
        <CreatorTools />
        <Stats />
        <Features />
        <HowItWorks />
        <UploadSection />
        <CTA />
      </main>
      <Footer />
    </div>
  );
}
