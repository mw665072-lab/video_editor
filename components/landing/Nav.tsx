"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { S } from "./landingStyles";
import { CmsNavItem, getPublicCms } from "@/lib/api";

export default function Nav() {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
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
      <a href="/" style={S.navLogo}>
        <div style={S.logoMark}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5">
            <polygon points="5 3 19 12 5 21 5 3" />
          </svg>
        </div>
        {siteName}
      </a>

      <ul style={S.navLinks} className="hidden md:flex">
        {links.map((item) => (
          <li key={`${item.location}-${item.id}-${item.href}`}>
            <a
              href={item.href}
              style={S.navLink}
              onClick={(e) => {
                e.preventDefault();
                navigate(item);
              }}
              onMouseEnter={(e) => (e.currentTarget.style.color = "#FB923C")}
              onMouseLeave={(e) => (e.currentTarget.style.color = "rgba(255,255,255,0.7)")}
            >{item.label}</a>
          </li>
        ))}
      </ul>

      <div className="hidden md:flex" style={{ display: "flex", gap: 10, alignItems: "center" }}>
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
        className="flex md:hidden"
        onClick={() => setMobileOpen((p) => !p)}
        style={{ ...S.btnGhost, padding: "8px 16px", fontSize: 12 }}
      >
        {mobileOpen ? "Close" : "Menu"}
      </button>

      {mobileOpen && (
        <div className="md:hidden" style={{
          position: "absolute", left: 16, right: 16, top: "100%", marginTop: 8, zIndex: 50,
          borderRadius: 16, background: "rgba(10,14,26,0.98)",
          border: "1px solid rgba(255,255,255,0.12)", padding: 12,
          boxShadow: "0 20px 60px rgba(0,0,0,0.5)",
        }}>
          {links.map((item) => (
            <a key={`${item.location}-${item.id}-${item.href}`} href={item.href}
              onClick={(e) => {
                e.preventDefault();
                setMobileOpen(false);
                navigate(item);
              }}
              style={{ display: "block", padding: "10px 16px", fontSize: 14, color: "rgba(255,255,255,0.8)", borderRadius: 10, textDecoration: "none" }}
            >{item.label}</a>
          ))}
        </div>
      )}
    </motion.nav>
  );
}
