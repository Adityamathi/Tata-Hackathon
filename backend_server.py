"""
PRISM Detection API — FastAPI backend
Provides real-time road damage detection with area/depth estimation.
"""

import io
import os
import base64
import tempfile
import urllib.request
from pathlib import Path

import cv2
import numpy as np
from PIL import Image, ImageDraw, ImageFont
from fastapi import FastAPI, File, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from severity_engine import SeverityEngine

try:
    from ultralytics import YOLO
    HAS_ULTRALYTICS = True
except ImportError:
    HAS_ULTRALYTICS = False

try:
    from road_damage_system import (
        SurfaceAreaEstimator, SeverityCalculator, RoadConditionAnalyzer,
        ActionRecommender, DamageType
    )
    from road_damage_system import Detection as RDDDetection
    HAS_RDD = True
except ImportError:
    HAS_RDD = False

try:
    from calibrated_camera import CameraCalibrator
    HAS_CALIBRATION = True
except ImportError:
    HAS_CALIBRATION = False

app = FastAPI(title="PRISM Detection API")
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"])

MODEL_PATHS = {
    "yolov8s": "submission/models/yolov8s/epoch35.pt",
    "yolov8l": "submission/models/yolov8l/best.pt",
    "yolov8x": "submission/models/yolov8x/best.pt",
}

class_names = {0: "Longitudinal_crack", 1: "Transverse_crack",
               2: "Alligator_crack", 3: "Other_corruption", 4: "Pothole"}

engine = SeverityEngine()
models: dict[str, YOLO] = {}
if HAS_ULTRALYTICS:
    for name, path in MODEL_PATHS.items():
        # Check if file is missing or is an LFS pointer
        is_pointer = False
        if os.path.exists(path):
            if os.path.getsize(path) < 1024:
                try:
                    with open(path, "r", errors="ignore") as f:
                        content = f.read(100)
                        if "git-lfs" in content or "version https://" in content:
                            is_pointer = True
                except Exception:
                    pass
        else:
            is_pointer = True

        if is_pointer:
            print(f"[PRISM] Downloading model {name} (LFS weights)...")
            url = f"https://github.com/Adityamathi/Tata-Hackathon/raw/main/{path}"
            os.makedirs(os.path.dirname(path), exist_ok=True)
            try:
                req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
                with urllib.request.urlopen(req) as response, open(path, "wb") as out_file:
                    out_file.write(response.read())
                print(f"[PRISM] Downloaded {name} successfully.")
            except Exception as e:
                print(f"[PRISM] Failed to download {name}: {e}")

        if os.path.exists(path):
            models[name] = YOLO(path)
            print(f"[PRISM] Loaded {name} from {path}")
        else:
            print(f"[PRISM] Model {name} not found at {path}")

SPEED_ADVICE = {
    "SAFE": {"speed": "Maintain 40–60 km/h", "rpm": "2000–3000 RPM", "action": "Maintain speed"},
    "CAUTION": {"speed": "Reduce to 20–30 km/h", "rpm": "1500–2000 RPM", "action": "Reduce speed, stay alert"},
    "DANGEROUS": {"speed": "Stop immediately", "rpm": "N/A", "action": "Stop. Do not proceed."},
    "NO_DATA": {"speed": "N/A", "rpm": "N/A", "action": "No hazards detected"},
}


class DetectionResult(BaseModel):
    type: str
    confidence: float
    area_m2: float
    depth_m: float
    severity_level: str
    severity_score: float
    severity_index: float
    normalized_area_ratio: float
    shape_irregularity: float
    shadow_intensity: float
    distance_zone: int


class AnalyzeResponse(BaseModel):
    detections: list[DetectionResult]
    total_detections: int
    alert: str
    road_health: str
    health_score: float
    total_area_m2: float
    coverage_percent: float
    speed_advice: dict
    annotated_image: str  # base64 PNG


def _iou(b1: list[float], b2: list[float]) -> float:
    """Intersection-over-Union for two [x1,y1,x2,y2] boxes."""
    xA = max(b1[0], b2[0]); yA = max(b1[1], b2[1])
    xB = min(b1[2], b2[2]); yB = min(b1[3], b2[3])
    inter = max(0, xB - xA) * max(0, yB - yA)
    a1 = (b1[2] - b1[0]) * (b1[3] - b1[1])
    a2 = (b2[2] - b2[0]) * (b2[3] - b2[1])
    union = a1 + a2 - inter
    return inter / union if union > 0 else 0.0


def _ensemble_detections(all_dets: list[dict]) -> list[dict]:
    """Greedy NMS-based ensemble: average overlapping boxes of the same class."""
    if not all_dets:
        return []
    all_dets = sorted(all_dets, key=lambda d: d["confidence"], reverse=True)
    merged = []
    for d in all_dets:
        found = False
        for m in merged:
            if d["class"] != m["class"]:
                continue
            if _iou(d["bbox"], m["bbox"]) >= 0.5:
                w1, w2 = d["confidence"], m["confidence"]
                m["bbox"] = [
                    (d["bbox"][i] * w1 + m["bbox"][i] * w2) / (w1 + w2)
                    for i in range(4)
                ]
                m["confidence"] = max(w1, w2)
                found = True
                break
        if not found:
            merged.append({"class": d["class"], "confidence": d["confidence"], "bbox": list(d["bbox"])})
    return merged


def _infer(models_dict: dict[str, YOLO], img_np: np.ndarray, ensemble: bool, conf_thresh: float = 0.15) -> list[dict]:
    """Run inference on one or all models."""
    raw_dets = []
    targets = list(models_dict.keys()) if ensemble else [list(models_dict.keys())[-1]]  # default to last (best) model
    for name in targets:
        model_obj = models_dict[name]
        results = model_obj(img_np, conf=conf_thresh, verbose=False)
        for r in results:
            for box in r.boxes:
                cls_id = int(box.cls[0])
                cls_name = class_names.get(cls_id, "Unknown")
                conf = float(box.conf[0])
                x1, y1, x2, y2 = box.xyxy[0].tolist()
                raw_dets.append({"class": cls_name, "confidence": conf, "bbox": [x1, y1, x2, y2]})
    if ensemble:
        raw_dets = _ensemble_detections(raw_dets)
    return raw_dets


@app.post("/api/detect", response_model=AnalyzeResponse)
async def detect(file: UploadFile = File(...), ensemble: bool = False):
    contents = await file.read()
    img = Image.open(io.BytesIO(contents)).convert("RGB")
    w, h = img.size

    # 1. Run YOLO detection (single model or ensemble)
    raw_dets = []
    if HAS_ULTRALYTICS and models:
        img_np = np.array(img)
        raw_dets = _infer(models, img_np, ensemble)

    # 2. Advanced pipeline (area + depth + severity)
    if raw_dets and HAS_RDD:
        rdd_dets = []
        for d in raw_dets:
            rdd_dets.append(RDDDetection(
                bbox=d["bbox"],
                damage_type=DamageType.from_str(d["class"]),
                confidence=d["confidence"],
            ))
        area_est = SurfaceAreaEstimator(pixels_per_meter=50.0)
        sev_calc = SeverityCalculator()
        analyzer = RoadConditionAnalyzer()
        action_rec = ActionRecommender()

        rdd_dets = area_est.estimate(rdd_dets, w, h, img=np.array(img))
        rdd_dets = sev_calc.calculate(rdd_dets, w, h)
        overall_score, health_status, total_area, coverage = analyzer.analyze(rdd_dets, w, h, ppm=50.0)
        action = action_rec.recommend(health_status)

        alert_map = {"FAILED": "DANGEROUS", "VERY_POOR": "DANGEROUS",
                     "POOR": "CAUTION", "FAIR": "SAFE", "GOOD": "SAFE"}
        alert = alert_map.get(health_status.value, "SAFE")
        health_score = round(max(0, 100 - overall_score), 1)

        detections_out = []
        for d in rdd_dets:
            detections_out.append(DetectionResult(
                type=d.damage_type.value,
                confidence=round(d.confidence, 2),
                area_m2=round(d.area_m2, 4),
                depth_m=round(d.depth_m, 4),
                severity_level=d.severity_level.value,
                severity_score=round(d.severity_score, 2),
                severity_index=round(d.severity_index, 4),
                normalized_area_ratio=round(d.normalized_area_ratio, 6),
                shape_irregularity=d.shape_irregularity,
                shadow_intensity=round(d.shadow_intensity, 3),
                distance_zone=d.distance_zone,
            ))
    else:
        result = engine.assess(raw_dets)
        alert = result["alert"]
        health_score = 0.0 if alert == "NO_DATA" else result["road_health_score"]
        total_area = 0.0
        coverage = 0.0
        action = result["driver_advice"]["action"]
        detections_out = []
        for d in raw_dets:
            detections_out.append(DetectionResult(
                type=d["class"],
                confidence=d["confidence"],
                area_m2=0.0,
                depth_m=0.0,
                severity_level="N/A",
                severity_score=0.0,
                severity_index=0.0,
                normalized_area_ratio=0.0,
                shape_irregularity=0.0,
                shadow_intensity=0.0,
                distance_zone=0,
            ))

    # 3. Draw annotated image
    draw = ImageDraw.Draw(img)
    try:
        font = ImageFont.truetype("arial.ttf", 20)
        small = ImageFont.truetype("arial.ttf", 15)
    except Exception:
        font = ImageFont.load_default()
        small = ImageFont.load_default()

    for d in raw_dets:
        x1, y1, x2, y2 = d["bbox"]
        draw.rectangle([x1, y1, x2, y2], outline=(0, 212, 255), width=3)
        draw.text((x1, y1 - 22), f"{d['class']} {d['confidence']:.2f}", fill=(0, 212, 255), font=small)

    # Info overlay
    alert_color_map = {"SAFE": (0, 212, 255), "CAUTION": (245, 158, 11), "DANGEROUS": (239, 68, 68), "NO_DATA": (128, 128, 128)}
    ac = alert_color_map.get(alert, (255, 255, 255))
    draw.rectangle([0, 0, w, 50], fill=(7, 17, 31))
    draw.text((10, 5), f"PRISM — {alert}  |  Health: {health_score}/100", fill=ac, font=font)
    draw.text((10, 30), f"Area: {total_area:.2f}m2  |  Coverage: {coverage:.1f}%  |  {action}", fill=(170, 179, 197), font=small)

    # Severity panel on the right side
    panel_x = w - 280
    for i, d in enumerate(detections_out[:6]):
        y_pos = 60 + i * 32
        sev_col = (255, 80, 80) if d.severity_level in ("HIGH", "CRITICAL") else \
                  (255, 200, 50) if d.severity_level == "MODERATE" else \
                  (80, 255, 80) if d.severity_level == "LOW" else (170, 179, 197)
        draw.rectangle([panel_x, y_pos, panel_x + 270, y_pos + 28], fill=(11, 29, 51))
        draw.rectangle([panel_x + 3, y_pos + 4, panel_x + 8, y_pos + 24], fill=sev_col)
        area_str = f"A={d.area_m2:.2f}m2" if d.area_m2 else "A=N/A"
        draw.text((panel_x + 14, y_pos + 4), f"{d.type:18s} {d.confidence:.2f}  {area_str}  D={d.depth_m:.2f}m",
                  fill=sev_col, font=small)

    buf = io.BytesIO()
    img.save(buf, format="PNG")
    b64 = base64.b64encode(buf.getvalue()).decode("utf-8")

    return AnalyzeResponse(
        detections=detections_out,
        total_detections=len(detections_out),
        alert=alert,
        road_health=health_status.value if raw_dets and HAS_RDD else alert,
        health_score=health_score,
        total_area_m2=round(total_area, 2),
        coverage_percent=round(coverage, 2),
        speed_advice=SPEED_ADVICE.get(alert, SPEED_ADVICE["NO_DATA"]),
        annotated_image=b64,
    )


@app.get("/api/health")
async def health():
    return {
        "status": "ok",
        "models_loaded": list(models.keys()),
        "ensemble_available": len(models) > 1,
        "rdd_available": HAS_RDD,
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
