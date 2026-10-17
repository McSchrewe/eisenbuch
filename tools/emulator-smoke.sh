#!/usr/bin/env bash
# Startet die APK im Android-Emulator und prüft, ob die Oberfläche wirklich lädt.
# Erfolg = Log-Zeile EB_READY aus der App. Sonst: Fehler als GitHub-Annotation ausgeben.
set -u
APK="$1"
adb install -r "$APK"
adb logcat -c
adb shell am start -n de.eisenbuch.app/.MainActivity
for i in $(seq 1 30); do
  sleep 2
  adb logcat -d > logcat.txt
  if grep -q "EB_READY" logcat.txt; then break; fi
done
adb exec-out screencap -p > emulator-start.png || true
# Fensterdaten zur Diagnose (Statusleiste, Insets) als Hinweis ausgeben
info=$(adb shell dumpsys window windows 2>/dev/null | grep -A12 "de.eisenbuch.app/de.eisenbuch.app.MainActivity" | grep -E "mFrame|mAttrs|fl=|sysuil|insets|ty=" | head -12 | sed ':a;N;$!ba;s/%/%25/g;s/\r/%0D/g;s/\n/%0A/g')
echo "::notice title=Fensterdaten::$info"
if grep -q "EB_READY" logcat.txt && ! grep -q "EB_START_ERROR\|EB_NATIVE_INIT" logcat.txt; then
  echo "App startet im Emulator korrekt."
  exit 0
fi
msg=$(grep -E "Capacitor|chromium|AndroidRuntime|EB_" logcat.txt | tail -40 | sed ':a;N;$!ba;s/%/%25/g;s/\r/%0D/g;s/\n/%0A/g')
echo "::error title=Emulator-Starttest fehlgeschlagen::$msg"
exit 1
