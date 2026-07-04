"""
PRISM Voice Alert Module
Text-to-speech driver alerts for DANGEROUS and CAUTION states.
"""

import threading
import time

ALERT_MESSAGES = {
    "SAFE": "Road is safe. Maintain speed.",
    "CAUTION": "Caution. Moderate damage ahead. Reduce speed.",
    "DANGEROUS": "Danger! Severe damage ahead. Slow down immediately!",
}

try:
    import pyttsx3
    HAS_TTS = True
except ImportError:
    HAS_TTS = False


class VoiceAlert:
    def __init__(self, rate=180, volume=0.9):
        self.engine = None
        self.last_alert = None
        self.lock = threading.Lock()
        if HAS_TTS:
            try:
                self.engine = pyttsx3.init()
                self.engine.setProperty("rate", rate)
                self.engine.setProperty("volume", volume)
            except Exception as e:
                print(f"[VoiceAlert] Init failed: {e}")

    def speak(self, text):
        if self.engine is None:
            return
        try:
            self.engine.say(text)
            self.engine.runAndWait()
        except Exception as e:
            print(f"[VoiceAlert] Speak error: {e}")

    def alert(self, alert_level):
        if alert_level == self.last_alert:
            return
        if alert_level == "SAFE":
            self.last_alert = alert_level
            return
        msg = ALERT_MESSAGES.get(alert_level, f"Alert: {alert_level}")
        threading.Thread(target=self.speak, args=(msg,), daemon=True).start()
        self.last_alert = alert_level

    def play_beacon(self, alert_level):
        if alert_level == "DANGEROUS":
            print("\a", end="", flush=True)
            time.sleep(0.3)
            print("\a", end="", flush=True)
        elif alert_level == "CAUTION":
            print("\a", end="", flush=True)

    def reset(self):
        self.last_alert = None


if __name__ == "__main__":
    va = VoiceAlert()
    print("Testing voice alerts...")
    for level in ["CAUTION", "DANGEROUS", "SAFE"]:
        print(f"\nAlert: {level}")
        va.alert(level)
        va.play_beacon(level)
        time.sleep(1)
    print("Done.")
