"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { S } from "./landingStyles";
import { CmsNavItem, getPublicCms } from "@/lib/api";

export default function Nav() {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [isDesktop, setIsDesktop] = useState<boolean>(() => {
    if (typeof window === "undefined") return true;
    return window.matchMedia("(min-width: 768px)").matches;
  });
  const [siteName, setSiteName] = useState("CLIPAI");
  const [links, setLinks] = useState<CmsNavItem[]>([
    { id: "features", label: "Features", href: "/#features", location: "navbar", audience: "public", icon: "", order: 10, isActive: true, external: false },
    { id: "how", label: "How it works", href: "/#howitworks", location: "navbar", audience: "public", icon: "", order: 20, isActive: true, external: false },
    { id: "pricing", label: "Pricing", href: "/price", location: "navbar", audience: "public", icon: "", order: 30, isActive: true, external: false },
  ]);
  const router = useRouter();

  useEffect(() => {
    const fn = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", fn);
    return () => window.removeEventListener("scroll", fn);
  }, []);

  useEffect(() => {
    const mediaQuery = window.matchMedia("(min-width: 768px)");
    const handleResize = () => {
      setIsDesktop(mediaQuery.matches);
      if (mediaQuery.matches) setMobileOpen(false);
    };

    handleResize();
    mediaQuery.addEventListener("change", handleResize);
    return () => mediaQuery.removeEventListener("change", handleResize);
  }, []);

  useEffect(() => {
    let cancelled = false;
    getPublicCms()
      .then((cms) => {
        if (cancelled) return;
        setSiteName(cms.settings.logoText || cms.settings.siteName || "CLIPAI");
        if (cms.nav.navbar.length) setLinks(cms.nav.navbar.filter((item) => item.isActive));
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, []);

  const navigate = (item: CmsNavItem) => {
    if (item.external) {
      window.open(item.href, "_blank", "noopener,noreferrer");
      return;
    }
    router.push(item.href);
  };

  return (
    <motion.nav
      initial={{ y: -32, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ duration: 0.35 }}
      style={S.nav(scrolled)}
    >
      <Link href="/" style={S.navLogo}>
        <div style={S.logoMark}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#5A2BB8" strokeWidth="2.5">
            <path d="M12 3v18" />
            <path d="M6.2 6.2l11.6 11.6" />
            <path d="M17.8 6.2L6.2 17.8" />
          </svg>
        </div>
        {siteName}
      </Link>

      <ul style={{ ...S.navLinks, display: isDesktop ? "flex" : "none" }}>
        {links.map((item) => (
          <li key={`${item.location}-${item.id}-${item.href}`}>
            <a
              href={item.href}
              style={S.navLink}
              onClick={(e) => {
                e.preventDefault();
                navigate(item);
              }}
              onMouseEnter={(e) => (e.currentTarget.style.color = "#FFD36B")}
              onMouseLeave={(e) => (e.currentTarget.style.color = "rgba(255,255,255,0.84)")}
            >{item.label}</a>
          </li>
        ))}
      </ul>

      <div style={{ display: isDesktop ? "flex" : "none", gap: 10, alignItems: "center" }}>
        <button style={S.btnGhost}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2"/></svg>
          Connect
        </button>
        <button style={S.btnPrimary} onClick={() => router.push("/editor")}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="5 3 19 12 5 21 5 3"/></svg>
          Start clipping
        </button>
      </div>

      <button
        onClick={() => setMobileOpen((p) => !p)}
        style={{ ...S.btnGhost, padding: "8px 16px", fontSize: 12, display: isDesktop ? "none" : "inline-flex", alignItems: "center", gap: 8 }}
      >
        <span style={{ display: "inline-flex", width: 18, height: 18, justifyContent: "center", alignItems: "center" }}>
          {mobileOpen ? (
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6 6 18" /><path d="m6 6 12 12" /></svg>
          ) : (
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 7h16" /><path d="M4 12h16" /><path d="M4 17h16" /></svg>
          )}
        </span>
        {mobileOpen ? "Close" : "Menu"}
      </button>

      {mobileOpen && !isDesktop && (
        <div style={{
          position: "absolute", left: 0, right: 0, top: "100%", marginTop: 8, zIndex: 50,
          borderRadius: 20, background: "rgba(22, 12, 59, 0.96)",
          border: "1px solid rgba(255,255,255,0.12)", padding: 16,
          boxShadow: "0 22px 70px rgba(12,2,32,0.52)",
          backdropFilter: "blur(24px)", WebkitBackdropFilter: "blur(24px)",
        }}>
          {links.map((item) => (
            <a key={`${item.location}-${item.id}-${item.href}`} href={item.href}
              onClick={(e) => {
                e.preventDefault();
                setMobileOpen(false);
                navigate(item);
              }}
              style={{ display: "block", padding: "12px 16px", fontSize: 15, color: "rgba(255,255,255,0.94)", borderRadius: 14, textDecoration: "none", marginBottom: 6, background: "rgba(255,255,255,0.03)" }}
            >{item.label}</a>
          ))}
          <div style={{ display: "flex", gap: 10, marginTop: 12, flexWrap: "wrap" }}>
            <button style={{ ...S.btnGhost, width: "100%" }} onClick={() => { setMobileOpen(false); router.push("/editor"); }}>
              Start clipping
            </button>
          </div>
        </div>
      )}
    </motion.nav>
  );
}
