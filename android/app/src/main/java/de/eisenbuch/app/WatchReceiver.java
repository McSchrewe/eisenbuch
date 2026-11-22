package de.eisenbuch.app;

import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;

/** Empfängt Pausen-Alarm und „✓ Geschafft“ (von Handy oder Uhr), ohne die App zu öffnen */
public class WatchReceiver extends BroadcastReceiver {
    @Override
    public void onReceive(Context c, Intent it) {
        if (it == null || it.getAction() == null) return;
        if (WatchLoop.ACT_ALERT.equals(it.getAction())) WatchLoop.onAlert(c);
        else if (WatchLoop.ACT_DONE.equals(it.getAction())) WatchLoop.onDone(c, it.getIntExtra("i", -1), it.getIntExtra("s", -1));
    }
}
