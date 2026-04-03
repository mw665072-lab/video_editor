"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { S } from "./landingStyles";
import { platforms, clipDurations } from "./landingData";

export default function Hero() {
  const [source, setSource] = useState("");
  const [selectedDuration, setSelectedDuration] = useState("30s");
  const router = useRouter();

  return (
    <section style={{
      ...S.section, minHeight: "100vh",
      display: "flex", flexDirection: "column", justifyContent: "center",
      padding: "110px 40px 80px",
      background: "radial-gradient(ellipse 80% 50% at 50% 0%, rgba(249,115,22,0.13) 0%, transparent 65%)",
    }}>
      <div style={{
        position: "absolute", inset: 0, pointerEvents: "none", zIndex: 0,
        backgroundImage: "repeating-linear-gradient(0deg,rgba(249,115,22,0.07) 0px,rgba(249,115,22,0.07) 1px,transparent 1px,transparent 48px),repeating-linear-gradient(90deg,rgba(249,115,22,0.07) 0px,rgba(249,115,22,0.07) 1px,transparent 1px,transparent 48px)",
      }} />
      <div style={{ position: "absolute", top: "5%", left: "5%", width: 500, height: 500, borderRadius: "50%", background: "rgba(249,115,22,0.10)", filter: "blur(130px)", pointerEvents: "none", zIndex: 0 }} />
      <div style={{ position: "absolute", top: "30%", right: "3%", width: 300, height: 300, borderRadius: "50%", background: "rgba(249,115,22,0.08)", filter: "blur(100px)", pointerEvents: "none", zIndex: 0 }} />

      <div style={{ ...S.container, position: "relative", zIndex: 2 }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 60, alignItems: "center" }}>

          <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
            <div style={{
              display: "inline-flex", alignItems: "center", gap: 8,
              padding: "5px 14px 5px 8px", borderRadius: 100,
              background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.12)",
              fontFamily: "'DM Mono',monospace", fontSize: 11, color: "#FB923C", marginBottom: 28,
            }}>
              <div style={{ width: 6, height: 6, borderRadius: "50%", background: "#F97316" }} />
              AI-Powered Video Clip Engine
            </div>

            <h1 style={{
              fontFamily: "'Syne',sans-serif",
              fontSize: "clamp(38px,5vw,68px)",
              fontWeight: 800, lineHeight: 1.05, letterSpacing: "-0.03em", marginBottom: 22,
            }}>
              Clip Any Video.<br />
              <span style={S.gradientText}>Any Platform.</span><br />
              Any Moment.
            </h1>

            <p style={{ fontSize: 17, color: "rgba(255,255,255,0.65)", lineHeight: 1.75, marginBottom: 32, maxWidth: 480 }}>
              Paste a YouTube, TikTok, Instagram or Facebook link. Pick any section, choose your clip length from 5s to 60s, and let AI find the viral moments — then publish directly to Facebook or YouTube.
            </p>

            <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 28 }}>
              {platforms.map((p) => (
                <div key={p.name} style={{
                  display: "inline-flex", alignItems: "center", gap: 6,
                  padding: "6px 12px", borderRadius: 100,
                  background: p.bg, border: `1px solid ${p.border}`,
                  color: p.color, fontSize: 12,
                  fontFamily: "'DM Mono',monospace", fontWeight: 500,
                }}>
                  {p.icon} {p.name}
                </div>
              ))}
            </div>

            <div style={{
              background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.12)", borderRadius: 14,
              padding: "6px 6px 6px 18px", display: "flex", alignItems: "center", gap: 8, marginBottom: 16,
            }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.35)" strokeWidth="2">
                <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/>
                <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>
              </svg>
              <input
                value={source}
                onChange={(e) => setSource(e.target.value)}
                placeholder="Paste YouTube, TikTok, Instagram or Facebook link…"
                style={{
                  flex: 1, background: "transparent", border: "none", outline: "none",
                  color: "#fff", fontSize: 14, fontFamily: "'DM Sans',sans-serif", padding: "8px 0",
                }}
              />
              <button
                style={{ ...S.btnPrimary, padding: "10px 20px", fontSize: 13, borderRadius: 10 }}
                onClick={() => { if (!source.trim()) return; router.push("/editor"); }}
                onMouseEnter={(e) => { e.currentTarget.style.transform = "translateY(-1px)"; e.currentTarget.style.boxShadow = "0 8px 28px rgba(249,115,22,0.55)"; }}
                onMouseLeave={(e) => { e.currentTarget.style.transform = "translateY(0)"; e.currentTarget.style.boxShadow = "0 4px 24px rgba(249,115,22,0.4)"; }}
              >
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="5 3 19 12 5 21 5 3"/></svg>
                Clip It
              </button>
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
              <span style={{ fontSize: 12, color: "rgba(255,255,255,0.35)", fontFamily: "'DM Mono',monospace" }}>Clip length:</span>
              {clipDurations.map((d) => (
                <button
                  key={d}
                  onClick={() => setSelectedDuration(d)}
                  style={{
                    padding: "5px 14px", borderRadius: 100, fontSize: 12,
                    fontFamily: "'DM Mono',monospace", cursor: "pointer", border: "none",
                    background: selectedDuration === d ? "linear-gradient(135deg,#F97316,#EA580C)" : "rgba(255,255,255,0.06)",
                    color: selectedDuration === d ? "#fff" : "rgba(255,255,255,0.45)",
                    boxShadow: selectedDuration === d ? "0 2px 12px rgba(249,115,22,0.4)" : "none",
                    transition: "all 0.2s",
                  }}
                >{d}</button>
              ))}
            </div>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.15 }}>
            <div style={{
              background: "rgba(15,17,26,0.9)", border: "1px solid rgba(255,255,255,0.12)", borderRadius: 24, overflow: "hidden",
              boxShadow: "0 40px 100px rgba(0,0,0,0.6), 0 0 0 1px rgba(255,255,255,0.04) inset",
            }}>
              <div style={{
                padding: "13px 18px", background: "rgba(255,255,255,0.03)",
                borderBottom: "1px solid rgba(255,255,255,0.10)",
                display: "flex", alignItems: "center", gap: 8,
              }}>
                { ["#FF5F57", "#FEBC2E", "#28C840" ].map((bg, i) => (
                  <div key={i} style={{ width: 10, height: 10, borderRadius: "50%", background: bg }} />
                )) }
                <span style={{ fontFamily: "'DM Mono',monospace", fontSize: 11, color: "rgba(255,255,255,0.4)", marginLeft: 8 }}>
                  clipai.app — Clip Editor
                </span>
                <div style={{ marginLeft: "auto" }}>
                  <div style={{ padding: "3px 10px", borderRadius: 6, background: "rgba(249,115,22,0.2)", border: "1px solid rgba(249,115,22,0.3)", fontSize: 10, color: "#FB923C", fontFamily: "'DM Mono',monospace" }}>● LIVE</div>
                </div>
              </div>
              <div style={{ position: "relative", height: 170, background: "linear-gradient(135deg,#0F1118,#1a1a2e)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <div style={{ width: "100%", height: "100%", position: "absolute", background: "linear-gradient(135deg,rgba(249,115,22,0.08),rgba(234,88,12,0.04))" }} />
                <div style={{
                  width: 52, height: 52, borderRadius: "50%",
                  background: "linear-gradient(135deg,#F97316,#EA580C)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  boxShadow: "0 0 30px rgba(249,115,22,0.5)", position: "relative", zIndex: 1,
                }}>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="#fff"><polygon points="5 3 19 12 5 21 5 3"/></svg>
                </div>
                <div style={{ position: "absolute", top: 12, left: 12, zIndex: 2, display: "flex", gap: 6, alignItems: "center", padding: "4px 10px", borderRadius: 8, background: "rgba(255,50,50,0.2)", border: "1px solid rgba(255,50,50,0.3)", fontSize: 10, color: "#ff7070", fontFamily: "'DM Mono',monospace" }}>
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor"><path d="M22.54 6.42a2.78 2.78 0 0 0-1.95-1.96C18.88 4 12 4 12 4s-6.88 0-8.59.46A2.78 2.78 0 0 0 1.46 6.42C1 8.14 1 12 1 12s0 3.86.46 5.58a2.78 2.78 0 0 0 1.95 1.95C5.12 20 12 20 12 20s6.88 0 8.59-.47a2.78 2.78 0 0 0 1.95-1.95C23 15.86 23 12 23 12s0-3.86-.46-5.58z"/></svg>
                  YouTube
                </div>
                <div style={{ position: "absolute", bottom: 12, right: 12, zIndex: 2, padding: "3px 8px", borderRadius: 6, background: "rgba(249,115,22,0.25)", border: "1px solid rgba(249,115,22,0.4)", fontSize: 10, color: "#FB923C", fontFamily: "'DM Mono',monospace" }}>4K</div>
              </div>
              <div style={{ padding: "14px 20px", borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: "rgba(255,255,255,0.35)", fontFamily: "'DM Mono',monospace", marginBottom: 8 }}>
                  <span>00:00</span><span style={{ color: "#FB923C" }}>▌ 00:30</span><span>01:42</span>
                </div>
                <div style={{ height: 6, background: "rgba(255,255,255,0.08)", borderRadius: 3, position: "relative", overflow: "hidden" }}>
                  <div style={{ position: "absolute", left: "20%", width: "30%", height: "100%", background: "linear-gradient(to right,#F97316,#FB923C)", borderRadius: 3 }} />
                </div>
                <div style={{ display: "flex", gap: 6, marginTop: 10 }}>
                  {["5s", "10s", "30s", "60s"].map((d) => (
                    <div key={d} style={{
                      padding: "3px 10px", borderRadius: 100, fontSize: 10,
                      fontFamily: "'DM Mono',monospace",
                      background: d === "30s" ? "linear-gradient(135deg,#F97316,#EA580C)" : "rgba(255,255,255,0.06)",
                      color: d === "30s" ? "#fff" : "rgba(255,255,255,0.35)"
                    }}>{d}</div>
                  ))}
                </div>
              </div>
              <div style={{ padding: "14px 20px" }}>
                <div style={{ fontSize: 10, color: "rgba(255,255,255,0.35)", fontFamily: "'DM Mono',monospace", marginBottom: 10, textTransform: "uppercase", letterSpacing: "0.08em" }}>
                  AI Viral Clips Found
                </div>
                {[
                  { label: "🔥 High Energy", time: "00:12 – 00:42", score: "98%" },
                  { label: "💡 Key Moment", time: "00:58 – 01:28", score: "91%" },
                  { label: "😂 Funny Cut", time: "01:05 – 01:20", score: "87%" },
                ].map((clip, i) => (
                  <div key={i} style={{
                    display: "flex", justifyContent: "space-between", alignItems: "center",
                    padding: "8px 12px", borderRadius: 10, marginBottom: 6,
                    background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)",
                    fontSize: 12,
                  }}>
                    <span>{clip.label}</span>
                    <span style={{ color: "rgba(255,255,255,0.35)", fontFamily: "'DM Mono',monospace", fontSize: 10 }}>{clip.time}</span>
                    <span style={{ color: "#34D399", fontFamily: "'DM Mono',monospace", fontSize: 11 }}>{clip.score}</span>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>

        </div>
      </div>
    </section>
  );
}
