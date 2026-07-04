"use client";

import { motion } from "framer-motion";
import { useEffect, useState } from "react";

interface StatCardProps {
  value: number;
  label: string;
  prefix?: string;
  suffix?: string;
  color?: string;
  delay?: number;
}

export default function StatCard({ value, label, prefix = "", suffix = "", color = "#00D4FF", delay = 0 }: StatCardProps) {
  const [count, setCount] = useState(0);

  useEffect(() => {
    const duration = 1500;
    const steps = 30;
    const increment = value / steps;
    let current = 0;
    const timer = setInterval(() => {
      current += increment;
      if (current >= value) {
        setCount(value);
        clearInterval(timer);
      } else {
        setCount(Math.floor(current));
      }
    }, duration / steps);
    return () => clearInterval(timer);
  }, [value]);

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.8 }}
      whileInView={{ opacity: 1, scale: 1 }}
      viewport={{ once: true }}
      transition={{ delay }}
      className="glass rounded-2xl p-6 text-center glow-blue"
    >
      <div className="text-4xl font-bold" style={{ color }}>
        {prefix}{count}{suffix}
      </div>
      <div className="text-sm text-[#AAB3C5] mt-2">{label}</div>
    </motion.div>
  );
}
