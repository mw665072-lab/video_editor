"use client";

import { useState } from "react";
import { ChevronDown, HelpCircle } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { S } from "./landingStyles";

const faqData = [
  {
    question: "What is a YouTube video trimmer?",
    answer: "A YouTube video trimmer is an online tool that cuts a chosen section from a YouTube video. You paste the link, set start and end times and export the clip, with no desktop editing software.",
  },
  {
    question: "How do I trim a YouTube video online for free?",
    answer: "Paste the video URL into YouTubeVideoTrimmer, drag the timeline handles to select your section, preview it and export. It’s free to use at the moment.",
  },
  {
    question: "What’s the difference between a video trimmer and a video cutter?",
    answer: "The terms are often used interchangeably. Trimming usually means shortening a video from the start or end. Cutting means taking out a section from anywhere in the video. This tool does both.",
  },
  {
    question: "Can I cut a specific part of a YouTube video?",
    answer: "Yes. Set any start and end time, down to the second, and export only that section.",
  },
  {
    question: "Can it find the best moments in a long video?",
    answer: "Yes. Find Moments analyzes the video and suggests segments with strong hooks, key points or high interest. Treat these as starting points and choose the ones that fit your content.",
  },
  {
    question: "Can I make YouTube Shorts from a long video?",
    answer: "Yes. Select a segment, reframe it to 9:16 vertical and add subtitles. The clip is ready to upload to Shorts.",
  },
  {
    question: "Can I make clips for TikTok and Instagram Reels?",
    answer: "Yes. Export in vertical, square or landscape formats for TikTok, Reels and Shorts.",
  },
  {
    question: "Can I add subtitles to my clips?",
    answer: "Yes. AI Subtitles generates captions from speech. You can edit the text before you export.",
  },
  {
    question: "Can I get a transcript or summary of a video?",
    answer: "Yes. Generate a timestamped transcript or a short summary from the same video link.",
  },
  {
    question: "Do I need to install software or create an account?",
    answer: "No installation is needed. Everything runs in your browser.",
  },
  {
    question: "Is YouTubeVideoTrimmer free?",
    answer: "Yes, it’s free during launch. Pricing may be introduced later, and any change will be announced on the site.",
  },
  {
    question: "Is it legal to clip YouTube videos?",
    answer: "Clip only videos you own, have permission to use, or that carry a license allowing reuse. Credit the original creator where appropriate.",
  },
  {
    question: "Which platforms does YouTubeVideoTrimmer work with?",
    answer: "It works with video links from YouTube, TikTok, Instagram and Facebook. Paste the URL, choose your section and export the clip.",
  },
];

export default function FAQ() {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  const toggle = (idx: number) => {
    setOpenIndex(openIndex === idx ? null : idx);
  };

  return (
    <section id="faq" style={{ ...S.section, padding: "100px 0", background: "#ffffff", borderTop: "1px solid #e4e6f2" }}>
      <div style={{ ...S.container, maxWidth: 900 }}>
        <div style={{ textAlign: "center", marginBottom: 56 }}>
          <span
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              padding: "6px 16px",
              borderRadius: 9999,
              background: "#f0eeff",
              border: "1px solid #ded7fb",
              color: "#5842ed",
              fontSize: 12,
              fontWeight: 700,
              letterSpacing: "0.06em",
              textTransform: "uppercase",
              marginBottom: 16,
            }}
          >
            <HelpCircle size={14} />
            FAQ
          </span>
          <h2
            style={{
              fontFamily: "'Plus Jakarta Sans', sans-serif",
              fontSize: "clamp(2rem, 3.8vw, 3.2rem)",
              fontWeight: 800,
              color: "#110d2e",
              lineHeight: 1.15,
              letterSpacing: "-0.04em",
            }}
          >
            YouTube Video Trimmer FAQ
          </h2>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          {faqData.map((item, index) => {
            const isOpen = openIndex === index;
            return (
              <div
                key={index}
                style={{
                  borderRadius: 20,
                  border: isOpen ? "1px solid rgba(88,66,237,0.3)" : "1px solid #e4e6f2",
                  background: isOpen ? "#ffffff" : "#f8f9fd",
                  boxShadow: isOpen ? "0 10px 30px rgba(88,66,237,0.06)" : "none",
                  overflow: "hidden",
                  transition: "all 0.25s ease",
                }}
              >
                <button
                  type="button"
                  onClick={() => toggle(index)}
                  style={{
                    width: "100%",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    padding: "22px 26px",
                    background: "none",
                    border: "none",
                    textAlign: "left",
                    cursor: "pointer",
                    gap: 16,
                  }}
                >
                  <span
                    style={{
                      fontFamily: "'Plus Jakarta Sans', sans-serif",
                      fontSize: 17,
                      fontWeight: 700,
                      color: isOpen ? "#5842ed" : "#110d2e",
                      letterSpacing: "-0.02em",
                    }}
                  >
                    {item.question}
                  </span>
                  <div
                    style={{
                      width: 32,
                      height: 32,
                      borderRadius: 10,
                      background: isOpen ? "#f0eeff" : "#ffffff",
                      border: "1px solid #ded7fb",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      flexShrink: 0,
                      transform: isOpen ? "rotate(180deg)" : "rotate(0deg)",
                      transition: "transform 0.25s ease, background 0.25s ease",
                      color: "#5842ed",
                    }}
                  >
                    <ChevronDown size={18} />
                  </div>
                </button>

                <AnimatePresence initial={false}>
                  {isOpen && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.25, ease: "easeInOut" }}
                    >
                      <div
                        style={{
                          padding: "0 26px 24px 26px",
                          fontSize: 15,
                          lineHeight: 1.75,
                          color: "#5e6578",
                          borderTop: "1px solid #f0eeff",
                          paddingTop: 16,
                        }}
                      >
                        {item.answer}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
