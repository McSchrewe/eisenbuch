import Toybox.Activity;
import Toybox.ActivityRecording;
import Toybox.Application;
import Toybox.Attention;
import Toybox.Communications;
import Toybox.Lang;
import Toybox.System;
import Toybox.Time;
import Toybox.Timer;
import Toybox.WatchUi;

// Zustand der Uhr-App.
// Handy -> Uhr: {"t":"q", "w":Trainings-ID, "n":Name, "q":[{"i","s","n","l","w","r"}...], "re":Pausenende (s), "rt":Pausenlänge (s)}
//               {"t":"end"} wenn das Training am Handy beendet wurde
// Uhr -> Handy: {"t":"hi"} beim Start, {"t":"done","w","d":[[i,s,ts],...]} mit allen bestätigten Sätzen des Trainings
//               (immer die ganze Liste: geht eine Nachricht verloren, holt die nächste sie nach)
class Model {
    var queue = [];
    var state = :wait;      // :wait, :set, :rest, :done
    var restEnd = 0;
    var restTotal = 0;
    var title = "";
    var wid = "";
    var log = [];
    var dirty = false;
    var doneKeys = {};
    var sending = false;
    var sentN = 0;
    var lastTry = 0;
    var lastHi = 0;
    var phoneSeen = false;
    var session = null;
    var timer;

    function initialize() {
        timer = new Timer.Timer();
        restore();
    }

    function now() {
        return Time.now().value();
    }

    function start() {
        timer.start(method(:tick), 1000, true);
        hello();
    }

    function stop() {
        timer.stop();
        persist();
    }

    function hello() {
        lastHi = now();
        try {
            Communications.transmit({"t" => "hi"}, null, new TxListener(self, false));
        } catch (e) {
        }
    }

    function head() {
        return queue.size() > 0 ? queue[0] : null;
    }

    function next() {
        return queue.size() > 1 ? queue[1] : null;
    }

    function key(i, s) {
        return i.toString() + ":" + s.toString();
    }

    // Neue Satzliste vom Handy
    function onPhone(d) {
        if (!(d instanceof Dictionary)) {
            return;
        }
        phoneSeen = true;
        var t = d["t"];
        if ("end".equals(t)) {
            queue = [];
            state = :done;
            doneKeys = {};
            WatchUi.requestUpdate();
            persist();
            return;
        }
        if (!"q".equals(t)) {
            return;
        }
        var w = d["w"];
        if (w != null && !w.toString().equals(wid)) {
            wid = w.toString();
            doneKeys = {};
            log = [];
            dirty = false;
        }
        if (d["n"] != null) {
            title = d["n"].toString();
        }
        var q = d["q"];
        var out = [];
        if (q instanceof Array) {
            for (var k = 0; k < q.size(); k++) {
                var e = q[k];
                if (e instanceof Dictionary && doneKeys[key(e["i"], e["s"])] == null) {
                    out.add(e);
                }
            }
        }
        queue = out;
        var re = d["re"];
        var localRest = state == :rest && restEnd > now();
        if (re != null && re > now()) {
            restEnd = re;
            restTotal = d["rt"] != null ? d["rt"] : (re - now());
            state = :rest;
        } else if (localRest && dirty) {
            // Handy kennt den letzten Satz noch nicht: eigene Pause weiterlaufen lassen
        } else if (queue.size() > 0) {
            state = :set;
        } else {
            state = :wait;
        }
        if (queue.size() > 0 && session == null) {
            startSession();
        }
        persist();
        WatchUi.requestUpdate();
    }

    // Satz bestätigen (grüner Knopf oder START-Taste)
    function confirm() {
        var h = head();
        if (h == null) {
            return;
        }
        var ts = now();
        log.add([h["i"], h["s"], ts]);
        dirty = true;
        doneKeys[key(h["i"], h["s"])] = ts;
        queue = queue.slice(1, null);
        if (session == null) {
            startSession();
        } else if (session.isRecording()) {
            session.addLap(); // jeder Satz eine Runde in Garmin Connect
        }
        var r = h["r"];
        if (queue.size() == 0) {
            state = :done;
        } else if (r != null && r > 1) {
            restTotal = r;
            restEnd = ts + r;
            state = :rest;
        } else {
            state = :set;
        }
        if (Attention has :vibrate) {
            Attention.vibrate([new Attention.VibeProfile(60, 80)]);
        }
        flush();
        persist();
        WatchUi.requestUpdate();
    }

    function skipRest() {
        if (state == :rest) {
            restEnd = now();
            state = queue.size() > 0 ? :set : :done;
            WatchUi.requestUpdate();
        }
    }

    function addRest(sec) {
        if (state == :rest) {
            restEnd += sec;
            restTotal += sec;
            if (restTotal < 1) {
                restTotal = 1;
            }
            if (restEnd <= now()) {
                skipRest();
            }
            persist();
            WatchUi.requestUpdate();
        }
    }

    function restLeft() {
        var l = restEnd - now();
        return l > 0 ? l : 0;
    }

    function tick() {
        if (state == :rest) {
            if (restEnd - now() <= 0) {
                state = queue.size() > 0 ? :set : :done;
                buzz();
            }
            WatchUi.requestUpdate();
        }
        if (dirty && !sending && now() - lastTry >= 4) {
            flush();
        }
        if (!phoneSeen && now() - lastHi >= 10) {
            hello(); // Handy-App noch nicht da: alle 10 s erneut melden
        }
    }

    // Pause vorbei: 3 deutliche Vibrationen, Display an
    function buzz() {
        if (Attention has :vibrate) {
            Attention.vibrate([
                new Attention.VibeProfile(100, 400), new Attention.VibeProfile(0, 200),
                new Attention.VibeProfile(100, 400), new Attention.VibeProfile(0, 200),
                new Attention.VibeProfile(100, 400)
            ]);
        }
        if (Attention has :backlight) {
            try {
                Attention.backlight(true);
            } catch (e) {
            }
        }
    }

    // Bestätigte Sätze nacheinander ans Handy schicken, bei Fehler später erneut
    function flush() {
        if (sending || !dirty) {
            return;
        }
        sending = true;
        lastTry = now();
        sentN = log.size();
        try {
            Communications.transmit({"t" => "done", "w" => wid, "d" => log}, null, new TxListener(self, true));
        } catch (e) {
            sending = false;
        }
    }

    function sent(ok, isDone) {
        if (!isDone) {
            return;
        }
        sending = false;
        if (ok) {
            phoneSeen = true;
            if (sentN >= log.size()) {
                dirty = false;
            }
            persist();
            flush();
        }
    }

    function startSession() {
        if (session != null || !(Toybox has :ActivityRecording)) {
            return;
        }
        try {
            session = ActivityRecording.createSession({
                :name => "Krafttraining",
                :sport => Activity.SPORT_TRAINING,
                :subSport => Activity.SUB_SPORT_STRENGTH_TRAINING
            });
            session.start();
        } catch (e) {
            session = null;
        }
    }

    function endSession(save) {
        if (session == null) {
            return;
        }
        try {
            if (session.isRecording()) {
                session.stop();
            }
            if (save) {
                session.save();
            } else {
                session.discard();
            }
        } catch (e) {
        }
        session = null;
        queue = [];
        state = :wait;
        doneKeys = {};
        log = [];
        dirty = false;
        persist();
    }

    function stateNum() {
        return state == :set ? 1 : state == :rest ? 2 : state == :done ? 3 : 0;
    }

    function persist() {
        try {
            Application.Storage.setValue("st", {
                "q" => queue, "s" => stateNum(), "re" => restEnd, "rt" => restTotal,
                "n" => title, "w" => wid, "l" => log, "dt" => dirty, "ts" => now()
            });
        } catch (e) {
        }
    }

    // Nach Neustart der App innerhalb von 3 h: Stand wiederherstellen
    function restore() {
        var d = null;
        try {
            d = Application.Storage.getValue("st");
        } catch (e) {
        }
        if (!(d instanceof Dictionary) || d["ts"] == null || now() - d["ts"] > 10800) {
            return;
        }
        queue = d["q"] instanceof Array ? d["q"] : [];
        log = d["l"] instanceof Array ? d["l"] : [];
        dirty = d["dt"] == true;
        restEnd = d["re"] != null ? d["re"] : 0;
        restTotal = d["rt"] != null ? d["rt"] : 0;
        title = d["n"] != null ? d["n"] : "";
        wid = d["w"] != null ? d["w"] : "";
        var s = d["s"];
        state = s == 1 ? :set : s == 2 ? :rest : s == 3 ? :done : :wait;
        if (state == :rest && restEnd <= now()) {
            state = queue.size() > 0 ? :set : :done;
        }
    }
}

class TxListener extends Communications.ConnectionListener {
    var m;
    var isDone;

    function initialize(model, d) {
        ConnectionListener.initialize();
        m = model;
        isDone = d;
    }

    function onComplete() {
        m.sent(true, isDone);
    }

    function onError() {
        m.sent(false, isDone);
    }
}
