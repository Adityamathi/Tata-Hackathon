"use client";

import { motion } from "framer-motion";
import dynamic from "next/dynamic";
import { MapPin, Route, AlertTriangle, Navigation, Layers, Target } from "lucide-react";
import GlowCard from "@/components/GlowCard";

const RoadHealthMap = dynamic(() => import("@/components/RoadHealthMap"), { ssr: false });

const hotspots = [
  { zone: "Sector A", risk: "HIGH", hazards: 24, color: "#EF4444" },
  { zone: "Sector B", risk: "MEDIUM", hazards: 12, color: "#F59E0B" },
  { zone: "Sector C", risk: "LOW", hazards: 5, color: "#00D4FF" },
  { zone: "Sector D", risk: "CRITICAL", hazards: 38, color: "#7F1D1D" },
  { zone: "Sector E", risk: "MEDIUM", hazards: 15, color: "#F59E0B" },
];

const routes = [
  { name: "Route A (Recommended)", hazards: 2, time: "18 min", score: 92 },
  { name: "Route B", hazards: 7, time: "15 min", score: 68 },
  { name: "Route C", hazards: 12, time: "12 min", score: 45 },
];

export default function MapPage() {
  return (
    <div className="pt-20 px-4 pb-12">
      <div className="max-w-7xl mx-auto">
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="mb-6">
          <h1 className="text-2xl md:text-3xl font-bold">
            <span className="gradient-text">Road Intelligence</span> Map
          </h1>
          <p className="text-[#AAB3C5] text-sm mt-1">Interactive hazard map with route recommendations</p>
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
          {/* Map */}
          <GlowCard className="lg:col-span-2 p-3">
            <RoadHealthMap />
          </GlowCard>

          {/* Hotspots + Routes */}
          <GlowCard className="flex flex-col gap-4">
            <div>
              <h3 className="text-white font-semibold mb-3 text-sm flex items-center gap-2">
                <Target className="w-4 h-4 text-[#EF4444]" /> Severity Hotspots
              </h3>
              <div className="space-y-2">
                {hotspots.map((h) => (
                  <div key={h.zone} className="flex items-center justify-between glass-strong rounded-lg px-3 py-2">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full" style={{ backgroundColor: h.color }} />
                      <span className="text-white text-xs">{h.zone}</span>
                    </div>
                    <div className="text-xs" style={{ color: h.color }}>
                      {h.hazards} hazards • {h.risk}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <h3 className="text-white font-semibold mb-3 text-sm flex items-center gap-2">
                <Navigation className="w-4 h-4 text-[#00D4FF]" /> Route Recommendations
              </h3>
              <div className="space-y-2">
                {routes.map((r) => (
                  <div key={r.name} className="glass-strong rounded-lg px-3 py-2.5">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="text-white text-xs font-semibold">{r.name}</div>
                        <div className="text-[#AAB3C5] text-xs">{r.time} • {r.hazards} hazards</div>
                      </div>
                      <div
                        className="text-sm font-bold"
                        style={{ color: r.score > 80 ? "#00D4FF" : r.score > 60 ? "#F59E0B" : "#EF4444" }}
                      >
                        {r.score}/100
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </GlowCard>
        </div>
      </div>
    </div>
  );
}
