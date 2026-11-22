import Toybox.Graphics;
import Toybox.Lang;
import Toybox.System;
import Toybox.WatchUi;

// Eine Ansicht für alle Zustände: Warten, Satz (grüner OK-Knopf), Pause (Vollbild-Countdown), Fertig
class MainView extends WatchUi.View {
    var m;
    const GREEN = 0x2BB673;
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
        if (m.state == :set) {
            drawSet(dc, w, h);
        } else if (m.state == :rest) {
            drawRest(dc, w, h);
        } else if (m.state == :done) {
            center(dc, w / 2, h * 0.40, Graphics.FONT_MEDIUM, Graphics.COLOR_WHITE, "Training fertig");
            center(dc, w / 2, h * 0.56, Graphics.FONT_TINY, GREY, "Zurück-Taste:");
            center(dc, w / 2, h * 0.64, Graphics.FONT_TINY, GREY, "speichern + beenden");
        } else {
            center(dc, w / 2, h * 0.30, Graphics.FONT_MEDIUM, Graphics.COLOR_WHITE, "Eisenbuch");
            center(dc, w / 2, h * 0.48, Graphics.FONT_TINY, GREY, "Training am Handy");
            center(dc, w / 2, h * 0.56, Graphics.FONT_TINY, GREY, "starten");
            center(dc, w / 2, h * 0.72, Graphics.FONT_XTINY, m.phoneSeen ? GREEN : GREY, m.phoneSeen ? "mit Handy verbunden" : "warte auf Handy ...");
        }
    }

    function drawSet(dc, w, h) {
        var e = m.head();
        if (e == null) {
            return;
        }
        if (!"".equals(m.title)) {
            center(dc, w / 2, h * 0.13, Graphics.FONT_XTINY, GREY, fit(dc, m.title, Graphics.FONT_XTINY, w * 0.55));
        }
        center(dc, w / 2, h * 0.23, Graphics.FONT_SMALL, GREEN, str(e["l"]));
        var name = str(e["n"]);
        var f = dc.getTextWidthInPixels(name, Graphics.FONT_MEDIUM) <= w * 0.84 ? Graphics.FONT_MEDIUM : Graphics.FONT_SMALL;
        center(dc, w / 2, h * 0.36, f, Graphics.COLOR_WHITE, fit(dc, name, f, w * 0.88));
        var wt = str(e["w"]);
        var f2 = dc.getTextWidthInPixels(wt, Graphics.FONT_LARGE) <= w * 0.9 ? Graphics.FONT_LARGE : Graphics.FONT_MEDIUM;
        center(dc, w / 2, h * 0.52, f2, Graphics.COLOR_WHITE, fit(dc, wt, f2, w * 0.92));
        // grüner OK-Knopf
        var r = w * 0.15;
        dc.setColor(GREEN, Graphics.COLOR_TRANSPARENT);
        dc.fillCircle(w / 2, h * 0.79, r);
        center(dc, w / 2, h * 0.79, Graphics.FONT_MEDIUM, Graphics.COLOR_BLACK, "OK");
    }

    function drawRest(dc, w, h) {
        var left = m.restLeft();
        var tot = m.restTotal > 0 ? m.restTotal : 1;
        var frac = left.toFloat() / tot;
        if (frac > 1) {
            frac = 1.0;
        }
        var cx = w / 2, cy = h / 2, rr = w / 2 - 10;
        dc.setPenWidth(12);
        dc.setColor(DARK, Graphics.COLOR_TRANSPARENT);
        dc.drawCircle(cx, cy, rr);
        if (frac > 0.001) {
            dc.setColor(left <= 10 ? 0xF2A33A : GREEN, Graphics.COLOR_TRANSPARENT);
            if (frac >= 0.999) {
                dc.drawCircle(cx, cy, rr);
            } else {
                dc.drawArc(cx, cy, rr, Graphics.ARC_CLOCKWISE, 90, 90 - 360 * frac);
            }
        }
        dc.setPenWidth(1);
        center(dc, w / 2, h * 0.19, Graphics.FONT_XTINY, GREY, "PAUSE");
        var mm = left / 60, ss = left % 60;
        center(dc, w / 2, h * 0.40, Graphics.FONT_NUMBER_THAI_HOT, Graphics.COLOR_WHITE, mm.toString() + ":" + ss.format("%02d"));
        var e = m.head();
        if (e != null) {
            center(dc, w / 2, h * 0.60, Graphics.FONT_XTINY, GREY, "Als Nächstes");
            center(dc, w / 2, h * 0.67, Graphics.FONT_TINY, Graphics.COLOR_WHITE, fit(dc, str(e["n"]) + " · " + str(e["l"]), Graphics.FONT_TINY, w * 0.80));
            center(dc, w / 2, h * 0.74, Graphics.FONT_TINY, GREEN, fit(dc, str(e["w"]), Graphics.FONT_TINY, w * 0.70));
        }
        center(dc, w * 0.32, h * 0.86, Graphics.FONT_XTINY, GREY, "-15 s");
        center(dc, w * 0.68, h * 0.86, Graphics.FONT_XTINY, GREY, "+15 s");
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

// Eingaben: Tippen auf OK bzw. START bestätigt den Satz. In der Pause: unten links -15 s, unten rechts +15 s, START überspringt.
class MainDelegate extends WatchUi.BehaviorDelegate {
    var m;

    function initialize(model) {
        BehaviorDelegate.initialize();
        m = model;
    }

    function onTap(evt) {
        var c = evt.getCoordinates();
        var w = System.getDeviceSettings().screenWidth, h = System.getDeviceSettings().screenHeight;
        if (m.state == :set) {
            if (c[1] > h * 0.60) {
                m.confirm();
            }
        } else if (m.state == :rest) {
            if (c[1] > h * 0.78) {
                if (c[0] < w * 0.5) {
                    m.addRest(-15);
                } else {
                    m.addRest(15);
                }
            }
        }
        return true;
    }

    function onSelect() {
        if (m.state == :set) {
            m.confirm();
        } else if (m.state == :rest) {
            m.skipRest();
        }
        return true;
    }

    function onBack() {
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
            m.endSession(true);
            System.exit();
        } else if (id == :discard) {
            m.endSession(false);
            System.exit();
        } else {
            WatchUi.popView(WatchUi.SLIDE_DOWN);
        }
    }
}
