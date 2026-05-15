import { motion } from "framer-motion";
import { S } from "./landingStyles";
import { features } from "./landingData";
import { HoverCard } from "./landingHelpers";

export default function Features() {
  return (
    <section id="features" style={{ ...S.section, padding: "120px 0" }}>
      <div style={{ position: "absolute", inset: 0, pointerEvents: "none", zIndex: 0, background: "radial-gradient(circle at 30% 50%,rgba(255,179,44,0.14),transparent 50%)" }} />
      <div style={{ ...S.container, position: "relative", zIndex: 1 }}>
        <div style={{ textAlign: "center", marginBottom: 64 }}>
          <span style={S.sectionTagCenter}>What You Can Do</span>
          <h2 style={{ ...S.sectionTitle, marginTop: 16 }}>Everything Your Video<br />Clips Need</h2>
          <p style={{ ...S.sectionSub, margin: "0 auto" }}>From import to publish — all in one place. No extra apps, no friction.</p>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(260px,1fr))", gap: 18 }}>
          {features.map((f, i) => (
            <motion.div key={i} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: i * 0.08 }} viewport={{ once: true }}>
              <HoverCard baseStyle={S.featureCard} hoverStyle={{ borderColor: "rgba(255,179,44,0.42)", background: "rgba(255,255,255,0.1)", transform: "translateY(-5px)", boxShadow: "0 20px 50px rgba(16,3,42,0.24)" }}>
                <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: 2, background: "linear-gradient(to right,#FFD36B,#FFB32C)", borderRadius: "0 0 4px 4px" }} />
                <div style={{
                  width: 50, height: 50, borderRadius: 13, marginBottom: 20,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  background: "linear-gradient(135deg,rgba(255,211,107,0.22),rgba(255,255,255,0.08))",
                  border: "1px solid rgba(255,255,255,0.18)", color: "#FFD36B",
                }}>{f.icon}</div>
                <div style={{ fontFamily: "'Sora',sans-serif", fontSize: 17, fontWeight: 700, marginBottom: 10 }}>{f.title}</div>
                <div style={{ fontSize: 14, color: "rgba(255,255,255,0.68)", lineHeight: 1.65 }}>{f.description}</div>
              </HoverCard>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
