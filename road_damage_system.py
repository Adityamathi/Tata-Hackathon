"""
Road Damage Detection System
Architecture: Image → YOLOAdapter → SurfaceAreaEstimator → SeverityCalculator
  → RoadConditionAnalyzer → AlertGenerator → ActionRecommender → Report
"""

import math
import os
import json
from dataclasses import dataclass, field, asdict
from enum import Enum
from typing import Optional

import numpy as np
import cv2
from PIL import Image, ImageDraw, ImageFont

try:
    from ultralytics import YOLO
    HAS_ULTRALYTICS = True
except ImportError:
    HAS_ULTRALYTICS = False

try:
    from calibrated_camera import CameraCalibrator, ContourAreaEstimator, mask_from_bbox, pixel_area_of_contour
    HAS_CALIBRATION = True
except ImportError:
    HAS_CALIBRATION = False


# ─── Enums ───────────────────────────────────────────────────────────────

class DamageType(Enum):
    POTHOLES = "pothole"
    ALLIGATOR_CRACK = "alligator crack"
    TRANSVERSE_CRACK = "transverse crack"
    LONGITUDINAL_CRACK = "longitudinal crack"
    OTHER_CORRUPTION = "other corruption"
    SURFACE_DAMAGE = "surface damage"

    @classmethod
    def from_str(cls, s: str):
        s = s.lower().replace("_", " ")
        for member in cls:
            if member.value == s:
                return member
        return cls.OTHER_CORRUPTION


class SeverityLevel(Enum):
    LOW = "LOW"
    MODERATE = "MODERATE"
    HIGH = "HIGH"
    CRITICAL = "CRITICAL"


class RoadHealthStatus(Enum):
    GOOD = "GOOD"
    FAIR = "FAIR"
    POOR = "POOR"
    VERY_POOR = "VERY_POOR"
    FAILED = "FAILED"


# ─── Data classes ────────────────────────────────────────────────────────

@dataclass
class Detection:
    bbox: list[float]          # [x1, y1, x2, y2] in pixels
    damage_type: DamageType
    confidence: float
    area_m2: float = 0.0        # proxy: normalized area ratio × lane-calibrated scale
    surface_m2: float = 0.0
    depth_m: float = 0.0        # proxy: shadow/darkness intensity (0–1)
    severity_score: float = 0.0
    severity_level: SeverityLevel = SeverityLevel.LOW
    mask_points: list = field(default_factory=list)
    contour_pixel_area: float = 0.0
    bbox_pixel_area: float = 0.0
    overestimate_ratio: float = 1.0
    # Proxy severity fields
    normalized_area_ratio: float = 0.0  # bbox_pixels / total_image_pixels
    shape_irregularity: float = 0.0     # aspect ratio deviation from 1
    shadow_intensity: float = 0.0       # mean darkness of bbox region (0–1)
    distance_zone: int = 0              # 1=near, 2=mid, 3=far based on bbox y-centre
    severity_index: float = 0.0         # combined distance-normalized severity proxy


@dataclass
class RoadConditionReport:
    detections: list[dict] = field(default_factory=list)
    total_detections: int = 0
    overall_score: float = 0.0
    road_health: str = "GOOD"
    severity_score: float = 0.0
    total_area_m2: float = 0.0
    surface_area_m2: float = 0.0
    coverage_percent: float = 0.0
    warning_message: str = ""
    recommended_action: str = ""

    def to_dict(self):
        return asdict(self)


# ─── YOLO_CLASS_MAP ─────────────────────────────────────────────────────

YOLO_CLASS_MAP = {
    0: "longitudinal_crack",
    1: "transverse_crack",
    2: "alligator_crack",
    3: "other_corruption",
    4: "pothole",
}


# ─── Module 1: YOLOAdapter ──────────────────────────────────────────────

class YOLOAdapter:
    """Wraps YOLOv8 (Ultralytics). Maps class names → DamageType.
    Includes mock mode for testing without a GPU."""

    def __init__(self, model_path: Optional[str] = None, conf_threshold: float = 0.25, use_mock: bool = False):
        self.model = None
        self.conf_threshold = conf_threshold
        self.use_mock = use_mock

        if not use_mock and model_path and os.path.exists(model_path):
            if not HAS_ULTRALYTICS:
                raise RuntimeError("ultralytics not installed. pip install ultralytics")
            self.model = YOLO(model_path)
            print(f"[YOLOAdapter] Model loaded: {model_path}")
        elif use_mock:
            print("[YOLOAdapter] Mock mode — no real model loaded")
        else:
            raise FileNotFoundError(f"Model not found: {model_path}")

    def detect(self, image_source) -> list[Detection]:
        if self.use_mock:
            return self._mock_detect()
        return self._real_detect(image_source)

    def _real_detect(self, image_source) -> list[Detection]:
        results = self.model(image_source, conf=self.conf_threshold, verbose=False)
        detections = []
        for r in results:
            # Try to extract segmentation masks
            masks_available = hasattr(r, 'masks') and r.masks is not None
            for i, box in enumerate(r.boxes):
                cls_id = int(box.cls[0])
                cls_name = self.model.names[cls_id]
                conf = float(box.conf[0])
                x1, y1, x2, y2 = map(float, box.xyxy[0])

                det = Detection(
                    bbox=[x1, y1, x2, y2],
                    damage_type=DamageType.from_str(cls_name),
                    confidence=conf,
                )

                if masks_available and i < len(r.masks.xy):
                    mask_poly = r.masks.xy[i]
                    det.mask_points = mask_poly.flatten().tolist() if hasattr(mask_poly, 'flatten') else list(mask_poly)
                detections.append(det)
        return detections

    def _mock_detect(self) -> list[Detection]:
        import random
        w, h = 640, 480

        def _ellipse_mask(cx, cy, rx, ry, n=16):
            angles = [2 * math.pi * i / n for i in range(n)]
            pts = []
            for a in angles:
                pts.append(cx + rx * math.cos(a))
                pts.append(cy + ry * math.sin(a))
            return pts

        return [
            Detection(
                bbox=[w * 0.42, h * 0.38, w * 0.58, h * 0.52],
                damage_type=DamageType.POTHOLES,
                confidence=0.87,
                mask_points=_ellipse_mask(w * 0.50, h * 0.45, w * 0.06, h * 0.05),
            ),
            Detection(
                bbox=[w * 0.55, h * 0.30, w * 0.72, h * 0.38],
                damage_type=DamageType.ALLIGATOR_CRACK,
                confidence=0.78,
                mask_points=_ellipse_mask(w * 0.635, h * 0.34, w * 0.07, h * 0.03),
            ),
            Detection(
                bbox=[w * 0.30, h * 0.55, w * 0.50, h * 0.66],
                damage_type=DamageType.LONGITUDINAL_CRACK,
                confidence=0.65,
                mask_points=_ellipse_mask(w * 0.40, h * 0.605, w * 0.09, h * 0.02),
            ),
        ]


# ─── Module 2: SurfaceAreaEstimator ─────────────────────────────────────

class SurfaceAreaEstimator:
    """Distance-Normalized Proxy Severity Index.

    Instead of computing exact physical area (unreliable without ground-truth
    calibration), computes a defensible relative severity score using:
      1. Normalized bbox area ratio — pixels / total frame pixels
      2. Shape irregularity — aspect ratio deviation from 1.0
      3. Shadow intensity — mean pixel darkness inside bbox
      4. Distance zone — vertical position (near/mid/far)
      5. IPM homography — perspective-normalised contour area

    The combined index is used for severity tiering, not exact cm²."""

    LANE_WIDTH_M = 3.5  # standard lane width for auto-calibration

    def __init__(self, pixels_per_meter: float = 50.0, calibrator=None):
        self.ppm = pixels_per_meter
        self.calibrator = calibrator
        self.use_contour = HAS_CALIBRATION
        self.contour_estimator = ContourAreaEstimator(calibrator) if HAS_CALIBRATION else None
        self._ipm_homography = None  # computed per-frame

    def _compute_ipm_homography(self, img_w: int, img_h: int) -> np.ndarray:
        """Build a simple homography to warp the road region to bird's-eye view.
        Source: trapezoidal road region (bottom 60% of frame)
        Destination: top-down rectangle."""
        src = np.float32([
            [0, img_h * 0.4],           # top-left of road region
            [img_w, img_h * 0.4],        # top-right
            [img_w * 0.75, img_h],       # bottom-right
            [img_w * 0.25, img_h],       # bottom-left
        ])
        dst = np.float32([
            [0, 0],
            [img_w, 0],
            [img_w, img_h],
            [0, img_h],
        ])
        return cv2.getPerspectiveTransform(src, dst)

    def _ipm_contour_area(self, contour: np.ndarray, img_w: int, img_h: int) -> float:
        """Project contour through IPM homography and compute bird's-eye area."""
        if self._ipm_homography is None:
            self._ipm_homography = self._compute_ipm_homography(img_w, img_h)
        if contour.size < 6:
            return 0.0
        pts = contour.reshape(-1, 1, 2).astype(np.float32)
        warped = cv2.perspectiveTransform(pts, self._ipm_homography)
        return abs(cv2.contourArea(warped))

    def _auto_ppm_from_lanes(self, img: np.ndarray | None) -> float:
        """Auto-calibrate PPM by detecting lane width (assumed 3.5m)."""
        if img is None:
            return self.ppm
        gray = cv2.cvtColor(img, cv2.COLOR_RGB2GRAY)
        edges = cv2.Canny(gray, 50, 150)
        lines = cv2.HoughLinesP(edges, 1, np.pi / 180, 100, minLineLength=40, maxLineGap=30)
        if lines is None or len(lines) < 4:
            return self.ppm
        # Find left and right lane x-coordinates at the bottom of the frame
        h, w = gray.shape
        xs = []
        for line in lines:
            line_flat = line.flatten()
            if len(line_flat) != 4:
                continue
            x1, y1, x2, y2 = line_flat
            if abs(y2 - y1) < 20:
                continue  # skip near-horizontal
            # intersect with bottom row
            if y2 == y1:
                continue
            x_at_bottom = x1 + (x2 - x1) * (h - y1) / (y2 - y1)
            xs.append(x_at_bottom)
        if len(xs) < 4:
            return self.ppm
        xs = sorted(xs)
        # Take the widest gap as likely lane separation
        max_gap = max(b - a for a, b in zip(xs, xs[1:]))
        if max_gap < 50:
            return self.ppm
        detected_ppm = max_gap / self.LANE_WIDTH_M
        if 10 < detected_ppm < 500:
            self.ppm = detected_ppm
        return self.ppm

    def estimate(self, detections: list[Detection], img_w: int, img_h: int, img: np.ndarray | None = None) -> list[Detection]:
        self._ipm_homography = self._compute_ipm_homography(img_w, img_h)
        if img is not None:
            self._auto_ppm_from_lanes(img)
        return self._estimate_proxy(detections, img_w, img_h, img)

    def _estimate_proxy(self, detections: list[Detection], img_w: int, img_h: int,
                        img: np.ndarray | None = None) -> list[Detection]:
        total_pixels = img_w * img_h
        for d in detections:
            x1, y1, x2, y2 = d.bbox
            bw = abs(x2 - x1)
            bh = abs(y2 - y1)
            bbox_pixels = bw * bh
            d.bbox_pixel_area = bbox_pixels
            d.contour_pixel_area = bbox_pixels

            # 1. Normalized area ratio
            d.normalized_area_ratio = bbox_pixels / total_pixels

            # 2. Shape irregularity — aspect ratio deviation from 1.0
            aspect = bw / bh if bh > 0 else 1.0
            d.shape_irregularity = round(abs(aspect - 1.0), 2)

            # 3. Distance zone based on bbox vertical centre
            cy = (y1 + y2) / 2
            if cy > img_h * 0.7:
                d.distance_zone = 1  # near
            elif cy > img_h * 0.4:
                d.distance_zone = 2  # mid
            else:
                d.distance_zone = 3  # far

            # 4. Shadow intensity — mean darkness inside bbox
            if img is not None:
                region = img[int(y1):int(y2), int(x1):int(x2)]
                if region.size > 0:
                    gray = cv2.cvtColor(region, cv2.COLOR_RGB2GRAY) if region.ndim == 3 else region
                    d.shadow_intensity = round(1.0 - gray.mean() / 255.0, 3)

            # 5. Contour area via IPM for perspective normalization
            contour = mask_from_bbox(d.bbox, img_w, img_h) if HAS_CALIBRATION else None
            if contour is not None:
                ipm_area = self._ipm_contour_area(contour, img_w, img_h)
                if ipm_area > 0:
                    d.contour_pixel_area = ipm_area
                    d.overestimate_ratio = round(bbox_pixels / ipm_area, 2) if ipm_area > 0 else 1.0

            # 6. Distance-normalized severity index
            # Near objects weighted more (distance_zone 1 → weight 1.0, 2 → 0.7, 3 → 0.4)
            zone_weight = {1: 1.0, 2: 0.7, 3: 0.4}.get(d.distance_zone, 0.5)
            d.severity_index = round(
                d.confidence * (1 + d.normalized_area_ratio * 500) * zone_weight
                * (1 + d.shadow_intensity * 2), 4)

            # 7. Proxy physical area using lane-calibrated PPM
            road_frac = d.contour_pixel_area / total_pixels
            road_h = img_h * 0.6  # road occupies bottom ~60% of frame
            road_area_approx = (img_w / self.ppm) * (road_h / self.ppm)
            d.area_m2 = round(road_frac * road_area_approx, 4)
            d.surface_m2 = d.area_m2

            # 8. Proxy depth from shadow intensity + area
            d.depth_m = round(0.02 + d.shadow_intensity * 0.15, 3)

        return detections

    def toggle_contour_mode(self, enabled: bool):
        self.use_contour = enabled if HAS_CALIBRATION else False


# ─── Module 3: SeverityCalculator ───────────────────────────────────────

DAMAGE_TYPE_WEIGHTS = {
    DamageType.POTHOLES: 1.5,
    DamageType.ALLIGATOR_CRACK: 1.3,
    DamageType.TRANSVERSE_CRACK: 1.1,
    DamageType.LONGITUDINAL_CRACK: 1.0,
    DamageType.OTHER_CORRUPTION: 1.0,
    DamageType.SURFACE_DAMAGE: 0.9,
}

class SeverityCalculator:
    """Scores each detection 0–100 using the Distance-Normalized Severity Index + damage-type weight."""

    def calculate(self, detections: list[Detection], img_w: int, img_h: int) -> list[Detection]:
        for d in detections:
            weight = DAMAGE_TYPE_WEIGHTS.get(d.damage_type, 1.0)
            d.severity_score = round(min(d.severity_index * weight * 3, 100), 1)

            if d.severity_score >= 50:
                d.severity_level = SeverityLevel.CRITICAL
            elif d.severity_score >= 25:
                d.severity_level = SeverityLevel.HIGH
            elif d.severity_score >= 10:
                d.severity_level = SeverityLevel.MODERATE
            else:
                d.severity_level = SeverityLevel.LOW

        return detections


# ─── Module 4: RoadConditionAnalyzer ────────────────────────────────────

class RoadConditionAnalyzer:
    """Aggregates all detections into overall score and RoadHealthStatus.
    Computes total damaged area and % coverage."""

    def analyze(self, detections: list[Detection], img_w: int = 640, img_h: int = 480, ppm: float = 50.0) -> tuple[float, RoadHealthStatus, float, float]:
        """Returns (overall_score, health_status, total_area_m2, coverage_percent)"""
        if not detections:
            return 0.0, RoadHealthStatus.GOOD, 0.0, 0.0

        weights = [DAMAGE_TYPE_WEIGHTS.get(d.damage_type, 1.0) for d in detections]
        total_weight = sum(weights)
        overall = sum(d.severity_score * w for d, w in zip(detections, weights))
        overall_score = round(overall / total_weight, 1) if total_weight > 0 else 0

        total_area = sum(d.area_m2 for d in detections)
        road_area_m2 = (img_w / ppm) * (img_h / ppm)
        coverage = round((total_area / road_area_m2) * 100, 2) if road_area_m2 > 0 else 0.0

        if overall_score >= 60:
            status = RoadHealthStatus.FAILED
        elif overall_score >= 35:
            status = RoadHealthStatus.VERY_POOR
        elif overall_score >= 20:
            status = RoadHealthStatus.POOR
        elif overall_score >= 8:
            status = RoadHealthStatus.FAIR
        else:
            status = RoadHealthStatus.GOOD

        return overall_score, status, total_area, coverage


# ─── Module 5: AlertGenerator ───────────────────────────────────────────

class AlertGenerator:
    """Produces human-readable warning with pothole count, % coverage, max depth."""

    def generate(self, detections: list[Detection], coverage: float, status: RoadHealthStatus) -> str:
        if not detections:
            return "Road surface appears clear."

        potholes = [d for d in detections if d.damage_type == DamageType.POTHOLES]
        max_depth = max((d.depth_m for d in potholes), default=0.0)
        n_potholes = len(potholes)
        n_total = len(detections)

        if status in (RoadHealthStatus.FAILED, RoadHealthStatus.VERY_POOR):
            base = f"🚨 Severe road damage! {n_potholes} pothole(s), "
            base += f"deepest ≈ {max_depth:.2f} m" if max_depth > 0 else "no depth data"
            return base
        elif status == RoadHealthStatus.POOR:
            base = f"⚠️ Significant damage. {n_total} hazards detected, "
            base += f"{coverage:.1f}% road surface affected"
            return base
        elif status == RoadHealthStatus.FAIR:
            return f"ℹ️ Minor road damage detected. {n_total} hazard(s), {coverage:.1f}% coverage."
        else:
            return "✅ Road is in good condition. No significant hazards."


# ─── Module 6: ActionRecommender ────────────────────────────────────────

class ActionRecommender:
    """Returns driver instructions based on health status."""

    def recommend(self, status: RoadHealthStatus) -> str:
        recommendations = {
            RoadHealthStatus.FAILED: (
                "🛑 STOP immediately. Hazard lights ON. Do not proceed. Report to authority."
            ),
            RoadHealthStatus.VERY_POOR: (
                "Reduce to 20–30 km/h, grip wheel firmly, hazard lights ON, report to authority."
            ),
            RoadHealthStatus.POOR: (
                "Reduce speed to 30–40 km/h. Stay alert. Avoid sudden steering."
            ),
            RoadHealthStatus.FAIR: (
                "Maintain speed. Stay cautious. Monitor road surface ahead."
            ),
            RoadHealthStatus.GOOD: (
                "Normal driving. No action required."
            ),
        }
        return recommendations.get(status, "Proceed with caution.")


# ─── System entry point ─────────────────────────────────────────────────

class RoadDamageDetectionSystem:
    """Orchestrates all 6 modules. Entry point: process_image() → RoadConditionReport."""

    def __init__(
        self,
        model_path: Optional[str] = None,
        pixels_per_meter: float = 50.0,
        conf_threshold: float = 0.25,
        use_mock: bool = False,
        calibrator: Optional['CameraCalibrator'] = None,
        use_contour: bool = True,
    ):
        self.adapter = YOLOAdapter(model_path, conf_threshold, use_mock)
        self.area_estimator = SurfaceAreaEstimator(pixels_per_meter, calibrator)
        self.area_estimator.use_contour = use_contour and HAS_CALIBRATION
        self.calibrator = calibrator
        self.severity_calc = SeverityCalculator()
        self.analyzer = RoadConditionAnalyzer()
        self.alert_gen = AlertGenerator()
        self.action_rec = ActionRecommender()

    def process_image(self, image_path: str, use_lane_ppm: bool = True) -> RoadConditionReport:
        img = Image.open(image_path).convert("RGB") if os.path.exists(image_path) else Image.new("RGB", (640, 480))
        w, h = img.size

        # 1. Detect
        detections = self.adapter.detect(image_path if os.path.exists(image_path) else None)

        # 2. Dynamic PPM from lane detection
        ppm = self.area_estimator.ppm
        if use_lane_ppm and self.calibrator and HAS_CALIBRATION and os.path.exists(image_path):
            try:
                cv_img = cv2.imread(image_path)
                if cv_img is not None:
                    live_ppm = self.calibrator.compute_ppm_from_lanes(cv_img)
                    if live_ppm > 10:
                        ppm = live_ppm
                        self.area_estimator.ppm = ppm
            except Exception:
                pass

        # 3. Estimate area (uses contour/IPM if configured)
        detections = self.area_estimator.estimate(detections, w, h)

        # 4. Calculate severity
        detections = self.severity_calc.calculate(detections, w, h)

        # 5. Analyze road condition
        overall_score, health_status, total_area, coverage = self.analyzer.analyze(detections, w, h, ppm)

        # 5. Generate alert
        warning = self.alert_gen.generate(detections, coverage, health_status)

        # 6. Recommend action
        action = self.action_rec.recommend(health_status)

        severity_score = round(sum(d.severity_score for d in detections) / max(len(detections), 1), 1)

        report = RoadConditionReport(
            detections=[{
                "type": d.damage_type.value,
                "confidence": round(d.confidence, 2),
                "bbox": d.bbox,
                "area_m2": d.area_m2,
                "depth_m": d.depth_m,
                "severity_score": d.severity_score,
                "severity_level": d.severity_level.value,
            } for d in detections],
            total_detections=len(detections),
            overall_score=overall_score,
            road_health=health_status.value,
            severity_score=severity_score,
            total_area_m2=round(total_area, 2),
            surface_area_m2=round(total_area, 2),
            coverage_percent=round(coverage, 2),
            warning_message=warning,
            recommended_action=action,
        )
        return report

    def process_and_visualize(self, image_path: str, output_path: Optional[str] = None) -> RoadConditionReport:
        img = Image.open(image_path).convert("RGB")
        w, h = img.size
        report = self.process_image(image_path)

        draw = ImageDraw.Draw(img)
        try:
            font = ImageFont.truetype("arial.ttf", 18)
            small = ImageFont.truetype("arial.ttf", 14)
        except Exception:
            font = ImageFont.load_default()
            small = ImageFont.load_default()

        health_colors = {
            "GOOD": (0, 212, 255), "FAIR": (0, 200, 100),
            "POOR": (245, 158, 11), "VERY_POOR": (239, 68, 68),
            "FAILED": (127, 29, 29),
        }
        sev_colors = {
            "LOW": (0, 212, 255), "MODERATE": (245, 158, 11),
            "HIGH": (239, 68, 68), "CRITICAL": (127, 29, 29),
        }

        for d in report.detections:
            # We need to re-draw from the raw detections — keep a parallel list
            pass

        # Top bar
        hc = health_colors.get(report.road_health, (255, 255, 255))
        draw.rectangle([0, 0, w, 50], fill=(0, 0, 0))
        draw.text((10, 5), f"PRISM — {report.road_health}", fill=hc, font=font)
        draw.text((10, 28), f"Score: {report.overall_score}/100  |  "
                  f"Area: {report.total_area_m2}m²  |  "
                  f"Coverage: {report.coverage_percent}%", fill=(170, 179, 197), font=small)

        if output_path:
            img.save(output_path)

        return report


    def accuracy_comparison(self, image_path: str = "") -> dict:
        """
        Compare bbox-only vs contour vs calibrated area for detections.
        If image_path is provided and exists, uses it for size / lane info.
        Otherwise assumes 640×480 (mock mode).
        """
        if not HAS_CALIBRATION:
            return {"error": "calibrated_camera module not available"}

        w, h = 640, 480
        if image_path and os.path.exists(image_path):
            img = Image.open(image_path)
            w, h = img.size
        raw_dets = self.adapter.detect(image_path if (image_path and os.path.exists(image_path)) else None)

        # Basic bbox mode
        basic_est = SurfaceAreaEstimator(pixels_per_meter=self.area_estimator.ppm, calibrator=None)
        basic_est.use_contour = False
        basic = basic_est.estimate([Detection(d.bbox, d.damage_type, d.confidence) for d in raw_dets], w, h)

        # Contour mode (no IPM)
        contour_est = SurfaceAreaEstimator(pixels_per_meter=self.area_estimator.ppm, calibrator=None)
        contour_est.use_contour = True
        contour = contour_est.estimate([Detection(d.bbox, d.damage_type, d.confidence, mask_points=d.mask_points) for d in raw_dets], w, h)

        # Calibrated mode (contour + IPM)
        cal_est = SurfaceAreaEstimator(pixels_per_meter=self.area_estimator.ppm, calibrator=self.calibrator)
        cal_est.use_contour = True
        cal = cal_est.estimate([Detection(d.bbox, d.damage_type, d.confidence, mask_points=d.mask_points) for d in raw_dets], w, h)

        comparison = []
        for i in range(len(raw_dets)):
            comparison.append({
                "type": raw_dets[i].damage_type.value,
                "confidence": raw_dets[i].confidence,
                "bbox_area_m2": basic[i].area_m2,
                "contour_area_m2": contour[i].area_m2,
                "calibrated_area_m2": cal[i].area_m2,
                "overestimate_ratio": contour[i].overestimate_ratio,
                "bbox_pixels": basic[i].bbox_pixel_area,
                "contour_pixels": contour[i].contour_pixel_area,
            })

        return {
            "detections": comparison,
            "total_bbox_area": round(sum(d["bbox_area_m2"] for d in comparison), 4),
            "total_contour_area": round(sum(d["contour_area_m2"] for d in comparison), 4),
            "total_calibrated_area": round(sum(d["calibrated_area_m2"] for d in comparison), 4),
            "avg_overestimate_ratio": round(
                np.mean([d["overestimate_ratio"] for d in comparison]), 2
            ) if comparison else 1.0,
        }


# ─── Standalone demo ─────────────────────────────────────────────────────

if __name__ == "__main__":
    print("=" * 60)
    print("  Road Damage Detection System — Demo (Mock Mode)")
    print("=" * 60)

    system = RoadDamageDetectionSystem(use_mock=True, pixels_per_meter=50.0)
    report = system.process_image("dummy.jpg")

    print(f"\nDetections      : {report.total_detections}")
    for d in report.detections:
        print(f"  {d['type']:25s} conf={d['confidence']:.2f}  area={d['area_m2']:.2f}m²  "
              f"depth={d['depth_m']:.2f}m  score={d['severity_score']:.1f} ({d['severity_level']})")

    print(f"\nRoad Health     : {report.road_health}")
    print(f"Severity Score  : {report.severity_score} / 100")
    print(f"Total Area      : {report.total_area_m2} m²")
    print(f"Coverage        : {report.coverage_percent}%")
    print(f"Warning         : {report.warning_message}")
    print(f"Action          : {report.recommended_action}")

    print("\nDict output:")
    print(json.dumps(report.to_dict(), indent=2))
