"use client";

import { motion } from "framer-motion";
import { useEffect, useState } from "react";

export default function HealthGauge({ value = 82, size = 200, label = "Road Health Score" }) {
  const [animated, setAnimated] = useState(0);
  const radius = size * 0.35;
  const circumference = 2 * Math.PI * radius;
  const clamped = Math.min(Math.max(value, 0), 100);

  useEffect(() => {
    const t = setTimeout(() => setAnimated(clamped), 300);
    return () => clearTimeout(t);
  }, [clamped]);

  const offset = circumference - (animated / 100) * circumference;
  const color = clamped > 75 ? "#00D4FF" : clamped > 50 ? "#F59E0B" : "#EF4444";

  return (
    <div className="flex flex-col items-center gap-2" style={{ width: size }}>
      <svg width={size} height={size * 0.55} viewBox={`0 0 ${size} ${size * 0.55}`}>
        <path
          d={`M ${size * 0.1} ${size * 0.45} A ${radius} ${radius} 0 0 1 ${size * 0.9} ${size * 0.45}`}
          fill="none"
          stroke="rgba(255,255,255,0.05)"
          strokeWidth={10}
          strokeLinecap="round"
        />
        <motion.path
          d={`M ${size * 0.1} ${size * 0.45} A ${radius} ${radius} 0 0 1 ${size * 0.9} ${size * 0.45}`}
          fill="none"
          stroke={color}
          strokeWidth={10}
          strokeLinecap="round"
          strokeDasharray={circumference}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset: offset }}
          transition={{ duration: 1.5, ease: "easeOut" }}
          style={{ filter: `drop-shadow(0 0 10px ${color})` }}
        />
        <text x={size / 2} y={size * 0.3} textAnchor="middle" fill="white" fontSize={size * 0.18} fontWeight="bold">
          {Math.round(animated)}
        </text>
        <text x={size / 2} y={size * 0.42} textAnchor="middle" fill="#AAB3C5" fontSize={size * 0.055}>
          / 100
        </text>
      </svg>
      <span className="text-sm text-[#AAB3C5]">{label}</span>
    </div>
  );
}
