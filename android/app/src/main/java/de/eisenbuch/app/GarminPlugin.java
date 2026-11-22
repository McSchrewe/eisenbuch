package de.eisenbuch.app;

import com.garmin.android.connectiq.ConnectIQ;
import com.garmin.android.connectiq.IQApp;
import com.garmin.android.connectiq.IQDevice;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.Iterator;
import java.util.List;
import java.util.Map;
import org.json.JSONArray;
import org.json.JSONObject;

/**
 * Verbindung zur Eisenbuch-App auf der Garmin-Uhr (Connect IQ) über Garmin Connect.
 * send(): Satzliste und Pause an die Uhr. Ereignis "msg": Nachrichten der Uhr (hi, done) an die Web-App.
 */
@CapacitorPlugin(name = "Garmin")
public class GarminPlugin extends Plugin {
    static final String APP_ID = "cf31de923ead4b8e8242191afea39114";
    private ConnectIQ ciq;
    private boolean ready = false;
    private String err = "";
    private final IQApp app = new IQApp(APP_ID);
    private final List<IQDevice> registered = new ArrayList<>();

    @Override
    public void load() {
        try {
            ciq = ConnectIQ.getInstance(getContext(), ConnectIQ.IQConnectType.WIRELESS);
            ciq.initialize(getContext(), false, new ConnectIQ.ConnectIQListener() {
                @Override public void onSdkReady() { ready = true; err = ""; registerAll(); }
                @Override public void onInitializeError(ConnectIQ.IQSdkErrorStatus s) { ready = false; err = s == null ? "init" : s.name(); }
                @Override public void onSdkShutDown() { ready = false; }
            });
        } catch (Throwable t) {
            err = String.valueOf(t.getMessage());
        }
    }

    @Override
    protected void handleOnDestroy() {
        try { if (ciq != null) { ciq.unregisterAllForEvents(); ciq.shutdown(getContext()); } } catch (Throwable ignored) {}
    }

    /** Für alle bekannten Uhren auf Nachrichten der Eisenbuch-Uhr-App hören */
    private void registerAll() {
        if (!ready || ciq == null) return;
        try {
            for (IQDevice d : ciq.getKnownDevices()) {
                boolean seen = false;
                for (IQDevice r : registered) if (r.getDeviceIdentifier() == d.getDeviceIdentifier()) seen = true;
                if (seen) continue;
                registered.add(d);
                ciq.registerForDeviceEvents(d, (dev, st) -> {
                    JSObject o = new JSObject();
                    o.put("device", dev.getFriendlyName());
                    o.put("status", st == null ? "UNKNOWN" : st.name());
                    notifyListeners("device", o);
                });
                ciq.registerForAppEvents(d, app, (dev, a, msg, status) -> {
                    if (msg == null) return;
                    for (Object m : msg) {
                        JSObject o = new JSObject();
                        o.put("device", dev.getFriendlyName());
                        o.put("data", toJson(m));
                        notifyListeners("msg", o, true);
                    }
                });
            }
        } catch (Throwable t) {
            err = String.valueOf(t.getMessage());
        }
    }

    private List<IQDevice> connected() {
        List<IQDevice> out = new ArrayList<>();
        if (!ready || ciq == null) return out;
        try {
            for (IQDevice d : ciq.getKnownDevices()) {
                IQDevice.IQDeviceStatus st = ciq.getDeviceStatus(d);
                if (st == IQDevice.IQDeviceStatus.CONNECTED) out.add(d);
            }
        } catch (Throwable t) { err = String.valueOf(t.getMessage()); }
        return out;
    }

    @PluginMethod
    public void status(PluginCall call) {
        registerAll();
        JSObject r = new JSObject();
        r.put("ready", ready);
        r.put("error", err);
        JSONArray ds = new JSONArray();
        for (IQDevice d : connected()) ds.put(d.getFriendlyName());
        r.put("devices", ds);
        call.resolve(r);
    }

    /** data: JSON-Objekt, wird als Dictionary an die Uhr-App geschickt */
    @PluginMethod
    public void send(PluginCall call) {
        JSObject data = call.getObject("data");
        if (data == null) { call.reject("keine Daten"); return; }
        registerAll();
        List<IQDevice> ds = connected();
        if (ds.isEmpty()) { JSObject r = new JSObject(); r.put("sent", 0); r.put("error", ready ? "keine Uhr verbunden" : err); call.resolve(r); return; }
        Object payload = fromJson(data);
        final int[] left = {ds.size()};
        final JSONArray res = new JSONArray();
        for (IQDevice d : ds) {
            try {
                ciq.sendMessage(d, app, payload, (dev, a, st) -> {
                    synchronized (res) {
                        res.put(st == null ? "UNKNOWN" : st.name());
                        if (--left[0] == 0) { JSObject r = new JSObject(); r.put("sent", res.length()); r.put("status", res); call.resolve(r); }
                    }
                });
            } catch (Throwable t) {
                synchronized (res) {
                    res.put("ERROR " + t.getMessage());
                    if (--left[0] == 0) { JSObject r = new JSObject(); r.put("sent", res.length()); r.put("status", res); call.resolve(r); }
                }
            }
        }
    }

    /** Uhr fragt den Nutzer, ob die Eisenbuch-App geöffnet werden soll */
    @PluginMethod
    public void open(PluginCall call) {
        registerAll();
        List<IQDevice> ds = connected();
        if (ds.isEmpty()) { JSObject r = new JSObject(); r.put("status", "NO_DEVICE"); call.resolve(r); return; }
        try {
            ciq.openApplication(ds.get(0), app, (dev, a, st) -> { JSObject r = new JSObject(); r.put("status", st == null ? "UNKNOWN" : st.name()); call.resolve(r); });
        } catch (Throwable t) { call.reject(String.valueOf(t.getMessage())); }
    }

    /** Ist die Uhr-App installiert? */
    @PluginMethod
    public void installed(PluginCall call) {
        registerAll();
        List<IQDevice> ds = connected();
        if (ds.isEmpty()) { JSObject r = new JSObject(); r.put("installed", false); r.put("device", false); call.resolve(r); return; }
        try {
            ciq.getApplicationInfo(APP_ID, ds.get(0), new ConnectIQ.IQApplicationInfoListener() {
                @Override public void onApplicationInfoReceived(IQApp a) { JSObject r = new JSObject(); r.put("installed", true); r.put("device", true); r.put("version", a.version()); call.resolve(r); }
                @Override public void onApplicationNotInstalled(String id) { JSObject r = new JSObject(); r.put("installed", false); r.put("device", true); call.resolve(r); }
            });
        } catch (Throwable t) { call.reject(String.valueOf(t.getMessage())); }
    }

    /* ----- Umwandlung JSON <-> Map/List für Connect IQ (Zahlen als Integer bzw. Double) ----- */
    private static Object fromJson(Object v) {
        try {
            if (v instanceof JSONObject) {
                JSONObject o = (JSONObject) v;
                Map<String, Object> m = new HashMap<>();
                Iterator<String> it = o.keys();
                while (it.hasNext()) { String k = it.next(); if (!o.isNull(k)) m.put(k, fromJson(o.get(k))); }
                return m;
            }
            if (v instanceof JSONArray) {
                JSONArray a = (JSONArray) v;
                List<Object> l = new ArrayList<>();
                for (int i = 0; i < a.length(); i++) l.add(a.isNull(i) ? "" : fromJson(a.get(i)));
                return l;
            }
            if (v instanceof Long) { long x = (Long) v; return x <= Integer.MAX_VALUE && x >= Integer.MIN_VALUE ? (Object) (int) x : (Object) x; }
            if (v instanceof Double) { double x = (Double) v; if (x == Math.rint(x) && Math.abs(x) < Integer.MAX_VALUE) return (int) x; return x; }
            return v;
        } catch (Exception e) {
            return "";
        }
    }

    private static Object toJson(Object v) {
        try {
            if (v instanceof Map) {
                JSONObject o = new JSONObject();
                for (Map.Entry<?, ?> e : ((Map<?, ?>) v).entrySet()) o.put(String.valueOf(e.getKey()), toJson(e.getValue()));
                return o;
            }
            if (v instanceof List) {
                JSONArray a = new JSONArray();
                for (Object x : (List<?>) v) a.put(toJson(x));
                return a;
            }
            return v == null ? JSONObject.NULL : v;
        } catch (Exception e) {
            return JSONObject.NULL;
        }
    }
}
