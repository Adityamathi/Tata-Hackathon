class SeverityEngine:
    SEVERITY_MAP = {
        "pothole": 3,
        "alligator crack": 3,
        "alligator_crack": 3,
        "transverse crack": 2,
        "transverse_crack": 2,
        "longitudinal crack": 1,
        "longitudinal_crack": 1,
        "other corruption": 1,
        "other_corruption": 1,
    }
    SCALE_FACTOR = 10

    def __init__(self, scale_factor=None):
        if scale_factor is not None:
            self.SCALE_FACTOR = scale_factor

    def assess(self, detections):
        if not detections:
            return {
                "total_damage_score": 0,
                "road_health_score": 100,
                "alert": "NO_DATA",
                "driver_advice": {
                    "action": "Detection unavailable",
                    "recommended_rpm": "N/A",
                    "message": "No road hazards detected — model may have missed targets. Try a different image or lower confidence threshold."
                }
            }

        total_damage = 0
        for d in detections:
            cls = d["class"].lower()
            conf = d["confidence"]
            severity = self.SEVERITY_MAP.get(cls, 1)
            total_damage += severity * conf

        health_score = max(0, 100 - (total_damage * self.SCALE_FACTOR))

        if health_score > 75:
            alert = "SAFE"
            advice = {
                "action": "Maintain speed",
                "recommended_rpm": "2000-3000 RPM",
                "message": "Road is safe"
            }
        elif health_score > 50:
            alert = "CAUTION"
            advice = {
                "action": "Reduce speed",
                "recommended_rpm": "1500-2000 RPM",
                "message": "Moderate damage ahead"
            }
        else:
            alert = "DANGEROUS"
            advice = {
                "action": "Slow down immediately",
                "recommended_rpm": "<1500 RPM",
                "message": "Severe damage ahead!"
            }

        return {
            "total_damage_score": round(total_damage, 2),
            "road_health_score": round(health_score, 1),
            "alert": alert,
            "driver_advice": advice
        }


if __name__ == "__main__":
    engine = SeverityEngine()

    test_cases = [
        [{"class": "pothole", "confidence": 0.87}, {"class": "longitudinal crack", "confidence": 0.65}],
        [{"class": "pothole", "confidence": 0.95}, {"class": "alligator crack", "confidence": 0.88}],
        [{"class": "longitudinal crack", "confidence": 0.30}],
        [],
        [{"class": "pothole", "confidence": 0.99}, {"class": "alligator crack", "confidence": 0.92},
         {"class": "transverse crack", "confidence": 0.85}, {"class": "longitudinal crack", "confidence": 0.78}],
    ]

    for i, dets in enumerate(test_cases, 1):
        print(f"--- Test {i} ---")
        print(f"Input: {dets}")
        result = engine.assess(dets)
        for k, v in result.items():
            print(f"  {k}: {v}")
        print()
