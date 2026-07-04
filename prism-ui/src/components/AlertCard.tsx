"use client";

import { motion } from "framer-motion";
import { AlertTriangle, Shield, AlertOctagon } from "lucide-react";

interface AlertCardProps {
  level: "SAFE" | "CAUTION" | "DANGEROUS";
  message: string;
  action: string;
  delay?: number;
}

const config = {
  SAFE: { icon: Shield, color: "#00D4FF", bg: "rgba(0,212,255,0.1)", border: "rgba(0,212,255,0.3)" },
  CAUTION: { icon: AlertTriangle, color: "#F59E0B", bg: "rgba(245,158,11,0.1)", border: "rgba(245,158,11,0.3)" },
  DANGEROUS: { icon: AlertOctagon, color: "#EF4444", bg: "rgba(239,68,68,0.1)", border: "rgba(239,68,68,0.3)" },
};

export default function AlertCard({ level, message, action, delay = 0 }: AlertCardProps) {
  const c = config[level];
  const Icon = c.icon;

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay }}
      className="rounded-xl p-4"
      style={{ background: c.bg, border: `1px solid ${c.border}` }}
    >
      <div className="flex items-start gap-3">
        <div className="relative">
          <Icon className="w-6 h-6" style={{ color: c.color }} />
          <span
            className="absolute inset-0 animate-ping rounded-full opacity-30"
            style={{ backgroundColor: c.color }}
          />
        </div>
        <div>
          <p className="font-semibold text-sm" style={{ color: c.color }}>{level}</p>
          <p className="text-white text-sm mt-1">{message}</p>
          <p className="text-[#AAB3C5] text-xs mt-1">{action}</p>
        </div>
      </div>
    </motion.div>
  );
}
