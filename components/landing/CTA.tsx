"use client";

import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { ArrowRight, Sparkles } from "lucide-react";

export default function CTA() {
  const router = useRouter();

  return (
    <section className="relative overflow-hidden bg-[#f8f9fd] py-20 lg:py-28">
      {/* Background ambient lighting */}
      <div className="pointer-events-none absolute -bottom-24 left-1/4 h-[450px] w-[650px] rounded-full bg-[#5842ed]/12 blur-[120px]" />
      <div className="pointer-events-none absolute right-12 top-10 h-[400px] w-[400px] rounded-full bg-[#7c3aed]/10 blur-[100px]" />

      <div className="relative mx-auto max-w-[1140px] px-5 sm:px-8">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          viewport={{ once: true }}
          className="relative overflow-hidden rounded-[2.5rem] border border-white/10 bg-gradient-to-r from-[#0c0a1e] via-[#16123a] to-[#0d0a22] p-8 sm:p-12 lg:p-16 shadow-[0_40px_100px_rgba(12,10,30,0.32)]"
        >
          {/* Subtle glowing wave overlay */}
          <div className="pointer-events-none absolute -right-20 -top-20 h-80 w-80 rounded-full bg-[#5842ed]/25 blur-[90px]" />

          <div className="relative z-10 grid grid-cols-1 items-center gap-10 lg:grid-cols-12">
            
            {/* Left Column: Copy & Button */}
            <div className="text-left lg:col-span-8">
              <div className="inline-flex items-center gap-2 rounded-full border border-violet-400/30 bg-[#5842ed]/30 px-4 py-1.5 text-xs font-extrabold text-violet-200">
                <Sparkles size={13} />
                Get Started
              </div>

              <h2 className="mt-4 font-['Plus_Jakarta_Sans'] text-[clamp(2rem,3.8vw,3.2rem)] font-extrabold leading-[1.15] tracking-[-0.03em] text-white">
                Cut Your Next Clip in Under a Minute
              </h2>

              <p className="mt-4 max-w-xl text-base sm:text-lg leading-relaxed text-slate-300 font-medium">
                Paste a link, choose your moment and export. Trimming and creator tools are free during launch.
              </p>

              <div className="mt-8">
                <button
                  type="button"
                  onClick={() => router.push("/editor")}
                  className="inline-flex cursor-pointer items-center gap-2.5 rounded-full bg-white px-8 py-4 text-sm sm:text-base font-extrabold text-[#110d2e] shadow-[0_10px_30px_rgba(0,0,0,0.25)] transition duration-200 hover:-translate-y-0.5 hover:bg-slate-100"
                >
                  Try YouTube Video Trimmer Free
                  <ArrowRight size={18} />
                </button>
              </div>
            </div>

            {/* Right Column: 3D Play button with orbital planet ring */}
            <div className="hidden lg:flex lg:col-span-4 items-center justify-center">
              <div className="relative flex h-48 w-48 items-center justify-center">
                {/* Orbital tilted ring */}
                <div
                  className="absolute inset-0 rounded-full border-2 border-violet-400/40"
                  style={{
                    transform: "rotateX(70deg) rotateZ(-25deg) scale(1.3)",
                    boxShadow: "0 0 30px rgba(139,92,246,0.3)",
                  }}
                />

                {/* 3D Play Cube/Tile */}
                <motion.div
                  animate={{ y: [-8, 8, -8], rotate: [-4, 4, -4] }}
                  transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
                  className="relative flex h-28 w-28 items-center justify-center rounded-3xl bg-gradient-to-br from-[#7c3aed] to-[#5842ed] p-1 shadow-[0_20px_50px_rgba(88,66,237,0.5)] ring-1 ring-white/30 backdrop-blur-md"
                >
                  <div className="absolute inset-1 rounded-[22px] bg-gradient-to-t from-transparent via-white/10 to-white/30" />
                  <svg width="44" height="44" viewBox="0 0 24 24" fill="#ffffff" className="ml-1">
                    <polygon points="6 3 20 12 6 21 6 3" />
                  </svg>
                </motion.div>
              </div>
            </div>

          </div>
        </motion.div>
      </div>
    </section>
  );
}
