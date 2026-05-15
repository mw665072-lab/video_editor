import { motion } from "framer-motion";
import { S } from "./landingStyles";
import { features } from "./landingData";

const FEATURE_CSS = `
@keyframes feature-bg-pan {
  0%,100% { background-position: 0% 40%; }
  50% { background-position: 100% 60%; }
}
.feature-tools-section {
  position: relative;
  overflow: hidden;
  background: #f8f7ff;
}
.feature-tools-bg {
  position: absolute;
  inset: 0;
  z-index: 0;
  background: radial-gradient(circle at 16% 18%, rgba(167,139,250,0.16), transparent 20%),
              radial-gradient(circle at 85% 20%, rgba(139,92,246,0.12), transparent 18%),
              radial-gradient(circle at 70% 80%, rgba(124,58,237,0.08), transparent 24%),
              linear-gradient(180deg, #ffffff 0%, #f8fafc 100%);
  background-size: 240% 240%;
  animation: feature-bg-pan 20s ease infinite;
}
.feature-tools-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
  gap: 18px;
}
.feature-tools-card {
  position: relative;
  overflow: hidden;
  padding: 28px;
  border-radius: 1.7rem;
  border: 1px solid rgba(124,58,237,0.18);
  background: linear-gradient(180deg, rgba(124,58,237,0.15), rgba(167,139,250,0.12));
  backdrop-filter: blur(18px);
  -webkit-backdrop-filter: blur(18px);
  box-shadow: 0 24px 80px rgba(124, 58, 237, 0.12);
  transition: transform 0.3s ease, border-color 0.3s ease, box-shadow 0.3s ease;
  cursor: default;
}
.feature-tools-card::before {
  content: "";
  position: absolute;
  inset: 0;
  background: radial-gradient(circle at top left, rgba(167,139,250,0.22), transparent 30%),
              radial-gradient(circle at bottom right, rgba(192,132,252,0.16), transparent 30%);
  opacity: 0;
  transition: opacity 0.35s ease;
  pointer-events: none;
}
.feature-tools-card:hover::before {
  opacity: 1;
}
.feature-tools-card:hover {
  transform: translateY(-6px);
  border-color: rgba(124,58,237,0.35);
  box-shadow: 0 28px 90px rgba(124,58,237,0.18);
}
.feature-tools-icon {
  width: 50px;
  height: 50px;
  border-radius: 13px;
  margin-bottom: 20px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, rgba(255,211,107,0.22), rgba(255,255,255,0.08));
  border: 1px solid rgba(255,255,255,0.18);
  color: #7c3aed;
  transition: transform 0.3s ease;
}
.feature-tools-card:hover .feature-tools-icon {
  transform: scale(1.06);
}
.feature-tools-title {
  font-family: 'Sora', sans-serif;
  font-size: 17px;
  font-weight: 700;
  margin-bottom: 10px;
  color: #2e1065;
}
.feature-tools-text {
  font-size: 14px;
  color: rgba(46,16,101,0.78);
  line-height: 1.75;
}
`;

export default function Features() {
  return (
    <section id="features" className="feature-tools-section" style={{ ...S.section, padding: "120px 0" }}>
      <style>{FEATURE_CSS}</style>
      <div className="feature-tools-bg" />
      <div style={{ ...S.container, position: "relative", zIndex: 1 }}>
        <div style={{ textAlign: "center", marginBottom: 64 }}>
          <span style={{
            ...S.sectionTagCenter,
            color: "#7c3aed",
            background: "rgba(124,58,237,0.1)",
            borderColor: "rgba(124,58,237,0.18)",
          }}>
            What You Can Do
          </span>
          <h2 style={{ ...S.sectionTitle, marginTop: 16, marginBottom: 12, color: "#2e1065" }}>
            Everything Your Video<br />Clips Need
          </h2>
          <p style={{ ...S.sectionSub, margin: "0 auto", color: "#4b2cbf" }}>
            From import to publish — all in one place. No extra apps, no friction.
          </p>
        </div>
        <div className="feature-tools-grid">
          {features.map((f, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: i * 0.08 }}
              viewport={{ once: true }}
            >
              <div className="feature-tools-card">
                <div className="feature-tools-icon">{f.icon}</div>
                <div className="feature-tools-title">{f.title}</div>
                <div className="feature-tools-text">{f.description}</div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
