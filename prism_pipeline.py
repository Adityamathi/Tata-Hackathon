"""
PRISM Pipeline: YOLOv8 Detection → Severity → Alert → Voice
Supports two modes:
  1. Lightweight: severity_engine.py (damage_score + health_score)
  2. Full: road_damage_system.py (area m², depth, coverage, severity, action)
"""

import sys
import os
import csv
from datetime import datetime
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw, ImageFont

from severity_engine import SeverityEngine

try:
    from road_damage_system import RoadDamageDetectionSystem
    HAS_RDD = True
except ImportError:
    HAS_RDD = False

try:
    from calibrated_camera import CameraCalibrator, CameraParams, ipm_accuracy_report
    HAS_CALIBRATION = True
except ImportError:
    HAS_CALIBRATION = False

try:
    from ultralytics import YOLO
    HAS_ULTRALYTICS = True
except ImportError:
    HAS_ULTRALYTICS = False

try:
    import pyttsx3
    HAS_TTS = True
except ImportError:
    HAS_TTS = False


class PRISMPipeline:
    COLORS = {
        "SAFE": (0, 255, 0),
        "CAUTION": (255, 255, 0),
        "DANGEROUS": (255, 0, 0),
    }

    def __init__(self, model_path=None, scale_factor=10, tts_enabled=True, use_advanced=False,
                 pixels_per_meter=50.0, use_mock=False,
                 use_calibration=False, camera_params=None, use_contour=True):
        self.use_advanced = use_advanced
        self.use_calibration = use_calibration and HAS_CALIBRATION
        self.use_contour = use_contour
        self.calibrator = None
        self.engine = SeverityEngine(scale_factor)
        self.rdd_system = None
        self.model = None
        self.tts_enabled = tts_enabled and HAS_TTS
        self.tts_engine = None
        self.last_alert = None

        if self.use_calibration:
            self.calibrator = CameraCalibrator(camera_params or CameraParams())
            print(f"[PRISM] Camera calibrated: H={self.calibrator.p.height_m}m "
                  f"pitch={self.calibrator.p.pitch_deg}° "
                  f"fx={self.calibrator.p.focal_length_px}")

        if use_advanced and HAS_RDD:
            rdd_kwargs = dict(
                model_path=model_path,
                pixels_per_meter=pixels_per_meter,
                use_mock=use_mock,
            )
            if self.calibrator:
                rdd_kwargs['calibrator'] = self.calibrator
                rdd_kwargs['use_contour'] = self.use_contour
            self.rdd_system = RoadDamageDetectionSystem(**rdd_kwargs)
            mode_strs = []
            if use_mock:
                mode_strs.append("mock")
            if self.calibrator:
                mode_strs.append("calibrated")
            if self.use_contour:
                mode_strs.append("contour")
            print(f"[PRISM] Advanced mode: RoadDamageDetectionSystem ({', '.join(mode_strs) or 'basic'})")
        elif model_path and os.path.exists(model_path):
            if not HAS_ULTRALYTICS:
                print("WARNING: ultralytics not installed. Install with: pip install ultralytics")
            else:
                self.model = YOLO(model_path)
                print(f"Model loaded: {model_path}")

        if self.tts_enabled:
            try:
                self.tts_engine = pyttsx3.init()
                self.tts_engine.setProperty("rate", 180)
            except Exception as e:
                print(f"TTS init failed: {e}")
                self.tts_enabled = False

    def detect_from_image(self, image_path, conf=0.25):
        if self.model is None:
            raise RuntimeError("No YOLO model loaded. Pass model_path to constructor.")
        results = self.model(image_path, conf=conf, verbose=False)
        detections = []
        for r in results:
            for box in r.boxes:
                cls_id = int(box.cls[0])
                cls_name = self.model.names[cls_id]
                confidence = float(box.conf[0])
                x1, y1, x2, y2 = map(float, box.xyxy[0])
                detections.append({
                    "class": cls_name,
                    "confidence": confidence,
                    "bbox": [x1, y1, x2, y2],
                })
        return detections

    def detect_from_predictions_file(self, txt_path, class_names=None):
        if class_names is None:
            class_names = {0: "Longitudinal_crack", 1: "Transverse_crack",
                           2: "Alligator_crack", 3: "Other_corruption", 4: "Pothole"}
        detections = []
        if not os.path.exists(txt_path):
            return detections
        with open(txt_path) as f:
            for line in f:
                parts = line.strip().split()
                if len(parts) >= 5:
                    cls_id = int(parts[0])
                    conf = float(parts[4])
                    bbox = list(map(float, parts[1:5]))
                    detections.append({
                        "class": class_names.get(cls_id, f"class_{cls_id}"),
                        "confidence": conf,
                        "bbox": bbox,
                    })
        return detections

    def run(self, detections):
        result = self.engine.assess(detections)
        alert = result["alert"]
        if self.tts_enabled and alert != self.last_alert:
            try:
                msg = result["driver_advice"]["message"]
                self.tts_engine.say(msg)
                self.tts_engine.runAndWait()
            except Exception:
                pass
            self.last_alert = alert
        return result

    def draw_overlay(self, image, detections, result):
        draw = ImageDraw.Draw(image)
        try:
            font = ImageFont.truetype("arial.ttf", 20)
            small_font = ImageFont.truetype("arial.ttf", 14)
        except Exception:
            font = ImageFont.load_default()
            small_font = ImageFont.load_default()

        for d in detections:
            bbox = d.get("bbox")
            if not bbox or (bbox[2] == 0 and bbox[3] == 0):
                continue
            x1, y1, x2, y2 = bbox
            cls_name = d.get("class", "?").replace("_", " ").title()
            conf = d.get("confidence", 0)
            sev = d.get("severity", SeverityEngine.SEVERITY_MAP.get(d.get("class", "").lower(), 1))
            try:
                sev_int = int(sev)
            except (ValueError, TypeError):
                sev_int = 3 if str(sev).upper() in ("HIGH", "CRITICAL") else 2 if str(sev).upper() == "MODERATE" else 1
            color = (255, 80, 80) if sev_int >= 3 else (255, 200, 50) if sev_int == 2 else (0, 212, 255)
            area = d.get("area_m2", 0)
            depth = d.get("depth_m", 0)
            over_ratio = d.get("overestimate_ratio", 1.0)
            draw.rectangle([x1, y1, x2, y2], outline=color, width=3)
            label = f"{cls_name} {conf:.2f}"
            if area:
                label += f" {area:.1f}m2"
            if depth:
                label += f" d:{depth:.2f}m"
            if over_ratio and over_ratio > 1.1:
                label += f" ~{over_ratio}xbbox"
            draw.text((x1, y1 - 22), label, fill=color, font=small_font)

        w, h = image.size
        alert_color = self.COLORS.get(result["alert"], (255, 255, 255))
        draw.rectangle([0, 0, w, 75], fill=(0, 0, 0))
        draw.text((10, 5), f"ALERT: {result['alert']}", fill=alert_color, font=font)
        health = result.get("road_health_score", 0)
        road_health = result.get("road_health", "")
        area_total = result.get("total_area_m2", 0)
        coverage = result.get("coverage_percent", 0)
        extras = f"Health: {health}/100"
        if road_health:
            extras += f" | Status: {road_health}"
        if area_total:
            extras += f" | Area: {area_total}m2"
        if coverage:
            extras += f" | Coverage: {coverage}%"
        if self.use_calibration and self.calibrator:
            extras += f" | H={self.calibrator.p.height_m}m"
        draw.text((10, 28), extras, fill=alert_color, font=small_font)
        draw.text((10, 48), result.get("driver_advice", {}).get("message", ""),
                  fill=alert_color, font=small_font)
        if self.use_calibration:
            mode_tag = "CALIBRATED" if self.use_contour else "CALIBRATED (bbox)"
            draw.text((10, 68), f"Mode: {mode_tag} | Contour: {self.use_contour}",
                      fill=(100, 200, 255), font=small_font)

        return image

    def process_image(self, image_path=None, output_path=None):
        if self.rdd_system:
            if image_path is None or not os.path.exists(image_path):
                image_path = ""  # mock mode
            report = self.rdd_system.process_image(image_path, use_lane_ppm=self.use_calibration)
            dets = [{"class": d["type"], "confidence": d["confidence"],
                     "bbox": d.get("bbox", [0, 0, 0, 0]), "area_m2": d["area_m2"],
                     "depth_m": d["depth_m"], "severity": d["severity_level"],
                     "contour_pixel_area": d.get("contour_pixel_area", 0),
                     "overestimate_ratio": d.get("overestimate_ratio", 1.0)}
                    for d in report.detections]
            alert_map = {"FAILED": "DANGEROUS", "VERY_POOR": "DANGEROUS",
                         "POOR": "CAUTION", "FAIR": "SAFE", "GOOD": "SAFE"}
            result = {
                "total_damage_score": report.severity_score,
                "road_health_score": round(max(0, 100 - report.overall_score), 1),
                "alert": alert_map.get(report.road_health, "SAFE"),
                "driver_advice": {
                    "action": report.recommended_action,
                    "recommended_rpm": "<1500 RPM" if report.road_health in ("FAILED", "VERY_POOR")
                                       else "1500-2000 RPM" if report.road_health == "POOR"
                                       else "2000-3000 RPM",
                    "message": report.warning_message,
                },
                "road_health": report.road_health,
                "total_area_m2": report.total_area_m2,
                "coverage_percent": report.coverage_percent,
            }
        else:
            detections = self.detect_from_image(image_path) if self.model else \
                         self.detect_from_predictions_file(image_path)
            result = self.run(detections)
            dets = detections

        img = Image.new("RGB", (640, 480))
        if image_path and os.path.exists(image_path):
            img = Image.open(image_path).convert("RGB")
        img = self.draw_overlay(img, dets, result)
        if output_path:
            img.save(output_path)
        return result, img

    def process_video(self, video_path, output_path=None, skip_frames=5):
        if not HAS_ULTRALYTICS:
            raise RuntimeError("Video processing requires ultralytics: pip install ultralytics")
        import cv2
        cap = cv2.VideoCapture(video_path)
        fps = int(cap.get(cv2.CAP_PROP_FPS))
        w = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
        h = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
        out = None
        if output_path:
            fourcc = cv2.VideoWriter_fourcc(*"mp4v")
            out = cv2.VideoWriter(output_path, fourcc, fps // skip_frames, (w, h))

        frame_idx = 0
        while cap.isOpened():
            ret, frame = cap.read()
            if not ret:
                break
            if frame_idx % skip_frames != 0:
                frame_idx += 1
                continue
            rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
            pil_img = Image.fromarray(rgb)
            detections = self.detect_from_image(pil_img)
            result = self.run(detections)
            pil_img = self.draw_overlay(pil_img, detections, result)
            annotated = cv2.cvtColor(np.array(pil_img), cv2.COLOR_RGB2BGR)
            if out:
                out.write(annotated)
            frame_idx += 1
        cap.release()
        if out:
            out.release()

    def batch_process(self, input_dir, output_dir, file_ext=".jpg"):
        os.makedirs(output_dir, exist_ok=True)
        results_log = []
        for fname in os.listdir(input_dir):
            if not fname.lower().endswith(file_ext):
                continue
            in_path = os.path.join(input_dir, fname)
            out_path = os.path.join(output_dir, f"annotated_{fname}")
            result, _ = self.process_image(in_path, out_path)
            results_log.append({"file": fname, **result})
        csv_path = os.path.join(output_dir, "results.csv")
        if results_log:
            with open(csv_path, "w", newline="") as f:
                w = csv.DictWriter(f, fieldnames=results_log[0].keys())
                w.writeheader()
                w.writerows(results_log)
        return results_log


if __name__ == "__main__":
    pipeline = PRISMPipeline(model_path="submission/models/yolov8l/best.pt")

    test_predictions = [
        {"class": "pothole", "confidence": 0.87},
        {"class": "longitudinal crack", "confidence": 0.65},
    ]
    result = pipeline.run(test_predictions)
    print("=== PRISM Pipeline Demo ===")
    for k, v in result.items():
        print(f"  {k}: {v}")
