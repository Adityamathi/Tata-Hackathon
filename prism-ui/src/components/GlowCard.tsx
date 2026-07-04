"use client";

import { motion } from "framer-motion";

interface GlowCardProps {
  children: React.ReactNode;
  className?: string;
  glow?: boolean;
  delay?: number;
}

export default function GlowCard({ children, className = "", glow = true, delay = 0 }: GlowCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.5, delay }}
      className={`glass rounded-2xl p-6 ${glow ? 'glow-blue' : ''} ${className}`}
    >
      {children}
    </motion.div>
  );
}
