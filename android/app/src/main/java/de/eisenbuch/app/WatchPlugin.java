package de.eisenbuch.app;

import com.getcapacitor.JSArray;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import org.json.JSONArray;

/**
 * Satz-Schleife für die Smartwatch (z. B. Garmin Venu 3).
 * Die App übergibt die Liste der nächsten Sätze. Am Pausenende erscheint eine Benachrichtigung mit Gewicht × Wdh.
 * und der Aktion „✓ Geschafft“. Die Uhr spiegelt sie und vibriert. Ein Tipp auf „Geschafft“ (Uhr oder Handy)
 * wird ohne Öffnen der App gespeichert, die nächste Pause startet sofort. Beim Öffnen holt die App die Sätze ab.
 */
@CapacitorPlugin(name = "Watch")
public class WatchPlugin extends Plugin {
    static WatchPlugin instance;

    @Override
    public void load() { instance = this; }

    @Override
    protected void handleOnDestroy() { if (instance == this) instance = null; }

    /** queue: [{i, s, title, body, rest(ms)}], at: Zeitpunkt (ms) für den ersten Satz, 0 = sofort */
    @PluginMethod
    public void arm(PluginCall call) {
        JSArray q = call.getArray("queue");
        long at = call.getLong("at", 0L);
        WatchLoop.arm(getContext(), q == null ? new JSONArray() : q, at);
        call.resolve();
    }

    @PluginMethod
    public void disarm(PluginCall call) {
        WatchLoop.disarm(getContext());
        call.resolve();
    }

    /** Liefert die auf Uhr/Handy bestätigten Sätze [{i, s, t}] und leert die Liste. next = nächster geplanter Alarm (ms) */
    @PluginMethod
    public void sync(PluginCall call) {
        JSObject r = new JSObject();
        r.put("done", WatchLoop.takeDone(getContext()));
        r.put("next", WatchLoop.nextAt(getContext()));
        call.resolve(r);
    }

    static void emitDone() {
        WatchPlugin p = instance;
        if (p != null) p.notifyListeners("done", new JSObject());
    }
}
