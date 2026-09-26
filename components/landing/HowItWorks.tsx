import { motion } from "framer-motion";
import { S } from "./landingStyles";
import { workflowSteps } from "./landingData";

const HOW_IT_WORKS_CSS = `
.how-step-card {
  border-color: rgba(24,35,27,0.09);
}
.how-step-card:hover {
  border-color: rgba(21,128,61,0.28);
  background: #ffffff !important;
  transform: translateY(-4px);
  box-shadow: 0 18px 44px rgba(38,49,72,0.10);
}
`;

export default function HowItWorks() {
  return (
    <section id="howitworks" style={{ ...S.section, padding: "120px 0", borderTop: "1px solid rgba(23,32,51,0.08)", position: "relative", overflow: "hidden" }}>
      <style>{HOW_IT_WORKS_CSS}</style>
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
            opacity: 0.1,
            filter: "grayscale(0.5) brightness(1.2)",
          }}
          crossOrigin="anonymous"
        >
          <source src="https://assets.mixkit.co/videos/preview/mixkit-person-editing-video-on-a-laptop-516-large.mp4" type="video/mp4" />
          Your browser does not support the video tag.
        </video>
        <div style={{ position: "absolute", inset: 0, background: "linear-gradient(180deg, rgba(248,249,252,0.82), rgba(244,246,251,0.96))" }} />
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
              <div className="how-step-card" style={S.howStep}>
                <div style={{
                  fontFamily: "'IBM Plex Mono',monospace", fontSize: 11, fontWeight: 700, color: "#166534",
                  letterSpacing: "0.1em", marginBottom: 16,
                  background: "#edf7ef", border: "1px solid #cce8d2",
                  display: "inline-block", padding: "4px 10px", borderRadius: 6,
                }}>{step.step}</div>
                <div style={{ color: "#15803d", marginBottom: 14 }}>{step.icon}</div>
                <div style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 18, fontWeight: 700, marginBottom: 10 }}>{step.title}</div>
                <p style={{ fontSize: 14, color: "#687386", lineHeight: 1.65 }}>{step.subtitle}</p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
