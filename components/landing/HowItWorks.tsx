import { motion } from "framer-motion";
import { S } from "./landingStyles";
import { workflowSteps } from "./landingData";
import { HoverCard } from "./landingHelpers";

export default function HowItWorks() {
  return (
    <section id="howitworks" style={{ ...S.section, padding: "120px 0", borderTop: "1px solid rgba(255,255,255,0.07)", position: "relative", overflow: "hidden" }}>
      <div style={{ position: "absolute", inset: 0, zIndex: 0, overflow: "hidden" }}>
        <video
          autoPlay
          muted
          loop
          playsInline
          preload="auto"
          poster="https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&w=1600&q=80"
          style={{
            position: "absolute",
            inset: 0,
            width: "100%",
            height: "100%",
            objectFit: "cover",
            opacity: 0.24,
            filter: "brightness(0.42) saturate(1.1)",
          }}
          crossOrigin="anonymous"
        >
          <source src="https://assets.mixkit.co/videos/preview/mixkit-person-editing-video-on-a-laptop-516-large.mp4" type="video/mp4" />
          Your browser does not support the video tag.
        </video>
        <div style={{ position: "absolute", inset: 0, background: "linear-gradient(180deg, rgba(15,12,44,0.52), rgba(15,12,44,0.82))" }} />
      </div>
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
