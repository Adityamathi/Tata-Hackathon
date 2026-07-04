"use client";

import { useState } from "react";
import Link from "next/link";
import { Menu, X, Radar } from "lucide-react";

const navLinks = [
  { href: "/", label: "Home" },
  { href: "/map", label: "Map" },
  { href: "/demo", label: "Demo" },
];

export default function Navbar() {
  const [open, setOpen] = useState(false);

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 glass border-b border-[rgba(0,212,255,0.1)]">
      <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2 group">
          <Radar className="w-6 h-6 text-[#00D4FF] group-hover:animate-pulse-glow" />
          <span className="text-lg font-bold">
            <span className="gradient-text">PRISM</span>
            <span className="text-white ml-1 hidden sm:inline text-sm font-normal opacity-60">| Predictive Road Intelligence</span>
          </span>
        </Link>

        <div className="hidden lg:flex items-center gap-1">
          {navLinks.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className="px-3 py-2 text-sm text-[#AAB3C5] hover:text-[#00D4FF] transition-colors rounded-lg hover:bg-[rgba(0,212,255,0.05)]"
            >
              {l.label}
            </Link>
          ))}
        </div>

        <button
          onClick={() => setOpen(!open)}
          className="lg:hidden p-2 text-[#AAB3C5] hover:text-white"
        >
          {open ? <X size={24} /> : <Menu size={24} />}
        </button>
      </div>

      {open && (
        <div className="lg:hidden glass border-t border-[rgba(0,212,255,0.1)]">
          <div className="px-4 py-2 space-y-1">
            {navLinks.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                onClick={() => setOpen(false)}
                className="block px-3 py-2 text-sm text-[#AAB3C5] hover:text-[#00D4FF] rounded-lg hover:bg-[rgba(0,212,255,0.05)]"
              >
                {l.label}
              </Link>
            ))}
          </div>
        </div>
      )}
    </nav>
  );
}
