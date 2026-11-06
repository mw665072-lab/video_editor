"use client";

import { motion } from "framer-motion";
import { Check, Play, Scissors, Sparkles, MousePointer } from "lucide-react";

export default function Intro() {
  const pills = [
    "Trim & Cut YouTube videos",
    "Save only the best parts",
    "Share your clips easily",
  ];

  return (
    <section id="about" className="relative overflow-hidden bg-[#f8f9fd] py-20 lg:py-28">
      {/* Background ambient lighting */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute right-0 top-1/2 h-[500px] w-[500px] -translate-y-1/2 rounded-full bg-gradient-to-l from-[#7c3aed]/10 to-transparent blur-[120px]" />
        <div className="absolute left-10 top-10 h-[300px] w-[300px] rounded-full bg-[#5842ed]/06 blur-[90px]" />
      </div>

      <div className="relative mx-auto max-w-[1200px] px-5 sm:px-8">
        <div className="grid grid-cols-1 items-center gap-12 lg:grid-cols-12 lg:gap-14">
          
          {/* Left Column: Browser Window Mockup with Video & Trimming Scrubber */}
          <motion.div
            initial={{ opacity: 0, x: -24 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.55 }}
            className="lg:col-span-6"
          >
            <div className="relative rounded-3xl border border-[#e4e6f2] bg-white p-4 shadow-[0_20px_50px_rgba(88,66,237,0.08)] sm:p-5">
              {/* Browser window header */}
              <div className="flex items-center gap-2 pb-3 mb-3 border-b border-[#f0eeff]">
                <span className="h-3 w-3 rounded-full bg-[#ff5f56]" />
                <span className="h-3 w-3 rounded-full bg-[#ffbd2e]" />
                <span className="h-3 w-3 rounded-full bg-[#27c93f]" />
                <div className="mx-auto flex h-6 w-48 items-center justify-center rounded-lg bg-[#f8f9fd] text-[11px] font-medium text-[#8a92a6]">
                  youtubevideotrimmer.com
                </div>
              </div>

              {/* Video Player Display */}
              <div className="relative aspect-video w-full overflow-hidden rounded-2xl bg-slate-900 shadow-inner group">
                <img
                  src="https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=800&q=80"
                  alt="Video Trimmer Preview"
                  className="h-full w-full object-cover opacity-85"
                />
                {/* Center Play Button Overlay */}
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[#5842ed] text-white shadow-[0_8px_24px_rgba(88,66,237,0.45)] transition duration-200 group-hover:scale-110">
                    <Play size={24} fill="#ffffff" className="ml-1" />
                  </div>
                </div>

                {/* Time badge */}
                <div className="absolute bottom-3 right-3 rounded-md bg-black/60 px-2 py-1 text-[11px] font-semibold text-white backdrop-blur-sm">
                  01:24 / 04:30
                </div>
              </div>

              {/* Timeline Scrubber Mockup */}
              <div className="mt-4 rounded-xl border border-[#ded7fb] bg-[#f8f9fd] p-3.5 relative">
                <div className="flex items-center justify-between text-[11px] font-bold text-[#5e6578] mb-2">
                  <span className="text-[#5842ed]">00:15 Start</span>
                  <span>Timeline Scrubber</span>
                  <span className="text-[#5842ed]">01:45 End</span>
                </div>

                {/* Scrubber bar */}
                <div className="relative h-6 w-full rounded-lg bg-[#e4e6f2] overflow-hidden flex items-center">
                  {/* Waveform graphic */}
                  <div className="absolute inset-0 flex items-center justify-between px-2 opacity-35">
                    {Array.from({ length: 36 }).map((_, i) => (
                      <div
                        key={i}
                        className="w-1 rounded-full bg-[#110d2e]"
                        style={{ height: `${20 + (i % 6) * 12}%` }}
                      />
                    ))}
                  </div>

                  {/* Active selected clip range */}
                  <div
                    className="absolute h-full rounded-md border-y-2 border-[#5842ed] bg-[#5842ed]/25 flex items-center justify-between px-1"
                    style={{ left: "15%", width: "55%" }}
                  >
                    <div className="h-4 w-1.5 rounded-sm bg-[#5842ed]" />
                    <div className="h-4 w-1.5 rounded-sm bg-[#5842ed]" />
                  </div>
                </div>

                {/* Floating cursor mockup clicking the handle */}
                <div className="absolute bottom-2 left-[68%] z-10 hidden sm:flex items-center gap-1.5 pointer-events-none">
                  <MousePointer size={18} className="text-[#5842ed] fill-[#5842ed]" />
                  <span className="rounded-md bg-[#110d2e] px-2 py-0.5 text-[10px] font-bold text-white shadow-md">
                    Trim 01:45
                  </span>
                </div>
              </div>
            </div>
          </motion.div>

          {/* Right Column: Text & Features */}
          <motion.div
            initial={{ opacity: 0, x: 24 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.55 }}
            className="lg:col-span-6"
          >
            {/* Badge: About */}
            <div className="inline-flex items-center gap-2 rounded-full border border-[#ded7fb] bg-white px-4 py-1.5 text-xs font-extrabold text-[#5842ed] shadow-[0_6px_20px_rgba(88,66,237,.06)]">
              <Sparkles size={13} />
              About
            </div>

            {/* H2 */}
            <h2 className="mt-4 font-['Plus_Jakarta_Sans'] text-[clamp(2rem,3.8vw,3rem)] font-extrabold leading-[1.12] tracking-[-0.04em] text-[#110d2e]">
              What Is YouTubeVideoTrimmer?
            </h2>

            {/* Description */}
            <p className="mt-5 text-base sm:text-lg leading-relaxed text-[#5e6578] font-medium">
              YouTubeVideoTrimmer is a free online video trimmer and cutter. It works from a video URL, so you don’t download or upload a file first. Select a section with the timeline editor, add subtitles, reframe it to vertical, square or landscape, and export a short clip. It also includes transcripts, summaries and thumbnails for creators, marketers, educators and podcasters.
            </p>

            {/* Feature checkmark pills */}
            <div className="mt-6 flex flex-wrap gap-2.5">
              {pills.map((pill) => (
                <div
                  key={pill}
                  className="inline-flex items-center gap-2 rounded-full border border-[#ded7fb] bg-white px-3.5 py-1.5 text-xs sm:text-sm font-bold text-[#110d2e] shadow-sm"
                >
                  <span className="flex h-4 w-4 items-center justify-center rounded-full bg-[#f0eeff] text-[#5842ed]">
                    <Check size={11} strokeWidth={3} />
                  </span>
                  {pill}
                </div>
              ))}
            </div>

            {/* Sub-badge: No software needed */}
            <div className="mt-4">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-[#f0eeff] px-3.5 py-1 text-xs font-bold text-[#5842ed]">
                <Scissors size={13} />
                No software needed
              </span>
            </div>
          </motion.div>

        </div>
      </div>
    </section>
  );
}
