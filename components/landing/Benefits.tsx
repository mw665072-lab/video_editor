"use client";

import { motion } from "framer-motion";
import {
  Clock,
  Globe,
  Sparkles,
  Smartphone,
  Subtitles,
  Send,
} from "lucide-react";
import { S } from "./landingStyles";

const benefitsList = [
  {
    icon: <Clock size={22} />,
    title: "Precise YouTube video trimmer",
    description: "Choose exact start and end times and keep only the section you need.",
  },
  {
    icon: <Globe size={22} />,
    title: "Online YouTube video cutter",
    description: "Cut clips in your browser with no desktop editing software.",
  },
  {
    icon: <Sparkles size={22} />,
    title: "Highlights found for you",
    description: "Skip scrubbing through hour-long videos. Find Moments suggests segments worth reviewing.",
  },
  {
    icon: <Smartphone size={22} />,
    title: "Formats for every platform",
    description: "Export with the right aspect ratio for YouTube Shorts, Instagram Reels, TikTok and standard video.",
  },
  {
    icon: <Subtitles size={22} />,
    title: "Captions and transcripts included",
    description: "Generate subtitles and a timestamped transcript from the same video link.",
  },
  {
    icon: <Send size={22} />,
    title: "Publish straight from the editor",
    description: "Send finished clips to YouTube or Facebook without downloading and re-uploading.",
  },
];

export default function Benefits() {
  return (
    <section id="why-use-it" style={{ ...S.section, padding: "100px 0", background: "#f8f9fd", borderTop: "1px solid #e4e6f2" }}>
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
            Why Use It
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
            Trim, Cut and Share Video Clips Faster
          </h2>
        </div>

        <div
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
        >
          {benefitsList.map((item, index) => (
            <motion.div
              key={item.title}
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.05, duration: 0.35 }}
              style={{
                borderRadius: "1.5rem",
                border: "1px solid #e4e6f2",
                background: "#ffffff",
                padding: "32px 28px",
                boxShadow: "0 10px 30px rgba(88,66,237,0.04)",
                transition: "all 0.25s ease",
              }}
              className="group hover:-translate-y-1 hover:border-[#5842ed]/40 hover:shadow-[0_20px_48px_rgba(88,66,237,0.08)]"
            >
              <div
                style={{
                  width: 48,
                  height: 48,
                  borderRadius: 14,
                  background: "#f0eeff",
                  border: "1px solid #ded7fb",
                  color: "#5842ed",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  marginBottom: 20,
                  boxShadow: "0 4px 12px rgba(88,66,237,0.08)",
                }}
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
