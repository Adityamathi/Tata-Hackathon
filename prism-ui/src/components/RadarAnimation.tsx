"use client";

export default function RadarAnimation() {
  return (
    <div className="relative w-48 h-48 mx-auto">
      <div className="absolute inset-0 rounded-full border border-[rgba(0,212,255,0.15)]" />
      <div className="absolute inset-4 rounded-full border border-[rgba(0,212,255,0.1)]" />
      <div className="absolute inset-8 rounded-full border border-[rgba(0,212,255,0.05)]" />
      <div className="absolute inset-0 rounded-full overflow-hidden">
        <div
          className="absolute top-1/2 left-1/2 w-1/2 h-0.5 origin-left bg-gradient-to-r from-transparent via-[#00D4FF] to-[#19F5FF] animate-radar"
          style={{ filter: "drop-shadow(0 0 10px #00D4FF)" }}
        />
      </div>
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="w-3 h-3 bg-[#00D4FF] rounded-full animate-pulse-glow" style={{ boxShadow: "0 0 20px #00D4FF" }} />
      </div>
    </div>
  );
}
