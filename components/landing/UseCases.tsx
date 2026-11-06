"use client";

import { motion } from "framer-motion";
import { Mic, Youtube, Gamepad2, GraduationCap } from "lucide-react";
import { S } from "./landingStyles";

const useCasesList = [
  {
    icon: <Mic size={24} />,
    title: "Podcasts and interviews",
    description: "Pull quotable moments and standout answers into short, shareable clips.",
  },
  {
    icon: <Youtube size={24} />,
    title: "YouTube videos and Shorts",
    description: "Cut a section from a longer video for highlights or tutorials, or turn a strong opening into a vertical Short.",
  },
  {
    icon: <Gamepad2 size={24} />,
    title: "Gaming and entertainment",
    description: "Save wins, clutch plays and funny reactions.",
  },
  {
    icon: <GraduationCap size={24} />,
    title: "Education and marketing",
    description: "Clip one concept from a lecture or training video, or repurpose webinars, demos and ads into short social posts.",
  },
];

export default function UseCases() {
  return (
    <section id="use-cases" style={{ ...S.section, padding: "100px 0", background: "#ffffff", borderTop: "1px solid #e4e6f2", position: "relative", overflow: "hidden" }}>
      {/* Decorative dot grid patterns */}
      <div className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 opacity-35 hidden xl:block">
        <svg width="60" height="120" viewBox="0 0 60 120" fill="none">
          <pattern id="dot-pattern-left" x="0" y="0" width="15" height="15" patternUnits="userSpaceOnUse">
            <circle cx="2" cy="2" r="1.5" fill="#5842ed" />
          </pattern>
          <rect width="60" height="120" fill="url(#dot-pattern-left)" />
        </svg>
      </div>
      <div className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 opacity-35 hidden xl:block">
        <svg width="60" height="120" viewBox="0 0 60 120" fill="none">
          <pattern id="dot-pattern-right" x="0" y="0" width="15" height="15" patternUnits="userSpaceOnUse">
            <circle cx="2" cy="2" r="1.5" fill="#5842ed" />
          </pattern>
          <rect width="60" height="120" fill="url(#dot-pattern-right)" />
        </svg>
      </div>

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
            Use Cases
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
            Turn Long Videos Into Short Clips
          </h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 relative z-10">
          {useCasesList.map((item, index) => (
            <motion.div
              key={item.title}
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.06, duration: 0.35 }}
              style={{
                borderRadius: "1.75rem",
                border: "1px solid #e4e6f2",
                background: "#f8f9fd",
                padding: "36px 26px",
                boxShadow: "0 10px 30px rgba(88,66,237,0.03)",
                transition: "all 0.25s ease",
              }}
              className="group hover:-translate-y-1.5 hover:border-[#5842ed]/40 hover:bg-white hover:shadow-[0_20px_48px_rgba(88,66,237,0.08)]"
            >
              <div
                style={{
                  width: 50,
                  height: 50,
                  borderRadius: 16,
                  background: "#ffffff",
                  border: "1px solid #ded7fb",
                  color: "#5842ed",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  marginBottom: 22,
                  boxShadow: "0 4px 12px rgba(88,66,237,0.06)",
                  transition: "transform 0.2s ease",
                }}
                className="group-hover:scale-105"
              >
                {item.icon}
              </div>
              <h3
                style={{
                  fontFamily: "'Plus Jakarta Sans', sans-serif",
                  fontSize: 18,
                  fontWeight: 800,
                  color: "#110d2e",
                  letterSpacing: "-0.02em",
                  marginBottom: 10,
                }}
              >
                {item.title}
              </h3>
              <p
                style={{
                  fontSize: 14,
                  color: "#5e6578",
                  lineHeight: 1.7,
                }}
              >
                {item.description}
              </p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
