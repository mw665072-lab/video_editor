"use client";

import { useRouter } from "next/navigation";
import { motion, useAnimationControls } from "framer-motion";
import { Captions, FileText, ImagePlus, Scissors, Search, Sparkles, Video, Wand2 } from "lucide-react";
import { S } from "./landingStyles";
import { useEffect, useState } from "react";

const TOOL_CSS = `
@keyframes tool-bg-pan {
  0%,100% { background-position: 0% 40%; }
  50% { background-position: 100% 60%; }
}
.creator-tools-section {
  position: relative;
  overflow: hidden;
  background: #ffffff;
}
.creator-tools-bg {
  position: absolute;
  inset: 0;
  z-index: 0;
  background: radial-gradient(circle at 16% 18%, rgba(134,201,149,0.16), transparent 20%),
              radial-gradient(circle at 85% 20%, rgba(34,163,83,0.12), transparent 18%),
              radial-gradient(circle at 70% 80%, rgba(21,128,61,0.08), transparent 24%),
              linear-gradient(180deg, #ffffff 0%, #f8fafc 100%);
  background-size: 240% 240%;
  animation: tool-bg-pan 25s ease infinite;
}
.creator-tools-card {
  position: relative;
  overflow: hidden;
  border-radius: 1.7rem;
  border: 1px solid rgba(21,128,61,0.18);
  background: linear-gradient(180deg, rgba(21,128,61,0.15), rgba(134,201,149,0.12));
  backdrop-filter: blur(18px);
  -webkit-backdrop-filter: blur(18px);
  box-shadow: 0 24px 80px rgba(21, 128, 61, 0.12);
  transition: transform 0.3s ease, border-color 0.3s ease, box-shadow 0.3s ease;
  flex-shrink: 0;
  width: 100%;
  max-width: 280px;
}
.creator-tools-card:hover {
  transform: translateY(-8px);
  border-color: rgba(21,128,61,0.45);
  box-shadow: 0 32px 100px rgba(21,128,61,0.22);
}
`;

const creatorTools = [
  {
    title: "AI Clipping",
    description: "Find high-retention moments and turn long videos into short clips.",
    icon: Scissors,
    href: "/editor?tool=ai-clipping",
  },
  {
    title: "Find Moments",
    description: "Detect hooks, punchlines, topic shifts, and highlight-worthy scenes.",
    icon: Search,
    href: "/editor?tool=find-moments",
  },
  {
    title: "AI Video",
    description: "Use AI assisted editing for captions, cuts, styling, and repurposing.",
    icon: Video,
    href: "/visual-editor?tool=ai-video",
    badge: "New",
  },
  {
    title: "Video Editor",
    description: "Trim, seek, preview, arrange, and export clips from your timeline.",
    icon: Wand2,
    href: "/visual-editor",
    badge: "New",
  },
  {
    title: "Video Summary",
    description: "Generate a concise summary and chapter-style breakdown from a video.",
    icon: FileText,
    href: "/editor?tool=summary",
  },
  {
    title: "Video Transcripts",
    description: "Turn speech into searchable text for captions, blogs, and scripts.",
    icon: FileText,
    href: "/editor?tool=transcript",
    badge: "Free",
  },
  {
    title: "AI Subtitles",
    description: "Create editable captions with timing, styling, and export support.",
    icon: Captions,
    href: "/visual-editor?tool=subtitles",
    badge: "Free",
  },
  {
    title: "AI Reframe",
    description: "Convert landscape clips into Shorts, Reels, and TikTok layouts.",
    icon: Sparkles,
    href: "/visual-editor?tool=reframe",
    badge: "Free",
  },
  {
    title: "AI Thumbnail",
    description: "Generate thumbnail ideas and export-ready image frames for videos.",
    icon: ImagePlus,
    href: "/visual-editor?tool=thumbnail",
    badge: "New",
  },
];

export default function CreatorTools() {
  const router = useRouter();
  const [isDragging, setIsDragging] = useState(false);

  // Split tools into two rows
  const topRow = creatorTools.slice(0, 5);
  const bottomRow = creatorTools.slice(5);

  return (
    <>
      <style>{TOOL_CSS}</style>
      <section id="aitools" className="creator-tools-section" style={{ ...S.section, padding: "38px 0 100px" }}>
        <div className="creator-tools-bg" />

        <div style={{ ...S.container, position: "relative", zIndex: 1 }}>
          {/* Header */}
          <div style={{ textAlign: "center", marginBottom: 34 }}>
            <span style={{ ...S.sectionTagCenter, color: "#15803d", background: "rgba(21,128,61,0.1)", borderColor: "rgba(21,128,61,0.18)" }}>
              Creator AI Toolkit
            </span>
            <h2 style={{ ...S.sectionTitle, marginTop: 16, marginBottom: 12, color: "#18231b" }}>
              More Than Clipping.
              <br />
              A Full Creator Workflow.
            </h2>
            <p style={{ ...S.sectionSub, margin: "0 auto", color: "#5d6a60" }}>
              Subtitles, transcripts, thumbnails, reframing, summaries, and timeline editing are surfaced from the homepage so users can jump straight into the job they need.
            </p>
          </div>

          {/* Top Row - Moving Left to Right */}
          <div className="mb-10">
            <InfiniteSlider 
              tools={topRow} 
              direction="left" 
              router={router}
              setIsDragging={setIsDragging}
            />
          </div>

          {/* Bottom Row - Moving Right to Left */}
          <div>
            <InfiniteSlider 
              tools={bottomRow} 
              direction="right" 
              router={router}
              setIsDragging={setIsDragging}
            />
          </div>
        </div>
      </section>
    </>
  );
}

// Infinite Slider Component
function InfiniteSlider({ tools, direction, router, setIsDragging }: any) {
  const controls = useAnimationControls();
  const duplicatedTools = [...tools, ...tools, ...tools]; // Triple for smooth infinite loop

  useEffect(() => {
    const duration = direction === "left" ? 32 : 38; // Slightly different speed

    controls.start({
      x: direction === "left" ? ["0%", "-33.33%"] : ["-33.33%", "0%"],
      transition: {
        duration: duration,
        repeat: Infinity,
        ease: "linear",
      },
    });
  }, [direction, controls]);

  return (
    <div className="overflow-hidden py-4 relative">
      <motion.div
        className="flex gap-6"
        animate={controls}
        drag="x"
        dragConstraints={{ left: -200, right: 200 }}
        onDragStart={() => setIsDragging(true)}
        onDragEnd={() => setIsDragging(false)}
        whileDrag={{ scale: 0.985 }}
      >
        {duplicatedTools.map((tool: any, index: number) => {
          const Icon = tool.icon;
          return (
            <motion.button
              key={index}
              type="button"
              onClick={() => router.push(tool.href)}
              className="creator-tools-card p-6 text-left group min-h-[172px]"
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
            >
              {tool.badge && (
                <span className="absolute right-5 top-5 rounded-full border border-green-300/30 bg-white/90 px-3 py-1 text-xs font-bold text-green-700 shadow-sm">
                  {tool.badge}
                </span>
              )}

              <div className="mb-6 inline-flex h-14 w-14 items-center justify-center rounded-2xl border border-emerald-300/40 bg-white text-emerald-700 transition-all group-hover:scale-110 group-hover:rotate-6">
                <Icon size={30} strokeWidth={2.3} />
              </div>

              <h3 className="text-xl font-bold text-slate-900 mb-3 leading-tight">{tool.title}</h3>
              <p className="text-sm leading-relaxed text-slate-600 line-clamp-3">
                {tool.description}
              </p>
            </motion.button>
          );
        })}
      </motion.div>

      {/* Left & Right Fade Gradients */}
      <div className="absolute left-0 top-0 bottom-0 w-24 bg-gradient-to-r from-white via-white to-transparent pointer-events-none z-10" />
      <div className="absolute right-0 top-0 bottom-0 w-24 bg-gradient-to-l from-white via-white to-transparent pointer-events-none z-10" />
    </div>
  );
}