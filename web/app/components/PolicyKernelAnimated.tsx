import { motion, useAnimation, useCycle, useReducedMotion } from "framer-motion";
import React, { useEffect } from "react";

/**
 * Policy Kernel Animated Diagram
 * - Single-file React component (Tailwind + Framer Motion)
 * - 6.5s seamless loop
 * - Inbound particle streams (Regimes, Asset Facts, Adapters)
 * - Kernel pulse + orbit
 * - Outbound particle streams (Requirements/Evidence, Enforcement Intents)
 * - Lightweight, GPU-friendly (transform/opacity only)
 */

export default function PolicyKernelAnimated() {
  const shouldReduceMotion = useReducedMotion();
  
  return (
    <div className="w-full h-[720px] bg-gradient-to-br from-slate-50 via-blue-50/30 to-emerald-50/40 rounded-3xl shadow-lg relative overflow-hidden">
      <BackgroundGlow />
      <FloatingElements />
      <div className="absolute inset-0 p-6 md:p-10">
        {/* Optimized layout with better space utilization */}
        <div className="grid grid-cols-12 h-full">
          {/* Left: Regime Plugins - positioned higher for better balance */}
          <div className="col-span-4 flex items-center justify-start">
            <div className="space-y-4">
              <SectionTitle title="Regime Plugins" subtitle="Regulatory requirements (inputs)" />
              <HoverLink targetKeys={["regimes"]}>
                <PillCard color="emerald" label="MiCA v1.0" />
              </HoverLink>
              <HoverLink targetKeys={["regimes"]}>
                <PillCard color="blue" label="Travel Rule" />
              </HoverLink>
            </div>
          </div>

          {/* Center: Kernel + Asset Facts (top) + Outputs (bottom) */}
          <div className="col-span-4 relative">
            {/* Asset Facts (top) - positioned higher */}
            <div className="absolute left-1/2 -translate-x-1/2 top-2 flex flex-col items-center gap-2">
              <SectionTitle title="Asset Facts" subtitle="" compact />
              <MiniChip color="violet" label="Asset Context" />
              <MiniChip color="violet" label="Issuer Facts" />
            </div>

            {/* Kernel - centered */}
            <Kernel />
            
            {/* Micro-legend for color system (positioned just above outputs) */}
            <div className="absolute left-1/2 -translate-x-1/2 bottom-12 text-center">
              <div className="text-xs text-slate-500 space-x-3">
                <span className="inline-flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                  regimes
                </span>
                <span className="inline-flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-violet-500"></span>
                  facts
                </span>
                <span className="inline-flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-blue-500"></span>
                  adapters
                </span>
              </div>
            </div>
            
            {/* Provenance chip (moved down below kernel) */}
            <div className="absolute left-1/2 -translate-x-1/2 bottom-24 text-center">
              <div className="text-xs text-slate-400 bg-slate-50/80 px-3 py-1 rounded-full border border-slate-200">
                Evaluated
              </div>
            </div>

            {/* Universal Outputs - positioned lower with wider spacing and more space from kernel */}
            <div className="absolute left-1/2 -translate-x-1/2 bottom-1 flex gap-36">
              <div className="flex flex-col items-center">
                <SectionTitle title="Universal Outputs" subtitle="" compact />
                <MiniChip color="emerald" label="Requirements" />
                <MiniChip color="emerald" label="Evidence" />
              </div>
              <div className="flex flex-col items-center">
                <SectionTitle title="Enforcement Intents" subtitle="" compact />
                <MiniChip color="orange" label="Gate Controls" />
                <MiniChip color="rose" label="Freeze Controls" />
              </div>
            </div>
          </div>

          {/* Right: Ledger Adapters - positioned higher for better balance */}
          <div className="col-span-4 flex items-center justify-end">
            <div className="space-y-4 text-right">
              <SectionTitle title="Ledger Adapters" subtitle="Available capabilities (inputs)" align="right" />
              <HoverLink targetKeys={["adapters"]}>
                <PillCard color="blue" label="XRPL" />
              </HoverLink>
              <HoverLink targetKeys={["adapters"]}>
                <PillCard color="orange" label="Ethereum" />
              </HoverLink>
            </div>
          </div>
        </div>
      </div>

      {/* Animated Streams */}
      <StreamsLayer shouldReduceMotion={shouldReduceMotion} />
    </div>
  );
}

/** Decorative soft glows with animation */
function BackgroundGlow() {
  return (
    <>
      <motion.div 
        className="pointer-events-none absolute -top-24 -left-24 h-96 w-96 rounded-full blur-3xl bg-emerald-100/50"
        animate={{ 
          scale: [1, 1.2, 1],
          opacity: [0.3, 0.6, 0.3]
        }}
        transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.div 
        className="pointer-events-none absolute -bottom-24 -right-24 h-96 w-96 rounded-full blur-3xl bg-sky-100/50"
        animate={{ 
          scale: [1.2, 1, 1.2],
          opacity: [0.6, 0.3, 0.6]
        }}
        transition={{ duration: 8, repeat: Infinity, ease: "easeInOut", delay: 2 }}
      />
      <motion.div 
        className="pointer-events-none absolute top-1/2 left-1/4 h-64 w-64 rounded-full blur-2xl bg-violet-100/40"
        animate={{ 
          scale: [1, 1.3, 1],
          opacity: [0.2, 0.5, 0.2]
        }}
        transition={{ duration: 6, repeat: Infinity, ease: "easeInOut", delay: 1 }}
      />
    </>
  );
}

/** Floating decorative elements */
function FloatingElements() {
  return (
    <>
      {/* Floating circles */}
      <motion.div
        className="absolute top-20 left-20 w-3 h-3 bg-emerald-400/60 rounded-full"
        animate={{
          y: [0, -20, 0],
          opacity: [0.4, 0.8, 0.4]
        }}
        transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.div
        className="absolute top-32 right-32 w-2 h-2 bg-blue-400/60 rounded-full"
        animate={{
          y: [0, -15, 0],
          opacity: [0.3, 0.7, 0.3]
        }}
        transition={{ duration: 5, repeat: Infinity, ease: "easeInOut", delay: 1 }}
      />
      <motion.div
        className="absolute bottom-40 left-32 w-4 h-4 bg-violet-400/50 rounded-full"
        animate={{
          y: [0, -25, 0],
          opacity: [0.2, 0.6, 0.2]
        }}
        transition={{ duration: 6, repeat: Infinity, ease: "easeInOut", delay: 2 }}
      />
      <motion.div
        className="absolute bottom-20 right-20 w-2 h-2 bg-orange-400/60 rounded-full"
        animate={{
          y: [0, -18, 0],
          opacity: [0.4, 0.8, 0.4]
        }}
        transition={{ duration: 4.5, repeat: Infinity, ease: "easeInOut", delay: 0.5 }}
      />
      
      {/* Floating geometric shapes */}
      <motion.div
        className="absolute top-40 right-16 w-6 h-6 border-2 border-emerald-300/40 rotate-45"
        animate={{
          rotate: [45, 405, 45],
          scale: [1, 1.2, 1]
        }}
        transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
      />
      <motion.div
        className="absolute bottom-32 left-16 w-4 h-4 border-2 border-blue-300/40"
        animate={{
          rotate: [0, 360],
          scale: [1, 1.3, 1]
        }}
        transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
      />
    </>
  );
}

function SectionTitle({ title, subtitle, compact=false, align="left" }: { title: string; subtitle?: string; compact?: boolean; align?: "left"|"right" }) {
  return (
    <div className={`mb-${compact?"1":"2"}`}>
      <div className={`text-slate-800 font-semibold ${compact?"text-sm":"text-base"} ${align==="right"?"text-right":""}`}>{title}</div>
      {subtitle ? (
        <div className={`text-slate-500 ${compact?"text-xs":"text-sm"} ${align==="right"?"text-right":""}`}>{subtitle}</div>
      ) : null}
    </div>
  );
}

function PillCard({ label, color }: { label: string; color: "emerald"|"blue"|"orange"|"violet" }) {
  const colorMap: Record<string, string> = {
    emerald: "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-100",
    blue: "bg-blue-50 text-blue-700 ring-1 ring-blue-100",
    orange: "bg-orange-50 text-orange-700 ring-1 ring-orange-100",
    violet: "bg-violet-50 text-violet-700 ring-1 ring-violet-100",
  };
  return (
    <div className={`inline-flex items-center gap-2 px-3 py-2 rounded-xl ${colorMap[color]} shadow-sm`}> 
      <span className="h-2 w-2 rounded-full bg-current opacity-70" />
      <span className="text-sm font-medium">{label}</span>
    </div>
  );
}

function MiniChip({ label, color }: { label: string; color: "emerald"|"blue"|"orange"|"rose"|"violet" }) {
  const colorMap: Record<string, string> = {
    emerald: "bg-emerald-50 text-emerald-600 border-emerald-100",
    blue: "bg-blue-50 text-blue-600 border-blue-100",
    orange: "bg-orange-50 text-orange-600 border-orange-100",
    rose: "bg-rose-50 text-rose-600 border-rose-100",
    violet: "bg-violet-50 text-violet-600 border-violet-100",
  };
  return (
    <div className={`px-2.5 py-1 rounded-lg text-xs border ${colorMap[color]} shadow-sm mt-1`}>{label}</div>
  );
}

/** Lightweight hover wrapper that highlights streams matching keys */
function HoverLink({ children, targetKeys }: { children: React.ReactNode; targetKeys: Array<"regimes"|"adapters"> }) {
  return (
    <div
      className="inline-block"
      onMouseEnter={() => {
        document.querySelectorAll(`#pk-streams [data-key]`).forEach((el) => {
          const key = el.getAttribute("data-key");
          if (key && targetKeys.includes(key as any)) {
            (el as HTMLElement).style.filter = "brightness(1.2)";
            (el as HTMLElement).style.opacity = "0.95";
          }
        });
      }}
      onMouseLeave={() => {
        document.querySelectorAll(`#pk-streams [data-key]`).forEach((el) => {
          (el as HTMLElement).style.filter = "";
          (el as HTMLElement).style.opacity = "";
        });
      }}
    >
      {children}
    </div>
  );
}

function Kernel() {
  // subtle orbit rotation using CSS keyframes via framer
  return (
    <div className="absolute inset-0 flex items-center justify-center">
      {/* Halo */}
      <motion.div
        className="absolute h-72 w-72 rounded-full bg-emerald-300/25 blur-2xl"
        animate={{ opacity: [0.25, 0.55, 0.25], scale: [1, 1.08, 1] }}
        transition={{ duration: 6.5, repeat: Infinity, ease: "easeInOut" }}
      />
      {/* Outer ring */}
      <motion.div
        className="relative h-60 w-60 rounded-full border-2 border-emerald-400/80 shadow-[0_0_80px_rgba(16,185,129,0.35)] backdrop-blur-sm flex items-center justify-center bg-white/70"
        animate={{ boxShadow: ["0 0 60px rgba(16,185,129,0.25)", "0 0 100px rgba(16,185,129,0.4)", "0 0 60px rgba(16,185,129,0.25)"] }}
        transition={{ duration: 6.5, repeat: Infinity, ease: "easeInOut" }}
      >
        {/* Orbiting dots removed for clean center */}

        {/* Inner pulse */}
        <motion.div
          className="absolute h-40 w-40 rounded-full border border-emerald-400/60"
          animate={{ scale: [0.96, 1, 0.96] }}
          transition={{ duration: 0.8, repeat: Infinity, ease: "easeInOut" }}
        />

        <div className="relative z-10 text-center">
          <div className="text-black font-bold text-xl drop-shadow-sm">Policy</div>
          <div className="text-black font-bold text-xl -mt-1 drop-shadow-sm">Kernel</div>
        </div>
      </motion.div>
    </div>
  );
}

function OrbitDot({ radius, color, delay=0 }: { radius: number; color: string; delay?: number }) {
  return (
    <motion.div
      style={{ width: 8, height: 8, borderRadius: 9999, background: color, position: "absolute" }}
      animate={{ rotate: 360 }}
      transition={{ repeat: Infinity, ease: "linear", duration: 1.6, delay }}
    >
      <div style={{ transform: `translate(${radius}px, 0)` }} className="w-2 h-2" />
    </motion.div>
  );
}

/** Layer that draws particle streams to/from the kernel with keyframed positions */
function StreamsLayer({ shouldReduceMotion }: { shouldReduceMotion: boolean | null }) {
  // Predefined anchor points (relative to container) - optimized for better space utilization
  const anchors = {
    kernel: { x: 0.5, y: 0.5 },
    regimes: { x: 0.18, y: 0.45 }, // moved higher for better balance
    facts: { x: 0.5, y: 0.08 }, // moved higher to use top space
    adapters: { x: 0.82, y: 0.45 }, // moved higher for better balance
    outputsLeft: { x: 0.35, y: 0.93 }, // pushed wider and slightly lower
    outputsRight: { x: 0.65, y: 0.93 }, // pushed wider and slightly lower
  };

  return (
    <div className="absolute inset-0 pointer-events-none" id="pk-streams">
      {/* Inbound streams - complete in ~1.4s */}
      <ParticleStream dataKey="regimes" color="#10B981" from={anchors.regimes} to={anchors.kernel} curvature="left" delay={0.1} shouldReduceMotion={shouldReduceMotion} />
      <ParticleStream dataKey="facts" color="#8B5CF6" from={anchors.facts} to={anchors.kernel} curvature="up" delay={0.3} shouldReduceMotion={shouldReduceMotion} />
      <ParticleStream dataKey="adapters" color="#3B82F6" from={anchors.adapters} to={anchors.kernel} curvature="right" delay={0.5} shouldReduceMotion={shouldReduceMotion} />

      {/* Outbound streams - start after 0.4s "think" beat, complete in ~1.2s */}
      <ParticleStream dataKey="regimes" color="#22C55E" from={anchors.kernel} to={anchors.outputsLeft} curvature="left" delay={2.0} reverse={false} shouldReduceMotion={shouldReduceMotion} />
      <ParticleStream dataKey="adapters" color="#F59E0B" from={anchors.kernel} to={anchors.outputsRight} curvature="right" delay={2.2} reverse={false} shouldReduceMotion={shouldReduceMotion} />
    </div>
  );
}

function ParticleStream({
  from,
  to,
  color,
  curvature = "left",
  delay = 0,
  reverse = false,
  shouldReduceMotion = false,
  dataKey,
}: {
  from: { x: number; y: number };
  to: { x: number; y: number };
  color: string;
  curvature?: "left" | "right" | "up";
  delay?: number;
  reverse?: boolean;
  shouldReduceMotion?: boolean | null;
  dataKey?: "regimes"|"adapters"|"facts";
}) {
  // Create 8 particles with slight stagger (optimized for performance)
  const particles = Array.from({ length: 8 });

  return (
    <>
      {particles.map((_, i) => {
        const d = 6.5; // loop duration
        const startDelay = delay + i * 0.12; // stagger
        return (
          <motion.div
            key={i}
            className="absolute"
            data-key={dataKey}
            style={{ 
              width: 6, 
              height: 6, 
              borderRadius: 9999, 
              backgroundColor: color, 
              filter: "drop-shadow(0 0 6px rgba(0,0,0,0.1))",
              // Static position for reduced motion
              left: shouldReduceMotion ? `${to.x * 100}%` : undefined,
              top: shouldReduceMotion ? `${to.y * 100}%` : undefined,
            }}
            animate={shouldReduceMotion ? {} : {
              // keyframed positions in % of container
              left: [
                `${from.x * 100}%`,
                `${(from.x + (to.x - from.x) * 0.35 + (curvature === "left" ? -0.08 : curvature === "right" ? 0.08 : 0)) * 100}%`,
                `${(from.x + (to.x - from.x) * 0.7) * 100}%`,
                `${to.x * 100}%`,
              ],
              top: [
                `${from.y * 100}%`,
                `${(from.y + (to.y - from.y) * 0.3 + (curvature === "up" ? -0.06 : 0)) * 100}%`,
                `${(from.y + (to.y - from.y) * 0.65) * 100}%`,
                `${to.y * 100}%`,
              ],
              opacity: [0, 1, 1, 0],
              scale: [0.8, 1, 1, 0.8],
            }}
            transition={shouldReduceMotion ? {} : {
              duration: d * 0.55,
              ease: "easeInOut",
              repeat: Infinity,
              delay: startDelay,
              repeatDelay: d * 0.45,
            }}
          />
        );
      })}
    </>
  );
}