"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

const features = [
  {
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10" />
        <line x1="2" y1="12" x2="22" y2="12" />
        <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
      </svg>
    ),
    title: "Any source, one workflow",
    description: "Paste any clip URL or upload locally and start editing with the same smart tools as the editor.",
  },
  {
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="16 16 12 12 8 16" />
        <line x1="12" y1="12" x2="12" y2="21" />
        <path d="M20.39 18.39A5 5 0 0 0 18 9h-1.26A8 8 0 1 0 3 16.3" />
      </svg>
    ),
    title: "Drag & drop uploads",
    description: "Continue editing with file uploads that map directly into the same clip timeline UX.",
  },
  {
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
      </svg>
    ),
    title: "Frame accurate trim",
    description: "Visual trimming and playback preview are shared with the editor, ensuring no surprises on export.",
  },
];

const workflowSteps = [
  {
    step: "1",
    title: "Connect source",
    subtitle: "URL paste or local file import with instant analysis.",
  },
  {
    step: "2",
    title: "Mark key moments",
    subtitle: "Use timeline scrubbing and quick cut presets in the hero preview.",
  },
  {
    step: "3",
    title: "Export and share",
    subtitle: "Finalize with 4K or social format outputs in one click.",
  },
];

function Nav() {
  const [scrolled, setScrolled] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <motion.nav
      initial={{ y: -32, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.35 }}
      className={`fixed inset-x-0 top-0 z-50 border-b backdrop-blur transition-all ${scrolled
          ? "bg-gradient-to-r from-indigo-900 via-slate-950 to-black/80 border-indigo-800"
          : "bg-gradient-to-r from-slate-950/90 via-slate-900/75 to-slate-950/90 border-slate-700"
        }`}
    >
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4 sm:px-6 md:px-8">
        <span className="font-bold tracking-wider text-white drop-shadow-lg">CLIPAI</span>
        <div className="hidden items-center gap-8 text-sm text-slate-100 md:flex">
          <a href="#features" className="text-slate-100 hover:text-cyan-300 transition">Features</a>
          <a href="#howitworks" className="text-slate-100 hover:text-cyan-300 transition">How it works</a>
          <a href="#pricing" className="text-slate-100 hover:text-cyan-300 transition">Pricing</a>
        </div>
        <Button
         onClick={() => router.push("/editor")}
          size="sm"
          className="hidden md:inline-flex bg-gradient-to-[270deg] from-fuchsia-500 via-violet-500 to-blue-500 text-white font-semibold shadow-[0_18px_40px_rgba(99,102,241,0.35)] hover:shadow-[0_20px_45px_rgba(125,50,255,0.45)] hover:scale-105 transform transition duration-300 ease-out rounded-lg px-4 py-2"
          variant="default"
        >
          Start clipping
        </Button>
      </div>
    </motion.nav>
  );
}

function Hero() {
  const [source, setSource] = useState("");
  const router = useRouter();

  return (
    <section className="relative overflow-hidden py-16 sm:py-20">
      <div className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(circle_at_top,rgba(99,102,241,0.24),transparent_35%),radial-gradient(circle_at_bottom,rgba(14,165,233,0.16),transparent_50%)]" />
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <div className="rounded-3xl border border-slate-800 bg-slate-900/70 p-8 shadow-[0_24px_54px_rgba(0,0,0,0.35)] backdrop-blur-xl">
          <div className="grid gap-10 lg:grid-cols-12 lg:items-center">
            <motion.div
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              className="col-span-12 lg:col-span-7"
            >
              <p className="inline-flex rounded-full bg-cyan-500/20 px-4 py-1 text-xs font-semibold tracking-wider text-cyan-300">
                Same editing system as your dashboard
              </p>

              <h1 className="mt-4 text-3xl font-black leading-tight tracking-tight text-white sm:text-4xl md:text-5xl lg:text-6xl">
                Turn any video into short-form clips with the editor you already trust.
              </h1>

              <p className="mt-4 max-w-xl text-sm leading-relaxed text-slate-200 sm:text-base md:text-lg lg:text-xl">
                Paste a URL or upload a local file, then trim, auto-crop, and export in 4K using the same smart workflow.
              </p>

              <div className="mt-6 grid gap-3 sm:grid-cols-[1fr_auto]">
                <Input
                  value={source}
                  onChange={(e) => setSource(e.target.value)}
                  placeholder="Paste YouTube, TikTok, or local link"
                  className="w-full min-w-0 rounded-lg border border-slate-700 bg-slate-900/85 text-white outline-none focus:border-cyan-400 focus:ring-2 focus:ring-cyan-400"
                />
                <Button
                  size="lg"
                  className="min-w-[170px] bg-gradient-to-r from-fuchsia-500 to-cyan-500 text-white font-bold tracking-wide shadow-lg transition-transform duration-300 ease-out hover:-translate-y-0.5 hover:shadow-2xl"
                  onClick={() => {
                    if (!source.trim()) return;
                    router.push("/editor");
                  }}
                >
                  Start clipping
                </Button>
              </div>

              <div className="mt-4 flex flex-wrap gap-2 text-xs text-slate-300">
                <span className="rounded-full bg-slate-800/60 px-3 py-1">Free 5 clips / month</span>
                <span className="rounded-full bg-slate-800/60 px-3 py-1">Full 4K export</span>
                <span className="rounded-full bg-slate-800/60 px-3 py-1">No watermark on Pro</span>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.15 }}
              className="col-span-12 lg:col-span-5"
            >
              <Card className="mx-auto max-w-md overflow-hidden rounded-2xl border border-slate-700 bg-slate-900/80 shadow-[0_20px_45px_rgba(0,0,0,.45)] lg:max-w-none">
                <div className="relative h-64 w-full overflow-hidden bg-slate-950">
                  <Image
                    src="/placeholder.jpg"
                    alt="Video editor preview"
                    fill
                    className="object-cover opacity-95"
                    sizes="(max-width: 640px) 100vw, 50vw"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/0 to-black/10" />

                  <div className="absolute bottom-4 left-4 right-4 rounded-xl border border-slate-700 bg-black/45 p-3 backdrop-blur">
                    <div className="mb-2 flex items-center justify-between text-xs text-slate-200">
                      <span>00:00</span>
                      <span>01:12</span>
                    </div>
                    <div className="h-2 w-full overflow-hidden rounded-full bg-slate-700">
                      <div className="h-full w-1/2 rounded-full bg-cyan-400" />
                    </div>
                  </div>
                </div>

                <div className="p-4">
                  <div className="mb-2 flex items-center justify-between text-sm text-slate-200">
                    <span>Clip timeline</span>
                    <span className="rounded-full bg-cyan-500/20 px-2 py-0.5 text-[10px] font-semibold text-cyan-300">4K</span>
                  </div>
                  <p className="text-sm text-slate-300">Auto-cut preview from your editor connection</p>
                </div>
              </Card>
            </motion.div>
          </div>
        </div>
      </div>
    </section>
  );
}

function Features() {
  return (
    <section id="features" className="relative overflow-hidden py-16 sm:py-20">
      <div className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(circle_at_top,rgba(0,221,255,0.1),transparent_40%),radial-gradient(circle_at_bottom,rgba(166,42,255,0.08),transparent_55%)]" />
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <div className="mb-10 text-center">
          <p className="text-xs font-semibold uppercase tracking-wider text-cyan-300">Superpowers</p>
          <h2 className="mt-3 text-3xl font-bold tracking-tight text-white sm:text-4xl">Everything you need to clip faster</h2>
          <p className="mx-auto mt-4 max-w-2xl text-sm text-slate-300">Shared design system components, from clip cards to controls, give your team a consistent workflow.</p>
        </div>

        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((feature, idx) => (
            <Card key={idx} className="relative overflow-hidden rounded-2xl border border-slate-800 bg-slate-900/75 p-6 shadow-[0_14px_30px_rgba(0,0,0,0.28)] transition-all hover:-translate-y-1 hover:shadow-[0_20px_38px_rgba(0,0,0,0.32)]">
              <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-cyan-400 via-blue-400 to-violet-500" />
              <div className="mb-4 inline-flex h-11 w-11 items-center justify-center rounded-lg bg-cyan-500/10 text-cyan-300">{feature.icon}</div>
              <CardTitle className="text-lg font-semibold text-white">{feature.title}</CardTitle>
              <CardDescription className="mt-2 text-sm text-slate-300">{feature.description}</CardDescription>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}

function HowItWorks() {
  return (
    <section id="howitworks" className="relative overflow-hidden py-16 sm:py-20">
      <div className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(circle_at_top,rgba(14,165,233,0.14),transparent_35%),radial-gradient(circle_at_bottom,rgba(99,102,241,0.12),transparent_50%)]" />
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <div className="mb-10 text-center">
          <p className="text-xs font-semibold uppercase tracking-wider text-cyan-300">How it works</p>
          <h2 className="mt-3 text-3xl font-bold tracking-tight text-white sm:text-4xl">Three steps to launch your first clip</h2>
          <p className="mx-auto mt-4 max-w-2xl text-sm text-slate-300">Workflow mapping is identical to the editor panel so users feel at home instantly.</p>
        </div>

        <div className="grid gap-5 sm:grid-cols-3">
          {workflowSteps.map((step) => (
            <Card key={step.step} className="relative overflow-hidden rounded-2xl border border-slate-800 bg-slate-900/75 p-6 shadow-[0_15px_30px_rgba(0,0,0,0.35)] ring-1 ring-transparent transition-all hover:-translate-y-1 hover:scale-[1.01] hover:ring-cyan-400/40 hover:shadow-[0_25px_45px_rgba(14,165,233,0.25)]">
              <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-cyan-400 via-blue-400 to-violet-500" />
              <div className="mb-4 flex items-center justify-between pt-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-cyan-500/20 text-xs font-bold text-cyan-300">{step.step}</div>
                <span className="text-xs font-semibold uppercase text-cyan-300/80">Step {step.step}</span>
              </div>
              <h3 className="text-lg font-semibold text-white">{step.title}</h3>
              <p className="mt-1 text-sm leading-relaxed text-slate-300">{step.subtitle}</p>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}

function CTA() {
  const router = useRouter();
  return (
    <section className="relative overflow-hidden py-16 sm:py-20">
      <div className="pointer-events-none absolute inset-0 -z-10 bg-[linear-gradient(120deg,rgba(99,102,241,0.16) 0%,rgba(14,165,233,0.12) 50%,rgba(139,92,246,0.1) 100%)]" />
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <div className="rounded-3xl border border-slate-800 bg-slate-900/75 p-8 text-center shadow-[0_16px_38px_rgba(0,0,0,0.28)] ring-1 ring-cyan-400/20 backdrop-blur">
          <h2 className="text-2xl font-bold text-white sm:text-3xl">Ready to ship your first viral short?</h2>
          <p className="mt-3 text-sm text-slate-300">The editor and landing flow now share the exact same interactive design DNA.</p>
          <Button
            className="mt-6 bg-gradient-to-r from-fuchsia-500 via-violet-500 to-cyan-500 text-white shadow-[0_12px_24px_rgba(99,102,241,0.32)] hover:shadow-[0_16px_32px_rgba(99,102,241,0.42)]"
            size="lg"
            onClick={() => router.push("/editor")}
          >
            Start clipping now
          </Button>
          <p className="mt-2 text-xs text-slate-200">Open the editor and quickly add clips, trim, and export with one click.</p>
        </div>
      </div>
    </section>
  );
}

function Footer() {
  return (
    <footer className="relative overflow-hidden border-t border-slate-700 bg-slate-950/80 py-12 text-sm text-slate-300 backdrop-blur-xl">
      <div className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(circle_at_top,rgba(8,145,178,0.16),transparent_55%),radial-gradient(circle_at_bottom,rgba(99,102,241,0.12),transparent_60%)]" />
      <div className="mx-auto grid max-w-6xl gap-10 px-4 sm:px-6 lg:px-8 lg:grid-cols-3">
        <div>
          <h3 className="text-lg font-bold text-white">CLIPAI</h3>
          <p className="mt-2 max-w-sm text-sm text-slate-400">
            Create clips fast from any source, with smart trimming, preview, and export to social formats.
          </p>
        </div>

        <div className="grid gap-2">
          <h4 className="text-sm font-semibold uppercase tracking-wide text-cyan-300">Quick links</h4>
          {['Features', 'How it works', 'Pricing', 'API Docs', 'Support'].map((link) => (
            <a key={link} href="#" className="transition hover:text-white">
              {link}
            </a>
          ))}
        </div>

        <div className="grid gap-2">
          <h4 className="text-sm font-semibold uppercase tracking-wide text-cyan-300">Follow us</h4>
          {['Twitter', 'LinkedIn', 'GitHub'].map((social) => (
            <a key={social} href="#" className="transition hover:text-white">
              {social}
            </a>
          ))}
        </div>
      </div>

      <div className="mx-auto mt-10 max-w-6xl border-t border-slate-700 pt-5 px-4 sm:px-6 lg:px-8">
        <p className="text-center text-xs font-medium text-slate-500">
          © {new Date().getFullYear()} CLIPAI INC. All rights reserved. Privacy · Terms · Cookies
        </p>
      </div>
    </footer>
  );
}

export default function ClipAIPage() {
  return (
    <div className="min-h-screen bg-slate-950 font-sans text-slate-100">
      <Nav />
      <main className="min-h-screen px-4 py-6 lg:px-8 lg:py-10 mt-10">
        <div className="mx-auto w-full max-w-6xl space-y-6">
          <Card className="rounded-3xl border-slate-800 bg-slate-900/70 p-4 shadow-[0_20px_45px_rgba(3,17,37,.55)] backdrop-blur-xl space-y-10">
            <Hero />
            <Features />
            <HowItWorks />
            <CTA />
          </Card>
        </div>
      </main>
      <Footer />
    </div>
  );
}
