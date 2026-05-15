"use client";

import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Captions, FileText, ImagePlus, Scissors, Search, Sparkles, Video, Wand2 } from "lucide-react";
import { S } from "./landingStyles";

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

  return (
    <section id="aitools" style={{ ...S.section, padding: "38px 0 100px" }}>
      <div
        style={{
          position: "absolute",
          inset: 0,
          pointerEvents: "none",
          background:
            "radial-gradient(circle at 15% 20%, rgba(249,115,22,0.10), transparent 36%), radial-gradient(circle at 90% 65%, rgba(251,146,60,0.08), transparent 32%)",
        }}
      />

      <div style={{ ...S.container, position: "relative", zIndex: 1 }}>
        <div style={{ textAlign: "center", marginBottom: 34 }}>
          <span style={S.sectionTagCenter}>Creator AI Toolkit</span>
          <h2 style={{ ...S.sectionTitle, marginTop: 16, marginBottom: 12 }}>
            More Than Clipping.
            <br />
            A Full Creator Workflow.
          </h2>
          <p style={{ ...S.sectionSub, margin: "0 auto" }}>
            Subtitles, transcripts, thumbnails, reframing, summaries, and timeline editing are surfaced from the homepage so users can jump straight into the job they need.
          </p>
        </div>

        <div className="mx-auto grid max-w-[1280px] grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
          {creatorTools.map((tool, index) => {
            const Icon = tool.icon;

            return (
              <motion.button
                key={tool.title}
                type="button"
                initial={{ opacity: 0, y: 18 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.35, delay: index * 0.035 }}
                viewport={{ once: true }}
                onClick={() => router.push(tool.href)}
                className="group relative min-h-[148px] overflow-hidden rounded-[1.7rem] border border-white/10 bg-white/[0.055] p-5 text-left shadow-[0_20px_70px_rgba(0,0,0,0.24)] transition duration-300 hover:-translate-y-1 hover:border-orange-400/45 hover:bg-orange-500/[0.08]"
              >
                <div className="absolute inset-0 opacity-0 transition duration-300 group-hover:opacity-100" style={{ background: "radial-gradient(circle at 50% 0%, rgba(249,115,22,0.18), transparent 58%)" }} />
                {tool.badge && (
                  <span className="absolute right-4 top-4 rounded-full border border-orange-300/20 bg-orange-400/15 px-2.5 py-1 text-[11px] font-black text-orange-300">
                    {tool.badge}
                  </span>
                )}

                <div className="relative z-10 flex h-full flex-col">
                  <div className="mb-5 inline-flex h-12 w-12 items-center justify-center rounded-2xl border border-orange-400/25 bg-orange-500/10 text-orange-300 transition group-hover:scale-105 group-hover:bg-orange-500/20">
                    <Icon size={24} strokeWidth={2.4} />
                  </div>
                  <h3 className="text-base font-black text-white">{tool.title}</h3>
                  <p className="mt-2 line-clamp-3 text-sm leading-6 text-white/48">{tool.description}</p>
                </div>
              </motion.button>
            );
          })}
        </div>
      </div>
    </section>
  );
}
