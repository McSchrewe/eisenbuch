package de.eisenbuch.app;

import android.os.Build;
import com.getcapacitor.JSObject;
import com.getcapacitor.PermissionState;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.getcapacitor.annotation.Permission;
import com.getcapacitor.annotation.PermissionCallback;

/**
 * Health Connect (Android 14+): Schlaf und Herzfrequenz lesen, z. B. von der Garmin-Uhr über Garmin Connect.
 * Nur lesen, nichts schreiben. Daten bleiben auf dem Gerät.
 */
@CapacitorPlugin(name = "Health", permissions = {
    @Permission(alias = "health", strings = {
        "android.permission.health.READ_SLEEP",
        "android.permission.health.READ_HEART_RATE",
        "android.permission.health.READ_RESTING_HEART_RATE"
    })
})
public class HealthPlugin extends Plugin {

    private boolean supported() { return Build.VERSION.SDK_INT >= 34 && HealthReader.present(getContext()); }

    @PluginMethod
    public void status(PluginCall call) {
        JSObject r = new JSObject();
        boolean ok = supported();
        r.put("available", ok);
        r.put("sdk", Build.VERSION.SDK_INT);
        r.put("granted", ok && getPermissionState("health") == PermissionState.GRANTED);
        call.resolve(r);
    }

    @PluginMethod
    public void request(PluginCall call) {
        if (!supported()) { JSObject r = new JSObject(); r.put("granted", false); r.put("available", false); call.resolve(r); return; }
        if (getPermissionState("health") == PermissionState.GRANTED) { JSObject r = new JSObject(); r.put("granted", true); r.put("available", true); call.resolve(r); return; }
        requestPermissionForAlias("health", call, "permCb");
    }

    @PermissionCallback
    private void permCb(PluginCall call) {
        JSObject r = new JSObject();
        r.put("available", true);
        r.put("granted", getPermissionState("health") == PermissionState.GRANTED);
        call.resolve(r);
    }

    /** Nächte der letzten `days` Tage: Schlafdauer und niedrige Herzfrequenz im Schlaf, dazu Ruhepuls-Einträge */
    @PluginMethod
    public void nights(PluginCall call) {
        if (!supported()) { call.reject("Health Connect nicht verfügbar"); return; }
        if (getPermissionState("health") != PermissionState.GRANTED) { call.reject("Keine Berechtigung"); return; }
        final int days = call.getInt("days", 15);
        new Thread(() -> {
            try { call.resolve(HealthReader.nights(getContext(), days)); }
            catch (Exception e) { call.reject("Lesen fehlgeschlagen: " + e.getMessage()); }
        }).start();
    }
}
