package de.eisenbuch.app;

import android.app.AlarmManager;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.content.Context;
import android.content.Intent;
import android.net.Uri;
import android.os.Build;
import android.provider.Settings;
import androidx.core.app.NotificationManagerCompat;
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

    /** Dürfen Benachrichtigungen angezeigt werden? (App-Schalter, Uhr-Kanal, exakte Alarme) */
    @PluginMethod
    public void status(PluginCall call) {
        Context c = getContext();
        boolean app = NotificationManagerCompat.from(c).areNotificationsEnabled(), ch = true, exact = true;
        if (Build.VERSION.SDK_INT >= 26) {
            NotificationManager nm = (NotificationManager) c.getSystemService(Context.NOTIFICATION_SERVICE);
            NotificationChannel n = nm == null ? null : nm.getNotificationChannel(WatchLoop.CH);
            if (n != null && n.getImportance() == NotificationManager.IMPORTANCE_NONE) ch = false;
        }
        if (Build.VERSION.SDK_INT >= 31) {
            AlarmManager am = (AlarmManager) c.getSystemService(Context.ALARM_SERVICE);
            exact = am != null && am.canScheduleExactAlarms();
        }
        JSObject r = new JSObject();
        r.put("enabled", app && ch);
        r.put("app", app);
        r.put("channel", ch);
        r.put("exact", exact);
        call.resolve(r);
    }

    /** Android-Einstellungen für die Benachrichtigungen von Eisenbuch öffnen */
    @PluginMethod
    public void openSettings(PluginCall call) {
        Context c = getContext();
        Intent i;
        if (Build.VERSION.SDK_INT >= 26) i = new Intent(Settings.ACTION_APP_NOTIFICATION_SETTINGS).putExtra(Settings.EXTRA_APP_PACKAGE, c.getPackageName());
        else i = new Intent(Settings.ACTION_APPLICATION_DETAILS_SETTINGS, Uri.parse("package:" + c.getPackageName()));
        i.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
        try { c.startActivity(i); call.resolve(); } catch (Exception e) { call.reject(e.getMessage()); }
    }

    static void emitDone() {
        WatchPlugin p = instance;
        if (p != null) p.notifyListeners("done", new JSObject());
    }
}
