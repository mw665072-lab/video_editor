"use client";

import { motion } from "framer-motion";
import {
  Scissors,
  Layers,
  Sparkles,
  Subtitles,
  Maximize2,
  FileText,
  AlignLeft,
  Image as ImageIcon,
  Video,
} from "lucide-react";
import { S } from "./landingStyles";

const FEATURE_CSS = `
.feature-tools-section {
  position: relative;
  overflow: hidden;
  background: #f8f9fd;
}
.feature-tools-bg {
  position: absolute;
  inset: 0;
  z-index: 0;
  background: radial-gradient(circle at 16% 18%, rgba(88,66,237,0.06), transparent 25%),
              radial-gradient(circle at 85% 20%, rgba(124,58,237,0.06), transparent 22%),
              linear-gradient(180deg, #fbfbfe 0%, #f6f7fc 100%);
}
.feature-tools-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 22px;
}
@media (max-width: 1024px) {
  .feature-tools-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}
@media (max-width: 640px) {
  .feature-tools-grid {
    grid-template-columns: 1fr;
  }
}
.feature-tools-card {
  position: relative;
  overflow: hidden;
  padding: 30px;
  border-radius: 1.5rem;
  border: 1px solid #e4e6f2;
  background: #ffffff;
  box-shadow: 0 10px 30px rgba(88, 66, 237, 0.04);
  transition: transform 0.25s ease, border-color 0.25s ease, box-shadow 0.25s ease;
  cursor: default;
}
.feature-tools-card:hover {
  transform: translateY(-4px);
  border-color: rgba(88,66,237,0.35);
  box-shadow: 0 20px 48px rgba(88,66,237,0.09);
}
.feature-tools-icon {
  width: 48px;
  height: 48px;
  border-radius: 14px;
  margin-bottom: 20px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #f0eeff;
  border: 1px solid #ded7fb;
  color: #5842ed;
  transition: transform 0.25s ease;
}
.feature-tools-card:hover .feature-tools-icon {
  transform: scale(1.08);
}
.feature-tools-title {
  font-family: 'Plus Jakarta Sans', sans-serif;
  font-size: 18px;
  font-weight: 800;
  margin-bottom: 8px;
  color: #110d2e;
  letter-spacing: -0.02em;
}
.feature-tools-text {
  font-size: 14px;
  color: #5e6578;
  line-height: 1.7;
}
`;

const toolsList = [
  {
    icon: <Scissors size={22} />,
    title: "Clip Editor",
    description: "Set exact start and end points on a timeline, preview the cut and fine-tune it before export.",
  },
  {
    icon: <Layers size={22} />,
    title: "AI Clipping",
    description: "Turn a long video into several short clips, each with its own start and end time.",
  },
  {
    icon: <Sparkles size={22} />,
    title: "Find Moments",
    description: "Scans a video for strong hooks, key points and high-interest segments that could work as Shorts.",
  },
  {
    icon: <Subtitles size={22} />,
    title: "AI Subtitles",
    description: "Generates captions from speech. Edit the text, then burn it into your clip.",
  },
  {
    icon: <Maximize2 size={22} />,
    title: "AI Reframe",
    description: "Converts landscape video to 9:16, 1:1 or 16:9 and keeps the speaker in frame.",
  },
  {
    icon: <FileText size={22} />,
    title: "Video Transcript",
    description: "Converts speech to searchable text with timestamps.",
  },
  {
    icon: <AlignLeft size={22} />,
    title: "Video Summary",
    description: "Condenses a long video into key points so you can decide what’s worth clipping.",
  },
  {
    icon: <ImageIcon size={22} />,
    title: "AI Thumbnail",
    description: "Creates thumbnail options for your clips and uploads.",
  },
  {
    icon: <Video size={22} />,
    title: "AI Video",
    description: "Additional generation and editing tools in the same editor.",
  },
];

export default function Features() {
  return (
    <section id="features" className="feature-tools-section" style={{ ...S.section, padding: "100px 0" }}>
      <style>{FEATURE_CSS}</style>
      <div className="feature-tools-bg" />
      <div style={{ ...S.container, position: "relative", zIndex: 1 }}>
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
            Features
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
            Tools for Trimming, Clipping and Repurposing Video
          </h2>
        </div>

        <div className="feature-tools-grid">
          {toolsList.map((item, index) => (
            <motion.div
              key={item.title}
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.05, duration: 0.35 }}
              className="feature-tools-card"
            >
              <div className="feature-tools-icon">{item.icon}</div>
              <h3 className="feature-tools-title">{item.title}</h3>
              <p className="feature-tools-text">{item.description}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
