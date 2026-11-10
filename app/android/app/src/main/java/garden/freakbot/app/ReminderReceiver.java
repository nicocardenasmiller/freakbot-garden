package garden.freakbot.app;

import android.app.AlarmManager;
import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.os.Build;
import java.text.SimpleDateFormat;
import java.util.Calendar;
import java.util.Date;
import java.util.Locale;

/** Checks at 19:35 each day and only nudges when today's cards are not done. */
public class ReminderReceiver extends BroadcastReceiver {
    static final String ACTION_REMIND = "garden.freakbot.app.REMIND";
    private static final String CHANNEL = "daily_reminder";
    private static final int HOUR = 19;
    private static final int MINUTE = 35;

    private static final String[] WITH_STREAK = {
        "wepa, pana. racha de %d y las matas con sed. dale po.",
        "pucha, la racha de %d no se cuida sola. son 3 cartas.",
        "oye, racha de %d. riega un poquito y listo, cachai.",
    };
    private static final String[] NO_STREAK = {
        "las matas te esperan, pana. 3 cartas y listo.",
        "dale po, son 3 minutos. yo traigo la regadera.",
        "oye, hoy se puede empezar una racha. bacán, no?",
    };

    @Override
    public void onReceive(Context context, Intent intent) {
        if (ACTION_REMIND.equals(intent.getAction())) {
            remind(context);
        }
        schedule(context);
        StreakWidget.refresh(context);
    }

    static void schedule(Context context) {
        Calendar next = Calendar.getInstance();
        next.set(Calendar.HOUR_OF_DAY, HOUR);
        next.set(Calendar.MINUTE, MINUTE);
        next.set(Calendar.SECOND, 0);
        next.set(Calendar.MILLISECOND, 0);
        if (next.getTimeInMillis() <= System.currentTimeMillis()) {
            next.add(Calendar.DAY_OF_YEAR, 1);
        }
        Intent intent = new Intent(context, ReminderReceiver.class).setAction(ACTION_REMIND);
        PendingIntent pending = PendingIntent.getBroadcast(context, 1, intent, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
        AlarmManager alarms = (AlarmManager) context.getSystemService(Context.ALARM_SERVICE);
        alarms.setAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, next.getTimeInMillis(), pending);
    }

    private static void remind(Context context) {
        SharedPreferences prefs = context.getSharedPreferences(StreakWidget.PREFS, Context.MODE_PRIVATE);
        String today = new SimpleDateFormat("yyyy-MM-dd", Locale.US).format(new Date());
        if (!prefs.getBoolean("known", false) || today.equals(prefs.getString("doneDay", ""))) {
            return;
        }
        NotificationManager manager = (NotificationManager) context.getSystemService(Context.NOTIFICATION_SERVICE);
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            manager.createNotificationChannel(new NotificationChannel(CHANNEL, "Daily reminder", NotificationManager.IMPORTANCE_DEFAULT));
        }
        Intent open = new Intent(context, MainActivity.class).setFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
        PendingIntent tap = PendingIntent.getActivity(context, 2, open, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
        Notification.Builder builder = Build.VERSION.SDK_INT >= Build.VERSION_CODES.O
            ? new Notification.Builder(context, CHANNEL)
            : new Notification.Builder(context);
        manager.notify(1, builder
            .setSmallIcon(R.drawable.ic_stat_freakbot)
            .setContentTitle("Freakbot")
            .setContentText(line(StreakWidget.liveStreak(prefs, today)))
            .setContentIntent(tap)
            .setAutoCancel(true)
            .build());
    }

    private static String line(int streak) {
        int day = Calendar.getInstance().get(Calendar.DAY_OF_YEAR);
        String[] lines = streak > 0 ? WITH_STREAK : NO_STREAK;
        return String.format(Locale.US, lines[day % lines.length], streak);
    }
}
