"use client";

import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { S } from "./landingStyles";

export default function CTA() {
  const router = useRouter();
  return (
    <section style={{ ...S.section, padding: "120px 0", background: "#f8fafc", color: "#111827", position: "relative", overflow: "hidden" }}>
      <div style={{ position: "absolute", bottom: -100, left: "20%", width: 680, height: 420, borderRadius: "50%", background: "rgba(21,128,61,0.14)", filter: "blur(120px)", pointerEvents: "none" }} />
      <div style={{ position: "absolute", top: 40, right: 36, width: 420, height: 420, borderRadius: "50%", background: "rgba(34,197,94,0.08)", filter: "blur(100px)", pointerEvents: "none" }} />
      <motion.div initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }} viewport={{ once: true }}>
        <div style={{ maxWidth: 960, margin: "0 auto", padding: "60px 42px", borderRadius: 32, background: "rgba(255,255,255,0.95)", boxShadow: "0 40px 120px rgba(15,23,42,0.08)" }}>
          <span style={{ ...S.sectionTagCenter, color: "#15803d", background: "rgba(21,128,61,0.1)", borderColor: "rgba(21,128,61,0.16)", display: "inline-flex" }}>Get Started Free</span>
          <h2 style={{
            fontFamily: "'Syne',sans-serif",
            fontSize: "clamp(36px,5vw,68px)",
            fontWeight: 800, marginBottom: 20, letterSpacing: "-0.02em", lineHeight: 1.05, marginTop: 16, color: "#111827",
          }}>
            Ready to Ship Your<br />
            <span style={{ color: "#166534", textDecoration: "underline", textDecorationColor: "#facc15", textDecorationThickness: "0.22em", textUnderlineOffset: "0.08em" }}>First Viral Clip?</span>
          </h2>
          <p style={{ fontSize: 18, color: "rgba(17,24,39,0.72)", maxWidth: 640, margin: "0 auto 40px", lineHeight: 1.75 }}>
            Paste a link, pick your moment, and publish to YouTube or Facebook fast. Clean, bright design with clear actions for every creator.
          </p>
          <div style={{ display: "flex", gap: 14, justifyContent: "center", flexWrap: "wrap" }}>
            <button
              style={{
                ...S.btnPrimaryLg,
                padding: "16px 26px",
                borderRadius: 999,
                background: "linear-gradient(135deg, #f59e0b, #facc15)",
                color: "#111827",
                boxShadow: "0 18px 40px rgba(202,138,4,0.22)",
              }}
              onClick={() => router.push("/editor")}
              onMouseEnter={(e) => { e.currentTarget.style.transform = "translateY(-2px)"; }}
              onMouseLeave={(e) => { e.currentTarget.style.transform = "translateY(0)"; }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="5 3 19 12 5 21 5 3"/></svg>
              Start Clipping — It&apos;s Free
            </button>
            <button
              style={{
                ...S.btnGhostLg,
                padding: "16px 24px",
                borderRadius: 999,
                background: "rgba(15,23,42,0.04)",
                color: "#111827",
                border: "1px solid rgba(15,23,42,0.12)",
              }}
              onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(15,23,42,0.08)"; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = "rgba(15,23,42,0.04)"; }}
            >
              See How It Works →
            </button>
          </div>
        </div>
      </motion.div>
    </section>
  );
}
