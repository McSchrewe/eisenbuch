package de.eisenbuch.app;

import android.app.AlarmManager;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.graphics.Color;
import android.os.Build;
import androidx.core.app.NotificationCompat;
import androidx.core.app.NotificationManagerCompat;
import org.json.JSONArray;
import org.json.JSONObject;

/** Zustand und Ablauf der Uhr-Satzschleife. Läuft auch, wenn die App im Hintergrund oder beendet ist. */
final class WatchLoop {
    static final String CH = "eb_watch";
    static final int NID = 9101;
    static final String ACT_ALERT = "de.eisenbuch.app.WATCH_ALERT";
    static final String ACT_DONE = "de.eisenbuch.app.WATCH_DONE";
    private static final Object LOCK = new Object();

    private WatchLoop() {}

    private static SharedPreferences sp(Context c) { return c.getSharedPreferences("eb_watch", Context.MODE_PRIVATE); }

    private static JSONArray arr(SharedPreferences p, String k) {
        try { return new JSONArray(p.getString(k, "[]")); } catch (Exception e) { return new JSONArray(); }
    }

    private static String key(JSONObject o) { return o == null ? "" : o.optInt("i", -1) + ":" + o.optInt("s", -1); }

    static void arm(Context c, JSONArray q, long at) {
        synchronized (LOCK) {
            SharedPreferences p = sp(c);
            cancelAlarm(c);
            if (q.length() == 0) { p.edit().putString("queue", "[]").putLong("next", 0).putString("shown", "").apply(); cancelNote(c); return; }
            String head = key(q.optJSONObject(0)), shown = p.getString("shown", "");
            p.edit().putString("queue", q.toString()).apply();
            if (at > System.currentTimeMillis() + 500) {
                if (!head.equals(shown)) { cancelNote(c); p.edit().putString("shown", "").apply(); }
                schedule(c, at);
            } else {
                p.edit().putLong("next", 0).apply();
                post(c);
            }
        }
    }

    static void disarm(Context c) {
        synchronized (LOCK) {
            cancelAlarm(c); cancelNote(c);
            sp(c).edit().putString("queue", "[]").putLong("next", 0).putString("shown", "").apply();
        }
    }

    static JSONArray takeDone(Context c) {
        synchronized (LOCK) {
            SharedPreferences p = sp(c);
            JSONArray d = arr(p, "done");
            p.edit().putString("done", "[]").apply();
            return d;
        }
    }

    static long nextAt(Context c) { return sp(c).getLong("next", 0); }

    /** Alarm: Pause vorbei, ersten Satz der Liste anzeigen */
    static void onAlert(Context c) {
        synchronized (LOCK) { sp(c).edit().putLong("next", 0).apply(); post(c); }
    }

    /** „✓ Geschafft“: Satz merken, Liste weiterschalten, nächste Pause starten */
    static void onDone(Context c, int i, int s) {
        synchronized (LOCK) {
            SharedPreferences p = sp(c);
            JSONArray q = arr(p, "queue");
            int idx = -1;
            for (int k = 0; k < q.length(); k++) { JSONObject o = q.optJSONObject(k); if (o != null && o.optInt("i", -1) == i && o.optInt("s", -1) == s) { idx = k; break; } }
            cancelNote(c);
            if (idx < 0) { p.edit().putString("shown", "").apply(); return; } /* veraltete Benachrichtigung */
            JSONObject cur = q.optJSONObject(idx);
            JSONArray d = arr(p, "done"), rest = new JSONArray();
            try { JSONObject ev = new JSONObject(); ev.put("i", i); ev.put("s", s); ev.put("t", System.currentTimeMillis()); d.put(ev); } catch (Exception ignored) {}
            for (int k = idx + 1; k < q.length(); k++) rest.put(q.opt(k));
            p.edit().putString("done", d.toString()).putString("queue", rest.toString()).putString("shown", "").apply();
            if (rest.length() > 0) {
                long r = cur.optLong("rest", 90000);
                if (r <= 1000) post(c); else schedule(c, System.currentTimeMillis() + r);
            } else p.edit().putLong("next", 0).apply();
        }
        WatchPlugin.emitDone();
    }

    private static PendingIntent alertPi(Context c) {
        Intent it = new Intent(c, WatchReceiver.class).setAction(ACT_ALERT);
        return PendingIntent.getBroadcast(c, NID, it, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
    }

    private static void schedule(Context c, long at) {
        AlarmManager am = (AlarmManager) c.getSystemService(Context.ALARM_SERVICE);
        sp(c).edit().putLong("next", at).apply();
        if (am == null) return;
        PendingIntent pi = alertPi(c);
        try {
            if (Build.VERSION.SDK_INT >= 31 && !am.canScheduleExactAlarms()) am.setAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, at, pi);
            else if (Build.VERSION.SDK_INT >= 23) am.setExactAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, at, pi);
            else am.setExact(AlarmManager.RTC_WAKEUP, at, pi);
        } catch (SecurityException e) {
            am.set(AlarmManager.RTC_WAKEUP, at, pi);
        }
    }

    private static void cancelAlarm(Context c) {
        AlarmManager am = (AlarmManager) c.getSystemService(Context.ALARM_SERVICE);
        if (am != null) am.cancel(alertPi(c));
    }

    private static void cancelNote(Context c) { NotificationManagerCompat.from(c).cancel(NID); }

    private static void channel(Context c) {
        if (Build.VERSION.SDK_INT < 26) return;
        NotificationManager nm = (NotificationManager) c.getSystemService(Context.NOTIFICATION_SERVICE);
        if (nm == null || nm.getNotificationChannel(CH) != null) return;
        NotificationChannel ch = new NotificationChannel(CH, "Uhr: nächster Satz", NotificationManager.IMPORTANCE_HIGH);
        ch.setDescription("Pausenende mit Gewicht und Wiederholungen, bestätigen mit „✓ Geschafft“ auf Handy oder Uhr");
        ch.enableVibration(true);
        ch.setVibrationPattern(new long[]{0, 300, 150, 300});
        ch.setLockscreenVisibility(android.app.Notification.VISIBILITY_PUBLIC);
        nm.createNotificationChannel(ch);
    }

    /** Ersten Satz der Liste als Benachrichtigung zeigen. Gleicher Satz erneut: still aktualisieren, kein zweites Vibrieren */
    private static void post(Context c) {
        SharedPreferences p = sp(c);
        JSONArray q = arr(p, "queue");
        JSONObject o = q.optJSONObject(0);
        if (o == null) { cancelNote(c); return; }
        channel(c);
        String k = key(o);
        boolean same = k.equals(p.getString("shown", ""));
        Intent di = new Intent(c, WatchReceiver.class).setAction(ACT_DONE).putExtra("i", o.optInt("i")).putExtra("s", o.optInt("s"));
        PendingIntent done = PendingIntent.getBroadcast(c, NID + 1, di, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
        Intent open = c.getPackageManager().getLaunchIntentForPackage(c.getPackageName());
        PendingIntent oi = open == null ? null : PendingIntent.getActivity(c, NID + 2, open, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
        NotificationCompat.Builder b = new NotificationCompat.Builder(c, CH)
            .setSmallIcon(R.drawable.ic_stat_eisenbuch)
            .setColor(Color.parseColor("#1F55C4"))
            .setContentTitle(o.optString("title", "Nächster Satz"))
            .setContentText(o.optString("body", ""))
            .setStyle(new NotificationCompat.BigTextStyle().bigText(o.optString("body", "")))
            .setPriority(NotificationCompat.PRIORITY_HIGH)
            .setCategory(NotificationCompat.CATEGORY_REMINDER)
            .setVisibility(NotificationCompat.VISIBILITY_PUBLIC)
            .setVibrate(new long[]{0, 300, 150, 300})
            .setOnlyAlertOnce(same)
            .setAutoCancel(true)
            .addAction(0, "✓ Geschafft", done)
            .extend(new NotificationCompat.WearableExtender().addAction(new NotificationCompat.Action.Builder(0, "✓ Geschafft", done).build()));
        if (oi != null) b.setContentIntent(oi);
        try { NotificationManagerCompat.from(c).notify(NID, b.build()); p.edit().putString("shown", k).apply(); }
        catch (SecurityException ignored) { /* Benachrichtigungen nicht erlaubt */ }
    }
}
