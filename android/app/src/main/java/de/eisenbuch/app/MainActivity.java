package de.eisenbuch.app;

import android.graphics.Color;
import android.os.Bundle;
import androidx.core.view.WindowCompat;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        // Inhalt unterhalb von Status- und Navigationsleiste anordnen, nicht dahinter
        WindowCompat.setDecorFitsSystemWindows(getWindow(), true);
        getWindow().setStatusBarColor(Color.parseColor("#1F55C4"));
        getWindow().setNavigationBarColor(Color.parseColor("#12161A"));
    }
}
