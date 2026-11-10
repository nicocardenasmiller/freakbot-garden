package garden.freakbot.app;

import android.os.Bundle;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(FreakbotWidgetPlugin.class);
        super.onCreate(savedInstanceState);
    }
}
