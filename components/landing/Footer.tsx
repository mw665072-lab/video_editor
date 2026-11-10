"use client";

import Link from "next/link";
import { Scissors } from "lucide-react";

export default function Footer() {
  const brandName = "youtubevideotrimmer";
  const footerBio =
    "Free online video trimmer and cutter. Trim YouTube, TikTok, Instagram and Facebook videos into high-impact clips for Shorts and Reels without downloading software.";

  const socialIcons = [
    {
      name: "YouTube",
      href: "https://youtube.com",
      icon: (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
          <path d="M22.54 6.42a2.78 2.78 0 0 0-1.95-1.96C18.88 4 12 4 12 4s-6.88 0-8.59.46A2.78 2.78 0 0 0 1.46 6.42C1 8.14 1 12 1 12s0 3.86.46 5.58a2.78 2.78 0 0 0 1.95 1.95C5.12 20 12 20 12 20s6.88 0 8.59-.47a2.78 2.78 0 0 0 1.95-1.95C23 15.86 23 12 23 12s0-3.86-.46-5.58z" />
          <polygon points="9.75 15.02 15.5 12 9.75 8.98 9.75 15.02" fill="#ffffff" />
        </svg>
      ),
    },
    {
      name: "X (Twitter)",
      href: "https://x.com",
      icon: (
        <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor">
          <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
        </svg>
      ),
    },
    {
      name: "LinkedIn",
      href: "https://linkedin.com",
      icon: (
        <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor">
          <path d="M19 3a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h14m-.5 15.5v-5.3a3.26 3.26 0 0 0-3.26-3.26c-.85 0-1.84.52-2.28 1.3v-1.11h-2.79v8.37h2.79v-4.93c0-.77.62-1.4 1.39-1.4a1.4 1.4 0 0 1 1.4 1.4v4.93h2.75M6.46 8.76a1.53 1.53 0 1 0 0-3.05 1.53 1.53 0 0 0 0 3.05m1.39 9.74v-8.37H5.07v8.37z" />
        </svg>
      ),
    },
    {
      name: "Facebook",
      href: "https://facebook.com",
      icon: (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
          <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z" />
        </svg>
      ),
    },
  ];

  return (
    <footer className="relative overflow-hidden border-t border-[#e4e6f2] bg-[#ffffff] pt-14 pb-10 font-['Manrope',sans-serif]">
      {/* Background ambient lighting */}
      <div className="pointer-events-none absolute inset-0 z-0 overflow-hidden">
        <div className="absolute left-1/2 top-0 h-[220px] w-[700px] -translate-x-1/2 rounded-full bg-gradient-to-b from-[#5842ed]/04 via-[#7c3aed]/02 to-transparent blur-[80px]" />
      </div>

      <div className="relative z-10 mx-auto max-w-[1240px] px-5 sm:px-8">
        <div className="flex flex-col md:flex-row items-center justify-between gap-6 pb-8 border-b border-[#e4e6f2] text-center md:text-left">
          {/* Brand Info */}
          <div>
            <Link href="/" className="inline-flex items-center gap-3 text-decoration-none group">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-[#5842ed] to-[#7c3aed] text-white shadow-[0_8px_20px_rgba(88,66,237,0.28)] transition duration-200 group-hover:scale-105">
                <Scissors size={20} className="rotate-[-45deg]" />
              </div>
              <div>
                <span className="font-['Plus_Jakarta_Sans'] text-xl font-extrabold tracking-[-0.03em] text-[#110d2e]">
                  {brandName}
                </span>
                <span className="ml-2 rounded-full border border-[#ded7fb] bg-[#f0eeff] px-2 py-0.5 text-[10px] font-bold text-[#5842ed]">
                  Free Tool
                </span>
              </div>
            </Link>

            <p className="mt-3 max-w-md text-sm leading-relaxed text-[#5e6578] font-medium">
              {footerBio}
            </p>
          </div>

          {/* Status & Social Icons */}
          <div className="flex flex-col sm:flex-row md:flex-col lg:flex-row items-center md:items-end lg:items-center gap-4">
            <div className="inline-flex items-center gap-2 rounded-full border border-[#ded7fb] bg-[#f8f9fd] px-3.5 py-1.5 text-xs font-semibold text-[#110d2e]">
              <span className="h-2 w-2 rounded-full bg-[#10b981] animate-pulse" />
              <span>Free during launch · No signup required</span>
            </div>

            <div className="flex items-center gap-2.5">
              {socialIcons.map((social) => (
                <a
                  key={social.name}
                  href={social.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={social.name}
                  className="flex h-9 w-9 items-center justify-center rounded-xl border border-[#e4e6f2] bg-white text-[#5e6578] shadow-[0_2px_8px_rgba(88,66,237,0.04)] transition duration-200 hover:-translate-y-0.5 hover:border-[#5842ed] hover:bg-[#f0eeff] hover:text-[#5842ed]"
                >
                  {social.icon}
                </a>
              ))}
            </div>
          </div>
        </div>

        {/* Bottom Bar: Copyright */}
        <div className="pt-6 text-center text-xs text-[#8a92a6] font-medium">
          © {new Date().getFullYear()} {brandName}. All rights reserved. Built with modern web performance.
        </div>
      </div>
    </footer>
  );
}
