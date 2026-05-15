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
          <p style={{ ...S.sectionSub, margin: "0 auto" }}>Paste → Clip → Publish. That&apos;s the whole workflow.</p>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(240px,1fr))", gap: 20 }}>
          {workflowSteps.map((step, i) => (
            <motion.div key={step.step} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: i * 0.1 }} viewport={{ once: true }}>
              <HoverCard baseStyle={S.howStep} hoverStyle={{ borderColor: "rgba(255,179,44,0.4)", background: "rgba(255,255,255,0.1)", transform: "translateY(-4px)" }}>
                <div style={{
                  fontFamily: "'IBM Plex Mono',monospace", fontSize: 11, fontWeight: 700, color: "#FFD36B",
                  letterSpacing: "0.1em", marginBottom: 16,
                  background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.16)",
                  display: "inline-block", padding: "4px 10px", borderRadius: 6,
                }}>{step.step}</div>
                <div style={{ color: "#FFD36B", marginBottom: 14 }}>{step.icon}</div>
                <div style={{ fontFamily: "'Sora',sans-serif", fontSize: 18, fontWeight: 700, marginBottom: 10 }}>{step.title}</div>
                <p style={{ fontSize: 14, color: "rgba(255,255,255,0.68)", lineHeight: 1.65 }}>{step.subtitle}</p>
              </HoverCard>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
