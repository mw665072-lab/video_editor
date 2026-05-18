"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { S } from "./landingStyles";
import { platforms, clipDurations } from "./landingData";

/* ─── Keyframe animations ─────────────────────────────────────────────────── */
const HERO_CSS = `
@keyframes hero-orbit-cw  { from{transform:rotate(0deg)}  to{transform:rotate(360deg)}  }
@keyframes hero-orbit-ccw { from{transform:rotate(0deg)}  to{transform:rotate(-360deg)} }
@keyframes hero-pulse {
  0%,100%{ opacity:.35; transform:scale(1);   }
  50%    { opacity:.85; transform:scale(1.07); }
}
@keyframes hero-eye {
  0%,100%{ opacity:.45; }
  50%    { opacity:1;   }
}
@keyframes hero-blink {
  0%,100%{ opacity:1;   }
  50%    { opacity:.15; }
}
@keyframes hero-grad {
  0%  { background-position:0%   50%; }
  50% { background-position:100% 50%; }
  100%{ background-position:0%   50%; }
}
@keyframes hero-shimmer {
  0%  { transform:translateX(-100%); }
  100%{ transform:translateX(100%);  }
}
@keyframes hero-float {
  0%,100%{ transform:translateY(0);   }
  50%    { transform:translateY(-7px); }
}
@keyframes hero-scan-h {
  0%  { top:0;   opacity:0; }
  10% { opacity:.6;         }
  90% { opacity:.6;         }
  100%{ top:100%;opacity:0; }
}
@media (max-width: 640px) {
  .hero-url-input {
    flex-wrap: wrap;
    // flex-direction: column;
    gap: 10px;
    padding: 10px 14px;
    align-items: stretch;
  }

  .hero-url-input svg {
    flex-shrink: 0;
    width: 16px;
    height: 16px;
  }

  .hero-url-input input {
    min-width: 0;
    width: 100%;
    font-size: 14px;
    padding: 8px 0;
  }

  .hero-url-input .hero-url-button {
    width: auto;
    max-width: 100%;
    margin: 0 auto;
    justify-content: center;
    padding: 10px 18px !important;
    font-size: 13px !important;
    border-radius: 999px;
  }
}
/* SVG-safe classes */
.h-ring-cw  { transform-box:fill-box; transform-origin:center; animation:hero-orbit-cw  18s linear infinite; }
.h-ring-ccw { transform-box:fill-box; transform-origin:center; animation:hero-orbit-ccw 11s linear infinite; }
.h-eye      { animation:hero-eye   2.6s ease-in-out infinite;        }
.h-eye2     { animation:hero-eye   2.6s ease-in-out infinite .45s;   }
.h-ant      { transform-box:fill-box; transform-origin:center; animation:hero-pulse 2s ease-in-out infinite; }
.h-node1    { animation:hero-pulse 2.2s ease-in-out infinite;      }
.h-node2    { animation:hero-pulse 2.2s ease-in-out infinite  .7s; }
.h-node3    { animation:hero-pulse 2.2s ease-in-out infinite 1.4s; }
`;

/* ─── Robotic AI Visual ───────────────────────────────────────────────────── */
function RoboticVisual() {
  const clips = [
    { label: "Podcast insight", time: "00:12 – 00:42", score: "98", color: "#a78bfa" },
    { label: "Product reveal",  time: "00:58 – 01:18", score: "93", color: "#ffd36b" },
    { label: "Hook moment",     time: "01:24 – 01:44", score: "89", color: "#22c55e" },
  ];
  const bars = [
    { label: "Neural Processing", value: 94, color: "#a78bfa" },
    { label: "Clip Detection",    value: 87, color: "#ffd36b" },
    { label: "Viral Score",       value: 99, color: "#22c55e" },
  ];

  return (
    <div style={{ position: "relative", width: "100%", maxWidth: 500, margin: "0 auto" }}>
      {/* ambient glow behind card */}
      <div style={{
        position: "absolute", top: "50%", left: "50%", transform: "translate(-50%,-50%)",
        width: 420, height: 420, borderRadius: "50%",
        background: "radial-gradient(circle,rgba(124,70,255,.32) 0%,transparent 70%)",
        animation: "hero-pulse 3.8s ease-in-out infinite", pointerEvents: "none", zIndex: 0,
      }}/>
      <div style={{
        position: "absolute", top: "50%", left: "50%", transform: "translate(-50%,-50%)",
        width: 560, height: 560, borderRadius: "50%",
        background: "radial-gradient(circle,rgba(255,190,112,.12) 0%,transparent 65%)",
        animation: "hero-pulse 5s ease-in-out infinite reverse", pointerEvents: "none", zIndex: 0,
      }}/>

      {/* ── Main card ── */}
      <div style={{
        position: "relative", zIndex: 1,
        background: "linear-gradient(148deg,rgba(22,8,62,.96) 0%,rgba(10,3,28,.98) 100%)",
        border: "1px solid rgba(167,139,250,.22)",
        borderRadius: 28, overflow: "hidden",
        boxShadow: [
          "0 0 0 1px rgba(167,139,250,.1)",
          "0 48px 110px rgba(6,1,20,.75)",
          "0 0 90px rgba(124,70,255,.12) inset",
        ].join(","),
        backdropFilter: "blur(28px)", WebkitBackdropFilter: "blur(28px)",
      }}>

        {/* window chrome */}
        <div style={{
          padding: "13px 18px", background: "rgba(255,255,255,.03)",
          borderBottom: "1px solid rgba(255,255,255,.07)",
          display: "flex", alignItems: "center", gap: 8,
        }}>
          {["#FF5F57","#FEBC2E","#28C840"].map((bg,i) => (
            <div key={i} style={{ width: 10, height: 10, borderRadius: "50%", background: bg }}/>
          ))}
          <span style={{ fontFamily:"'IBM Plex Mono',monospace", fontSize:10, color:"rgba(255,255,255,.38)", marginLeft:8 }}>
            clipai.app — <span style={{ color:"#a78bfa" }}>Neural Engine v3.0</span>
          </span>
          <div style={{ marginLeft:"auto", display:"flex", alignItems:"center", gap:6 }}>
            <div style={{ width:6, height:6, borderRadius:"50%", background:"#22c55e", boxShadow:"0 0 10px #22c55e", animation:"hero-blink 1.8s ease-in-out infinite" }}/>
            <span style={{ fontSize:9, color:"#22c55e", fontFamily:"'IBM Plex Mono',monospace" }}>LIVE</span>
          </div>
        </div>

        {/* ── Robot face area ── */}
        <div style={{ position:"relative" }}>
          {/* hex grid bg */}
          <svg style={{ position:"absolute", inset:0, width:"100%", height:"100%", opacity:.05, pointerEvents:"none" }}
               preserveAspectRatio="xMidYMid slice" viewBox="0 0 420 300">
            <defs>
              <pattern id="hg" x="0" y="0" width="34" height="29.4" patternUnits="userSpaceOnUse">
                <polygon points="17,2 32,10.7 32,26.7 17,35.4 2,26.7 2,10.7"
                         fill="none" stroke="rgba(167,139,250,1)" strokeWidth="0.7"/>
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#hg)"/>
          </svg>

          {/* scan line */}
          <div style={{ position:"absolute", left:0, right:0, height:1, background:"linear-gradient(90deg,transparent,rgba(167,139,250,.5),transparent)", animation:"hero-scan-h 3.5s linear infinite", zIndex:2, pointerEvents:"none" }}/>

          {/* Robot SVG */}
          <div style={{ padding:"30px 24px 14px", display:"flex", justifyContent:"center", position:"relative", zIndex:3 }}>
            <svg width="230" height="230" viewBox="0 0 230 230" fill="none" xmlns="http://www.w3.org/2000/svg">
              <defs>
                <radialGradient id="rgFace" cx="40%" cy="30%">
                  <stop offset="0%"   stopColor="#3b1d8a"/>
                  <stop offset="60%"  stopColor="#180a4e"/>
                  <stop offset="100%" stopColor="#0d0428"/>
                </radialGradient>
                <radialGradient id="rgEye" cx="50%" cy="30%">
                  <stop offset="0%"   stopColor="#e0d7ff"/>
                  <stop offset="100%" stopColor="#7c3aed"/>
                </radialGradient>
                <radialGradient id="rgGlow" cx="50%" cy="50%">
                  <stop offset="0%"   stopColor="rgba(167,139,250,.5)"/>
                  <stop offset="100%" stopColor="rgba(167,139,250,0)"/>
                </radialGradient>
                <filter id="fGlow" x="-30%" y="-30%" width="160%" height="160%">
                  <feGaussianBlur stdDeviation="2.5" result="b"/>
                  <feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge>
                </filter>
              </defs>

              {/* ── Outer orbit ring (CW) ── */}
              <g className="h-ring-cw">
                <circle cx="115" cy="115" r="106" stroke="rgba(167,139,250,.18)" strokeWidth="1" strokeDasharray="5 5"/>
                {[0,60,120,180,240,300].map((deg,i) => {
                  const r = (deg*Math.PI)/180;
                  return <circle key={i} cx={115+106*Math.cos(r)} cy={115+106*Math.sin(r)}
                                 r={i%2===0?3.5:2} fill={i%2===0?"#a78bfa":"#ffd36b"} opacity=".85"/>;
                })}
              </g>

              {/* ── Middle ring (CCW) ── */}
              <g className="h-ring-ccw">
                <circle cx="115" cy="115" r="85" stroke="rgba(255,211,107,.14)" strokeWidth="1.5" strokeDasharray="2 8"/>
                {[30,90,150,210,270,330].map((deg,i) => {
                  const r = (deg*Math.PI)/180;
                  return <rect key={i} x={115+85*Math.cos(r)-2} y={115+85*Math.sin(r)-2}
                               width="4" height="4" rx=".5" fill="rgba(255,211,107,.5)"/>;
                })}
              </g>

              {/* ── Face ── */}
              <circle cx="115" cy="115" r="66" fill="url(#rgFace)"/>
              <circle cx="115" cy="115" r="66" stroke="rgba(167,139,250,.45)" strokeWidth="1.5"/>
              {/* inner face ring detail */}
              <circle cx="115" cy="115" r="60" stroke="rgba(167,139,250,.1)" strokeWidth=".5" strokeDasharray="2 4"/>

              {/* ── Antenna (triple) ── */}
              <line x1="115" y1="49" x2="115" y2="30" stroke="rgba(167,139,250,.6)" strokeWidth="1.5"/>
              <circle cx="115" cy="27" r="4.5" fill="#a78bfa" className="h-ant" filter="url(#fGlow)"/>
              <circle cx="115" cy="27" r="8"   fill="none"   stroke="rgba(167,139,250,.3)" strokeWidth="1" className="h-ant"/>
              <line x1="115" y1="30" x2="96"  y2="17" stroke="rgba(167,139,250,.35)" strokeWidth="1"/>
              <circle cx="94"  cy="15" r="3"   fill="rgba(167,139,250,.55)" className="h-node1"/>
              <line x1="115" y1="30" x2="134" y2="17" stroke="rgba(255,211,107,.35)" strokeWidth="1"/>
              <circle cx="136" cy="15" r="3"   fill="rgba(255,211,107,.55)" className="h-node2"/>

              {/* ── Side ear sensors ── */}
              <rect x="45" y="100" width="9" height="20" rx="2.5" fill="rgba(167,139,250,.3)" stroke="rgba(167,139,250,.4)" strokeWidth=".8"/>
              <rect x="176" y="100" width="9" height="20" rx="2.5" fill="rgba(167,139,250,.3)" stroke="rgba(167,139,250,.4)" strokeWidth=".8"/>
              <rect x="46" y="106" width="7" height="4"  rx="1"   fill="rgba(167,139,250,.6)" className="h-node1"/>
              <rect x="177" y="106" width="7" height="4" rx="1"   fill="rgba(167,139,250,.6)" className="h-node2"/>

              {/* ── Eyes ── */}
              {/* left eye */}
              <rect x="77"  y="97" width="32" height="17" rx="5.5" fill="rgba(0,0,0,.75)" stroke="rgba(167,139,250,.5)" strokeWidth="1"/>
              <rect x="80"  y="100" width="26" height="11" rx="3.5" fill="url(#rgEye)" className="h-eye" opacity=".9"/>
              {/* left eye glare */}
              <rect x="80" y="100" width="8" height="4" rx="2" fill="rgba(255,255,255,.3)" opacity=".6"/>
              {/* right eye */}
              <rect x="121" y="97" width="32" height="17" rx="5.5" fill="rgba(0,0,0,.75)" stroke="rgba(167,139,250,.5)" strokeWidth="1"/>
              <rect x="124" y="100" width="26" height="11" rx="3.5" fill="url(#rgEye)" className="h-eye2" opacity=".9"/>
              <rect x="124" y="100" width="8"  height="4"  rx="2"   fill="rgba(255,255,255,.3)" opacity=".6"/>

              {/* ── Nose sensor array ── */}
              <circle cx="115" cy="124" r="3.5" fill="rgba(167,139,250,.55)" className="h-node3" filter="url(#fGlow)"/>
              <circle cx="108" cy="123" r="2"   fill="rgba(167,139,250,.3)"/>
              <circle cx="122" cy="123" r="2"   fill="rgba(167,139,250,.3)"/>

              {/* ── Mouth grid ── */}
              <rect x="86" y="133" width="58" height="13" rx="4" fill="rgba(0,0,0,.65)" stroke="rgba(167,139,250,.28)" strokeWidth="1"/>
              {[90,96,102,108,114,120,126,132,138].map((x,i) => (
                <rect key={i} x={x} y="136" width="4" height="7" rx="1"
                      fill="rgba(167,139,250,.6)"
                      opacity={[1,.35,.75,1,.5,.25,.9,.4,.8][i]}/>
              ))}

              {/* ── Circuit traces ── */}
              {/* left */}
              <polyline points="49,110 22,110 22,158" stroke="rgba(167,139,250,.35)" strokeWidth="1" strokeDasharray="4 3" fill="none"/>
              <circle cx="22" cy="158" r="3.5" fill="rgba(167,139,250,.5)" className="h-node1" filter="url(#fGlow)"/>
              {/* right */}
              <polyline points="181,110 208,110 208,158" stroke="rgba(255,211,107,.35)" strokeWidth="1" strokeDasharray="4 3" fill="none"/>
              <circle cx="208" cy="158" r="3.5" fill="rgba(255,211,107,.5)" className="h-node2" filter="url(#fGlow)"/>
              {/* top branch */}
              <polyline points="123,49 158,49 158,22" stroke="rgba(167,139,250,.22)" strokeWidth="1" strokeDasharray="3 4" fill="none"/>
              <circle cx="158" cy="22" r="2.5" fill="rgba(167,139,250,.45)"/>
              {/* bottom chin trace */}
              <polyline points="96,149 96,175 134,175 134,149" stroke="rgba(255,211,107,.15)" strokeWidth="1" strokeDasharray="2 5" fill="none"/>
            </svg>
          </div>

          {/* Status bars */}
          <div style={{ padding:"0 22px 16px", display:"flex", flexDirection:"column", gap:9 }}>
            {bars.map((bar,i) => (
              <div key={i} style={{ display:"flex", alignItems:"center", gap:10 }}>
                <span style={{ fontSize:10, color:"rgba(255,255,255,.42)", fontFamily:"'IBM Plex Mono',monospace", width:122, flexShrink:0 }}>
                  {bar.label}
                </span>
                <div style={{ flex:1, height:3, background:"rgba(255,255,255,.07)", borderRadius:2, overflow:"hidden" }}>
                  <motion.div
                    initial={{ width:0 }}
                    animate={{ width:`${bar.value}%` }}
                    transition={{ duration:1.3, delay:.6+i*.2, ease:"easeOut" }}
                    style={{ height:"100%", background:bar.color, borderRadius:2, boxShadow:`0 0 7px ${bar.color}88` }}
                  />
                </div>
                <span style={{ fontSize:10, color:bar.color, fontFamily:"'IBM Plex Mono',monospace", width:30, textAlign:"right", fontWeight:700 }}>
                  {bar.value}%
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Timeline */}
        <div style={{ padding:"10px 22px 14px", borderTop:"1px solid rgba(255,255,255,.06)" }}>
          <div style={{ display:"flex", justifyContent:"space-between", fontSize:10, color:"rgba(255,255,255,.38)", fontFamily:"'IBM Plex Mono',monospace", marginBottom:6 }}>
            <span>00:00</span>
            <span style={{ color:"#ffd36b", display:"flex", alignItems:"center", gap:4 }}>
              <span style={{ animation:"hero-blink 1.1s ease-in-out infinite" }}>▸</span> ANALYZING
            </span>
            <span>01:42</span>
          </div>
          <div style={{ height:5, background:"rgba(255,255,255,.06)", borderRadius:3, position:"relative", overflow:"hidden" }}>
            <motion.div
              initial={{ width:"0%" }}
              animate={{ width:"72%" }}
              transition={{ duration:2.4, delay:.9, ease:[.25,.46,.45,.94] }}
              style={{ height:"100%", background:"linear-gradient(90deg,#7c3aed,#a78bfa 50%,#ffd36b)", borderRadius:3, position:"relative" }}
            >
              <div style={{ position:"absolute", inset:0, background:"linear-gradient(90deg,transparent,rgba(255,255,255,.28),transparent)", animation:"hero-shimmer 1.9s ease-in-out infinite" }}/>
            </motion.div>
          </div>
          <div style={{ display:"flex", gap:6, marginTop:9 }}>
            {["5s","10s","30s","60s"].map((d) => (
              <div key={d} style={{
                padding:"3px 11px", borderRadius:100, fontSize:9,
                fontFamily:"'IBM Plex Mono',monospace",
                background:d==="30s"?"linear-gradient(135deg,#ffd36b,#ffb32c)":"rgba(255,255,255,.05)",
                color:d==="30s"?"#351765":"rgba(255,255,255,.48)",
                border:d==="30s"?"none":"1px solid rgba(255,255,255,.08)",
              }}>{d}</div>
            ))}
          </div>
        </div>

        {/* Clip results */}
        <div style={{ padding:"10px 22px 22px" }}>
          <div style={{ fontSize:9, color:"rgba(255,255,255,.38)", fontFamily:"'IBM Plex Mono',monospace", marginBottom:9, textTransform:"uppercase", letterSpacing:"0.1em" }}>
            ✦ AI Viral Clips Found
          </div>
          {clips.map((clip,i) => (
            <motion.div key={i}
              initial={{ opacity:0, x:18 }}
              animate={{ opacity:1, x:0 }}
              transition={{ duration:.45, delay:1.1+i*.16 }}
              style={{
                display:"flex", justifyContent:"space-between", alignItems:"center",
                padding:"8px 13px", borderRadius:11, marginBottom:i<clips.length-1?6:0,
                background:"rgba(255,255,255,.04)", border:"1px solid rgba(255,255,255,.07)", fontSize:12,
              }}
            >
              <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                <div style={{ width:6, height:6, borderRadius:"50%", background:clip.color, boxShadow:`0 0 9px ${clip.color}` }}/>
                <span style={{ color:"rgba(255,255,255,.85)" }}>{clip.label}</span>
              </div>
              <span style={{ color:"rgba(255,255,255,.36)", fontFamily:"'IBM Plex Mono',monospace", fontSize:9 }}>{clip.time}</span>
              <span style={{ color:clip.color, fontFamily:"'IBM Plex Mono',monospace", fontSize:11, fontWeight:700 }}>{clip.score}%</span>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ─── Hero ────────────────────────────────────────────────────────────────── */
export default function Hero() {
  const [source, setSource] = useState("");
  const [selectedDuration, setSelectedDuration] = useState("30s");
  const router = useRouter();

  return (
    <>
      <style>{HERO_CSS}</style>
      <section className="relative overflow-hidden min-h-screen" style={{
        ...S.section,
        minHeight: "100vh",
        display: "flex", flexDirection: "column", justifyContent: "center",
        // padding: "29px 44px ",
        background: [
          "radial-gradient(ellipse 80% 55% at 10% 5%,  rgba(124,70,255,.24)   0%, transparent 52%)",
          "radial-gradient(ellipse 65% 45% at 90% 12%, rgba(255,190,112,.17)  0%, transparent 48%)",
          "radial-gradient(ellipse 55% 38% at 50% 100%,rgba(34,197,94,.09)    0%, transparent 48%)",
          "radial-gradient(ellipse 40% 30% at 70% 60%, rgba(124,70,255,.1)    0%, transparent 40%)",
          "linear-gradient(168deg,#0e0530 0%,#0c0330 35%,#060116 100%)",
        ].join(","),
      }}>
        {/* fine grid */}
        <div style={{
          position:"absolute", inset:0, pointerEvents:"none", zIndex:0,
          backgroundImage:[
            "repeating-linear-gradient(0deg,  rgba(255,255,255,.022) 0px,rgba(255,255,255,.022) 1px,transparent 1px,transparent 66px)",
            "repeating-linear-gradient(90deg, rgba(255,255,255,.022) 0px,rgba(255,255,255,.022) 1px,transparent 1px,transparent 66px)",
          ].join(","),
        }}/>
        {/* ambient orbs */}
        <div style={{ position:"absolute", top:"-10%", left:"3%",  width:680, height:680, borderRadius:"50%", background:"rgba(124,70,255,.17)",  filter:"blur(190px)", pointerEvents:"none", zIndex:0 }}/>
        <div style={{ position:"absolute", top:"15%",  right:"-8%", width:460, height:460, borderRadius:"50%", background:"rgba(255,190,112,.13)", filter:"blur(150px)", pointerEvents:"none", zIndex:0 }}/>
        <div style={{ position:"absolute", bottom:"5%",left:"28%", width:380, height:380, borderRadius:"50%", background:"rgba(34,197,94,.07)",    filter:"blur(120px)", pointerEvents:"none", zIndex:0 }}/>
        {/* subtle top-center radial highlight */}
        <div style={{ position:"absolute", top:0, left:"50%", transform:"translateX(-50%)", width:900, height:260, background:"radial-gradient(ellipse 70% 100% at 50% 0%,rgba(255,255,255,.055) 0%,transparent 70%)", pointerEvents:"none", zIndex:0 }}/>

        <div className="relative mx-auto mt-7 ml-0 sm:ml-7 md:ml-0 lg:ml-7 w-full max-w-[1800px] px-4 sm:px-6 lg:px-8" style={{ zIndex:2 }}>
          <div className="grid gap-16 xl:gap-20" style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(320px,1fr))", alignItems:"center" }}>

            {/* ── Left: copy ── */}
            <motion.div initial={{ opacity:0, y:40 }} animate={{ opacity:1, y:0 }} transition={{ duration:.72 }}>

              {/* badge */}
              <motion.div
                initial={{ opacity:0, scale:.9 }} animate={{ opacity:1, scale:1 }} transition={{ duration:.5 }}
                style={{
                  display:"inline-flex", alignItems:"center", gap:8,
                  padding:"5px 14px 5px 8px", borderRadius:100,
                  background:"rgba(167,139,250,.1)", border:"1px solid rgba(167,139,250,.28)",
                  fontFamily:"'IBM Plex Mono',monospace", fontSize:11, color:"#c4b5fd", marginBottom:28,
                  backdropFilter:"blur(16px)", WebkitBackdropFilter:"blur(16px)",
                  boxShadow:"0 0 24px rgba(167,139,250,.14)",
                }}
              >
                <div style={{ width:6, height:6, borderRadius:"50%", background:"#a78bfa", boxShadow:"0 0 9px #a78bfa", animation:"hero-blink 2s ease-in-out infinite" }}/>
                NEW AI clipping workflow
              </motion.div>

              {/* ── 3-line heading ── */}
              <h1 style={{ fontFamily:"'Sora',sans-serif", fontWeight:800, lineHeight:1.07, letterSpacing:"-0.03em", marginBottom:26 }}>
                {/* line 1 */}
                <motion.span
                  initial={{ opacity:0, y:24 }} animate={{ opacity:1, y:0 }} transition={{ duration:.62, delay:.1 }}
                  style={{ display:"block", fontSize:"clamp(28px,5.6vw,76px)", color:"rgba(248,247,255,.95)" }}
                >
                  Turn your long
                </motion.span>
                {/* line 2 – animated gradient */}
                <motion.span
                  initial={{ opacity:0, y:24 }} animate={{ opacity:1, y:0 }} transition={{ duration:.62, delay:.25 }}
                  style={{
                    display:"block", fontSize:"clamp(28px,5.6vw,76px)",
                    background:"linear-gradient(135deg,#c4b5fd 0%,#a78bfa 28%,#ffd36b 68%,#ffb32c 100%)",
                    backgroundSize:"200% 200%", backgroundClip:"text",
                    WebkitBackgroundClip:"text", WebkitTextFillColor:"transparent",
                    animation:"hero-grad 4.5s ease infinite",
                  }}
                >
                  video into viral
                </motion.span>
                {/* line 3 – split accent */}
                <motion.span
                  initial={{ opacity:0, y:24 }} animate={{ opacity:1, y:0 }} transition={{ duration:.62, delay:.42 }}
                  style={{ display:"block", fontSize:"clamp(38px,5.6vw,76px)" }}
                >
                  <span style={{ color:"rgba(248,247,255,.95)" }}>clips with </span>
                  <span style={{
                    background:"linear-gradient(135deg,#ffd36b,#ffb32c,#ff9500)",
                    backgroundClip:"text", WebkitBackgroundClip:"text", WebkitTextFillColor:"transparent",
                  }}>AI magic</span>
                  <span style={{ color:"#a78bfa", marginLeft:10, display:"inline-block", animation:"hero-blink 2.8s ease-in-out infinite" }}>✦</span>
                </motion.span>
              </h1>

              <motion.p
                initial={{ opacity:0 }} animate={{ opacity:1 }} transition={{ duration:.6, delay:.62 }}
                style={{ fontSize:17, color:"rgba(248,247,255,.72)", lineHeight:1.82, marginBottom:32, maxWidth:560 }}
              >
                ClipAI uses AI to turn podcasts, webinars, tutorials, and streams into polished shorts for TikTok, Instagram, YouTube Shorts, and your dashboard workflow.
              </motion.p>

              {/* platform badges */}
              <motion.div
                initial={{ opacity:0 }} animate={{ opacity:1 }} transition={{ duration:.5, delay:.72 }}
                style={{ display:"flex", flexWrap:"wrap", gap:8, marginBottom:28 }}
              >
                {platforms.map((p) => (
                  <div key={p.name} style={{
                    display:"inline-flex", alignItems:"center", gap:6,
                    padding:"7px 12px", borderRadius:100,
                    background:p.bg, border:`1px solid ${p.border}`,
                    color:p.color, fontSize:12,
                    fontFamily:"'IBM Plex Mono',monospace", fontWeight:500,
                  }}>
                    {p.icon} {p.name}
                  </div>
                ))}
              </motion.div>

              {/* URL input */}
              <motion.div
                className="hero-url-input"
                initial={{ opacity:0, y:12 }} animate={{ opacity:1, y:0 }} transition={{ duration:.5, delay:.82 }}
                style={{
                  background:"rgba(255,255,255,.97)", border:"1px solid rgba(255,255,255,.3)", borderRadius:999,
                  padding:"8px 8px 8px 18px", display:"flex", alignItems:"center", gap:8, marginBottom:16,
                  boxShadow:"0 22px 64px rgba(10,2,30,.32), 0 0 0 1px rgba(167,139,250,.22)",
                }}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="rgba(84,49,145,.45)" strokeWidth="2">
                  <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/>
                  <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>
                </svg>
                <input
                  value={source}
                  onChange={(e) => setSource(e.target.value)}
                  placeholder="Paste YouTube, TikTok, Instagram or Facebook link…"
                  style={{ flex:1, minWidth:0, background:"transparent", border:"none", outline:"none", color:"#2B145B", fontSize:15, fontFamily:"'Manrope',sans-serif", padding:"8px 0" }}
                />
                <button
                  className="hero-url-button"
                  style={{ ...S.btnPrimary, padding:"13px 24px", fontSize:13, borderRadius:999 }}
                  onClick={() => { if (!source.trim()) return; router.push("/editor"); }}
                  onMouseEnter={(e) => { e.currentTarget.style.transform="translateY(-2px)"; e.currentTarget.style.boxShadow="0 16px 38px rgba(255,179,44,.42)"; }}
                  onMouseLeave={(e) => { e.currentTarget.style.transform="translateY(0)";   e.currentTarget.style.boxShadow="0 10px 30px rgba(255,179,44,.28)"; }}
                >
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="5 3 19 12 5 21 5 3"/></svg>
                  Get clips for free
                </button>
              </motion.div>

              {/* clip duration */}
              <motion.div
                initial={{ opacity:0 }} animate={{ opacity:1 }} transition={{ duration:.5, delay:.92 }}
                style={{ display:"flex", alignItems:"center", gap:8, flexWrap:"wrap", marginBottom:12 }}
              >
                <span style={{ fontSize:12, color:"rgba(255,255,255,.5)", fontFamily:"'IBM Plex Mono',monospace" }}>Clip length:</span>
                {clipDurations.map((d) => (
                  <button key={d} onClick={() => setSelectedDuration(d)} style={{
                    padding:"5px 14px", borderRadius:100, fontSize:12,
                    fontFamily:"'IBM Plex Mono',monospace", cursor:"pointer", border:"none",
                    background:selectedDuration===d?"linear-gradient(135deg,#ffcf5a,#ffb32c)":"rgba(255,255,255,.07)",
                    color:selectedDuration===d?"#351765":"rgba(255,255,255,.62)",
                    boxShadow:selectedDuration===d?"0 8px 22px rgba(255,179,44,.26)":"none",
                    transition:"all 0.2s",
                  }}>{d}</button>
                ))}
              </motion.div>
            </motion.div>

            {/* ── Right: robotic visual ── */}
            <motion.div
              initial={{ opacity:0, y:40 }} animate={{ opacity:1, y:0 }} transition={{ duration:.72, delay:.2 }}
              style={{ animation:"hero-float 6s ease-in-out infinite" }}
            >
              <RoboticVisual/>
            </motion.div>

          </div>
        </div>
      </section>
    </>
  );
}
