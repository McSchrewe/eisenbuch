package de.eisenbuch.app;

import android.content.Context;
import android.health.connect.HealthConnectException;
import android.health.connect.HealthConnectManager;
import android.health.connect.ReadRecordsRequestUsingFilters;
import android.health.connect.ReadRecordsResponse;
import android.health.connect.TimeInstantRangeFilter;
import android.health.connect.datatypes.HeartRateRecord;
import android.health.connect.datatypes.Record;
import android.health.connect.datatypes.RestingHeartRateRecord;
import android.health.connect.datatypes.SleepSessionRecord;
import android.os.OutcomeReceiver;
import androidx.annotation.RequiresApi;
import com.getcapacitor.JSArray;
import com.getcapacitor.JSObject;
import java.time.Duration;
import java.time.Instant;
import java.time.ZoneId;
import java.util.ArrayList;
import java.util.Collections;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.Executor;
import java.util.concurrent.Executors;
import java.util.concurrent.TimeUnit;

/** Liest Health Connect über die System-API (Android 14+). Wird nur aufgerufen, wenn SDK >= 34. */
@RequiresApi(34)
final class HealthReader {
    private static final Executor EX = Executors.newSingleThreadExecutor();

    private HealthReader() {}

    static boolean present(Context c) {
        try { return c.getSystemService(HealthConnectManager.class) != null; } catch (Throwable t) { return false; }
    }

    private static <T extends Record> List<T> read(HealthConnectManager m, Class<T> cls, Instant a, Instant b) throws Exception {
        List<T> out = new ArrayList<>();
        long token = -1;
        for (int page = 0; page < 20; page++) {
            ReadRecordsRequestUsingFilters.Builder<T> bl = new ReadRecordsRequestUsingFilters.Builder<>(cls)
                .setTimeRangeFilter(new TimeInstantRangeFilter.Builder().setStartTime(a).setEndTime(b).build())
                .setPageSize(1000);
            if (token != -1) bl.setPageToken(token);
            final CountDownLatch l = new CountDownLatch(1);
            final List<ReadRecordsResponse<T>> res = new ArrayList<>(1);
            final List<Exception> err = new ArrayList<>(1);
            m.readRecords(bl.build(), EX, new OutcomeReceiver<ReadRecordsResponse<T>, HealthConnectException>() {
                @Override public void onResult(ReadRecordsResponse<T> r) { res.add(r); l.countDown(); }
                @Override public void onError(HealthConnectException e) { err.add(e); l.countDown(); }
            });
            if (!l.await(20, TimeUnit.SECONDS)) throw new Exception("Zeitüberschreitung");
            if (!err.isEmpty()) throw err.get(0);
            ReadRecordsResponse<T> r = res.get(0);
            out.addAll(r.getRecords());
            token = r.getNextPageToken();
            if (token == -1) break;
        }
        return out;
    }

    private static boolean awake(int type) { return type == 1 || type == 3 || type == 7; } /* wach, außerhalb des Betts, wach im Bett */

    static JSObject nights(Context c, int days) throws Exception {
        HealthConnectManager m = c.getSystemService(HealthConnectManager.class);
        Instant now = Instant.now(), from = now.minus(Duration.ofDays(days));
        ZoneId z = ZoneId.systemDefault();
        /* Schlaf: pro Nacht (Datum des Aufwachens) die längste Session ab 3 h */
        Map<String, SleepSessionRecord> best = new HashMap<>();
        for (SleepSessionRecord s : read(m, SleepSessionRecord.class, from, now)) {
            long min = Duration.between(s.getStartTime(), s.getEndTime()).toMinutes();
            if (min < 180) continue;
            String d = s.getEndTime().atZone(z).toLocalDate().toString();
            SleepSessionRecord o = best.get(d);
            if (o == null || Duration.between(o.getStartTime(), o.getEndTime()).toMinutes() < min) best.put(d, s);
        }
        JSArray nights = new JSArray();
        List<String> keys = new ArrayList<>(best.keySet());
        Collections.sort(keys);
        for (String d : keys) {
            SleepSessionRecord s = best.get(d);
            long inBed = Duration.between(s.getStartTime(), s.getEndTime()).toMinutes(), asleep = 0;
            List<SleepSessionRecord.Stage> st = s.getStages();
            if (st == null || st.isEmpty()) asleep = inBed;
            else for (SleepSessionRecord.Stage g : st) if (!awake(g.getType())) asleep += Duration.between(g.getStartTime(), g.getEndTime()).toMinutes();
            List<Long> bpm = new ArrayList<>();
            try {
                for (HeartRateRecord h : read(m, HeartRateRecord.class, s.getStartTime(), s.getEndTime()))
                    for (HeartRateRecord.HeartRateSample x : h.getSamples()) bpm.add(x.getBeatsPerMinute());
            } catch (Exception ignored) {}
            JSObject n = new JSObject();
            n.put("date", d);
            n.put("start", s.getStartTime().toEpochMilli());
            n.put("end", s.getEndTime().toEpochMilli());
            n.put("inBed", inBed);
            n.put("asleep", asleep);
            if (bpm.size() >= 10) {
                Collections.sort(bpm);
                long sum = 0; for (long v : bpm) sum += v;
                n.put("hrLow", bpm.get(bpm.size() / 10)); /* 10. Perzentil: robuster Ruhepuls im Schlaf */
                n.put("hrAvg", Math.round((double) sum / bpm.size()));
                n.put("hrN", bpm.size());
            }
            nights.put(n);
        }
        JSArray resting = new JSArray();
        try {
            for (RestingHeartRateRecord r : read(m, RestingHeartRateRecord.class, from, now)) {
                JSObject o = new JSObject();
                o.put("date", r.getTime().atZone(z).toLocalDate().toString());
                o.put("bpm", r.getBeatsPerMinute());
                resting.put(o);
            }
        } catch (Exception ignored) {}
        JSObject out = new JSObject();
        out.put("nights", nights);
        out.put("resting", resting);
        return out;
    }
}
