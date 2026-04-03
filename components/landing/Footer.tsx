import { S } from "./landingStyles";

export default function Footer() {
  return (
    <footer style={S.footer}>
      <div style={S.container}>
        <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr", gap: 48, marginBottom: 48 }}>
          <div>
            <a href="#" style={S.navLogo}>
              <div style={S.logoMark}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5"><polygon points="5 3 19 12 5 21 5 3"/></svg>
              </div>
              CLIPAI
            </a>
            <p style={{ fontSize: 14, color: "rgba(255,255,255,0.4)", marginTop: 14, maxWidth: 270, lineHeight: 1.75 }}>
              AI-powered video clipping from YouTube, TikTok, Instagram & Facebook. Create. Clip. Publish.
            </p>
          </div>
          <div>
            <div style={S.footerTitle}>Platform</div>
            {["Features", "How it works", "Pricing", "API Docs", "Support"].map((l) => (
              <a key={l} href="#" style={S.footerLink}
                onMouseEnter={(e) => (e.currentTarget.style.color = "#fff")}
                onMouseLeave={(e) => (e.currentTarget.style.color = "rgba(255,255,255,0.4)")}
              >{l}</a>
            ))}
          </div>
          <div>
            <div style={S.footerTitle}>Follow Us</div>
            {["Twitter", "LinkedIn", "GitHub"].map((s) => (
              <a key={s} href="#" style={S.footerLink}
                onMouseEnter={(e) => (e.currentTarget.style.color = "#fff")}
                onMouseLeave={(e) => (e.currentTarget.style.color = "rgba(255,255,255,0.4)")}
              >{s}</a>
            ))}
          </div>
        </div>
        <div style={{ borderTop: "1px solid rgba(255,255,255,0.08)", paddingTop: 28, display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 16 }}>
          <div style={{ fontSize: 13, color: "rgba(255,255,255,0.35)" }}>
            © {new Date().getFullYear()} CLIPAI INC. All rights reserved. Privacy · Terms · Cookies
          </div>
          <div style={{ display: "flex", gap: 10 }}>
            {["𝕏", "in", "yt", "fb"].map((icon) => (
              <a key={icon} href="#" style={S.footerSocialIcon}
                onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(249,115,22,0.2)"; e.currentTarget.style.borderColor = "rgba(249,115,22,0.4)"; e.currentTarget.style.color = "#FB923C"; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = "rgba(255,255,255,0.04)"; e.currentTarget.style.borderColor = "rgba(255,255,255,0.10)"; e.currentTarget.style.color = "rgba(255,255,255,0.5)"; }}
              >{icon}</a>
            ))}
          </div>
        </div>
      </div>
    </footer>
  );
}
