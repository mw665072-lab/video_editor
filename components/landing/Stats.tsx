import { motion } from "framer-motion";
import { S } from "./landingStyles";
import { stats } from "./landingData";

export default function Stats() {
  return (
    <section style={{
      ...S.section,
      borderTop: "1px solid rgba(255,255,255,0.08)",
      borderBottom: "1px solid rgba(255,255,255,0.08)",
      background: "linear-gradient(to bottom,rgba(249,115,22,0.04),transparent)",
    }}>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)" }}>
        {stats.map((s, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: i * 0.1 }}
            viewport={{ once: true }}
            style={{
              padding: "48px 32px", background: "#05070C", textAlign: "center",
              borderRight: i < 3 ? "1px solid rgba(255,255,255,0.06)" : "none",
            }}
          >
            <div style={{
              fontFamily: "'Syne',sans-serif", fontSize: 38, fontWeight: 800,
              background: "linear-gradient(135deg,#fff,#FB923C)",
              WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text",
              marginBottom: 8,
            }}>{s.num}</div>
            <div style={{ fontSize: 13, color: "rgba(255,255,255,0.4)" }}>{s.label}</div>
          </motion.div>
        ))}
      </div>
    </section>
  );
}
