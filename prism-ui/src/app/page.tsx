import Link from "next/link";

export default function Home() {
  return (
    <main className="min-h-screen bg-[#07111F] text-white overflow-x-hidden flex flex-col items-center justify-center px-4">
      <div className="text-center max-w-3xl mx-auto">
        <h1 className="text-4xl sm:text-5xl md:text-7xl font-bold leading-tight mb-6">
          Roads Don&apos;t Warn Drivers.<br />
          <span className="bg-gradient-to-r from-[#00D4FF] to-[#3DDCFF] bg-clip-text text-transparent">PRISM Does.</span>
        </h1>
        <p className="text-[#AAB3C5] text-lg mb-10">
          Edge AI powered Predictive Road Intelligence System that transforms raw road observations into actionable driver intelligence.
        </p>
        <div className="flex flex-wrap justify-center gap-4">
          <Link href="/demo" className="btn-primary flex items-center gap-2 text-lg px-8 py-4">
            Live Demo
          </Link>
          <a
            href="https://github.com/Adityamathi/Tata-Hackathon"
            target="_blank"
            rel="noopener noreferrer"
            className="btn-outline flex items-center gap-2 text-lg px-8 py-4"
          >
            GitHub
          </a>
        </div>
      </div>
    </main>
  );
}
