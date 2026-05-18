import { motion } from "framer-motion";
import { S } from "./landingStyles";
import { stats } from "./landingData";

export default function Stats() {
  return (
    <section style={{
      ...S.section,
      borderTop: "1px solid rgba(255,255,255,0.08)",
      borderBottom: "1px solid rgba(255,255,255,0.08)",
      background: "linear-gradient(to bottom,rgba(255,255,255,0.08),rgba(255,255,255,0.02))",
    }}>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(180px,1fr))" }}>
        {stats.map((s, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: i * 0.1 }}
            viewport={{ once: true }}
            style={{
              padding: "48px 32px", background: "rgba(255,255,255,0.04)", textAlign: "center",
              borderRight: i < 3 ? "1px solid rgba(255,255,255,0.08)" : "none",
              backdropFilter: "blur(18px)",
            }}
          >
            <div style={{
              fontFamily: "'Sora',sans-serif", fontSize: 38, fontWeight: 800,
              background: "linear-gradient(135deg,#fff,#FFD36B)",
              WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text",
              marginBottom: 8,
            }}>{s.num}</div>
            <div style={{ fontSize: 13, color: "rgba(255,255,255,0.62)" }}>{s.label}</div>
          </motion.div>
        ))}
      </div>
    </section>
  );
}
