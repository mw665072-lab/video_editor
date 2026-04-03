"use client";

import { useState } from "react";
import { S } from "./landingStyles";

export default function UploadSection() {
  const [activePublish, setActivePublish] = useState<"YouTube" | "Facebook">("YouTube");

  return (
    <section style={{ ...S.section, padding: "120px 0", borderTop: "1px solid rgba(255,255,255,0.07)", background: "linear-gradient(to bottom,transparent,rgba(249,115,22,0.04),transparent)" }}>
      <div style={{ ...S.container, position: "relative", zIndex: 1 }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 80, alignItems: "center" }}>
          <div>
            <span style={{ ...S.sectionTagCenter, display: "block", width: "fit-content", marginBottom: 16 }}>Direct Publishing</span>
            <h2 style={{ ...S.sectionTitle, marginTop: 16 }}>Clip It. Then<br /><span style={S.gradientText}>Publish It.</span></h2>
            <p style={{ ...S.sectionSub, marginBottom: 36 }}>
              After you create your perfect clip, push it directly to YouTube or Facebook from inside the app. No downloading, no re-uploading manually — one click and it's live.
            </p>
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              {[
                { platform: "YouTube", color: "#FF5555", bg: "rgba(255,85,85,0.10)", border: "rgba(255,85,85,0.25)", desc: "Upload as YouTube Short or standard video", icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M22.54 6.42a2.78 2.78 0 0 0-1.95-1.96C18.88 4 12 4 12 4s-6.88 0-8.59.46A2.78 2.78 0 0 0 1.46 6.42C1 8.14 1 12 1 12s0 3.86.46 5.58a2.78 2.78 0 0 0 1.95 1.95C5.12 20 12 20 12 20s6.88 0 8.59-.47a2.78 2.78 0 0 0 1.95-1.95C23 15.86 23 12 23 12s0-3.86-.46-5.58z"/><polygon points="9.75 15.02 15.5 12 9.75 8.98 9.75 15.02" fill="#fff"/></svg> },
                { platform: "Facebook", color: "#5B9CF6", bg: "rgba(91,156,246,0.10)", border: "rgba(91,156,246,0.25)", desc: "Post as Facebook Reel or page video", icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"/></svg> },
              ].map((item) => (
                <div key={item.platform} style={{
                  display: "flex", alignItems: "center", gap: 16, padding: "18px 20px",
                  borderRadius: 16, background: item.bg, border: `1px solid ${item.border}`,
                }}>
                  <div style={{ width: 42, height: 42, borderRadius: 12, background: item.bg, display: "flex", alignItems: "center", justifyContent: "center", color: item.color, flexShrink: 0, border: `1px solid ${item.border}` }}>{item.icon}</div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontFamily: "'Syne',sans-serif", fontWeight: 700, fontSize: 15, marginBottom: 3 }}>{item.platform}</div>
                    <div style={{ fontSize: 13, color: "rgba(255,255,255,0.45)" }}>{item.desc}</div>
                  </div>
                  <div style={{ padding: "5px 14px", borderRadius: 100, background: "rgba(249,115,22,0.12)", border: "1px solid rgba(249,115,22,0.28)", fontSize: 11, color: "#FB923C", fontFamily: "'DM Mono',monospace", whiteSpace: "nowrap" }}>
                    One-click →
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div style={{ ...S.glass, padding: 28 }}>
            <div style={{ fontFamily: "'DM Mono',monospace", fontSize: 10, color: "rgba(255,255,255,0.35)", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 20 }}>
              Upload Your Clip
            </div>

            <div style={{
              borderRadius: 14, border: "2px dashed rgba(249,115,22,0.3)",
              background: "rgba(249,115,22,0.04)",
              padding: "28px 20px", textAlign: "center", marginBottom: 16, cursor: "pointer",
              transition: "border-color 0.2s",
            }}>
              <div style={{ fontSize: 30, marginBottom: 8 }}>🎬</div>
              <div style={{ fontSize: 14, color: "rgba(255,255,255,0.6)", marginBottom: 4 }}>Drag & drop your clip here</div>
              <div style={{ fontSize: 12, color: "rgba(255,255,255,0.3)" }}>MP4, MOV, WebM — up to 2GB</div>
            </div>

            <div style={{ fontSize: 11, color: "rgba(255,255,255,0.35)", fontFamily: "'DM Mono',monospace", marginBottom: 10, textTransform: "uppercase", letterSpacing: "0.08em" }}>Publish to</div>
            <div style={{ display: "flex", gap: 10, marginBottom: 20 }}>
              {([
                { label: "YouTube", color: "#FF5555" },
                { label: "Facebook", color: "#5B9CF6" },
              ] as const).map((btn) => (
                <button
                  key={btn.label}
                  onClick={() => setActivePublish(btn.label)}
                  style={{
                    flex: 1, padding: "10px", borderRadius: 10, fontSize: 13,
                    fontFamily: "'DM Mono',monospace", cursor: "pointer",
                    background: activePublish === btn.label ? `${btn.color}22` : "rgba(255,255,255,0.04)",
                    border: activePublish === btn.label ? `1px solid ${btn.color}55` : "1px solid rgba(255,255,255,0.10)",
                    color: activePublish === btn.label ? btn.color : "rgba(255,255,255,0.35)",
                    transition: "all 0.2s",
                  }}
                >{btn.label}</button>
              ))}
            </div>

            <button style={{ ...S.btnPrimaryLg, width: "100%", justifyContent: "center", padding: "14px", fontSize: 14 }}>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"/><polyline points="16 6 12 2 8 6"/><line x1="12" y1="2" x2="12" y2="15"/></svg>
              Publish to {activePublish}
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
