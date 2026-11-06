"use client";

import Nav from "../../components/landing/Nav";
import Footer from "../../components/landing/Footer";
import { S } from "../../components/landing/landingStyles";
import { motion } from "framer-motion";

const plans = [
  {
    name: "Starter",
    price: "$9",
    period: "/month",
    description: "Best for solo creators trying out fast AI clips",
    benefits: ["1 project", "25 video exports", "Basic AI highlights", "Email support"],
    cta: "Get started",
  },
  {
    name: "Pro",
    price: "$29",
    period: "/month",
    description: "For ambitious creators and small teams",
    benefits: ["Unlimited projects", "Unlimited exports", "Auto clip suggestions", "Priority support"],
    cta: "Choose Pro",
    recommended: true,
  },
  {
    name: "Enterprise",
    price: "Custom",
    period: "", 
    description: "Scale with enterprise workflow integrations",
    benefits: ["Custom SLA", "Dedicated onboarding", "Advanced analytics", "SAML + SSO"],
    cta: "Contact sales",
  },
];

export default function PricePage() {
  return (
    <div style={S.page}>
      <Nav />
      <main style={{ paddingTop: 70, paddingBottom: 80 }}>
        <div style={S.container}>
          <section style={{ textAlign: "center", padding: "40px 0" }}>
            <div style={S.sectionTagCenter}>PRICING</div>
            <h1 style={S.sectionTitle}>Simple pricing for every creator</h1>
            <p style={S.sectionSub}>
              Choose the plan that fits your journey and grow with confidence. All plans include 14-day free trial and cancel any time.
            </p>
          </section>

          <section style={{ display: "grid", gap: 20, gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))" }}>
            {plans.map((plan) => (
              <motion.article
                key={plan.name}
                whileHover={{ y: -6, boxShadow: "0 18px 45px rgba(88,66,237,0.12)" }}
                transition={{ type: "spring", stiffness: 240, damping: 18 }}
                style={{
                  ...S.featureCard,
                  border: plan.recommended ? "2px solid #5842ed" : "1px solid #edf0f8",
                  background: "#ffffff",
                  boxShadow: plan.recommended ? "0 16px 40px rgba(88,66,237,0.10)" : "0 10px 30px rgba(88,66,237,0.04)",
                  position: "relative",
                }}
              >
                {plan.recommended && (
                  <span style={{
                    position: "absolute", top: 14, right: 14, fontSize: 11, fontWeight: 700,
                    color: "#ffffff", background: "#5842ed", borderRadius: 999, padding: "4px 12px",
                    letterSpacing: "0.08em", textTransform: "uppercase",
                  }}>
                    Recommended
                  </span>
                )}
                <h3 style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: 22, margin: 0, fontWeight: 800, color: "#110d2e" }}>{plan.name}</h3>
                <p style={{ margin: "10px 0 18px", color: "#5e6578", fontSize: 14 }}>{plan.description}</p>
                <div style={{ display: "flex", alignItems: "flex-end", gap: 4, marginBottom: 18 }}>
                  <span style={{ fontSize: 42, fontWeight: 800, color: "#110d2e" }}>{plan.price}</span>
                  <span style={{ color: "#5e6578", fontSize: 18, marginBottom: 4 }}>{plan.period}</span>
                </div>

                <ul style={{ margin: 0, padding: 0, listStyle: "none", gap: 10, display: "grid" }}>
                  {plan.benefits.map((benefit) => (
                    <li key={benefit} style={{ color: "#5e6578", fontSize: 15, display: "flex", alignItems: "center", gap: 10 }}>
                      <span style={{ color: "#5842ed", fontWeight: 800 }}>✓</span>
                      {benefit}
                    </li>
                  ))}
                </ul>

                <button
                  style={{
                    ...S.btnPrimaryLg,
                    width: "100%",
                    marginTop: 22,
                    background: plan.recommended ? "linear-gradient(135deg, #5842ed, #4730df)" : "#5842ed",
                    boxShadow: "0 10px 28px rgba(88,66,237,0.26)",
                  }}
                >
                  {plan.cta}
                </button>
              </motion.article>
            ))}
          </section>

          <section style={{ textAlign: "center", marginTop: 44 }}>
            <p style={{ ...S.sectionSub, maxWidth: 650, margin: "0 auto" }}>
              All plans are backed by our 30-day money-back guarantee. No hidden fees, no surprises — just reliable clip creation.
            </p>
          </section>
        </div>
      </main>
      <Footer />
    </div>
  );
}
