"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { FaChevronLeft as ChevronLeft, FaChevronRight as ChevronRight } from "react-icons/fa";
import { motion, AnimatePresence } from "framer-motion";

// ---- Usage ---------------------------------------------------------------
// <CapabilitiesPager />
// Tailwind required. No external link buttons. Arrows at sides. Autoplay 3s.
// -------------------------------------------------------------------------

const slides = [
  {
    id: "01",
    title: "Onboarding & Org Setup",
    blurb:
      "Create a workspace, add issuers, define asset codes, and configure network/signing once. The flow validates every step and stores a clean audit trail so ops can reproduce it later without guesswork.",
  },
  {
    id: "02",
    title: "Issuance Controls",
    blurb:
      "Mint, freeze, or claw back with guard‑rails. You get role‑based approvals, pre‑flight checks for limits and flags, and a human‑readable summary of what the transaction will do before it’s sent.",
  },
  {
    id: "03",
    title: "Asset Transfers & Payouts",
    blurb:
      "Execute single or batch transfers of tokenized assets across multiple currencies, with automatic tagging for transaction metadata and built-in reconciliation aids. Every transfer run generates a downloadable ledger report that finance teams can align with their on-chain and off-chain records in minutes instead of hours.",
  },
  {
    id: "04",
    title: "Compliance & Regulatory Reporting",
    blurb:
      "Automatically generate compliance-ready reports for issued digital assets, covering activity summaries, transfer restrictions, and audit logs. The system enforces regulatory requirements at the transaction level and produces exportable records that meet financial and jurisdictional standards—making it easy to demonstrate compliance to auditors, regulators, and enterprise stakeholders.",
  },
  {
    id: "05",
    title: "Balances & Trust Lines",
    blurb:
      "View every holder, their trust limits, and live balances with filters by issuer, asset code, and risk flags. Ops can quickly pinpoint outliers—like accounts near their limit or with stale activity—and export the view for support.",
  },
  {
    id: "06",
    title: "Monitoring & Alerts",
    blurb:
      "Track key events—new trust lines, freezes, large transfers—and route alerts to Slack or email. Tuning rules takes seconds and every alert links back to the exact on‑chain transaction for instant triage.",
  },
];

export default function CapabilitiesPager() {
  const [index, setIndex] = useState(0);
  const count = slides.length;
  const intervalMs = 3000; // 3 seconds
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const hoveringRef = useRef(false);

  const go = (dir: 1 | -1) => {
    setIndex((i) => (i + dir + count) % count);
  };

  const goTo = (i: number) => setIndex(((i % count) + count) % count);

  const start = () => {
    stop();
    timerRef.current = setInterval(() => {
      if (!hoveringRef.current) {
        setIndex((i) => (i + 1) % count);
      }
    }, intervalMs);
  };

  const stop = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  };

  useEffect(() => {
    start();
    return stop;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const current = useMemo(() => slides[index], [index]);

  return (
    <div className="w-full min-h-[520px] flex flex-col gap-10">
      {/* Header */}
      <div className="px-6 md:px-10 lg:px-20 text-center">
        <h2 className="text-3xl md:text-5xl font-semibold tracking-tight text-white">
          Core in the MVP <span className="text-white/60">extensible for enterprise</span>
        </h2>
      </div>

      {/* Card */}
      <div
        className="relative mx-4 md:mx-10 lg:mx-16 rounded-3xl border border-white/10 bg-black shadow-lg overflow-hidden"
        onMouseEnter={() => (hoveringRef.current = true)}
        onMouseLeave={() => (hoveringRef.current = false)}
      >
        {/* Left Arrow */}
        <button
          aria-label="Previous"
          onClick={() => go(-1)}
          className="absolute left-3 top-1/2 -translate-y-1/2 z-20 grid place-items-center h-12 w-12 rounded-full bg-black/80 backdrop-blur border border-white/20 shadow hover:scale-105 transition"
        >
          <ChevronLeft className="h-6 w-6 text-white" />
        </button>

        {/* Right Arrow */}
        <button
          aria-label="Next"
          onClick={() => go(1)}
          className="absolute right-3 top-1/2 -translate-y-1/2 z-20 grid place-items-center h-12 w-12 rounded-full bg-black/80 backdrop-blur border border-white/20 shadow hover:scale-105 transition"
        >
          <ChevronRight className="h-6 w-6 text-white" />
        </button>

        {/* Slide */}
        <div className="px-6 md:px-10 lg:px-24 py-16 md:py-24 text-center">
          <p className="uppercase tracking-widest text-sm text-white/60 mb-6">
            Capability {current.id}
          </p>

          <AnimatePresence mode="wait">
            <motion.h3
              key={`title-${current.id}`}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.25 }}
              className="text-4xl md:text-6xl font-semibold text-center text-white"
            >
              {current.title}
            </motion.h3>
          </AnimatePresence>

          <div className="mt-8 md:mt-10 flex justify-center">
            <div className="max-w-4xl">
              <AnimatePresence mode="wait">
                <motion.p
                  key={`blurb-${current.id}`}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.25, delay: 0.05 }}
                  className="text-lg md:text-2xl leading-relaxed text-white/80 text-center"
                >
                  {current.blurb}
                </motion.p>
              </AnimatePresence>
            </div>
          </div>

          {/* Dots */}
          <div className="mt-12 flex items-center justify-center gap-3">
            {slides.map((s, i) => (
              <button
                key={s.id}
                onClick={() => goTo(i)}
                aria-label={`Go to slide ${i + 1}`}
                className={`h-2.5 rounded-full transition-all ${
                  i === index ? "w-8 bg-white/80" : "w-2.5 bg-white/30 hover:bg-white/50"
                }`}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
