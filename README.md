# Eisenbuch

Persönliche Trainings-App für Android: Krafttraining mit Periodisierung und automatischen Gewichtsvorschlägen, Griffkraft-Tests für die Wakeboard-Saison, Körpergewicht und Lauftagebuch.

## Installieren
1. Unter **Releases** (rechte Seite der Repository-Startseite) die neueste `eisenbuch-1.X.apk` auf dem Handy herunterladen.
2. Datei öffnen. Beim ersten Mal fragt Android, ob der Browser bzw. die Dateien-App Apps installieren darf: erlauben.
3. Updates genauso installieren. Die Daten bleiben erhalten, weil jede Version mit demselben Schlüssel signiert ist.

## Aufbau
- `src/` – App-Code (JavaScript, CSS). Eine Quelle für Android und die Web-Version.
- `tools/build.js` – baut `www/index.html` (Android, offline) und `dist/artifact.html` (Web).
- `tools/test.js` – Logik-Tests: simuliert komplette Trainingsblöcke.
- `android/` – Android-Projekt (Capacitor 6).
- `.github/workflows/android.yml` – baut bei jedem Push die APK und legt ein Release an.

## Lokal entwickeln
```
npm ci
npm test
npm run sync      # Web bauen und ins Android-Projekt kopieren
```
Das Repository privat halten: Der Signaturschlüssel liegt in `android/app/`.
