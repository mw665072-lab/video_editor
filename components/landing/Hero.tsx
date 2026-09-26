"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { ArrowRight, Captions, Link2, Share2 } from "lucide-react";
import { clipDurations, platforms } from "./landingData";

const HERO_CSS = `
.hero-shell {
  background:
    radial-gradient(circle at 12% 16%, rgba(34,197,94,.11), transparent 27%),
    radial-gradient(circle at 88% 13%, rgba(250,204,21,.15), transparent 24%),
    linear-gradient(180deg,#fbfcf7 0%,#f5f8f1 100%);
}
.hero-title-mark {
  position: relative;
  display: inline-block;
  z-index: 0;
  white-space: nowrap;
}
.hero-title-mark::after {
  content: "";
  position: absolute;
  left: -1.5%;
  right: -1.5%;
  bottom: .06em;
  height: .2em;
  z-index: -1;
  border-radius: 999px;
  background: #facc15;
  transform: rotate(-.8deg);
  opacity: .78;
}
.hero-source-form:focus-within {
  border-color: rgba(21,128,61,.58);
  box-shadow: 0 0 0 4px rgba(21,128,61,.10), 0 22px 60px rgba(31,52,36,.11);
}
.hero-benefit + .hero-benefit {
  border-left: 1px solid #dce5dc;
}
@media (max-width: 700px) {
  .hero-title-mark { white-space: normal; }
  .hero-source-form { flex-wrap: wrap; }
  .hero-source-form input { width: calc(100% - 34px); }
  .hero-source-form button { width: 100%; justify-content: center; }
  .hero-platforms { gap: 7px !important; }
  .hero-platforms > div { padding: 6px 9px !important; }
  .hero-benefits { grid-template-columns: 1fr !important; }
  .hero-benefit + .hero-benefit { border-left: 0; border-top: 1px solid #dce5dc; }
}
`;

const benefits = [
  {
    icon: Link2,
    title: "Paste any link",
    text: "Start from YouTube, TikTok, or a direct video URL.",
  },
  {
    icon: Captions,
    title: "Get clean clips",
    text: "Create focused cuts with captions and social framing.",
  },
  {
    icon: Share2,
    title: "Publish anywhere",
    text: "Export polished clips ready for every major platform.",
  },
];

export default function Hero() {
  const [source, setSource] = useState("");
  const [selectedDuration, setSelectedDuration] = useState("30s");
  const router = useRouter();

  const startEditing = (event: FormEvent) => {
    event.preventDefault();
    if (!source.trim()) return;
    router.push("/editor");
  };

  return (
    <section className="hero-shell relative flex min-h-[94vh] items-center overflow-hidden px-5 pb-20 pt-32 sm:px-8 lg:pb-24 lg:pt-36">
      <style>{HERO_CSS}</style>

      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(rgba(24,35,27,.032)_1px,transparent_1px),linear-gradient(90deg,rgba(24,35,27,.032)_1px,transparent_1px)] bg-[size:72px_72px] [mask-image:linear-gradient(to_bottom,black,transparent_88%)]" />
      <div className="pointer-events-none absolute left-1/2 top-28 h-64 w-64 -translate-x-1/2 rounded-full border border-[#dfe7dd] opacity-60 sm:h-96 sm:w-96" />
      <div className="pointer-events-none absolute left-1/2 top-40 h-40 w-40 -translate-x-1/2 rounded-full border border-[#e5eadf] opacity-70 sm:h-64 sm:w-64" />

      <div className="relative mx-auto w-full max-w-[1120px] text-center">
        <motion.div
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45 }}
        >
          <div className="inline-flex items-center gap-2 rounded-full border border-[#cce8d2] bg-white/85 px-4 py-2 text-xs font-extrabold text-[#166534] shadow-[0_8px_26px_rgba(31,52,36,.06)] backdrop-blur-sm">
            <span className="h-2 w-2 rounded-full bg-[#22a653]" />
            Fast, focused video editing
          </div>

          <h1 className="mx-auto mt-7 max-w-[1040px] font-['Plus_Jakarta_Sans'] text-[clamp(3rem,7.2vw,6.8rem)] font-extrabold leading-[.96] tracking-[-.065em] text-[#18231b]">
            One long video.
            <br />
            <span className="hero-title-mark">All the clips you need.</span>
          </h1>

          <p className="mx-auto mt-7 max-w-[700px] text-base leading-7 text-[#5d6a60] sm:text-lg sm:leading-8">
            Turn podcasts, interviews, tutorials, and streams into sharp, shareable clips—without learning a complicated editor.
          </p>

          <form
            onSubmit={startEditing}
            className="hero-source-form mx-auto mt-9 flex max-w-[820px] items-center gap-3 rounded-[22px] border border-[#d8e3d8] bg-white p-2.5 text-left shadow-[0_20px_60px_rgba(31,52,36,.09)] transition"
          >
            <label htmlFor="hero-video-url" className="sr-only">Video URL</label>
            <Link2 size={20} className="ml-2 shrink-0 text-[#15803d]" aria-hidden="true" />
            <input
              id="hero-video-url"
              value={source}
              onChange={(event) => setSource(event.target.value)}
              placeholder="Paste a YouTube, TikTok, or video URL"
              className="min-w-0 flex-1 border-0 bg-transparent px-1 py-2.5 text-sm text-[#18231b] outline-none placeholder:text-[#8a948c] sm:text-base"
            />
            <button
              type="submit"
              className="inline-flex min-h-12 cursor-pointer items-center gap-2 rounded-2xl bg-[#15803d] px-6 py-3 text-sm font-extrabold text-white shadow-[0_10px_26px_rgba(21,128,61,.23)] transition duration-200 hover:-translate-y-0.5 hover:bg-[#166534]"
            >
              Create my clips <ArrowRight size={17} />
            </button>
          </form>

          <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
            <span className="mr-1 text-xs font-semibold text-[#758078]">Clip length</span>
            {clipDurations.map((duration) => (
              <button
                key={duration}
                type="button"
                onClick={() => setSelectedDuration(duration)}
                className={`min-h-9 cursor-pointer rounded-full px-3.5 py-1.5 text-xs font-bold transition duration-200 ${
                  selectedDuration === duration
                    ? "bg-[#18231b] text-white shadow-sm"
                    : "border border-[#dce5dc] bg-white/85 text-[#5d6a60] hover:border-[#9ec9a7] hover:text-[#166534]"
                }`}
              >
                {duration}
              </button>
            ))}
          </div>

          <div className="hero-platforms mt-7 flex flex-wrap items-center justify-center gap-3">
            <span className="text-xs font-semibold text-[#758078]">Works with</span>
            {platforms.map((platform) => (
              <div
                key={platform.name}
                className="inline-flex items-center gap-1.5 rounded-full border border-[#dde5dc] bg-white/80 px-3 py-1.5 text-xs font-bold text-[#465249]"
              >
                <span style={{ color: platform.color }}>{platform.icon}</span>
                {platform.name}
              </div>
            ))}
          </div>
        </motion.div>

        <motion.div
          className="hero-benefits mx-auto mt-12 grid max-w-[940px] grid-cols-3 overflow-hidden rounded-[24px] border border-[#dce5dc] bg-white/72 text-left shadow-[0_16px_50px_rgba(31,52,36,.07)] backdrop-blur-md"
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.14 }}
        >
          {benefits.map(({ icon: Icon, title, text }) => (
            <div key={title} className="hero-benefit flex gap-3.5 p-5 sm:p-6">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#edf7ef] text-[#15803d]">
                <Icon size={19} strokeWidth={2.2} />
              </span>
              <div>
                <h2 className="text-sm font-extrabold text-[#18231b]">{title}</h2>
                <p className="mt-1 text-xs leading-5 text-[#667069]">{text}</p>
              </div>
            </div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
