import Toybox.Application;
import Toybox.Graphics;
import Toybox.Lang;
import Toybox.Time;
import Toybox.Time.Gregorian;
import Toybox.WatchUi;

// Widget-Zeile: nächstes Training und Tage bis zum Saisonstart (Stand der letzten Verbindung mit dem Handy)
(:glance)
class EbGlance extends WatchUi.GlanceView {
    function initialize() {
        GlanceView.initialize();
    }

    function onUpdate(dc) {
        var g = null;
        try {
            g = Application.Storage.getValue("gl");
        } catch (e) {
        }
        var nx = "", se = "";
        if (g instanceof Dictionary) {
            nx = g["nx"] != null ? g["nx"].toString() : "";
            se = g["se"] != null ? g["se"].toString() : "";
        }
        var h = dc.getHeight();
        dc.setColor(Graphics.COLOR_WHITE, Graphics.COLOR_TRANSPARENT);
        dc.drawText(0, h * 0.30, Graphics.FONT_GLANCE, "EISENBUCH", Graphics.TEXT_JUSTIFY_LEFT | Graphics.TEXT_JUSTIFY_VCENTER);
        var line = nx;
        var days = daysTo(se);
        if (days != null && days > 0) {
            line = line.equals("") ? "Saison in " + days + " Tagen" : line + " · Saison " + days + " T";
        }
        if (line.equals("")) {
            line = "Training am Handy planen";
        }
        dc.setColor(0x2BB673, Graphics.COLOR_TRANSPARENT);
        dc.drawText(0, h * 0.72, Graphics.FONT_GLANCE, line, Graphics.TEXT_JUSTIFY_LEFT | Graphics.TEXT_JUSTIFY_VCENTER);
    }

    // Tage bis zu einem Datum "JJJJ-MM-TT"
    function daysTo(s) {
        if (s == null || s.length() < 10) {
            return null;
        }
        try {
            var y = s.substring(0, 4).toNumber(), m = s.substring(5, 7).toNumber(), d = s.substring(8, 10).toNumber();
            if (y == null || m == null || d == null) {
                return null;
            }
            var t = Gregorian.moment({:year => y, :month => m, :day => d, :hour => 0, :minute => 0, :second => 0});
            var diff = t.value() - Time.today().value();
            return (diff / 86400).toNumber();
        } catch (e) {
            return null;
        }
    }
}
