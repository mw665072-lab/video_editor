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
  const previewClips = [
    { label: "Podcast insight", time: "00:12 - 00:42", score: "98" },
    { label: "Product reveal", time: "00:58 - 01:18", score: "93" },
    { label: "Hook moment", time: "01:24 - 01:44", score: "89" },
  ];

  return (
    <section style={{
      ...S.section, minHeight: "100vh",
      display: "flex", flexDirection: "column", justifyContent: "center",
      padding: "120px clamp(20px, 4vw, 40px) 96px",
      background: "radial-gradient(ellipse 78% 52% at 50% 6%, rgba(255,255,255,0.14) 0%, rgba(255,255,255,0.03) 28%, transparent 66%)",
    }}>
      <div style={{
        position: "absolute", inset: 0, pointerEvents: "none", zIndex: 0,
        backgroundImage: "repeating-linear-gradient(0deg,rgba(255,255,255,0.05) 0px,rgba(255,255,255,0.05) 1px,transparent 1px,transparent 52px),repeating-linear-gradient(90deg,rgba(255,255,255,0.05) 0px,rgba(255,255,255,0.05) 1px,transparent 1px,transparent 52px)",
      }} />
      <div style={{ position: "absolute", top: "0%", left: "8%", width: 520, height: 520, borderRadius: "50%", background: "rgba(124,70,255,0.28)", filter: "blur(145px)", pointerEvents: "none", zIndex: 0 }} />
      <div style={{ position: "absolute", top: "18%", right: "2%", width: 360, height: 360, borderRadius: "50%", background: "rgba(255,190,112,0.2)", filter: "blur(120px)", pointerEvents: "none", zIndex: 0 }} />

      <div style={{ ...S.container, position: "relative", zIndex: 2 }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: 48, alignItems: "center" }}>

          <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
            <div style={{
              display: "inline-flex", alignItems: "center", gap: 8,
              padding: "5px 14px 5px 8px", borderRadius: 100,
              background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.16)",
              fontFamily: "'IBM Plex Mono',monospace", fontSize: 11, color: "#FFD36B", marginBottom: 28,
              backdropFilter: "blur(16px)", WebkitBackdropFilter: "blur(16px)",
            }}>
              <div style={{ width: 6, height: 6, borderRadius: "50%", background: "#FFD36B" }} />
              NEW AI clipping workflow
            </div>

            <h1 style={{
              fontFamily: "'Sora',sans-serif",
              fontSize: "clamp(42px,7vw,86px)",
              fontWeight: 800, lineHeight: 1.05, letterSpacing: "-0.03em", marginBottom: 22,
            }}>
              Turn your long video into
              <br />
              viral clips <span style={S.gradientText}>with AI magic</span>
            </h1>

            <p style={{ fontSize: 18, color: "rgba(248,247,255,0.82)", lineHeight: 1.75, marginBottom: 32, maxWidth: 620 }}>
              ClipAI uses AI to turn podcasts, webinars, tutorials, and streams into polished shorts for TikTok, Instagram, YouTube Shorts, and your dashboard workflow.
            </p>

            <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 28 }}>
              {platforms.map((p) => (
                <div key={p.name} style={{
                  display: "inline-flex", alignItems: "center", gap: 6,
                  padding: "7px 12px", borderRadius: 100,
                  background: p.bg, border: `1px solid ${p.border}`,
                  color: p.color, fontSize: 12,
                  fontFamily: "'IBM Plex Mono',monospace", fontWeight: 500,
                }}>
                  {p.icon} {p.name}
                </div>
              ))}
            </div>

            <div style={{
              background: "rgba(255,255,255,0.94)", border: "1px solid rgba(255,255,255,0.3)", borderRadius: 999,
              padding: "8px 8px 8px 18px", display: "flex", alignItems: "center", gap: 8, marginBottom: 16,
              boxShadow: "0 18px 50px rgba(14, 4, 40, 0.24)",
            }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="rgba(84,49,145,0.45)" strokeWidth="2">
                <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/>
                <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>
              </svg>
              <input
                value={source}
                onChange={(e) => setSource(e.target.value)}
                placeholder="Paste YouTube, TikTok, Instagram or Facebook link…"
                style={{
                  flex: 1, background: "transparent", border: "none", outline: "none",
                  color: "#2B145B", fontSize: 15, fontFamily: "'Manrope',sans-serif", padding: "8px 0",
                }}
              />
              <button
                style={{ ...S.btnPrimary, padding: "13px 24px", fontSize: 13, borderRadius: 999 }}
                onClick={() => { if (!source.trim()) return; router.push("/editor"); }}
                onMouseEnter={(e) => { e.currentTarget.style.transform = "translateY(-1px)"; e.currentTarget.style.boxShadow = "0 16px 36px rgba(255,179,44,0.34)"; }}
                onMouseLeave={(e) => { e.currentTarget.style.transform = "translateY(0)"; e.currentTarget.style.boxShadow = "0 10px 30px rgba(255,179,44,0.28)"; }}
              >
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="5 3 19 12 5 21 5 3"/></svg>
                Get clips for free
              </button>
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
              <span style={{ fontSize: 12, color: "rgba(255,255,255,0.62)", fontFamily: "'IBM Plex Mono',monospace" }}>Clip length:</span>
              {clipDurations.map((d) => (
                <button
                  key={d}
                  onClick={() => setSelectedDuration(d)}
                  style={{
                    padding: "5px 14px", borderRadius: 100, fontSize: 12,
                    fontFamily: "'IBM Plex Mono',monospace", cursor: "pointer", border: "none",
                    background: selectedDuration === d ? "linear-gradient(135deg,#ffcf5a,#ffb32c)" : "rgba(255,255,255,0.08)",
                    color: selectedDuration === d ? "#351765" : "rgba(255,255,255,0.72)",
                    boxShadow: selectedDuration === d ? "0 10px 22px rgba(255,179,44,0.22)" : "none",
                    transition: "all 0.2s",
                  }}
                >{d}</button>
              ))}
            </div>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.15 }}>
            <div style={{
              background: "rgba(55, 24, 128, 0.3)", border: "1px solid rgba(255,255,255,0.18)", borderRadius: 34, overflow: "hidden",
              boxShadow: "0 40px 100px rgba(16, 3, 42, 0.45), 0 0 0 1px rgba(255,255,255,0.06) inset",
              backdropFilter: "blur(24px)", WebkitBackdropFilter: "blur(24px)",
            }}>
              <div style={{
                padding: "16px 18px", background: "rgba(255,255,255,0.08)",
                borderBottom: "1px solid rgba(255,255,255,0.10)",
                display: "flex", alignItems: "center", gap: 8,
              }}>
                { ["#FF5F57", "#FEBC2E", "#28C840" ].map((bg, i) => (
                  <div key={i} style={{ width: 10, height: 10, borderRadius: "50%", background: bg }} />
                )) }
                <span style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: 11, color: "rgba(255,255,255,0.62)", marginLeft: 8 }}>
                  clipai.app / AI studio
                </span>
                <div style={{ marginLeft: "auto" }}>
                  <div style={{ padding: "3px 10px", borderRadius: 999, background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.14)", fontSize: 10, color: "#FFD36B", fontFamily: "'IBM Plex Mono',monospace" }}>NEW</div>
                </div>
              </div>
              <div style={{ position: "relative", height: 220, background: "linear-gradient(135deg,#28125f,#6c2cff 58%,#d18a71)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <div style={{ width: "100%", height: "100%", position: "absolute", background: "radial-gradient(circle at 50% 20%, rgba(255,255,255,0.24), transparent 35%)" }} />
                <div style={{
                  width: 74, height: 74, borderRadius: "50%",
                  background: "linear-gradient(135deg,#ffffff,#f7d17c)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  boxShadow: "0 0 44px rgba(255,255,255,0.26)", position: "relative", zIndex: 1,
                }}>
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="#5A2BB8"><polygon points="5 3 19 12 5 21 5 3"/></svg>
                </div>
                <div style={{ position: "absolute", top: 16, left: 16, zIndex: 2, display: "flex", gap: 6, alignItems: "center", padding: "5px 12px", borderRadius: 999, background: "rgba(255,255,255,0.1)", border: "1px solid rgba(255,255,255,0.18)", fontSize: 10, color: "#ffffff", fontFamily: "'IBM Plex Mono',monospace" }}>
                  Try Kling 3.0, Veo 3, Sora 2 and more
                </div>
                <div style={{ position: "absolute", bottom: 16, right: 16, zIndex: 2, padding: "4px 10px", borderRadius: 999, background: "rgba(255,255,255,0.12)", border: "1px solid rgba(255,255,255,0.18)", fontSize: 10, color: "#FFD36B", fontFamily: "'IBM Plex Mono',monospace" }}>AI clipping</div>
              </div>
              <div style={{ padding: "14px 20px", borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: "rgba(255,255,255,0.55)", fontFamily: "'IBM Plex Mono',monospace", marginBottom: 8 }}>
                  <span>00:00</span><span style={{ color: "#FFD36B" }}>00:30</span><span>01:42</span>
                </div>
                <div style={{ height: 6, background: "rgba(255,255,255,0.08)", borderRadius: 3, position: "relative", overflow: "hidden" }}>
                  <div style={{ position: "absolute", left: "20%", width: "30%", height: "100%", background: "linear-gradient(to right,#ffd36b,#ffb32c)", borderRadius: 3 }} />
                </div>
                <div style={{ display: "flex", gap: 6, marginTop: 10 }}>
                  {["5s", "10s", "30s", "60s"].map((d) => (
                    <div key={d} style={{
                      padding: "3px 10px", borderRadius: 100, fontSize: 10,
                      fontFamily: "'IBM Plex Mono',monospace",
                      background: d === "30s" ? "linear-gradient(135deg,#ffd36b,#ffb32c)" : "rgba(255,255,255,0.06)",
                      color: d === "30s" ? "#351765" : "rgba(255,255,255,0.6)"
                    }}>{d}</div>
                  ))}
                </div>
              </div>
              <div style={{ padding: "14px 20px" }}>
                <div style={{ fontSize: 10, color: "rgba(255,255,255,0.58)", fontFamily: "'IBM Plex Mono',monospace", marginBottom: 10, textTransform: "uppercase", letterSpacing: "0.08em" }}>
                  AI Viral Clips Found
                </div>
                {previewClips.map((clip, i) => (
                  <div key={i} style={{
                    display: "flex", justifyContent: "space-between", alignItems: "center",
                    padding: "8px 12px", borderRadius: 10, marginBottom: 6,
                    background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)",
                    fontSize: 12,
                  }}>
                    <span>{clip.label}</span>
                    <span style={{ color: "rgba(255,255,255,0.48)", fontFamily: "'IBM Plex Mono',monospace", fontSize: 10 }}>{clip.time}</span>
                    <span style={{ color: "#FFE08A", fontFamily: "'IBM Plex Mono',monospace", fontSize: 11 }}>{clip.score}%</span>
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
