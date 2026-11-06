"use client";

import { useState } from "react";
import { UploadCloud, Play, Sparkles } from "lucide-react";
import { S } from "./landingStyles";

export default function UploadSection() {
  const [activePublish, setActivePublish] = useState<"YouTube" | "Facebook">("YouTube");

  return (
    <section id="direct-publishing" style={{ ...S.section, padding: "100px 0", borderTop: "1px solid #e4e6f2", background: "#f8f9fd" }}>
      <div style={{ ...S.container, position: "relative", zIndex: 1 }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: 50, alignItems: "center" }}>
          
          {/* Left Column: Headings & Platform cards */}
          <div>
            <span
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                padding: "6px 16px",
                borderRadius: 9999,
                background: "#f0eeff",
                border: "1px solid #ded7fb",
                color: "#5842ed",
                fontSize: 12,
                fontWeight: 700,
                letterSpacing: "0.06em",
                textTransform: "uppercase",
                marginBottom: 16,
              }}
            >
              Direct Publishing
            </span>
            <h2
              style={{
                fontFamily: "'Plus Jakarta Sans', sans-serif",
                fontSize: "clamp(2rem, 3.8vw, 3.2rem)",
                fontWeight: 800,
                color: "#110d2e",
                lineHeight: 1.15,
                letterSpacing: "-0.04em",
                marginTop: 12,
                marginBottom: 16,
              }}
            >
              Clip It. Then Publish It.
            </h2>
            <p
              style={{
                fontSize: "clamp(1rem, 1.2vw, 1.1rem)",
                lineHeight: 1.75,
                color: "#5e6578",
                marginBottom: 32,
              }}
            >
              Finished a clip? Publish it to YouTube or Facebook from inside the app. No downloading and no manual re-uploading.
            </p>

            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              {[
                {
                  platform: "YouTube",
                  color: "#FF0000",
                  bg: "rgba(255, 0, 0, 0.06)",
                  border: "rgba(255, 0, 0, 0.16)",
                  desc: "Upload as a YouTube Short or standard video.",
                  icon: (
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M22.54 6.42a2.78 2.78 0 0 0-1.95-1.96C18.88 4 12 4 12 4s-6.88 0-8.59.46A2.78 2.78 0 0 0 1.46 6.42C1 8.14 1 12 1 12s0 3.86.46 5.58a2.78 2.78 0 0 0 1.95 1.95C5.12 20 12 20 12 20s6.88 0 8.59-.47a2.78 2.78 0 0 0 1.95-1.95C23 15.86 23 12 23 12s0-3.86-.46-5.58z" />
                      <polygon points="9.75 15.02 15.5 12 9.75 8.98 9.75 15.02" fill="#fff" />
                    </svg>
                  ),
                },
                {
                  platform: "Facebook",
                  color: "#1877F2",
                  bg: "rgba(24, 119, 242, 0.06)",
                  border: "rgba(24, 119, 242, 0.16)",
                  desc: "Post as a Facebook Reel or page video.",
                  icon: (
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z" />
                    </svg>
                  ),
                },
              ].map((item) => (
                <div
                  key={item.platform}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 16,
                    padding: "20px 22px",
                    borderRadius: 18,
                    background: "#ffffff",
                    border: "1px solid #e4e6f2",
                    boxShadow: "0 6px 20px rgba(88,66,237,0.03)",
                  }}
                >
                  <div
                    style={{
                      width: 44,
                      height: 44,
                      borderRadius: 12,
                      background: item.bg,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      color: item.color,
                      flexShrink: 0,
                      border: `1px solid ${item.border}`,
                    }}
                  >
                    {item.icon}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontWeight: 800, fontSize: 16, color: "#110d2e", marginBottom: 3 }}>
                      {item.platform}
                    </div>
                    <div style={{ fontSize: 13, color: "#5e6578" }}>{item.desc}</div>
                  </div>
                  <div
                    style={{
                      padding: "5px 14px",
                      borderRadius: 100,
                      background: "#f0eeff",
                      border: "1px solid #ded7fb",
                      fontSize: 12,
                      fontWeight: 700,
                      color: "#5842ed",
                      whiteSpace: "nowrap",
                    }}
                  >
                    Tag: One-click
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Right Column: "Your clip is ready!" Preview Card & Upload Box */}
          <div
            style={{
              background: "#ffffff",
              border: "1px solid #e4e6f2",
              borderRadius: "2rem",
              padding: "32px 28px",
              boxShadow: "0 16px 48px rgba(88,66,237,0.06)",
            }}
          >
            {/* Header: Your clip is ready! */}
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[#f0eeff] text-[#5842ed]">
                  <Sparkles size={13} />
                </span>
                <span className="font-['Plus_Jakarta_Sans'] font-extrabold text-[#110d2e] text-base">
                  Your clip is ready!
                </span>
              </div>
              <span className="text-xs font-bold text-[#5842ed] bg-[#f0eeff] px-2.5 py-0.5 rounded-full border border-[#ded7fb]">
                HD 1080p
              </span>
            </div>

            {/* Video preview mockup */}
            <div className="relative aspect-video w-full rounded-2xl overflow-hidden bg-slate-900 mb-3 shadow-inner group">
              <img
                src="https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?auto=format&fit=crop&w=800&q=80"
                alt="Finished clip thumbnail"
                className="w-full h-full object-cover opacity-85"
              />
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#5842ed] text-white shadow-lg transition duration-200 group-hover:scale-110">
                  <Play size={20} fill="#ffffff" className="ml-1" />
                </div>
              </div>
              <div className="absolute bottom-2.5 right-2.5 rounded-md bg-black/60 px-2 py-0.5 text-[11px] font-semibold text-white">
                00:00 / 04:32
              </div>
            </div>

            {/* Scrubber audio progress bar */}
            <div className="h-2 w-full rounded-full bg-[#e4e6f2] mb-5 overflow-hidden">
              <div className="h-full w-2/5 rounded-full bg-[#5842ed]" />
            </div>

            {/* Upload your clip drop zone */}
            <div className="mb-4">
              <div className="text-xs font-bold text-[#5e6578] uppercase tracking-wider mb-2">
                Upload your clip
              </div>
              <div
                style={{
                  borderRadius: 16,
                  border: "2px dashed #ded7fb",
                  background: "#f8f9fd",
                  padding: "20px 16px",
                  textAlign: "center",
                  cursor: "pointer",
                  transition: "all 0.2s ease",
                }}
                className="hover:border-[#5842ed] hover:bg-[#f0eeff]/40"
              >
                <div
                  style={{
                    width: 40,
                    height: 40,
                    borderRadius: 12,
                    background: "#f0eeff",
                    color: "#5842ed",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    margin: "0 auto 8px",
                  }}
                >
                  <UploadCloud size={20} />
                </div>
                <div style={{ fontSize: 13, color: "#110d2e", marginBottom: 3, fontWeight: 700 }}>
                  Drag and drop your clip here
                </div>
                <div style={{ fontSize: 11, color: "#5e6578" }}>
                  MP4, MOV, WebM – up to 2GB
                </div>
              </div>
            </div>

            {/* Toggle label: Publish to */}
            <div
              style={{
                fontSize: 11,
                fontWeight: 700,
                color: "#5e6578",
                textTransform: "uppercase",
                letterSpacing: "0.06em",
                marginBottom: 8,
              }}
            >
              Publish to
            </div>

            {/* Toggle options: YouTube | Facebook */}
            <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
              {(["YouTube", "Facebook"] as const).map((platform) => {
                const isActive = activePublish === platform;
                return (
                  <button
                    key={platform}
                    type="button"
                    onClick={() => setActivePublish(platform)}
                    style={{
                      flex: 1,
                      padding: "10px",
                      borderRadius: 12,
                      fontSize: 13,
                      fontWeight: 700,
                      cursor: "pointer",
                      background: isActive ? "#f0eeff" : "#f8f9fd",
                      border: isActive ? "1.5px solid #5842ed" : "1px solid #e4e6f2",
                      color: isActive ? "#5842ed" : "#5e6578",
                      transition: "all 0.2s ease",
                    }}
                  >
                    {platform}
                  </button>
                );
              })}
            </div>

            {/* Dynamic publish button: Changes when toggle changes */}
            <button
              type="button"
              style={{
                width: "100%",
                padding: "13px 20px",
                borderRadius: 14,
                background: "#5842ed",
                color: "#ffffff",
                border: "none",
                fontSize: 14,
                fontWeight: 800,
                fontFamily: "'Plus Jakarta Sans',sans-serif",
                cursor: "pointer",
                boxShadow: "0 10px 24px rgba(88,66,237,0.25)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 8,
                transition: "background 0.2s ease",
              }}
              className="hover:bg-[#4730df]"
            >
              Publish to {activePublish}
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
