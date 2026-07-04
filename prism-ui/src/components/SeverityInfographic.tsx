"use client";

import { useEffect, useRef, useState } from "react";
import {
  motion,
  useMotionValue,
  useMotionValueEvent,
  animate,
  useInView,
} from "framer-motion";
import {
  Table,
  Calculator,
  Sigma,
  Heart,
  AlertTriangle,
  Shield,
  ChevronDown,
  ChevronRight,
} from "lucide-react";

const severityData = [
  { label: "Pothole", weight: 3 },
  { label: "Alligator Crack", weight: 3 },
  { label: "Transverse Crack", weight: 2 },
  { label: "Longitudinal Crack", weight: 1 },
  { label: "Others", weight: 1 },
];

function AnimatedNumber({ target, decimals = 1 }: { target: number; decimals?: number }) {
  const ref = useRef<HTMLSpanElement>(null);
  const isInView = useInView(ref, { once: true });
  const mv = useMotionValue(0);
  const [display, setDisplay] = useState("0");

  useMotionValueEvent(mv, "change", (v) => {
    setDisplay(v.toFixed(decimals));
  });

  useEffect(() => {
    if (isInView) {
      const controls = animate(mv, target, { duration: 2, ease: "easeOut" });
      return controls.stop;
    }
  }, [isInView, target, mv]);

  return <span ref={ref}>{display}</span>;
}

function StepArrow() {
  return (
    <div className="flex items-center justify-center py-1 lg:px-1 lg:py-0">
      <motion.div
        className="block lg:hidden"
        animate={{ y: [0, 6, 0] }}
        transition={{ repeat: Infinity, duration: 2, ease: "easeInOut" }}
      >
        <ChevronDown className="w-7 h-7 text-cyan-400/60" />
      </motion.div>
      <motion.div
        className="hidden lg:block"
        animate={{ x: [0, 6, 0] }}
        transition={{ repeat: Infinity, duration: 2, ease: "easeInOut" }}
      >
        <ChevronRight className="w-7 h-7 text-cyan-400/60" />
      </motion.div>
    </div>
  );
}

const glassCard = "rounded-2xl bg-white/[0.04] backdrop-blur-xl border border-white/10 p-5 h-full";

export default function SeverityInfographic() {
  return (
    <section className="relative min-h-screen bg-gradient-to-br from-[#061A40] to-[#0B1D33] py-20 px-4 overflow-hidden">
      <div className="absolute inset-0 bg-[linear-gradient(rgba(0,212,255,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(0,212,255,0.03)_1px,transparent_1px)] bg-[size:40px_40px]" />

      <div className="relative max-w-7xl mx-auto">
        <motion.h2
          initial={{ opacity: 0, y: -20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-3xl lg:text-4xl font-bold text-center mb-16 bg-gradient-to-r from-cyan-400 to-blue-400 bg-clip-text text-transparent tracking-tight"
        >
          PRISM Severity Engine Pipeline
        </motion.h2>

        <div className="flex flex-col lg:flex-row lg:overflow-x-auto items-center lg:items-stretch gap-2 pb-4 scrollbar-thin">
          {/* STEP 1 — Severity Mapping */}
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.05 }}
            className="w-full max-w-sm lg:w-[185px] shrink-0"
          >
            <div className={glassCard}>
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 rounded-lg bg-cyan-400/10">
                  <Table className="w-5 h-5 text-cyan-400" />
                </div>
                <span className="text-[10px] font-semibold uppercase tracking-widest text-cyan-400">
                  Step 1
                </span>
              </div>
              <h3 className="text-base font-semibold text-white mb-3">Severity Mapping</h3>
              <div className="space-y-1.5">
                {severityData.map((item) => (
                  <div
                    key={item.label}
                    className="flex justify-between items-center px-3 py-1.5 rounded-xl bg-white/[0.04] border border-white/5 text-xs"
                  >
                    <span className="text-gray-300">{item.label}</span>
                    <span className="text-cyan-300 font-mono font-bold text-base">{item.weight}</span>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>

          <StepArrow />

          {/* STEP 2 — Damage Score */}
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="w-full max-w-sm lg:w-[185px] shrink-0"
          >
            <div className={glassCard}>
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 rounded-lg bg-cyan-400/10">
                  <Calculator className="w-5 h-5 text-cyan-400" />
                </div>
                <span className="text-[10px] font-semibold uppercase tracking-widest text-cyan-400">
                  Step 2
                </span>
              </div>
              <h3 className="text-base font-semibold text-white mb-3">Damage Score</h3>
              <div className="bg-white/[0.04] rounded-xl p-3 border border-white/5 mb-3">
                <code className="text-[10px] text-gray-300 font-mono leading-relaxed block">
                  damage_score =<br /> severity_weight &times; confidence
                </code>
              </div>
              <div className="space-y-1.5 text-xs">
                <div className="flex justify-between text-gray-400">
                  <span>Pothole: 3 &times; 0.87</span>
                  <span className="text-cyan-300 font-mono font-medium">= 2.61</span>
                </div>
                <div className="flex justify-between text-gray-400">
                  <span>Longitudinal Crack: 1 &times; 0.65</span>
                  <span className="text-cyan-300 font-mono font-medium">= 0.65</span>
                </div>
              </div>
            </div>
          </motion.div>

          <StepArrow />

          {/* STEP 3 — Total Damage Score */}
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.15 }}
            className="w-full max-w-sm lg:w-[185px] shrink-0"
          >
            <div className={glassCard}>
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 rounded-lg bg-cyan-400/10">
                  <Sigma className="w-5 h-5 text-cyan-400" />
                </div>
                <span className="text-[10px] font-semibold uppercase tracking-widest text-cyan-400">
                  Step 3
                </span>
              </div>
              <h3 className="text-base font-semibold text-white mb-3">Total Damage Score</h3>
              <div className="bg-white/[0.04] rounded-xl p-4 border border-white/5 text-center">
                <div className="text-gray-400 text-xs mb-1">&Sigma; all damage scores</div>
                <div className="text-sm font-mono text-gray-300">2.61 + 0.65</div>
                <div className="text-3xl font-bold font-mono text-white mt-2">
                  = <AnimatedNumber target={3.26} decimals={2} />
                </div>
              </div>
            </div>
          </motion.div>

          <StepArrow />

          {/* STEP 4 — Road Health Score */}
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="w-full max-w-sm lg:w-[185px] shrink-0"
          >
            <div className={glassCard}>
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 rounded-lg bg-cyan-400/10">
                  <Heart className="w-5 h-5 text-cyan-400" />
                </div>
                <span className="text-[10px] font-semibold uppercase tracking-widest text-cyan-400">
                  Step 4
                </span>
              </div>
              <h3 className="text-base font-semibold text-white mb-3">Road Health Score</h3>
              <div className="bg-white/[0.04] rounded-xl p-3 border border-white/5 text-center mb-3">
                <code className="text-[10px] text-gray-300 font-mono leading-relaxed block">
                  health = 100 &minus; (damage &times; 10)<br />
                  = 100 &minus; (3.26 &times; 10) = 67.4
                </code>
              </div>
              <div className="text-center">
                <div className="text-5xl font-bold font-mono text-yellow-400">
                  <AnimatedNumber target={67.4} />
                </div>
                <div className="text-gray-500 text-xs mt-1">/ 100</div>
              </div>
            </div>
          </motion.div>

          <StepArrow />

          {/* STEP 5 — Alert Classification */}
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.25 }}
            className="w-full max-w-sm lg:w-[185px] shrink-0"
          >
            <div className={glassCard}>
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 rounded-lg bg-cyan-400/10">
                  <AlertTriangle className="w-5 h-5 text-cyan-400" />
                </div>
                <span className="text-[10px] font-semibold uppercase tracking-widest text-cyan-400">
                  Step 5
                </span>
              </div>
              <h3 className="text-base font-semibold text-white mb-3">Alert Classification</h3>
              <div className="space-y-3">
                <div>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-green-400 font-medium">Health &gt; 75 &rarr; SAFE</span>
                    <span className="text-white/40">90</span>
                  </div>
                  <div className="w-full h-2.5 rounded-full bg-white/10 overflow-hidden">
                    <motion.div
                      initial={{ width: "0%" }}
                      whileInView={{ width: "90%" }}
                      viewport={{ once: true }}
                      transition={{ duration: 1.2, ease: "easeOut", delay: 0.3 }}
                      className="h-full rounded-full bg-gradient-to-r from-green-500 to-green-400"
                    />
                  </div>
                </div>
                <div>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-yellow-400 font-medium">Health &gt; 50 &rarr; CAUTION</span>
                    <span className="text-yellow-400 font-mono font-bold">67.4</span>
                  </div>
                  <div className="w-full h-2.5 rounded-full bg-white/10 overflow-hidden relative">
                    <motion.div
                      initial={{ width: "0%" }}
                      whileInView={{ width: "67.4%" }}
                      viewport={{ once: true }}
                      transition={{ duration: 1.2, ease: "easeOut", delay: 0.3 }}
                      className="h-full rounded-full bg-gradient-to-r from-yellow-500 to-yellow-400"
                    />
                    <motion.div
                      initial={{ opacity: 0 }}
                      whileInView={{ opacity: 1 }}
                      viewport={{ once: true }}
                      transition={{ delay: 1.5, duration: 0.3 }}
                      className="absolute -top-1.5"
                      style={{ left: "67.4%", transform: "translateX(-50%)" }}
                    >
                      <div className="w-3 h-3 rounded-full bg-yellow-400 shadow-[0_0_8px_rgba(234,179,8,0.6)]" />
                    </motion.div>
                  </div>
                </div>
                <div>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-red-400 font-medium">Else &rarr; DANGEROUS</span>
                    <span className="text-white/40">30</span>
                  </div>
                  <div className="w-full h-2.5 rounded-full bg-white/10 overflow-hidden">
                    <motion.div
                      initial={{ width: "0%" }}
                      whileInView={{ width: "30%" }}
                      viewport={{ once: true }}
                      transition={{ duration: 1.2, ease: "easeOut", delay: 0.3 }}
                      className="h-full rounded-full bg-gradient-to-r from-red-600 to-red-400"
                    />
                  </div>
                </div>
              </div>
              <div className="mt-3 text-center text-[10px] text-cyan-400/80 font-medium">
                Current: 67.4 &mdash; CAUTION zone
              </div>
            </div>
          </motion.div>

          <StepArrow />

          {/* STEP 6 — Driver Decision Support */}
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.3 }}
            className="w-full max-w-sm lg:w-[185px] shrink-0"
          >
            <div className={glassCard}>
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 rounded-lg bg-cyan-400/10">
                  <Shield className="w-5 h-5 text-cyan-400" />
                </div>
                <span className="text-[10px] font-semibold uppercase tracking-widest text-cyan-400">
                  Step 6
                </span>
              </div>
              <h3 className="text-base font-semibold text-white mb-3">Driver Decision Support</h3>
              <div className="space-y-2">
                <div className="rounded-xl bg-white/[0.03] border border-green-500/30 p-2.5 opacity-50">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-green-500" />
                    <span className="text-[11px] font-semibold text-green-400">SAFE</span>
                  </div>
                  <p className="text-[11px] text-gray-400">Maintain Speed</p>
                  <p className="text-[10px] text-gray-500">2000&ndash;3000 RPM</p>
                </div>

                <div className="rounded-xl bg-white/[0.06] border border-yellow-500/30 p-2.5 shadow-lg shadow-yellow-500/10">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-yellow-500 animate-pulse" />
                    <span className="text-[11px] font-semibold text-yellow-400">CAUTION</span>
                  </div>
                  <p className="text-[11px] text-gray-200">Reduce Speed</p>
                  <p className="text-[10px] text-gray-400">1500&ndash;2000 RPM</p>
                </div>

                <div className="rounded-xl bg-white/[0.03] border border-red-500/30 p-2.5 opacity-50">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-red-500" />
                    <span className="text-[11px] font-semibold text-red-400">DANGEROUS</span>
                  </div>
                  <p className="text-[11px] text-gray-400">Slow Down Immediately</p>
                  <p className="text-[10px] text-gray-500">Below 1500 RPM</p>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
