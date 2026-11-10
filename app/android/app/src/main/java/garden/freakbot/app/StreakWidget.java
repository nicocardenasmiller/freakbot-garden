package garden.freakbot.app;

import android.app.PendingIntent;
import android.appwidget.AppWidgetManager;
import android.appwidget.AppWidgetProvider;
import android.content.ComponentName;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.widget.RemoteViews;
import java.text.ParseException;
import java.text.SimpleDateFormat;
import java.util.Calendar;
import java.util.Date;
import java.util.Locale;

public class StreakWidget extends AppWidgetProvider {
    static final String PREFS = "freakbot_widget";

    static void refresh(Context context) {
        AppWidgetManager manager = AppWidgetManager.getInstance(context);
        int[] ids = manager.getAppWidgetIds(new ComponentName(context, StreakWidget.class));
        for (int id : ids) {
            manager.updateAppWidget(id, render(context));
        }
    }

    @Override
    public void onUpdate(Context context, AppWidgetManager manager, int[] ids) {
        for (int id : ids) {
            manager.updateAppWidget(id, render(context));
        }
    }

    private static RemoteViews render(Context context) {
        SharedPreferences prefs = context.getSharedPreferences(PREFS, Context.MODE_PRIVATE);
        String today = dayFormat().format(new Date());
        boolean known = prefs.getBoolean("known", false);
        boolean done = today.equals(prefs.getString("doneDay", ""));
        int streak = liveStreak(prefs, today);
        int hour = Calendar.getInstance().get(Calendar.HOUR_OF_DAY);
        boolean asleep = hour >= 21 || hour < 5;

        RemoteViews views = new RemoteViews(context.getPackageName(), R.layout.streak_widget);
        views.setImageViewResource(R.id.widget_bot, asleep ? R.drawable.widget_bot_sleep : R.drawable.widget_bot);
        views.setTextViewText(R.id.widget_streak, String.valueOf(streak));
        views.setTextViewText(R.id.widget_status, !known ? "Open Freakbot" : done ? "Watered today" : "Water today");

        Intent open = new Intent(context, MainActivity.class).setFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
        PendingIntent tap = PendingIntent.getActivity(context, 0, open, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
        views.setOnClickPendingIntent(R.id.widget_root, tap);
        return views;
    }

    /** Applies days missed since the app last ran, the same way the app's streak rule does. */
    private static int liveStreak(SharedPreferences prefs, String today) {
        int streak = prefs.getInt("streak", 0);
        String lastDay = prefs.getString("lastDay", "");
        if (lastDay == null || lastDay.isEmpty()) {
            return streak;
        }
        try {
            long gap = daysBetween(lastDay, today);
            return gap - 1 > prefs.getInt("freezes", 0) ? 0 : streak;
        } catch (ParseException e) {
            return streak;
        }
    }

    private static long daysBetween(String from, String to) throws ParseException {
        SimpleDateFormat format = dayFormat();
        return Math.round((format.parse(to).getTime() - format.parse(from).getTime()) / 86400000.0);
    }

    private static SimpleDateFormat dayFormat() {
        return new SimpleDateFormat("yyyy-MM-dd", Locale.US);
    }
}
