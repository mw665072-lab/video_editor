"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { Link2, Scissors, ArrowRight, Download } from "lucide-react";
import { S } from "./landingStyles";

const steps = [
  {
    step: "01",
    title: "Paste the video link",
    description: "Copy a YouTube or supported social video URL into the box.",
    icon: <Link2 size={24} />,
  },
  {
    step: "02",
    title: "Choose your clip",
    description: "Drag the timeline handles, enter times manually, or use Find Moments.",
    icon: <Scissors size={24} />,
  },
  {
    step: "03",
    title: "Edit and export",
    description: "Preview the clip, add subtitles, pick an aspect ratio and export.",
    icon: <Download size={24} />,
  },
];

export default function HowItWorks() {
  return (
    <section id="how-it-works" style={{ ...S.section, padding: "100px 0", borderTop: "1px solid #e4e6f2", background: "#f8f9fd", position: "relative", overflow: "hidden" }}>
      {/* Floating 3D Clapperboard Accent */}
      <motion.div
        initial={{ y: 10, rotate: 8 }}
        animate={{ y: [ 10, -10, 10 ], rotate: [ 8, 4, 8 ] }}
        transition={{ duration: 7, repeat: Infinity, ease: "easeInOut" }}
        className="pointer-events-none absolute -right-6 top-1/2 -translate-y-1/2 hidden xl:block"
      >
        <div className="relative flex h-24 w-24 items-center justify-center rounded-3xl bg-gradient-to-br from-[#7c3aed] to-[#5842ed] p-1 shadow-[0_20px_40px_rgba(88,66,237,0.32)] ring-1 ring-white/30 backdrop-blur-md">
          <div className="absolute inset-1 rounded-[22px] bg-gradient-to-t from-transparent via-white/10 to-white/30" />
          <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#ffffff" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <rect width="18" height="18" x="3" y="3" rx="3" />
            <path d="m4 11 3-8" />
            <path d="m10 11 3-8" />
            <path d="m16 11 3-8" />
            <path d="M3 11h18" />
          </svg>
        </div>
      </motion.div>

      <div style={S.container}>
        <div style={{ textAlign: "center", marginBottom: 56 }}>
          <span
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              padding: "6px 16px",
              borderRadius: 9999,
              background: "#f0eeff",
              border: "1px solid #ded7fb",
              color: "#5842ed",
              fontSize: 12,
              fontWeight: 700,
              letterSpacing: "0.06em",
              textTransform: "uppercase",
              marginBottom: 16,
            }}
          >
            How It Works
          </span>
          <h2
            style={{
              fontFamily: "'Plus Jakarta Sans', sans-serif",
              fontSize: "clamp(2rem, 3.8vw, 3.2rem)",
              fontWeight: 800,
              color: "#110d2e",
              lineHeight: 1.15,
              letterSpacing: "-0.04em",
            }}
          >
            How to Trim a YouTube Video Online
          </h2>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 24 }}>
          {steps.map((item, i) => (
            <motion.div
              key={item.step}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: i * 0.1 }}
              viewport={{ once: true }}
            >
              <div
                style={{
                  height: "100%",
                  borderRadius: "1.75rem",
                  border: "1px solid #e4e6f2",
                  background: "#f8f9fd",
                  padding: "36px 30px",
                  boxShadow: "0 10px 30px rgba(88,66,237,0.03)",
                  transition: "all 0.25s ease",
                }}
                className="hover:-translate-y-1.5 hover:border-[#5842ed]/40 hover:shadow-[0_20px_48px_rgba(88,66,237,0.08)]"
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    marginBottom: 20,
                  }}
                >
                  <div
                    style={{
                      width: 48,
                      height: 48,
                      borderRadius: 14,
                      background: "#ffffff",
                      border: "1px solid #ded7fb",
                      color: "#5842ed",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      boxShadow: "0 4px 12px rgba(88,66,237,0.08)",
                    }}
                  >
                    {item.icon}
                  </div>
                  <span
                    style={{
                      fontFamily: "'IBM Plex Mono', monospace",
                      fontSize: 13,
                      fontWeight: 800,
                      color: "#5842ed",
                      background: "#f0eeff",
                      border: "1px solid #ded7fb",
                      padding: "4px 10px",
                      borderRadius: 8,
                    }}
                  >
                    {item.step}
                  </span>
                </div>

                <h3
                  style={{
                    fontFamily: "'Plus Jakarta Sans', sans-serif",
                    fontSize: 19,
                    fontWeight: 800,
                    marginBottom: 10,
                    color: "#110d2e",
                    letterSpacing: "-0.02em",
                  }}
                >
                  {item.title}
                </h3>
                <p style={{ fontSize: 14, color: "#5e6578", lineHeight: 1.7 }}>
                  {item.description}
                </p>
              </div>
            </motion.div>
          ))}
        </div>

        <div style={{ textAlign: "center", marginTop: 48 }}>
          <Link
            href="/editor"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 10,
              padding: "16px 36px",
              borderRadius: 9999,
              background: "#5842ed",
              color: "#ffffff",
              fontFamily: "'Plus Jakarta Sans', sans-serif",
              fontWeight: 800,
              fontSize: 15,
              textDecoration: "none",
              boxShadow: "0 10px 28px rgba(88,66,237,0.28)",
              transition: "transform 0.2s ease, background 0.2s ease",
            }}
            className="hover:-translate-y-0.5 hover:bg-[#4730df]"
          >
            Start Trimming for Free <ArrowRight size={18} />
          </Link>
        </div>
      </div>
    </section>
  );
}
