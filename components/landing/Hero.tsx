"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import {
  ArrowRight,
  Link2,
  ShieldCheck,
  Zap,
  MonitorSmartphone,
  Youtube,
  Instagram,
  Facebook,
} from "lucide-react";

export default function Hero() {
  const [source, setSource] = useState("");
  const router = useRouter();

  const startEditing = (event: FormEvent) => {
    event.preventDefault();
    if (!source.trim()) return;
    router.push("/editor");
  };

  return (
    <section className="relative flex min-h-[92vh] items-center justify-center overflow-hidden px-5 pb-20 pt-28 sm:px-8 lg:pb-24 lg:pt-32">
      {/* Background ambient lighting and liquid curves */}
      <div className="pointer-events-none absolute inset-0 z-0 overflow-hidden">
        {/* Top center soft radial glow */}
        <div className="absolute left-1/2 top-0 h-[500px] w-[900px] -translate-x-1/2 rounded-full bg-gradient-to-b from-[#5842ed]/10 via-[#7c3aed]/05 to-transparent blur-[120px]" />
        
        {/* Left flowing purple wave ribbon */}
        <div className="absolute -left-32 top-1/4 h-[420px] w-[420px] rounded-full bg-gradient-to-br from-[#7c3aed]/15 to-[#5842ed]/05 blur-[90px]" />
        
        {/* Right flowing purple wave ribbon */}
        <div className="absolute -right-32 top-1/3 h-[450px] w-[450px] rounded-full bg-gradient-to-bl from-[#5842ed]/15 to-[#a78bfa]/10 blur-[100px]" />

        {/* Subtle grid texture */}
        <div className="absolute inset-0 bg-[linear-gradient(rgba(88,66,237,.02)_1px,transparent_1px),linear-gradient(90deg,rgba(88,66,237,.02)_1px,transparent_1px)] bg-[size:64px_64px] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_40%,#000_70%,transparent_100%)]" />
      </div>

      {/* Floating 3D Play Button Accent (Left) */}
      <motion.div
        initial={{ y: -10, rotate: -8 }}
        animate={{ y: [ -10, 10, -10 ], rotate: [ -8, -4, -8 ] }}
        transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
        className="pointer-events-none absolute left-6 top-36 hidden lg:block xl:left-16"
      >
        <div className="relative flex h-20 w-20 items-center justify-center rounded-3xl bg-gradient-to-br from-[#7c3aed] to-[#5842ed] p-1 shadow-[0_20px_40px_rgba(88,66,237,0.35)] ring-1 ring-white/30 backdrop-blur-md">
          <div className="absolute inset-1 rounded-[22px] bg-gradient-to-t from-transparent via-white/10 to-white/30" />
          <svg width="34" height="34" viewBox="0 0 24 24" fill="#ffffff">
            <polygon points="6 3 20 12 6 21 6 3" />
          </svg>
        </div>
      </motion.div>

      {/* Floating 3D Clapperboard Accent (Right) */}
      <motion.div
        initial={{ y: 10, rotate: 10 }}
        animate={{ y: [ 10, -10, 10 ], rotate: [ 10, 6, 10 ] }}
        transition={{ duration: 7, repeat: Infinity, ease: "easeInOut", delay: 0.5 }}
        className="pointer-events-none absolute right-6 top-40 hidden lg:block xl:right-16"
      >
        <div className="relative flex h-20 w-20 items-center justify-center rounded-3xl bg-gradient-to-br from-[#5842ed] to-[#432ec7] p-1 shadow-[0_20px_40px_rgba(88,66,237,0.32)] ring-1 ring-white/30 backdrop-blur-md">
          <div className="absolute inset-1 rounded-[22px] bg-gradient-to-t from-transparent via-white/10 to-white/30" />
          <svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="#ffffff" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <rect width="18" height="18" x="3" y="3" rx="3" />
            <path d="m4 11 3-8" />
            <path d="m10 11 3-8" />
            <path d="m16 11 3-8" />
            <path d="M3 11h18" />
          </svg>
        </div>
      </motion.div>

      <div className="relative z-10 mx-auto w-full max-w-[1080px] text-center">
        <motion.div
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45 }}
        >
          {/* Badge: Free During Launch */}
          <div className="inline-flex items-center gap-2 rounded-full border border-[#ded7fb] bg-white/95 px-4 py-1.5 text-xs font-extrabold text-[#5842ed] shadow-[0_6px_20px_rgba(88,66,237,.06)] backdrop-blur-sm">
            <span className="h-2 w-2 rounded-full bg-[#5842ed] animate-pulse" />
            Free During Launch
          </div>

          {/* H1 */}
          <h1 className="mx-auto mt-6 max-w-[960px] font-['Plus_Jakarta_Sans'] text-[clamp(2.5rem,6vw,5.2rem)] font-extrabold leading-[1.08] tracking-[-0.045em] text-[#110d2e]">
            Free YouTube Video{" "}
            <span className="bg-gradient-to-r from-[#5842ed] via-[#7c3aed] to-[#5842ed] bg-clip-text text-transparent">
              Trimmer &amp;
            </span>
            <br />
            Cutter Online
          </h1>

          {/* Description */}
          <p className="mx-auto mt-6 max-w-[720px] text-base leading-7 text-[#5e6578] sm:text-lg sm:leading-8 font-medium">
            Paste a video link, set the start and end time, and cut the exact clip you need. Or let Find Moments pick out the highlights for Shorts, TikTok and Reels.
          </p>

          {/* Search/URL Form */}
          <form
            onSubmit={startEditing}
            className="mx-auto mt-9 flex max-w-[760px] flex-col sm:flex-row items-center gap-2 sm:gap-3 rounded-[24px] border border-[#e2e4f0] bg-white p-2.5 text-left shadow-[0_20px_60px_rgba(88,66,237,.08)] transition focus-within:border-[#5842ed] focus-within:ring-4 focus-within:ring-[#5842ed]/10"
          >
            <div className="flex w-full flex-1 items-center gap-2 px-2">
              <Link2 size={20} className="shrink-0 text-[#5842ed]" aria-hidden="true" />
              <input
                value={source}
                onChange={(event) => setSource(event.target.value)}
                placeholder="Paste a YouTube, TikTok, Instagram or Facebook link…"
                className="w-full border-0 bg-transparent py-2.5 text-sm sm:text-base text-[#110d2e] outline-none placeholder:text-[#8a92a6]"
              />
            </div>
            <button
              type="submit"
              className="w-full sm:w-auto inline-flex min-h-12 cursor-pointer items-center justify-center gap-2 rounded-2xl bg-[#5842ed] px-7 py-3 text-sm font-extrabold text-white shadow-[0_10px_26px_rgba(88,66,237,.25)] transition duration-200 hover:-translate-y-0.5 hover:bg-[#4730df]"
            >
              Get Clips for Free <ArrowRight size={17} />
            </button>
          </form>

          {/* Supported platform chips */}
          <div className="mt-5 flex flex-wrap items-center justify-center gap-2 text-xs font-semibold text-[#8a92a6]">
            <span>Works with:</span>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-[#e4e6f2] bg-white/80 px-2.5 py-1 text-xs font-bold text-[#5e6578]">
              <Youtube size={13} className="text-[#FF0000]" /> YouTube
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-[#e4e6f2] bg-white/80 px-2.5 py-1 text-xs font-bold text-[#5e6578]">
              <Instagram size={13} className="text-[#E4405F]" /> Instagram
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-[#e4e6f2] bg-white/80 px-2.5 py-1 text-xs font-bold text-[#5e6578]">
              <Facebook size={13} className="text-[#1877F2]" /> Facebook
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-[#e4e6f2] bg-white/80 px-2.5 py-1 text-xs font-bold text-[#5e6578]">
              TikTok
            </span>
          </div>

          {/* 3 Trust Cards (Matching reference screenshot row) */}
          <div className="mt-12 grid grid-cols-1 sm:grid-cols-3 gap-4 max-w-[840px] mx-auto">
            <div className="flex items-center gap-3 rounded-2xl border border-[#e4e6f2] bg-white/90 p-4 shadow-[0_10px_30px_rgba(88,66,237,0.03)] text-left">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#f0eeff] text-[#5842ed]">
                <Zap size={20} />
              </div>
              <div>
                <div className="text-sm font-extrabold text-[#110d2e]">100% Free</div>
                <div className="text-xs text-[#5e6578]">No Sign Up Required</div>
              </div>
            </div>

            <div className="flex items-center gap-3 rounded-2xl border border-[#e4e6f2] bg-white/90 p-4 shadow-[0_10px_30px_rgba(88,66,237,0.03)] text-left">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#f0eeff] text-[#5842ed]">
                <ShieldCheck size={20} />
              </div>
              <div>
                <div className="text-sm font-extrabold text-[#110d2e]">Fast &amp; Secure</div>
                <div className="text-xs text-[#5e6578]">Your Privacy First</div>
              </div>
            </div>

            <div className="flex items-center gap-3 rounded-2xl border border-[#e4e6f2] bg-white/90 p-4 shadow-[0_10px_30px_rgba(88,66,237,0.03)] text-left">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#f0eeff] text-[#5842ed]">
                <MonitorSmartphone size={20} />
              </div>
              <div>
                <div className="text-sm font-extrabold text-[#110d2e]">Works Everywhere</div>
                <div className="text-xs text-[#5e6578]">Desktop · Mobile · Tablet</div>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
