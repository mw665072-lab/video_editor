"use client";

import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { S } from "./landingStyles";

export default function CTA() {
  const router = useRouter();
  return (
    <section style={S.ctaSection}>
      <div style={{ position: "absolute", bottom: -80, left: "25%", width: 700, height: 400, borderRadius: "50%", background: "rgba(255,179,44,0.12)", filter: "blur(120px)", pointerEvents: "none" }} />
      <motion.div initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }} viewport={{ once: true }}>
        <span style={S.sectionTagCenter}>Get Started Free</span>
        <h2 style={{
          fontFamily: "'Syne',sans-serif",
          fontSize: "clamp(36px,5vw,68px)",
          fontWeight: 800, marginBottom: 20, letterSpacing: "-0.02em", lineHeight: 1.05, marginTop: 16,
        }}>
          Ready to Ship Your<br /><span style={S.gradientText}>First Viral Clip?</span>
        </h2>
        <p style={{ fontSize: 18, color: "rgba(255,255,255,0.6)", maxWidth: 480, margin: "0 auto 40px", lineHeight: 1.7 }}>
          Paste a link, pick your moment, and publish to YouTube or Facebook — all in under a minute.
        </p>
        <div style={{ display: "flex", gap: 14, justifyContent: "center", flexWrap: "wrap" }}>
          <button
            style={S.btnPrimaryLg}
            onClick={() => router.push("/editor")}
            onMouseEnter={(e) => { e.currentTarget.style.boxShadow = "0 18px 40px rgba(255,179,44,0.36)"; e.currentTarget.style.transform = "translateY(-2px)"; }}
            onMouseLeave={(e) => { e.currentTarget.style.boxShadow = "0 16px 40px rgba(255,179,44,0.24)"; e.currentTarget.style.transform = "translateY(0)"; }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="5 3 19 12 5 21 5 3"/></svg>
            Start Clipping — It&apos;s Free
          </button>
          <button
            style={S.btnGhostLg}
            onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(255,255,255,0.1)"; e.currentTarget.style.color = "#FFD36B"; e.currentTarget.style.borderColor = "rgba(255,255,255,0.28)"; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = "rgba(255,255,255,0.06)"; e.currentTarget.style.color = "rgba(255,255,255,0.9)"; e.currentTarget.style.borderColor = "rgba(255,255,255,0.2)"; }}
          >
            See How It Works →
          </button>
        </div>
      </motion.div>
    </section>
  );
}
