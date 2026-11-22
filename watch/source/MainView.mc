import Toybox.Graphics;
import Toybox.Lang;
import Toybox.Math;
import Toybox.System;
import Toybox.WatchUi;

// Eine Ansicht für alle Zustände: Warten, Satz, Pause, Puls-Warten, Gefühl, Fertig, Wake. Dazu der Rekord-Pokal als Overlay.
class MainView extends WatchUi.View {
    var m;
    const GREEN = 0x2BB673;
    const RED = 0xE0574F;
    const GOLD = 0xF2C230;
    const GOLD2 = 0xC9961A;
    const GREY = 0x8A8F8E;
    const DARK = 0x2A2F2E;

    function initialize(model) {
        View.initialize();
        m = model;
    }

    function onUpdate(dc) {
        var w = dc.getWidth(), h = dc.getHeight();
        dc.setColor(Graphics.COLOR_BLACK, Graphics.COLOR_BLACK);
        dc.clear();
        if (m.prActive()) {
            drawPr(dc, w, h);
            return;
        }
        if (m.state == :set) {
            drawSet(dc, w, h);
        } else if (m.state == :rest) {
            drawRest(dc, w, h);
        } else if (m.state == :hrwait) {
            drawHrWait(dc, w, h);
        } else if (m.state == :feel) {
            drawFeel(dc, w, h);
        } else if (m.state == :wake) {
            drawWake(dc, w, h);
        } else if (m.state == :done) {
            center(dc, w / 2, h * 0.40, Graphics.FONT_MEDIUM, Graphics.COLOR_WHITE, "Training fertig");
            center(dc, w / 2, h * 0.56, Graphics.FONT_TINY, GREY, "Zurück-Taste:");
            center(dc, w / 2, h * 0.64, Graphics.FONT_TINY, GREY, "speichern + beenden");
        } else {
            center(dc, w / 2, h * 0.24, Graphics.FONT_MEDIUM, Graphics.COLOR_WHITE, "Eisenbuch");
            center(dc, w / 2, h * 0.38, Graphics.FONT_TINY, GREY, "Training am Handy starten");
            center(dc, w / 2, h * 0.47, Graphics.FONT_XTINY, m.phoneSeen ? GREEN : GREY, m.phoneSeen ? "mit Handy verbunden" : "warte auf Handy ...");
            // Knopf für den Wake-Modus
            dc.setColor(0x14B8A6, Graphics.COLOR_TRANSPARENT);
            dc.fillRoundedRectangle(w * 0.22, h * 0.62, w * 0.56, h * 0.15, h * 0.075);
            center(dc, w / 2, h * 0.695, Graphics.FONT_SMALL, Graphics.COLOR_BLACK, "Wake-Session");
        }
    }

    function fmtKg(k, plus) {
        if (k < 0) {
            return "?";
        }
        var r = (k * 100).toNumber();
        var s = (r % 100 == 0) ? (r / 100).toString() : k.format(r % 10 == 0 ? "%.1f" : "%.2f");
        var out = "";
        for (var i = 0; i < s.length(); i++) {
            var c = s.substring(i, i + 1);
            out += c.equals(".") ? "," : c;
        }
        return (plus ? "+" : "") + out;
    }

    function drawSet(dc, w, h) {
        m.syncHead();
        var e = m.head();
        if (e == null) {
            return;
        }
        if (!"".equals(m.title)) {
            center(dc, w / 2, h * 0.12, Graphics.FONT_XTINY, GREY, fit(dc, m.title, Graphics.FONT_XTINY, w * 0.55));
        }
        center(dc, w / 2, h * 0.21, Graphics.FONT_SMALL, GREEN, str(e["l"]));
        var name = str(e["n"]);
        var f = dc.getTextWidthInPixels(name, Graphics.FONT_MEDIUM) <= w * 0.84 ? Graphics.FONT_MEDIUM : Graphics.FONT_SMALL;
        center(dc, w / 2, h * 0.32, f, Graphics.COLOR_WHITE, fit(dc, name, f, w * 0.88));
        // zwei Felder: Gewicht und Wiederholungen, das gewählte ist grün umrandet, Wischen ändert es
        var kgTxt = fmtKg(m.curKg, e["kgp"] == 1);
        var bw = w * 0.36, bh = h * 0.19, by = h * 0.41;
        var xs = [w * 0.13, w * 0.51];
        var vals = [kgTxt, m.curReps.toString()];
        var units = ["kg", str(e["u"])];
        for (var k = 0; k < 2; k++) {
            var sel = (k == 0) == m.editKg;
            dc.setColor(sel ? GREEN : DARK, Graphics.COLOR_TRANSPARENT);
            dc.setPenWidth(sel ? 4 : 2);
            dc.drawRoundedRectangle(xs[k], by, bw, bh, 14);
            dc.setPenWidth(1);
            var vf = dc.getTextWidthInPixels(vals[k], Graphics.FONT_LARGE) <= bw - 10 ? Graphics.FONT_LARGE : Graphics.FONT_MEDIUM;
            center(dc, xs[k] + bw / 2, by + bh * 0.40, vf, Graphics.COLOR_WHITE, vals[k]);
            center(dc, xs[k] + bw / 2, by + bh * 0.80, Graphics.FONT_XTINY, GREY, units[k]);
        }
        center(dc, w / 2, h * 0.645, Graphics.FONT_XTINY, GREY, "Feld antippen, wischen ändert");
        var hr = m.hr();
        if (hr > 0) {
            center(dc, w / 2, h * 0.92, Graphics.FONT_XTINY, GREY, "Puls " + hr);
        }
        var r = w * 0.12;
        dc.setColor(GREEN, Graphics.COLOR_TRANSPARENT);
        dc.fillCircle(w / 2, h * 0.79, r);
        center(dc, w / 2, h * 0.79, Graphics.FONT_MEDIUM, Graphics.COLOR_BLACK, "OK");
    }

    function ring(dc, w, h, frac, color) {
        var cx = w / 2, cy = h / 2, rr = w / 2 - 10;
        dc.setPenWidth(12);
        dc.setColor(DARK, Graphics.COLOR_TRANSPARENT);
        dc.drawCircle(cx, cy, rr);
        if (frac > 0.001) {
            dc.setColor(color, Graphics.COLOR_TRANSPARENT);
            if (frac >= 0.999) {
                dc.drawCircle(cx, cy, rr);
            } else {
                dc.drawArc(cx, cy, rr, Graphics.ARC_CLOCKWISE, 90, 90 - 360 * frac);
            }
        }
        dc.setPenWidth(1);
    }

    function drawRest(dc, w, h) {
        var left = m.restLeft();
        var tot = m.restTotal > 0 ? m.restTotal : 1;
        var frac = left.toFloat() / tot;
        if (frac > 1) {
            frac = 1.0;
        }
        ring(dc, w, h, frac, left <= 10 ? 0xF2A33A : GREEN);
        var hr = m.hr();
        center(dc, w / 2, h * 0.19, Graphics.FONT_XTINY, GREY, hr > 0 ? "PAUSE · Puls " + hr : "PAUSE");
        var mm = left / 60, ss = left % 60;
        center(dc, w / 2, h * 0.40, Graphics.FONT_NUMBER_THAI_HOT, Graphics.COLOR_WHITE, mm.toString() + ":" + ss.format("%02d"));
        nextLine(dc, w, h);
    }

    function nextLine(dc, w, h) {
        var e = m.head();
        if (e != null) {
            center(dc, w / 2, h * 0.62, Graphics.FONT_XTINY, GREY, "Als Nächstes");
            center(dc, w / 2, h * 0.69, Graphics.FONT_TINY, Graphics.COLOR_WHITE, fit(dc, str(e["n"]) + " · " + str(e["l"]), Graphics.FONT_TINY, w * 0.80));
            center(dc, w / 2, h * 0.76, Graphics.FONT_TINY, GREEN, fit(dc, str(e["w"]), Graphics.FONT_TINY, w * 0.70));
        }
    }

    function drawHrWait(dc, w, h) {
        ring(dc, w, h, 1.0, 0xF2A33A);
        center(dc, w / 2, h * 0.19, Graphics.FONT_XTINY, GREY, "PULS NOCH HOCH");
        center(dc, w / 2, h * 0.40, Graphics.FONT_NUMBER_THAI_HOT, 0xF2A33A, m.hr().toString());
        center(dc, w / 2, h * 0.55, Graphics.FONT_TINY, GREY, "weiter unter " + m.hrThr + " bpm");
        nextLine(dc, w, h);
    }

    function drawFeel(dc, w, h) {
        center(dc, w / 2, h * 0.14, Graphics.FONT_SMALL, Graphics.COLOR_WHITE, "Wie war's?");
        center(dc, w / 2, h * 0.23, Graphics.FONT_XTINY, GREY, fit(dc, m.feelName, Graphics.FONT_XTINY, w * 0.6));
        var opts = [["Leicht", "3+ Wdh. übrig", 0x3E9E58], ["Passend", "1-2 übrig", 0x1F55C4], ["Limit", "nichts mehr", RED]];
        for (var k = 0; k < 3; k++) {
            var y = h * (0.30 + 0.19 * k);
            dc.setColor(opts[k][2], Graphics.COLOR_TRANSPARENT);
            dc.fillRoundedRectangle(w * 0.16, y, w * 0.68, h * 0.16, 18);
            center(dc, w / 2, y + h * 0.058, Graphics.FONT_SMALL, Graphics.COLOR_WHITE, opts[k][0]);
            center(dc, w / 2, y + h * 0.118, Graphics.FONT_XTINY, Graphics.COLOR_WHITE, opts[k][1]);
        }
        var left = m.feelUntil - m.now();
        center(dc, w / 2, h * 0.90, Graphics.FONT_XTINY, GREY, "Pause läuft · " + (left > 0 ? left : 0) + " s");
    }

    function drawWake(dc, w, h) {
        var laps = m.wlog.size();
        center(dc, w / 2, h * 0.13, Graphics.FONT_XTINY, 0x14B8A6, "WAKE · " + laps + (laps == 1 ? " Versuch" : " Versuche"));
        var t = m.wakeTrick();
        var name = t != null && t["n"] != null ? t["n"].toString() : "Trick am Handy wählen";
        var f = dc.getTextWidthInPixels(name, Graphics.FONT_MEDIUM) <= w * 0.82 ? Graphics.FONT_MEDIUM : Graphics.FONT_SMALL;
        center(dc, w / 2, h * 0.27, f, Graphics.COLOR_WHITE, fit(dc, name, f, w * 0.86));
        if (m.wl.size() > 1) {
            center(dc, w / 2, h * 0.36, Graphics.FONT_XTINY, GREY, (m.wi + 1) + "/" + m.wl.size() + " · wischen: anderer Trick");
        }
        var c = m.wakeCount(m.wi);
        center(dc, w / 2, h * 0.47, Graphics.FONT_SMALL, GREEN, c[0] + "/" + c[1] + " gestanden");
        // zwei Knöpfe: Sturz links (rot), Steht rechts (grün); Tasten: START = steht, ZURÜCK = Sturz
        var r = w * 0.15;
        dc.setColor(RED, Graphics.COLOR_TRANSPARENT);
        dc.fillCircle(w * 0.31, h * 0.70, r);
        dc.setColor(GREEN, Graphics.COLOR_TRANSPARENT);
        dc.fillCircle(w * 0.69, h * 0.70, r);
        center(dc, w * 0.31, h * 0.70, Graphics.FONT_SMALL, Graphics.COLOR_WHITE, "Sturz");
        center(dc, w * 0.69, h * 0.70, Graphics.FONT_SMALL, Graphics.COLOR_BLACK, "Steht");
        center(dc, w / 2, h * 0.89, Graphics.FONT_XTINY, GREY, "oben tippen: Menü");
    }

    // Pokal: wächst herein, Strahlen drehen sich, Funken fliegen nach außen
    function drawPr(dc, w, h) {
        var a = m.prAge();
        var t = a / 1000.0;
        var sc = t < 0.35 ? t / 0.35 : (t < 0.5 ? 1.0 + (0.5 - t) * 0.6 : 1.0);
        var cx = w / 2, cy = h * 0.36;
        // Strahlen
        dc.setColor(0x3A2E0A, Graphics.COLOR_TRANSPARENT);
        for (var k = 0; k < 12; k++) {
            var ang = (k * 30 + t * 40) * Math.PI / 180;
            var ang2 = ang + 0.12;
            var R = w * 0.48;
            dc.fillPolygon([[cx, cy], [cx + R * Math.cos(ang), cy + R * Math.sin(ang)], [cx + R * Math.cos(ang2), cy + R * Math.sin(ang2)]]);
        }
        // Pokal
        var s = w * 0.16 * sc;
        dc.setColor(GOLD, Graphics.COLOR_TRANSPARENT);
        dc.fillPolygon([[cx - s, cy - s], [cx + s, cy - s], [cx + s * 0.75, cy + s * 0.3], [cx - s * 0.75, cy + s * 0.3]]);
        dc.fillCircle(cx, cy + s * 0.25, s * 0.55);
        dc.setPenWidth((s * 0.16).toNumber() > 1 ? (s * 0.16).toNumber() : 2);
        dc.drawArc(cx - s, cy - s * 0.45, s * 0.45, Graphics.ARC_COUNTER_CLOCKWISE, 90, 270);
        dc.drawArc(cx + s, cy - s * 0.45, s * 0.45, Graphics.ARC_CLOCKWISE, 90, 270);
        dc.setPenWidth(1);
        dc.setColor(GOLD2, Graphics.COLOR_TRANSPARENT);
        dc.fillRectangle(cx - s * 0.14, cy + s * 0.7, s * 0.28, s * 0.45);
        dc.fillRoundedRectangle(cx - s * 0.6, cy + s * 1.1, s * 1.2, s * 0.32, 6);
        // Funken
        for (var k = 0; k < 10; k++) {
            var ang = k * 36 * Math.PI / 180;
            var d = w * (0.12 + t * 0.22);
            var fade = t < 1.6 ? 1 : 0;
            if (fade == 1) {
                dc.setColor(k % 2 == 0 ? GOLD : Graphics.COLOR_WHITE, Graphics.COLOR_TRANSPARENT);
                dc.fillCircle(cx + d * Math.cos(ang), cy + d * Math.sin(ang), 5);
            }
        }
        center(dc, w / 2, h * 0.66, Graphics.FONT_MEDIUM, GOLD, "Neuer Rekord!");
        center(dc, w / 2, h * 0.75, Graphics.FONT_SMALL, Graphics.COLOR_WHITE, fit(dc, m.prName, Graphics.FONT_SMALL, w * 0.78));
        center(dc, w / 2, h * 0.83, Graphics.FONT_TINY, GREY, fit(dc, m.prText, Graphics.FONT_TINY, w * 0.66));
    }

    function str(x) {
        return x == null ? "" : x.toString();
    }

    function center(dc, x, y, font, color, text) {
        dc.setColor(color, Graphics.COLOR_TRANSPARENT);
        dc.drawText(x, y, font, text, Graphics.TEXT_JUSTIFY_CENTER | Graphics.TEXT_JUSTIFY_VCENTER);
    }

    // Text kürzen, bis er in die Breite passt
    function fit(dc, text, font, maxW) {
        if (dc.getTextWidthInPixels(text, font) <= maxW) {
            return text;
        }
        var t = text;
        while (t.length() > 3 && dc.getTextWidthInPixels(t + "..", font) > maxW) {
            t = t.substring(0, t.length() - 1);
        }
        return t + "..";
    }
}

// Eingaben
//  Satz: Feld (Gewicht / Wdh.) antippen, wischen hoch/runter ändert, OK oder START bestätigt
//  Pause: START überspringt. Gefühl: Band antippen, START = Passend
//  Wake: START = steht, ZURÜCK = Sturz, wischen = anderer Trick, oben tippen = Menü
class MainDelegate extends WatchUi.BehaviorDelegate {
    var m;

    function initialize(model) {
        BehaviorDelegate.initialize();
        m = model;
    }

    function onTap(evt) {
        var c = evt.getCoordinates();
        var w = System.getDeviceSettings().screenWidth, h = System.getDeviceSettings().screenHeight;
        if (m.prActive()) {
            m.closePr();
            return true;
        }
        if (m.state == :set) {
            if (c[1] > h * 0.68) {
                m.confirm();
            } else if (c[1] > h * 0.38 && c[1] < h * 0.62) {
                m.selectEdit(c[0] < w / 2);
            }
        } else if (m.state == :feel) {
            if (c[1] > h * 0.30 && c[1] < h * 0.46) {
                m.feel("easy");
            } else if (c[1] >= h * 0.49 && c[1] < h * 0.65) {
                m.feel("ok");
            } else if (c[1] >= h * 0.68 && c[1] < h * 0.84) {
                m.feel("hard");
            }
        } else if (m.state == :wake) {
            if (c[1] < h * 0.22) {
                wakeMenu();
            } else if (c[1] > h * 0.55 && c[1] < h * 0.86) {
                m.wakeTry(c[0] > w / 2);
            }
        } else if (m.state == :wait) {
            if (c[1] > h * 0.60 && c[1] < h * 0.80) {
                m.startWake();
            }
        }
        return true;
    }

    function onNextPage() {
        if (m.state == :set) {
            m.adjust(1);
        } else if (m.state == :wake) {
            m.wakeMove(1);
        }
        return true;
    }

    function onPreviousPage() {
        if (m.state == :set) {
            m.adjust(-1);
        } else if (m.state == :wake) {
            m.wakeMove(-1);
        }
        return true;
    }

    function onSelect() {
        if (m.prActive()) {
            m.closePr();
        } else if (m.state == :set) {
            m.confirm();
        } else if (m.state == :rest || m.state == :hrwait) {
            m.skipRest();
        } else if (m.state == :feel) {
            m.feel("ok");
        } else if (m.state == :wake) {
            m.wakeTry(true);
        } else if (m.state == :wait) {
            m.startWake();
        }
        return true;
    }

    function onMenu() {
        if (m.state == :wake) {
            wakeMenu();
            return true;
        }
        return false;
    }

    function wakeMenu() {
        var menu = new WatchUi.Menu2({:title => "Wake"});
        menu.addItem(new WatchUi.MenuItem("Weiter", null, :resume, null));
        menu.addItem(new WatchUi.MenuItem("Letzten löschen", null, :undo, null));
        menu.addItem(new WatchUi.MenuItem("Speichern", "Session ans Handy", :save, null));
        menu.addItem(new WatchUi.MenuItem("Verwerfen", null, :discard, null));
        WatchUi.pushView(menu, new ExitDelegate(m), WatchUi.SLIDE_UP);
    }

    function onBack() {
        if (m.state == :wake) {
            m.wakeTry(false); // ZURÜCK = Sturz
            return true;
        }
        if (m.session != null) {
            var menu = new WatchUi.Menu2({:title => "Training"});
            menu.addItem(new WatchUi.MenuItem("Weiter", null, :resume, null));
            menu.addItem(new WatchUi.MenuItem("Speichern", "und beenden", :save, null));
            menu.addItem(new WatchUi.MenuItem("Verwerfen", "Aktivität löschen", :discard, null));
            WatchUi.pushView(menu, new ExitDelegate(m), WatchUi.SLIDE_UP);
            return true;
        }
        return false;
    }
}

class ExitDelegate extends WatchUi.Menu2InputDelegate {
    var m;

    function initialize(model) {
        Menu2InputDelegate.initialize();
        m = model;
    }

    function onSelect(item) {
        var id = item.getId();
        if (id == :save) {
            var wasWake = m.state == :wake;
            m.endSession(true);
            if (wasWake) {
                WatchUi.popView(WatchUi.SLIDE_DOWN); // auf die Bestätigung durchs Handy warten, App bleibt offen
            } else {
                System.exit();
            }
        } else if (id == :discard) {
            m.endSession(false);
            System.exit();
        } else if (id == :undo) {
            m.wakeUndo();
            WatchUi.popView(WatchUi.SLIDE_DOWN);
        } else {
            WatchUi.popView(WatchUi.SLIDE_DOWN);
        }
    }
}
