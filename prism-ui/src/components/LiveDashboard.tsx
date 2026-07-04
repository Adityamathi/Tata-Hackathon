"use client";

import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import {
  AlertTriangle,
  Shield,
  Activity,
  Ruler,
  Map,
  Droplet,
  Car,
} from "lucide-react";

function describeArc(
  cx: number,
  cy: number,
  r: number,
  startAngle: number,
  endAngle: number,
) {
  const rad = (d: number) => (d * Math.PI) / 180;
  const x1 = cx + r * Math.cos(rad(startAngle));
  const y1 = cy + r * Math.sin(rad(startAngle));
  const x2 = cx + r * Math.cos(rad(endAngle));
  const y2 = cy + r * Math.sin(rad(endAngle));
  const sweep = 1;
  let diff = endAngle - startAngle;
  if (diff < 0) diff += 360;
  const large = diff > 180 ? 1 : 0;
  return `M ${x1.toFixed(1)} ${y1.toFixed(1)} A ${r} ${r} 0 ${large} ${sweep} ${x2.toFixed(1)} ${y2.toFixed(1)}`;
}

function DetectionRow({
  label,
  confidence,
  barColor,
  bboxColor,
}: {
  label: string;
  confidence: number;
  barColor: string;
  bboxColor: string;
}) {
  return (
    <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-white/[0.04] border border-white/5">
      <div className="flex-1 min-w-0">
        <div className="flex justify-between items-center mb-1.5">
          <span className="text-sm font-medium text-white truncate">{label}</span>
          <span className="text-xs font-mono text-white/60 ml-2">{confidence}%</span>
        </div>
        <div className="w-full h-2 rounded-full bg-white/10 overflow-hidden">
          <motion.div
            initial={{ width: "0%" }}
            whileInView={{ width: `${confidence}%` }}
            viewport={{ once: true }}
            transition={{ duration: 1.2, ease: "easeOut", delay: 0.2 }}
            className="h-full rounded-full"
            style={{ backgroundColor: barColor }}
          />
        </div>
      </div>
      <div
        className="w-8 h-8 rounded border-2 shrink-0"
        style={{ borderColor: bboxColor, backgroundColor: `${bboxColor}20` }}
      />
    </div>
  );
}

const cx = 100, cy = 100, r = 72, gaugeStart = 150, gaugeEnd = 30, gaugeSweep = 120;
const bgArc = describeArc(cx, cy, r, gaugeStart, gaugeEnd);

function Gauge() {
  const value = 42.8;
  const valueAngle = gaugeStart - (value / 100) * gaugeSweep;
  const valArc = describeArc(cx, cy, r, gaugeStart, valueAngle);

  const needleAngle = (valueAngle * Math.PI) / 180;
  const needleX = cx + r * Math.cos(needleAngle);
  const needleY = cy + r * Math.sin(needleAngle);

  return (
    <svg viewBox="0 0 200 200" className="w-52 h-52 mx-auto" strokeLinecap="round">
      <defs>
        <linearGradient id="gaugeRed" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#ef4444" />
          <stop offset="100%" stopColor="#dc2626" />
        </linearGradient>
        <filter id="needleGlow">
          <feGaussianBlur stdDeviation="3" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
        <filter id="gaugeGlow">
          <feGaussianBlur stdDeviation="4" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      <motion.path
        d={bgArc}
        fill="none"
        stroke="#AAB3C5"
        strokeOpacity={0.2}
        strokeWidth={14}
      />

      <motion.path
        d={valArc}
        fill="none"
        stroke="url(#gaugeRed)"
        strokeWidth={14}
        filter="url(#gaugeGlow)"
        initial={{ pathLength: 0 }}
        whileInView={{ pathLength: 1 }}
        viewport={{ once: true }}
        transition={{ duration: 2, ease: "easeOut", delay: 0.4 }}
      />

      {[0, 25, 50, 75, 100].map((t) => {
        const a = ((gaugeStart - (t / 100) * gaugeSweep) * Math.PI) / 180;
        const inner = { x: cx + (r - 10) * Math.cos(a), y: cy + (r - 10) * Math.sin(a) };
        const outer = { x: cx + (r + 2) * Math.cos(a), y: cy + (r + 2) * Math.sin(a) };
        return (
          <line
            key={t}
            x1={inner.x}
            y1={inner.y}
            x2={outer.x}
            y2={outer.y}
            stroke="#AAB3C5"
            strokeOpacity={0.4}
            strokeWidth={1.5}
          />
        );
      })}

      {[0, 25, 50, 75, 100].map((t) => {
        const a = ((gaugeStart - (t / 100) * gaugeSweep) * Math.PI) / 180;
        const pos = { x: cx + (r + 16) * Math.cos(a), y: cy + (r + 16) * Math.sin(a) };
        return (
          <text
            key={t}
            x={pos.x}
            y={pos.y}
            textAnchor="middle"
            dominantBaseline="middle"
            fill="#AAB3C5"
            fillOpacity={0.6}
            fontSize={9}
            fontFamily="monospace"
          >
            {t}
          </text>
        );
      })}

      <motion.line
        x1={cx}
        y1={cy}
        x2={needleX}
        y2={needleY}
        stroke="#ef4444"
        strokeWidth={2.5}
        filter="url(#needleGlow)"
        initial={{ pathLength: 0 }}
        whileInView={{ pathLength: 1 }}
        viewport={{ once: true }}
        transition={{ duration: 1.5, ease: "easeOut", delay: 0.6 }}
      />

      <circle cx={cx} cy={cy} r={5} fill="#ef4444" />
      <circle cx={cx} cy={cy} r={2} fill="#fff" />

      <text
        x={cx}
        y={cy + 24}
        textAnchor="middle"
        fill="#ef4444"
        fontSize={26}
        fontWeight={700}
        fontFamily="monospace"
      >
        {value}
      </text>
      <text
        x={cx}
        y={cy + 40}
        textAnchor="middle"
        fill="#AAB3C5"
        fillOpacity={0.5}
        fontSize={10}
        fontFamily="monospace"
      >
        / 100
      </text>
    </svg>
  );
}

function MetricCard({
  icon,
  label,
  value,
  unit,
  color = "text-white",
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  unit?: string;
  color?: string;
}) {
  return (
    <div className="rounded-xl bg-white/[0.04] border border-white/5 p-3.5">
      <div className="flex items-center gap-2 mb-2">
        <div className={`p-1.5 rounded-lg bg-white/5 ${color}`}>{icon}</div>
        <span className="text-[10px] uppercase tracking-wider text-white/40">{label}</span>
      </div>
      <div className="flex items-baseline gap-1">
        <span className={`text-xl font-bold font-mono ${color}`}>{value}</span>
        {unit && <span className="text-[10px] text-white/30 font-mono">{unit}</span>}
      </div>
    </div>
  );
}

export default function LiveDashboard() {
  return (
    <section className="relative min-h-screen bg-[#061A40] py-10 px-4 overflow-hidden">
      <div className="absolute inset-0 bg-[linear-gradient(rgba(0,212,255,0.04)_1px,transparent_1px),linear-gradient(90deg,rgba(0,212,255,0.04)_1px,transparent_1px)] bg-[size:50px_50px]" />

      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(0,212,255,0.06),transparent_70%)]" />

      <div className="relative max-w-6xl mx-auto">
        <div className="flex items-center gap-3 mb-8">
          <Shield className="w-6 h-6 text-cyan-400" />
          <h1 className="text-2xl font-bold text-white tracking-tight">
            PRISM <span className="text-cyan-400">Live Monitor</span>
          </h1>
        </div>

        <div className="rounded-3xl bg-white/[0.03] backdrop-blur-2xl border border-cyan-500/15 shadow-[0_0_50px_rgba(0,212,255,0.1)] p-6 lg:p-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* LEFT COLUMN */}
            <div>
              <div className="flex items-center gap-2 mb-5">
                <span className="relative flex w-2.5 h-2.5">
                  <span className="absolute inset-0 rounded-full bg-red-500 animate-ping opacity-60" />
                  <span className="relative inline-block w-2.5 h-2.5 rounded-full bg-red-500" />
                </span>
                <span className="text-xs font-semibold uppercase tracking-[0.15em] text-white/60">
                  LIVE DETECTIONS
                </span>
              </div>

              <div className="space-y-2.5 mb-5">
                <DetectionRow
                  label="POTHOLE"
                  confidence={87}
                  barColor="#ef4444"
                  bboxColor="#ef4444"
                />
                <DetectionRow
                  label="ALLIGATOR CRACK"
                  confidence={92}
                  barColor="#ef4444"
                  bboxColor="#ef4444"
                />
                <DetectionRow
                  label="LONGITUDINAL CRACK"
                  confidence={65}
                  barColor="#eab308"
                  bboxColor="#eab308"
                />
              </div>

              <motion.div
                initial={{ opacity: 0, y: 10 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.4, delay: 0.5 }}
                className="flex items-center justify-between px-4 py-3 rounded-xl bg-white/[0.04] border border-white/5"
              >
                <div className="flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-cyan-400" />
                  <span className="text-sm font-medium text-white">3 Hazards Detected</span>
                </div>
                <span className="text-lg font-bold font-mono text-cyan-400">3</span>
              </motion.div>
            </div>

            {/* RIGHT COLUMN */}
            <div>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-sm font-semibold uppercase tracking-[0.15em] text-white/60">
                  ROAD HEALTH
                </h2>
              </div>

              <Gauge />

              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ duration: 0.4, delay: 0.8 }}
                className="flex justify-center mt-2"
              >
                <span className="px-4 py-1.5 rounded-full bg-red-500/15 border border-red-500/30 text-xs font-bold text-red-400 uppercase tracking-widest">
                  VERY POOR
                </span>
              </motion.div>

              <div className="grid grid-cols-2 gap-3 mt-6">
                <MetricCard
                  icon={<Activity className="w-4 h-4" />}
                  label="Severity Score"
                  value="66.1"
                  unit="/100"
                  color="text-orange-400"
                />
                <MetricCard
                  icon={<Map className="w-4 h-4" />}
                  label="Total Area"
                  value="43.2"
                  unit="m²"
                />
                <MetricCard
                  icon={<Droplet className="w-4 h-4" />}
                  label="Coverage"
                  value="18"
                  unit="%"
                />
                <MetricCard
                  icon={<Ruler className="w-4 h-4" />}
                  label="Deepest Pothole"
                  value="3.10"
                  unit="m"
                />
              </div>

              <motion.div
                initial={{ opacity: 0, x: -20 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: 0.3 }}
                className="mt-5 p-4 rounded-xl bg-red-500/10 border border-red-500/25 flex items-start gap-3"
              >
                <span className="text-base shrink-0 mt-0.5">🚨</span>
                <span className="text-sm font-medium text-red-300">
                  Severe Road Damage Detected
                </span>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: 0.4 }}
                className="mt-3 p-4 rounded-xl bg-white/[0.04] border border-white/10"
              >
                <div className="flex items-center gap-2 mb-3">
                  <Car className="w-4 h-4 text-cyan-400" />
                  <span className="text-xs font-semibold uppercase tracking-wider text-cyan-400">
                    Recommended Action
                  </span>
                </div>
                <ul className="space-y-1.5">
                  {[
                    "Reduce speed to 20\u201330 km/h",
                    "Hazard Lights ON",
                    "Grip Steering Wheel",
                    "Report to Authority",
                  ].map((item) => (
                    <li key={item} className="flex items-center gap-2 text-xs text-gray-300">
                      <span className="w-1 h-1 rounded-full bg-cyan-400/60" />
                      {item}
                    </li>
                  ))}
                </ul>
              </motion.div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
