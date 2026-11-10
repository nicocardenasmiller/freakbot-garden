package garden.freakbot.app;

import android.content.Context;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

/** The web app calls this whenever the streak changes, so the widget never needs the sync token. */
@CapacitorPlugin(name = "FreakbotWidget")
public class FreakbotWidgetPlugin extends Plugin {
    @PluginMethod
    public void info(PluginCall call) {
        JSObject result = new JSObject();
        try {
            Context context = getContext();
            result.put("version", context.getPackageManager().getPackageInfo(context.getPackageName(), 0).versionName);
            call.resolve(result);
        } catch (android.content.pm.PackageManager.NameNotFoundException e) {
            call.reject("version unavailable");
        }
    }

    @PluginMethod
    public void update(PluginCall call) {
        Context context = getContext();
        context.getSharedPreferences(StreakWidget.PREFS, Context.MODE_PRIVATE)
            .edit()
            .putBoolean("known", true)
            .putInt("streak", call.getInt("streak", 0))
            .putInt("freezes", call.getInt("freezes", 0))
            .putString("lastDay", call.getString("lastDay", ""))
            .putString("doneDay", call.getString("doneDay", ""))
            .putString("week", call.getString("week", "0000000"))
            .putString("weekEnd", call.getString("weekEnd", ""))
            .putInt("plantSpecies", call.getInt("plantSpecies", -1))
            .putInt("plantColumn", call.getInt("plantColumn", 0))
            .apply();
        StreakWidget.refresh(context);
        call.resolve();
    }
}
