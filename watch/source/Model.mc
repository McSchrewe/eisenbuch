import Toybox.Activity;
import Toybox.ActivityRecording;
import Toybox.Application;
import Toybox.Attention;
import Toybox.Communications;
import Toybox.FitContributor;
import Toybox.Lang;
import Toybox.SensorHistory;
import Toybox.System;
import Toybox.Time;
import Toybox.Timer;
import Toybox.WatchUi;

// Zustand der Uhr-App.
// Handy -> Uhr: {"t":"q", "w":Trainings-ID, "n":Name, "q":[{"i","s","n","l","w","r","kg","rp","st","u","kgp","x"}...],
//                "re":Pausenende (s), "rt":Pausenlänge (s), "hr":Puls-Schwelle, "nx":nächstes Training, "se":Saisonstart}
//               {"t":"end"|"info", "nx", "se"}, {"t":"pr","n","d"} Rekord, {"t":"wl","l":[{"id","k","n"}]} Trickliste, {"t":"bio?"}
// Uhr -> Handy: {"t":"hi","bb","bbx","st"}, {"t":"done","w","d":[[i,s,ts,kg,reps,hr],...]}, {"t":"feel","w","i","f"},
//               {"t":"wk?"}, {"t":"wake"|"wend","w","d":[[id,k,steht,ts],...],"min","laps"}
// Satz- und Wake-Listen gehen immer vollständig raus: geht eine Nachricht verloren, holt die nächste sie nach.
class Model {
    var queue = [];
    var state = :wait;      // :wait, :set, :rest, :hrwait, :feel, :done, :wake
    var restEnd = 0;
    var restTotal = 0;
    var hrWaitUntil = 0;
    var hrThr = 0;
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
    // Korrektur auf der Uhr
    var headKey = "";
    var curKg = -1.0;
    var curReps = 0;
    var editKg = false;
    var setHrMax = 0;
    // Gefühl am Übungsende
    var feelI = -1;
    var feelName = "";
    var feelUntil = 0;
    var afterFeel = :set;
    // Rekord-Pokal
    var prText = "";
    var prName = "";
    var prStart = 0;
    var anim = null;
    // FIT-Felder in der Aktivität
    var fW = null;
    var fR = null;
    var fVol = null;
    var fSets = null;
    var vol = 0.0;
    var nSets = 0;
    // Wake-Modus
    var wl = [];
    var wi = 0;
    var wlog = [];
    var wsid = "";
    var wStart = 0;
    var wdirty = false;
    var wend = false;
    var wsending = false;

    function initialize() {
        timer = new Timer.Timer();
        anim = new Timer.Timer();
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
        anim.stop();
        persist();
    }

    // Anmelden beim Handy, mit Body Battery und Stress
    function hello() {
        lastHi = now();
        var d = {"t" => "hi"};
        var b = bio();
        if (b != null) {
            d["bb"] = b[0];
            d["bbx"] = b[1];
            if (b[2] != null) {
                d["st"] = b[2];
            }
        }
        try {
            Communications.transmit(d, null, new TxListener(self, 0));
        } catch (e) {
        }
    }

    // [aktuell, Höchstwert der letzten 24 h, Stress-Schnitt der letzten 3 h] oder null
    function bio() {
        if (!(Toybox has :SensorHistory) || !(SensorHistory has :getBodyBatteryHistory)) {
            return null;
        }
        try {
            var it = SensorHistory.getBodyBatteryHistory({:period => new Time.Duration(86400), :order => SensorHistory.ORDER_NEWEST_FIRST});
            if (it == null) {
                return null;
            }
            var cur = null, mx = null;
            var s = it.next();
            while (s != null) {
                if (s.data != null) {
                    if (cur == null) {
                        cur = s.data;
                    }
                    if (mx == null || s.data > mx) {
                        mx = s.data;
                    }
                }
                s = it.next();
            }
            if (cur == null) {
                return null;
            }
            var st = null;
            if (SensorHistory has :getStressHistory) {
                var si = SensorHistory.getStressHistory({:period => new Time.Duration(10800)});
                var sum = 0, n = 0;
                if (si != null) {
                    var x = si.next();
                    while (x != null) {
                        if (x.data != null) {
                            sum += x.data;
                            n++;
                        }
                        x = si.next();
                    }
                }
                if (n > 0) {
                    st = (sum / n).toNumber();
                }
            }
            return [cur.toNumber(), mx.toNumber(), st];
        } catch (e) {
            return null;
        }
    }

    function head() {
        return queue.size() > 0 ? queue[0] : null;
    }

    function key(i, s) {
        return i.toString() + ":" + s.toString();
    }

    // Werte des aktuellen Satzes für die Korrektur übernehmen, sobald ein neuer Satz dran ist
    function syncHead() {
        var h = head();
        var k = h == null ? "" : key(h["i"], h["s"]);
        if (!k.equals(headKey)) {
            headKey = k;
            editKg = false;
            setHrMax = 0;
            if (h != null) {
                curKg = h["kg"] != null ? h["kg"].toFloat() : -1.0;
                curReps = h["rp"] != null ? h["rp"].toNumber() : 0;
            }
        }
    }

    function onPhone(d) {
        if (!(d instanceof Dictionary)) {
            return;
        }
        phoneSeen = true;
        var t = d["t"];
        if (d["nx"] != null || d["se"] != null) {
            try {
                Application.Storage.setValue("gl", {"nx" => d["nx"] != null ? d["nx"] : "", "se" => d["se"] != null ? d["se"] : ""});
            } catch (e) {
            }
        }
        if ("pr".equals(t)) {
            showPr(d["n"] != null ? d["n"].toString() : "", d["d"] != null ? d["d"].toString() : "");
            return;
        }
        if ("bio?".equals(t)) {
            hello();
            return;
        }
        if ("wl".equals(t)) {
            if (d["l"] instanceof Array) {
                wl = d["l"];
                if (wi >= wl.size()) {
                    wi = 0;
                }
                try {
                    Application.Storage.setValue("wl", wl);
                } catch (e) {
                }
            }
            WatchUi.requestUpdate();
            return;
        }
        if (state == :wake) {
            return; // während der Wake-Session keine Gym-Daten
        }
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
        hrThr = d["hr"] != null ? d["hr"] : 0;
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
        syncHead();
        var re = d["re"];
        var localRest = (state == :rest || state == :hrwait || state == :feel) && dirty;
        if (state == :feel) {
            // Gefühl-Abfrage nicht unterbrechen
        } else if (re != null && re > now()) {
            restEnd = re;
            restTotal = d["rt"] != null ? d["rt"] : (re - now());
            state = :rest;
        } else if (localRest) {
            // Handy kennt den letzten Satz noch nicht: eigene Pause weiterlaufen lassen
        } else if (queue.size() > 0) {
            if (state != :hrwait) {
                state = :set;
            }
        } else {
            state = :wait;
        }
        if (queue.size() > 0 && session == null) {
            startSession(false);
        }
        persist();
        WatchUi.requestUpdate();
    }

    // ---------- Satz ----------
    function adjust(dir) {
        if (state != :set) {
            return;
        }
        var h = head();
        if (h == null) {
            return;
        }
        if (editKg) {
            var st = h["st"] != null ? h["st"].toFloat() : 2.5;
            if (curKg < 0) {
                curKg = 0.0;
            }
            curKg += dir * st;
            if (curKg < 0) {
                curKg = 0.0;
            }
        } else {
            var step = "s".equals(h["u"]) ? 5 : 1;
            curReps += dir * step;
            if (curReps < 0) {
                curReps = 0;
            }
        }
        WatchUi.requestUpdate();
    }

    function selectEdit(kg) {
        editKg = kg;
        WatchUi.requestUpdate();
    }

    function confirm() {
        var h = head();
        if (h == null) {
            return;
        }
        syncHead();
        var ts = now();
        var kg = curKg >= 0 ? curKg : null;
        log.add([h["i"], h["s"], ts, kg, curReps, setHrMax]);
        dirty = true;
        doneKeys[key(h["i"], h["s"])] = ts;
        queue = queue.slice(1, null);
        if (session == null) {
            startSession(false); // keine Runden pro Satz: die Uhr würde jede Runde ansagen
        }
        fitSet(kg, curReps);
        var r = h["r"];
        var nextState = :set;
        if (queue.size() == 0) {
            nextState = :done;
        } else if (r != null && r > 1) {
            restTotal = r;
            restEnd = ts + r;
            nextState = :rest;
        }
        syncHead();
        if (h["x"] == 1) {
            // letzter Satz der Übung: kurz nach dem Gefühl fragen, Pause läuft im Hintergrund
            feelI = h["i"];
            feelName = h["n"] != null ? h["n"].toString() : "";
            feelUntil = ts + 20;
            afterFeel = nextState;
            state = :feel;
        } else {
            state = nextState;
        }
        if (Attention has :vibrate) {
            Attention.vibrate([new Attention.VibeProfile(60, 80)]);
        }
        flush();
        persist();
        WatchUi.requestUpdate();
    }

    function feel(f) {
        if (state != :feel) {
            return;
        }
        if (f != null) {
            try {
                Communications.transmit({"t" => "feel", "w" => wid, "i" => feelI, "f" => f}, null, new TxListener(self, 0));
            } catch (e) {
            }
        }
        state = afterFeel;
        if (state == :rest && restEnd <= now()) {
            state = queue.size() > 0 ? :set : :done;
        }
        WatchUi.requestUpdate();
    }

    function skipRest() {
        if (state == :rest || state == :hrwait) {
            restEnd = now();
            state = queue.size() > 0 ? :set : :done;
            WatchUi.requestUpdate();
        }
    }

    function restLeft() {
        var l = restEnd - now();
        return l > 0 ? l : 0;
    }

    function hr() {
        try {
            var info = Activity.getActivityInfo();
            if (info != null && info.currentHeartRate != null) {
                return info.currentHeartRate;
            }
        } catch (e) {
        }
        return 0;
    }

    function tick() {
        var h = hr();
        if (state == :set && h > setHrMax) {
            setHrMax = h;
        }
        if (state == :rest) {
            if (restEnd - now() <= 0) {
                if (hrThr > 0 && h > hrThr) {
                    hrWaitUntil = now() + 60; // Puls noch zu hoch: höchstens 60 s warten
                    state = :hrwait;
                } else {
                    state = queue.size() > 0 ? :set : :done;
                    buzz();
                }
            }
            WatchUi.requestUpdate();
        } else if (state == :hrwait) {
            if (h <= hrThr || now() >= hrWaitUntil) {
                state = queue.size() > 0 ? :set : :done;
                buzz();
            }
            WatchUi.requestUpdate();
        } else if (state == :feel) {
            if (now() >= feelUntil) {
                feel(null);
            }
            WatchUi.requestUpdate();
        } else if (state == :wake || state == :set) {
            WatchUi.requestUpdate();
        }
        if (dirty && !sending && now() - lastTry >= 4) {
            flush();
        }
        if ((wdirty || wend) && !wsending && now() - lastTry >= 4) {
            wflush();
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
        light();
    }

    function light() {
        if (Attention has :backlight) {
            try {
                Attention.backlight(true);
            } catch (e) {
            }
        }
    }

    // ---------- Rekord-Pokal ----------
    function showPr(n, d) {
        prName = n;
        prText = d;
        prStart = System.getTimer();
        if (Attention has :vibrate) {
            Attention.vibrate([
                new Attention.VibeProfile(70, 120), new Attention.VibeProfile(0, 80),
                new Attention.VibeProfile(70, 120), new Attention.VibeProfile(0, 80),
                new Attention.VibeProfile(100, 500)
            ]);
        }
        light();
        anim.stop();
        anim.start(method(:animTick), 50, true);
        WatchUi.requestUpdate();
    }

    function prAge() {
        return prStart == 0 ? -1 : System.getTimer() - prStart;
    }

    function prActive() {
        var a = prAge();
        return a >= 0 && a < 4000;
    }

    function animTick() {
        if (!prActive()) {
            anim.stop();
            prStart = 0;
        }
        WatchUi.requestUpdate();
    }

    function closePr() {
        prStart = 0;
        anim.stop();
        WatchUi.requestUpdate();
    }

    // ---------- Senden ----------
    function flush() {
        if (sending || !dirty) {
            return;
        }
        sending = true;
        lastTry = now();
        sentN = log.size();
        try {
            Communications.transmit({"t" => "done", "w" => wid, "d" => log}, null, new TxListener(self, 1));
        } catch (e) {
            sending = false;
        }
    }

    function sent(ok, kind) {
        if (kind == 1) {
            sending = false;
            if (ok) {
                phoneSeen = true;
                if (sentN >= log.size()) {
                    dirty = false;
                }
                persist();
                flush();
            }
        } else if (kind == 2 || kind == 3) {
            wsending = false;
            if (ok) {
                phoneSeen = true;
                if (kind == 3) {
                    wend = false;
                    wdirty = false;
                } else if (sentN >= wlog.size()) {
                    wdirty = false;
                }
                persist();
            }
        }
    }

    // ---------- Aktivität und FIT-Felder ----------
    function startSession(wake) {
        if (session != null || !(Toybox has :ActivityRecording)) {
            return;
        }
        try {
            if (wake) {
                session = ActivityRecording.createSession({:name => "Wakeboard", :sport => Activity.SPORT_WAKEBOARDING});
            } else {
                session = ActivityRecording.createSession({
                    :name => "Krafttraining",
                    :sport => Activity.SPORT_TRAINING,
                    :subSport => Activity.SUB_SPORT_STRENGTH_TRAINING
                });
                vol = 0.0;
                nSets = 0;
                try {
                    fW = session.createField("Gewicht", 0, FitContributor.DATA_TYPE_FLOAT, {:mesgType => FitContributor.MESG_TYPE_RECORD, :units => "kg"});
                    fR = session.createField("Wiederholungen", 1, FitContributor.DATA_TYPE_UINT16, {:mesgType => FitContributor.MESG_TYPE_RECORD, :units => "Wdh"});
                    fVol = session.createField("Volumen", 2, FitContributor.DATA_TYPE_FLOAT, {:mesgType => FitContributor.MESG_TYPE_SESSION, :units => "kg"});
                    fSets = session.createField("Saetze", 3, FitContributor.DATA_TYPE_UINT16, {:mesgType => FitContributor.MESG_TYPE_SESSION, :units => "Saetze"});
                } catch (e) {
                    fW = null;
                }
            }
            session.start();
        } catch (e) {
            session = null;
        }
    }

    function fitSet(kg, reps) {
        if (fW == null) {
            return;
        }
        try {
            var k = kg == null ? 0.0 : kg.toFloat();
            fW.setData(k);
            fR.setData(reps);
            nSets++;
            if (k > 0 && reps > 0) {
                vol += k * reps;
            }
            fVol.setData(vol);
            fSets.setData(nSets);
        } catch (e) {
        }
    }

    function endSession(save) {
        if (state == :wake) {
            if (save) {
                wend = true;
                wflush();
            }
        }
        if (session != null) {
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
        }
        session = null;
        fW = null;
        queue = [];
        state = :wait;
        doneKeys = {};
        log = [];
        dirty = false;
        persist();
    }

    // ---------- Wake-Modus ----------
    function startWake() {
        state = :wake;
        wlog = [];
        wsid = "w" + now().toString();
        wStart = now();
        wdirty = false;
        wend = false;
        if (wl.size() == 0) {
            var s = null;
            try {
                s = Application.Storage.getValue("wl");
            } catch (e) {
            }
            wl = s instanceof Array ? s : [];
        }
        wi = 0;
        try {
            Communications.transmit({"t" => "wk?"}, null, new TxListener(self, 0));
        } catch (e) {
        }
        startSession(true);
        persist();
        WatchUi.requestUpdate();
    }

    function wakeTrick() {
        return wl.size() > 0 && wi < wl.size() ? wl[wi] : null;
    }

    function wakeMove(dir) {
        if (state != :wake || wl.size() == 0) {
            return;
        }
        wi = (wi + dir + wl.size()) % wl.size();
        WatchUi.requestUpdate();
    }

    function wakeTry(landed) {
        if (state != :wake) {
            return;
        }
        var t = wakeTrick();
        var id = t != null && t["id"] != null ? t["id"] : "";
        var k = t != null && t["k"] != null ? t["k"] : "s";
        wlog.add([id, k, landed ? 1 : 0, now()]);
        wdirty = true;
        if (Attention has :vibrate) {
            Attention.vibrate([new Attention.VibeProfile(landed ? 80 : 40, landed ? 150 : 60)]);
        }
        wflush();
        persist();
        WatchUi.requestUpdate();
    }

    function wakeUndo() {
        if (wlog.size() > 0) {
            wlog = wlog.slice(0, wlog.size() - 1);
            wdirty = true; // Handy zählt nur neue Einträge dazu, Zurücknehmen gilt auf der Uhr
            persist();
            WatchUi.requestUpdate();
        }
    }

    function wakeCount(idx) {
        var t = idx < wl.size() ? wl[idx] : null;
        var a = 0, l = 0;
        for (var j = 0; j < wlog.size(); j++) {
            var e = wlog[j];
            if (t == null || (e[0].equals(t["id"]) && e[1].equals(t["k"]))) {
                a++;
                l += e[2];
            }
        }
        return [l, a];
    }

    function wflush() {
        if (wsending || (!wdirty && !wend)) {
            return;
        }
        wsending = true;
        lastTry = now();
        sentN = wlog.size();
        var d = {"t" => wend ? "wend" : "wake", "w" => wsid, "d" => wlog};
        if (wend) {
            d["min"] = ((now() - wStart) / 60).toNumber();
            d["laps"] = wlog.size();
        }
        try {
            Communications.transmit(d, null, new TxListener(self, wend ? 3 : 2));
        } catch (e) {
            wsending = false;
        }
    }

    // ---------- Speichern ----------
    function stateNum() {
        return state == :set ? 1 : state == :rest ? 2 : state == :done ? 3 : state == :wake ? 4 : 0;
    }

    function persist() {
        try {
            Application.Storage.setValue("st", {
                "q" => queue, "s" => stateNum(), "re" => restEnd, "rt" => restTotal,
                "n" => title, "w" => wid, "l" => log, "dt" => dirty, "ts" => now(),
                "wl" => wlog, "ws" => wsid, "wt" => wStart, "wd" => wdirty, "we" => wend
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
        wlog = d["wl"] instanceof Array ? d["wl"] : [];
        wsid = d["ws"] != null ? d["ws"] : "";
        wStart = d["wt"] != null ? d["wt"] : now();
        wdirty = d["wd"] == true;
        wend = d["we"] == true;
        var s = d["s"];
        state = s == 1 ? :set : s == 2 ? :rest : s == 3 ? :done : :wait;
        if (state == :rest && restEnd <= now()) {
            state = queue.size() > 0 ? :set : :done;
        }
        for (var k = 0; k < log.size(); k++) {
            doneKeys[key(log[k][0], log[k][1])] = log[k][2];
        }
        try {
            var w = Application.Storage.getValue("wl");
            wl = w instanceof Array ? w : [];
        } catch (e) {
        }
        syncHead();
    }
}

class TxListener extends Communications.ConnectionListener {
    var m;
    var kind;

    function initialize(model, k) {
        ConnectionListener.initialize();
        m = model;
        kind = k;
    }

    function onComplete() {
        m.sent(true, kind);
    }

    function onError() {
        m.sent(false, kind);
    }
}
