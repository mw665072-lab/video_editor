"use client";

import { useEffect, useState } from "react";
import { CmsNavItem, CmsSettings, getPublicCms } from "@/lib/api";
import { S } from "./landingStyles";

export default function Footer() {
  const [settings, setSettings] = useState<CmsSettings | null>(null);
  const [links, setLinks] = useState<CmsNavItem[]>([
    { id: "features", label: "Features", href: "/#features", location: "footer", audience: "public", icon: "", order: 10, isActive: true, external: false },
    { id: "how", label: "How it works", href: "/#howitworks", location: "footer", audience: "public", icon: "", order: 20, isActive: true, external: false },
    { id: "pricing", label: "Pricing", href: "/price", location: "footer", audience: "public", icon: "", order: 30, isActive: true, external: false },
    { id: "blogs", label: "Blogs", href: "/blogs", location: "footer", audience: "public", icon: "", order: 40, isActive: true, external: false },
  ]);

  useEffect(() => {
    let cancelled = false;
    getPublicCms()
      .then((cms) => {
        if (cancelled) return;
        setSettings(cms.settings);
        if (cms.nav.footer.length) setLinks(cms.nav.footer.filter((item) => item.isActive));
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, []);

  const socialLinks = settings?.socialLinks?.length ? settings.socialLinks : [
    { label: "𝕏", href: "#" },
    { label: "in", href: "#" },
    { label: "yt", href: "#" },
    { label: "fb", href: "#" },
  ];

  return (
    <footer style={S.footer}>
      <div style={S.container}>
        <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr", gap: 48, marginBottom: 48 }}>
          <div>
            <a href="#" style={S.navLogo}>
              <div style={S.logoMark}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5"><polygon points="5 3 19 12 5 21 5 3"/></svg>
              </div>
              {settings?.logoText || settings?.siteName || "CLIPAI"}
            </a>
            <p style={{ fontSize: 14, color: "rgba(255,255,255,0.4)", marginTop: 14, maxWidth: 270, lineHeight: 1.75 }}>
              {settings?.footerDescription || "AI-powered video clipping from YouTube, TikTok, Instagram & Facebook. Create. Clip. Publish."}
            </p>
          </div>
          <div>
            <div style={S.footerTitle}>Platform</div>
            {links.map((item) => (
              <a key={`${item.id}-${item.href}`} href={item.href} target={item.external ? "_blank" : undefined} rel={item.external ? "noopener noreferrer" : undefined} style={S.footerLink}
                onMouseEnter={(e) => (e.currentTarget.style.color = "#fff")}
                onMouseLeave={(e) => (e.currentTarget.style.color = "rgba(255,255,255,0.4)")}
              >{item.label}</a>
            ))}
          </div>
          <div>
            <div style={S.footerTitle}>Follow Us</div>
            {socialLinks.map((s) => (
              <a key={`${s.label}-${s.href}`} href={s.href} target="_blank" rel="noopener noreferrer" style={S.footerLink}
                onMouseEnter={(e) => (e.currentTarget.style.color = "#fff")}
                onMouseLeave={(e) => (e.currentTarget.style.color = "rgba(255,255,255,0.4)")}
              >{s.label}</a>
            ))}
          </div>
        </div>
        <div style={{ borderTop: "1px solid rgba(255,255,255,0.08)", paddingTop: 28, display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 16 }}>
          <div style={{ fontSize: 13, color: "rgba(255,255,255,0.35)" }}>
            © {new Date().getFullYear()} {settings?.siteName || "CLIPAI"} INC. {settings?.footerCopyright || "All rights reserved. Privacy · Terms · Cookies"}
          </div>
          <div style={{ display: "flex", gap: 10 }}>
            {socialLinks.slice(0, 4).map((social) => (
              <a key={`${social.label}-icon`} href={social.href} target="_blank" rel="noopener noreferrer" style={S.footerSocialIcon}
                onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(249,115,22,0.2)"; e.currentTarget.style.borderColor = "rgba(249,115,22,0.4)"; e.currentTarget.style.color = "#FB923C"; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = "rgba(255,255,255,0.04)"; e.currentTarget.style.borderColor = "rgba(255,255,255,0.10)"; e.currentTarget.style.color = "rgba(255,255,255,0.5)"; }}
              >{social.icon || social.label.slice(0, 2)}</a>
            ))}
          </div>
        </div>
      </div>
    </footer>
  );
}
