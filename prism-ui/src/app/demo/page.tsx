"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { motion } from "framer-motion";
import { Upload, Camera, Image, Video, Activity, Shield, AlertTriangle, Gauge, Ruler, MapPin } from "lucide-react";
import GlowCard from "@/components/GlowCard";
import AlertCard from "@/components/AlertCard";
import HealthGauge from "@/components/HealthGauge";

const API_URL = "http://localhost:8000";

interface Detection {
  type: string;
  confidence: number;
  area_m2: number;
  depth_m: number;
  severity_level: string;
  severity_score: number;
  severity_index: number;
  normalized_area_ratio: number;
  shape_irregularity: number;
  shadow_intensity: number;
  distance_zone: number;
}

interface Result {
  detections: Detection[];
  total_detections: number;
  alert: "SAFE" | "CAUTION" | "DANGEROUS" | "NO_DATA";
  road_health: string;
  health_score: number;
  total_area_m2: number;
  coverage_percent: number;
  speed_advice: { speed: string; rpm: string; action: string };
  annotated_image: string;
}

export default function DemoPage() {
  const [uploaded, setUploaded] = useState<string | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [results, setResults] = useState<Result | null>(null);
  const [camMode, setCamMode] = useState(false);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const startCam = useCallback(async () => {
    try {
      const s = await navigator.mediaDevices.getUserMedia({ video: true });
      setStream(s);
      setCamMode(true);
      setUploaded(null);
      setResults(null);
      setError(null);
    } catch {
      setError("Camera access denied or not available");
    }
  }, []);

  const stopCam = useCallback(() => {
    if (stream) {
      stream.getTracks().forEach((t) => t.stop());
      setStream(null);
    }
    setCamMode(false);
  }, [stream]);

  useEffect(() => {
    if (camMode && videoRef.current && stream) {
      videoRef.current.srcObject = stream;
    }
  }, [camMode, stream]);

  useEffect(() => {
    return () => {
      if (stream) stream.getTracks().forEach((t) => t.stop());
    };
  }, [stream]);

  const captureFrame = async () => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.drawImage(video, 0, 0);
    setUploaded(canvas.toDataURL("image/jpeg"));
    setAnalyzing(true);
    setError(null);
    setResults(null);

    canvas.toBlob(async (blob) => {
      if (!blob) { setAnalyzing(false); return; }
      const form = new FormData();
      form.append("file", blob, "webcam.jpg");
      try {
        const res = await fetch(`${API_URL}/api/detect`, { method: "POST", body: form });
        if (!res.ok) throw new Error(`Server error: ${res.status}`);
        const data: Result = await res.json();
        setResults(data);
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : "Failed to analyze image";
        setError(msg);
      } finally {
        setAnalyzing(false);
      }
    }, "image/jpeg");
  };

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploaded(URL.createObjectURL(file));
    setAnalyzing(true);
    setError(null);
    setResults(null);

    const form = new FormData();
    form.append("file", file);

    try {
      const res = await fetch(`${API_URL}/api/detect`, { method: "POST", body: form });
      if (!res.ok) throw new Error(`Server error: ${res.status}`);
      const data: Result = await res.json();
      setResults(data);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to analyze image";
      setError(msg);
    } finally {
      setAnalyzing(false);
    }
  };

  const alertColor = (sev: string) => {
    if (sev === "HIGH" || sev === "CRITICAL") return "#EF4444";
    if (sev === "MODERATE") return "#F59E0B";
    if (sev === "LOW") return "#00D4FF";
    return "#AAB3C5";
  };

  return (
    <div className="pt-20 px-4 pb-12">
      <div className="max-w-7xl mx-auto">
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="mb-6">
          <h1 className="text-2xl md:text-3xl font-bold">
            <span className="gradient-text">PRISM</span> Road Detection Demo
          </h1>
          <p className="text-[#AAB3C5] text-sm mt-1">
            Upload a road image or use your webcam for real-time AI analysis with area, depth & severity estimation
          </p>
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
          {/* Left - Input & Image */}
          <div className="space-y-4">
            {/* Mode Toggle */}
            <div className="flex gap-2">
              <button
                onClick={() => { if (camMode) stopCam(); }}
                className={`flex-1 py-2 rounded-xl text-sm font-medium transition-all ${
                  !camMode
                    ? "bg-[#00D4FF] text-black"
                    : "glass-strong text-[#AAB3C5]"
                }`}
              >
                <Upload className="w-4 h-4 inline mr-1" /> Upload
              </button>
              <button
                onClick={camMode ? stopCam : startCam}
                className={`flex-1 py-2 rounded-xl text-sm font-medium transition-all ${
                  camMode
                    ? "bg-[#00D4FF] text-black"
                    : "glass-strong text-[#AAB3C5]"
                }`}
              >
                <Camera className="w-4 h-4 inline mr-1" /> Live Cam
              </button>
            </div>

            {camMode ? (
              <GlowCard>
                <h2 className="text-white font-semibold mb-4 flex items-center gap-2">
                  <Video className="w-4 h-4 text-[#00D4FF]" /> Webcam Feed
                </h2>
                <div className="relative bg-black rounded-xl overflow-hidden aspect-video">
                  <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    muted
                    className="w-full h-full object-contain"
                  />
                  <canvas ref={canvasRef} hidden />
                  {stream && (
                    <div className="absolute bottom-2 left-2 right-2 flex justify-center">
                      <button
                        onClick={captureFrame}
                        disabled={analyzing}
                        className="bg-[#00D4FF] text-black px-6 py-2 rounded-full text-sm font-semibold hover:bg-[#00D4FF]/80 transition-all disabled:opacity-50"
                      >
                        {analyzing ? "Analyzing..." : "Capture & Analyze"}
                      </button>
                    </div>
                  )}
                </div>
              </GlowCard>
            ) : (
              <GlowCard>
                <h2 className="text-white font-semibold mb-4 flex items-center gap-2">
                  <Camera className="w-4 h-4 text-[#00D4FF]" /> Upload Image
                </h2>
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="glass-strong rounded-xl p-8 text-center cursor-pointer hover:glow-blue transition-all"
                >
                  <Upload className="w-10 h-10 text-[#00D4FF] mx-auto mb-3" />
                  <p className="text-white text-sm">Click to upload road image</p>
                  <p className="text-[#AAB3C5] text-xs mt-1">JPG or PNG</p>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleFile}
                    hidden
                  />
                </div>
              </GlowCard>
            )}

            {results?.annotated_image && (
              <GlowCard>
                <h2 className="text-white font-semibold mb-4 flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-[#00D4FF]" /> Detection Overlay
                </h2>
                <img
                  src={`data:image/png;base64,${results.annotated_image}`}
                  alt="Annotated detection"
                  className="rounded-xl w-full"
                />
              </GlowCard>
            )}

            {uploaded && !results?.annotated_image && (
              <GlowCard>
                <img src={uploaded} alt="Original" className="rounded-xl w-full opacity-60" />
              </GlowCard>
            )}
          </div>

          {/* Center - Detection Details */}
          <GlowCard>
            <h2 className="text-white font-semibold mb-4 flex items-center gap-2">
              <Activity className="w-4 h-4 text-[#00D4FF]" /> Detections
            </h2>
            {analyzing ? (
              <div className="flex flex-col items-center justify-center py-12">
                <motion.div
                  className="w-16 h-16 border-4 border-[#00D4FF] border-t-transparent rounded-full"
                  animate={{ rotate: 360 }}
                  transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                />
                <p className="text-[#AAB3C5] text-sm mt-4">Running YOLOv11 inference...</p>
              </div>
            ) : error ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <AlertTriangle className="w-10 h-10 text-[#EF4444] mb-3" />
                <p className="text-[#EF4444] text-sm">{error}</p>
                <p className="text-[#AAB3C5] text-xs mt-2">Make sure the backend is running on port 8000</p>
              </div>
            ) : results ? (
              <div className="space-y-3">
                <div className="glass-strong rounded-xl p-3 flex items-center justify-between">
                  <span className="text-[#AAB3C5] text-sm">Total Detections</span>
                  <span className="text-white font-bold">{results.total_detections}</span>
                </div>
                {results.total_detections > 0 && (
                  <div className="glass-strong rounded-xl p-3 flex items-center justify-between">
                    <span className="text-[#AAB3C5] text-sm flex items-center gap-1">
                      <Ruler className="w-3 h-3" /> Total Damage Area
                    </span>
                    <span className="text-white font-bold">{results.total_area_m2} m²</span>
                  </div>
                )}
                {results.detections.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-8 text-[#AAB3C5]">
                    <Shield className="w-10 h-10 mb-2 opacity-50" />
                    <p className="text-sm">No road defects detected</p>
                    <p className="text-xs mt-1">Try a different image or lower confidence threshold</p>
                  </div>
                ) : (
                  results.detections.map((d, i) => (
                    <motion.div
                      key={i}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.1 }}
                      className="glass-strong rounded-xl p-4"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className="text-white font-semibold text-sm">{d.type}</div>
                        <span
                          className="text-xs font-bold px-2 py-1 rounded"
                          style={{
                            backgroundColor: `${alertColor(d.severity_level)}20`,
                            color: alertColor(d.severity_level),
                          }}
                        >
                          {d.severity_level}
                        </span>
                      </div>
                      <div className="grid grid-cols-3 gap-2 text-xs text-[#AAB3C5]">
                        <div>
                          <span className="block text-white font-medium">{(d.confidence * 100).toFixed(0)}%</span>
                          Confidence
                        </div>
                        <div>
                          <span className="block text-white font-medium">{d.area_m2 > 0 ? `${d.area_m2.toFixed(3)} m²` : "N/A"}</span>
                          Area (proxy)
                        </div>
                        <div>
                          <span className="block text-white font-medium">{d.depth_m > 0 ? `${(d.depth_m * 100).toFixed(1)} cm` : "N/A"}</span>
                          Depth (est.)
                        </div>
                      </div>
                      <div className="flex gap-2 mt-1.5 text-xs text-[#AAB3C5]">
                        <span className="bg-[rgba(0,212,255,0.1)] px-2 py-0.5 rounded">
                          Index: {d.severity_index.toFixed(2)}
                        </span>
                        <span className="bg-[rgba(0,212,255,0.1)] px-2 py-0.5 rounded">
                          Zone: {d.distance_zone === 1 ? "Near" : d.distance_zone === 2 ? "Mid" : "Far"}
                        </span>
                        <span className="bg-[rgba(0,212,255,0.1)] px-2 py-0.5 rounded">
                          Shadow: {(d.shadow_intensity * 100).toFixed(0)}%
                        </span>
                      </div>
                    </motion.div>
                  ))
                )}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-12 text-[#AAB3C5]">
                <Camera className="w-12 h-12 mb-3 opacity-50" />
                <p className="text-sm">Upload an image to start</p>
              </div>
            )}
          </GlowCard>

          {/* Right - Results */}
          <GlowCard>
            <h2 className="text-white font-semibold mb-4">Assessment</h2>
            {results ? (
              <div className="space-y-4">
                <AlertCard
                  level={results.alert === "NO_DATA" ? "SAFE" : results.alert}
                  message={
                    results.alert === "SAFE" ? "Road is safe — no significant hazards detected" :
                    results.alert === "CAUTION" ? "Moderate road damage detected — stay alert" :
                    results.alert === "DANGEROUS" ? "Severe road damage — stop immediately" :
                    "No data available"
                  }
                  action={results.speed_advice.action}
                />
                <div className="flex justify-center">
                  <HealthGauge value={results.health_score} size={160} />
                </div>

                {/* Speed Recommendation Card */}
                <div className="glass-strong rounded-xl p-4">
                  <h3 className="text-white text-sm font-semibold mb-3 flex items-center gap-2">
                    <Gauge className="w-4 h-4 text-[#00D4FF]" /> Speed Recommendation
                  </h3>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-[#AAB3C5]">Recommended Speed</span>
                      <span className="text-white font-bold">{results.speed_advice.speed}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-[#AAB3C5]">Engine RPM</span>
                      <span className="text-white font-bold">{results.speed_advice.rpm}</span>
                    </div>
                  </div>
                </div>

                {/* Summary Stats */}
                {results.total_detections > 0 && (
                  <div className="glass-strong rounded-xl p-4">
                    <h3 className="text-white text-sm font-semibold mb-3">Road Summary</h3>
                    <div className="grid grid-cols-2 gap-3 text-sm">
                      <div className="text-center p-2 rounded-lg" style={{ background: "rgba(0,212,255,0.1)" }}>
                        <div className="text-[#00D4FF] text-lg font-bold">{results.total_area_m2.toFixed(2)}</div>
                        <div className="text-[#AAB3C5] text-xs">Area (m²)</div>
                      </div>
                      <div className="text-center p-2 rounded-lg" style={{ background: "rgba(0,212,255,0.1)" }}>
                        <div className="text-[#00D4FF] text-lg font-bold">{results.coverage_percent.toFixed(1)}%</div>
                        <div className="text-[#AAB3C5] text-xs">Coverage</div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-12 text-[#AAB3C5]">
                <Shield className="w-12 h-12 mb-3 opacity-50" />
                <p className="text-sm">Awaiting analysis results</p>
              </div>
            )}
          </GlowCard>
        </div>
      </div>
    </div>
  );
}
