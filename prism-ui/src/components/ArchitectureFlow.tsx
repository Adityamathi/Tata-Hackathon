"use client";

import { motion } from "framer-motion";

const steps = [
  { label: "Vehicle Camera", sub: "Real-time video input" },
  { label: "Road Hazard Detection", sub: "YOLOv11 Edge AI" },
  { label: "Severity Assessment", sub: "Confidence-weight scoring" },
  { label: "Driver Warning System", sub: "Audio-visual alerts" },
  { label: "Road Health Intelligence", sub: "Health score analytics" },
  { label: "Fleet Analytics", sub: "Enterprise intelligence" },
];

export default function ArchitectureFlow() {
  return (
    <div className="flex flex-col items-center gap-0">
      {steps.map((s, i) => (
        <motion.div
          key={s.label}
          initial={{ opacity: 0, x: -20 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true }}
          transition={{ delay: i * 0.15 }}
          className="flex flex-col items-center"
        >
          <div className="glass-strong rounded-xl px-6 py-3 w-64 text-center glow-blue">
            <div className="text-white font-semibold text-sm">{s.label}</div>
            <div className="text-[#AAB3C5] text-xs mt-0.5">{s.sub}</div>
          </div>
          {i < steps.length - 1 && (
            <svg width="24" height="40" viewBox="0 0 24 40" className="my-1">
              <motion.line
                x1="12" y1="0" x2="12" y2="40"
                stroke="#00D4FF" strokeWidth="2" strokeDasharray="4 4"
                initial={{ pathLength: 0 }}
                whileInView={{ pathLength: 1 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.15 + 0.3, duration: 0.5 }}
              />
            </svg>
          )}
        </motion.div>
      ))}
    </div>
  );
}
