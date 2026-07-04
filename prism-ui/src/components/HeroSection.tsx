"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { ChevronDown, Play, Layers, Code2, FileText } from "lucide-react";

const fadeUp = {
  hidden: { opacity: 0, y: 30 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.6, delay: i * 0.12, ease: "easeOut" as const },
  }),
};

export default function HeroSection() {
  return (
    <section className="relative min-h-screen flex items-center justify-center px-4 pt-24 overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0 bg-gradient-to-b from-[#00D4FF]/8 via-transparent to-transparent" />
      <div className="absolute top-1/4 left-1/4 w-[500px] h-[500px] bg-[#00D4FF]/8 rounded-full blur-[150px]" />
      <div className="absolute bottom-1/4 right-1/4 w-[400px] h-[400px] bg-[#0A84FF]/8 rounded-full blur-[120px]" />

      {/* Grid overlay */}
      <div className="absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage: `linear-gradient(rgba(0,212,255,0.3) 1px, transparent 1px), linear-gradient(90deg, rgba(0,212,255,0.3) 1px, transparent 1px)`,
          backgroundSize: "60px 60px",
        }}
      />

      <div className="relative z-10 flex flex-col items-center text-center max-w-4xl mx-auto">
        <motion.div custom={0} variants={fadeUp} initial="hidden" animate="visible"
          className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/[0.035] backdrop-blur-xl border border-white/[0.08] text-xs md:text-sm text-[#AAB3C5] mb-8"
        >
          <span>🚗</span> Edge AI · Real-time · Production Ready
        </motion.div>

        <motion.h1 custom={1} variants={fadeUp} initial="hidden" animate="visible"
          className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold leading-tight mb-6"
        >
          Roads Don&apos;t Warn Drivers.<br />
          <span className="bg-gradient-to-r from-[#00D4FF] to-[#3DDCFF] bg-clip-text text-transparent">PRISM Does.</span>
        </motion.h1>

        <motion.p custom={2} variants={fadeUp} initial="hidden" animate="visible"
          className="text-[#AAB3C5] text-lg max-w-2xl mb-10"
        >
          Edge AI powered Predictive Road Intelligence System that transforms raw road observations into actionable driver intelligence.
        </motion.p>

        <motion.div custom={3} variants={fadeUp} initial="hidden" animate="visible"
          className="flex flex-wrap justify-center gap-4"
        >
          <Link href="/dashboard" className="btn-primary flex items-center gap-2">
            Live Demo <Play className="w-4 h-4" />
          </Link>
          <Link href="#architecture" className="btn-outline flex items-center gap-2">
            <Layers className="w-4 h-4" /> View Architecture
          </Link>
          <Link href="#" className="btn-outline flex items-center gap-2">
            <Code2 className="w-4 h-4" /> GitHub
          </Link>
          <Link href="#" className="btn-outline flex items-center gap-2">
            <FileText className="w-4 h-4" /> Documentation
          </Link>
        </motion.div>

        <motion.div custom={4} variants={fadeUp} initial="hidden" animate="visible" className="mt-16">
          <ChevronDown className="w-6 h-6 text-[#AAB3C5] animate-bounce" />
        </motion.div>
      </div>
    </section>
  );
}
