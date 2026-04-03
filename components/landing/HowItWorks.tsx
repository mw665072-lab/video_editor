import { motion } from "framer-motion";
import { S } from "./landingStyles";
import { workflowSteps } from "./landingData";
import { HoverCard } from "./landingHelpers";

export default function HowItWorks() {
  return (
    <section id="howitworks" style={{ ...S.section, padding: "120px 0", borderTop: "1px solid rgba(255,255,255,0.07)" }}>
      <div style={{ ...S.container, position: "relative", zIndex: 1 }}>
        <div style={{ textAlign: "center", marginBottom: 64 }}>
          <span style={S.sectionTagCenter}>How It Works</span>
          <h2 style={{ ...S.sectionTitle, marginTop: 16 }}>Three Steps.<br />Fully Automated.</h2>
          <p style={{ ...S.sectionSub, margin: "0 auto" }}>Paste → Clip → Publish. That's the whole workflow.</p>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 20 }}>
          {workflowSteps.map((step, i) => (
            <motion.div key={step.step} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: i * 0.1 }} viewport={{ once: true }}>
              <HoverCard baseStyle={S.howStep} hoverStyle={{ borderColor: "rgba(249,115,22,0.45)", background: "rgba(249,115,22,0.06)", transform: "translateY(-4px)" }}>
                <div style={{
                  fontFamily: "'Syne',sans-serif", fontSize: 11, fontWeight: 800, color: "#FB923C",
                  letterSpacing: "0.1em", marginBottom: 16,
                  background: "rgba(249,115,22,0.15)", border: "1px solid rgba(249,115,22,0.3)",
                  display: "inline-block", padding: "4px 10px", borderRadius: 6,
                }}>{step.step}</div>
                <div style={{ color: "#FB923C", marginBottom: 14 }}>{step.icon}</div>
                <div style={{ fontFamily: "'Syne',sans-serif", fontSize: 18, fontWeight: 700, marginBottom: 10 }}>{step.title}</div>
                <p style={{ fontSize: 14, color: "rgba(255,255,255,0.5)", lineHeight: 1.65 }}>{step.subtitle}</p>
              </HoverCard>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
