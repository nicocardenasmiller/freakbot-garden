package garden.freakbot.app;

import android.app.PendingIntent;
import android.appwidget.AppWidgetManager;
import android.appwidget.AppWidgetProvider;
import android.content.ComponentName;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.graphics.Bitmap;
import android.graphics.BitmapFactory;
import android.graphics.Color;
import android.os.Bundle;
import android.widget.RemoteViews;
import java.text.ParseException;
import java.text.SimpleDateFormat;
import java.util.Calendar;
import java.util.Date;
import java.util.HashMap;
import java.util.Locale;
import java.util.Map;

/** The widget is drawn as real pixel art on a 2 dp grid, not system text, so it matches the app. */
public class StreakWidget extends AppWidgetProvider {
    static final String PREFS = "freakbot_widget";
    private static final int BASE_W = 85;
    private static final int BASE_H = 40;
    private static final int[][] BAYER = {{0, 8, 2, 10}, {12, 4, 14, 6}, {3, 11, 1, 9}, {15, 7, 13, 5}};
    private static final int HULL = Color.parseColor("#E0E0DA");
    private static final int HULL_DARK = Color.parseColor("#D2D3CD");
    private static final int LIGHT = Color.parseColor("#F8F7F2");
    private static final int INK = Color.parseColor("#1C2028");
    private static final int MUTED = Color.parseColor("#565E6B");
    private static final int LINE = Color.parseColor("#A9ACA8");
    private static final int RED = Color.parseColor("#C4402E");
    private static final int BLUE = Color.parseColor("#2B6CA3");
    private static final int ICE = Color.parseColor("#8DB8DE");
    private static final int YELLOW = Color.parseColor("#E0A92E");
    private static final String[] DROP = {"...#...", "..###..", ".#####.", "#######", "#######", "#######", ".#####.", "..###.."};
    private static final Map<Character, String[]> FONT = new HashMap<>();

    static {
        String[][] glyphs = {
            {"A", "010", "101", "111", "101", "101"}, {"B", "110", "101", "110", "101", "110"}, {"C", "011", "100", "100", "100", "011"},
            {"D", "110", "101", "101", "101", "110"}, {"E", "111", "100", "110", "100", "111"}, {"G", "011", "100", "101", "101", "011"},
            {"H", "101", "101", "111", "101", "101"}, {"I", "111", "010", "010", "010", "111"}, {"L", "100", "100", "100", "100", "111"},
            {"M", "101", "111", "111", "101", "101"}, {"N", "110", "101", "101", "101", "101"}, {"O", "111", "101", "101", "101", "111"},
            {"P", "110", "101", "110", "100", "100"}, {"R", "110", "101", "110", "101", "101"}, {"U", "101", "101", "101", "101", "111"},
            {"V", "101", "101", "101", "101", "010"}, {"Y", "101", "101", "010", "010", "010"}, {"0", "111", "101", "101", "101", "111"},
            {"1", "010", "110", "010", "010", "111"}, {"2", "111", "001", "111", "100", "111"}, {"3", "111", "001", "011", "001", "111"},
            {"4", "101", "101", "111", "001", "001"}, {"5", "111", "100", "111", "001", "111"}, {"6", "111", "100", "111", "101", "111"},
            {"7", "111", "001", "010", "010", "010"}, {"8", "111", "101", "111", "101", "111"}, {"9", "111", "101", "111", "001", "111"},
        };
        for (String[] g : glyphs) {
            FONT.put(g[0].charAt(0), new String[] {g[1], g[2], g[3], g[4], g[5]});
        }
    }

    static void refresh(Context context) {
        AppWidgetManager manager = AppWidgetManager.getInstance(context);
        for (int id : manager.getAppWidgetIds(new ComponentName(context, StreakWidget.class))) {
            manager.updateAppWidget(id, render(context, manager.getAppWidgetOptions(id)));
        }
    }

    @Override
    public void onUpdate(Context context, AppWidgetManager manager, int[] ids) {
        for (int id : ids) {
            manager.updateAppWidget(id, render(context, manager.getAppWidgetOptions(id)));
        }
    }

    @Override
    public void onAppWidgetOptionsChanged(Context context, AppWidgetManager manager, int id, Bundle options) {
        manager.updateAppWidget(id, render(context, options));
    }

    private static RemoteViews render(Context context, Bundle options) {
        int widthDp = Math.max(170, options.getInt(AppWidgetManager.OPTION_APPWIDGET_MIN_WIDTH, 170));
        int heightDp = Math.max(80, options.getInt(AppWidgetManager.OPTION_APPWIDGET_MAX_HEIGHT, 80));
        int zoom = Math.max(1, Math.min(widthDp / 170, heightDp / 80));
        int w = Math.max(BASE_W, widthDp / (2 * zoom));
        int h = Math.max(BASE_H, heightDp / (2 * zoom));
        int scale = Math.max(1, Math.round(2 * zoom * context.getResources().getDisplayMetrics().density));

        Bitmap art = draw(context, w, h);
        RemoteViews views = new RemoteViews(context.getPackageName(), R.layout.streak_widget);
        views.setImageViewBitmap(R.id.widget_art, Bitmap.createScaledBitmap(art, w * scale, h * scale, false));
        Intent open = new Intent(context, MainActivity.class).setFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
        PendingIntent tap = PendingIntent.getActivity(context, 0, open, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
        views.setOnClickPendingIntent(R.id.widget_root, tap);
        return views;
    }

    private static final String[][] SKIES = {
        {"#0E1430", "#182048", "#2A2F5E", "#27406A", "#3F6E8E", "#7FB0B8", "#FFE9B8"},
        {"#070A18", "#0A0E22", "#101636", "#1E5A8A", "#3A8AB8", "#A8DCF0", "#DDF2FF"},
        {"#1A1030", "#2E1638", "#4A1C40", "#5E2E3A", "#B0603A", "#E8A050", "#FFD27A"},
        {"#05060F", "#070A18", "#0A0E22", "#0E1428", "#141C36", "#1E2A4A", "#4FA0C8"},
    };
    private static final int[][] STARS = {{8, 6}, {21, 4}, {33, 9}, {46, 5}, {58, 8}, {70, 4}, {79, 11}, {14, 13}, {40, 15}, {64, 16}};
    private static final String[] BIG_DROP = {
        "....#....", "....#....", "...###...", "..#####..", ".#######.", ".#######.", "#########", "#########", "#########", ".#######.", "..#####..",
    };

    private static Bitmap draw(Context context, int w, int h) {
        SharedPreferences prefs = context.getSharedPreferences(PREFS, Context.MODE_PRIVATE);
        String today = dayFormat().format(new Date());
        boolean known = prefs.getBoolean("known", false);
        boolean done = today.equals(prefs.getString("doneDay", ""));
        int streak = liveStreak(prefs, today);
        int hour = Calendar.getInstance().get(Calendar.HOUR_OF_DAY);
        boolean night = hour >= 21 || hour < 5;
        boolean lost = streak == 0 && !prefs.getString("lastDay", "").isEmpty();
        int band = night ? 3 : hour < 11 ? 0 : hour < 17 ? 1 : 2;

        int white = Color.parseColor("#F8F7F2");
        int alarm = Color.parseColor("#FF7A5C");
        int gold = Color.parseColor("#F4C25E");
        String status = "HOY REGAR";
        int statusColor = white;
        int frame = R.drawable.widget_fbo;
        if (!known) {
            status = "ABRE APP";
        } else if (done && night) {
            status = "A DORMIR";
            statusColor = gold;
            frame = R.drawable.widget_fbn;
        } else if (done) {
            status = "REGADO";
            statusColor = gold;
            frame = R.drawable.widget_fbw;
        } else if (lost) {
            status = "DE NUEVO";
            frame = R.drawable.widget_fbb;
        } else if (hour >= 18 && streak > 0) {
            status = "EN PELIGRO";
            statusColor = alarm;
        }

        Bitmap b = Bitmap.createBitmap(w, h, Bitmap.Config.ARGB_8888);
        drawSky(b, w, h, SKIES[band], band);

        int ox = (w - BASE_W) / 2;
        int oy = h - BASE_H;
        // deck under the crew
        int deck = oy + BASE_H - 4;
        rect(b, 0, deck, w, h - deck, HULL_DARK);
        rect(b, 0, deck, w, 1, LIGHT);
        for (int x = 3; x < w - 2; x += 6) b.setPixel(x, deck + 1, MUTED);

        plant(context, b, prefs, ox + 1, deck - 29);
        sprite(context, b, frame, ox + 11, deck - 29);

        int rx = ox + 44;
        shadowText(b, status, rx, oy + 4, statusColor, 1);
        int dropColor = statusColor == alarm ? alarm : streak >= 30 ? gold : Color.parseColor("#6FB8F0");
        for (int y = 0; y < BIG_DROP.length; y++) {
            for (int x = 0; x < 9; x++) {
                if (BIG_DROP[y].charAt(x) != '#') continue;
                boolean edge = x == 0 || x == 8 || y == BIG_DROP.length - 1 || BIG_DROP[y].charAt(x - 1) != '#' || BIG_DROP[y].charAt(x + 1) != '#' || (y > 0 && BIG_DROP[y - 1].charAt(x) != '#');
                if (done || edge) b.setPixel(rx + x, oy + 13 + y, dropColor);
            }
        }
        if (done) {
            rect(b, rx + 2, oy + 19, 1, 2, white);
            b.setPixel(rx + 3, oy + 18, white);
        }
        int size = streak < 100 ? 3 : 2;
        shadowText(b, String.valueOf(streak), rx + 12, oy + (size == 3 ? 10 : 13), white, size);

        String week = shiftedWeek(prefs, today);
        for (int i = 0; i < 7; i++) {
            int x = rx + i * 5;
            int y = oy + 28;
            char day = week.charAt(i);
            rect(b, x, y, 4, 4, day == '1' ? gold : day == 'f' ? ICE : Color.parseColor("#4A5478"));
            if (day == '1') b.setPixel(x, y, white);
            if (i == 6 && day != '1') {
                rect(b, x, y, 4, 1, white);
                rect(b, x, y + 3, 4, 1, white);
                rect(b, x, y, 1, 4, white);
                rect(b, x + 3, y, 1, 4, white);
            }
        }
        frameHull(b, w, h);
        return b;
    }

    private static void drawSky(Bitmap b, int w, int h, String[] sky, int band) {
        int[] colors = new int[sky.length];
        for (int i = 0; i < sky.length; i++) colors[i] = Color.parseColor(sky[i]);
        for (int y = 0; y < h; y++) {
            int step = Math.min(2, y * 3 / Math.max(1, h));
            for (int x = 0; x < w; x++) b.setPixel(x, y, colors[step]);
        }
        for (int[] star : STARS) {
            if (star[0] * w / 85 < w && star[1] < h) b.setPixel(star[0] * w / 85, star[1], LIGHT);
        }
        int cx = w * 3 / 10;
        int cy = h + 16;
        int radius = 42;
        for (int y = 0; y < h; y++) {
            for (int x = 0; x < w; x++) {
                double d = Math.hypot(x - cx, y - cy);
                if (d > radius) continue;
                double light = Math.hypot(x - (cx + 14), y - (cy - 38));
                int shade = light < 26 ? 5 : light < 42 ? 4 : 3;
                b.setPixel(x, y, colors[d > radius - 1.2 ? 6 : shade]);
            }
        }
    }

    private static void plant(Context context, Bitmap b, SharedPreferences prefs, int x, int y) {
        int species = prefs.getInt("plantSpecies", -1);
        if (species < 0) return;
        BitmapFactory.Options options = new BitmapFactory.Options();
        options.inScaled = false;
        Bitmap sheet = BitmapFactory.decodeResource(context.getResources(), R.drawable.widget_plants, options);
        int col = Math.max(0, Math.min(14, prefs.getInt("plantColumn", 0)));
        for (int yy = 0; yy < 34; yy++) {
            for (int xx = 0; xx < 26; xx++) {
                int color = sheet.getPixel(col * 26 + xx, species * 34 + yy);
                if (Color.alpha(color) > 0 && x + xx >= 0 && x + xx < b.getWidth() && y + yy >= 0 && y + yy < b.getHeight()) b.setPixel(x + xx, y + yy, color);
            }
        }
        // a small pot, level with the deck
        rect(b, x + 9, y + 26, 9, 2, INK);
        rect(b, x + 10, y + 28, 7, 2, Color.parseColor("#3A3E46"));
        rect(b, x + 10, y + 28, 1, 2, Color.parseColor("#6C7078"));
    }

    private static void shadowText(Bitmap b, String word, int x, int y, int color, int size) {
        text(b, word, x + Math.max(1, size / 2), y + Math.max(1, size / 2), INK, size);
        text(b, word, x, y, color, size);
    }

    /** The widget is a little viewport: a hull frame with cut corners. */
    private static void frameHull(Bitmap b, int w, int h) {
        rect(b, 0, 0, w, 2, HULL);
        rect(b, 0, h - 2, w, 2, HULL);
        rect(b, 0, 0, 2, h, HULL);
        rect(b, w - 2, 0, 2, h, HULL);
        rect(b, 0, 0, w, 1, LIGHT);
        rect(b, 0, 0, 1, h, LIGHT);
        rect(b, 2, 2, w - 4, 1, INK);
        rect(b, 2, h - 3, w - 4, 1, INK);
        rect(b, 2, 2, 1, h - 4, INK);
        rect(b, w - 3, 2, 1, h - 4, INK);
        for (int[] rivet : new int[][] {{5, 1}, {w - 6, 1}, {5, h - 2}, {w - 6, h - 2}}) b.setPixel(rivet[0], rivet[1], MUTED);
        for (int k = 0; k < 3; k++) {
            for (int j = 0; j < 3 - k; j++) {
                b.setPixel(j, k, Color.TRANSPARENT);
                b.setPixel(w - 1 - j, k, Color.TRANSPARENT);
                b.setPixel(j, h - 1 - k, Color.TRANSPARENT);
                b.setPixel(w - 1 - j, h - 1 - k, Color.TRANSPARENT);
            }
        }
    }

    private static String shiftedWeek(SharedPreferences prefs, String today) {
        String week = prefs.getString("week", "0000000");
        String end = prefs.getString("weekEnd", today);
        if (week == null || week.length() != 7) week = "0000000";
        try {
            int gap = (int) Math.max(0, Math.min(7, daysBetween(end, today)));
            return week.substring(gap) + "0000000".substring(0, gap);
        } catch (ParseException e) {
            return week;
        }
    }

    private static void rect(Bitmap b, int x, int y, int w, int h, int color) {
        for (int yy = y; yy < y + h; yy++) {
            for (int xx = x; xx < x + w; xx++) {
                if (xx >= 0 && yy >= 0 && xx < b.getWidth() && yy < b.getHeight()) b.setPixel(xx, yy, color);
            }
        }
    }

    private static void outline(Bitmap b, int x, int y, int color) {
        rect(b, x, y, 5, 1, color);
        rect(b, x, y + 4, 5, 1, color);
        rect(b, x, y, 1, 5, color);
        rect(b, x + 4, y, 1, 5, color);
    }

    private static void text(Bitmap b, String word, int x, int y, int color, int size) {
        int cursor = x;
        for (char ch : word.toCharArray()) {
            String[] glyph = FONT.get(ch);
            if (glyph != null) {
                for (int r = 0; r < 5; r++) {
                    for (int c = 0; c < 3; c++) {
                        if (glyph[r].charAt(c) == '1') rect(b, cursor + c * size, y + r * size, size, size, color);
                    }
                }
            }
            cursor += (glyph == null ? 3 : 4) * size;
        }
    }

    private static void sprite(Context context, Bitmap b, int resource, int x, int y) {
        BitmapFactory.Options options = new BitmapFactory.Options();
        options.inScaled = false;
        Bitmap frame = BitmapFactory.decodeResource(context.getResources(), resource, options);
        for (int yy = 0; yy < frame.getHeight(); yy++) {
            for (int xx = 0; xx < frame.getWidth(); xx++) {
                int color = frame.getPixel(xx, yy);
                if (Color.alpha(color) > 0 && x + xx < b.getWidth() && y + yy < b.getHeight()) b.setPixel(x + xx, y + yy, color);
            }
        }
    }

    /** Applies days missed since the app last ran, the same way the app's streak rule does. */
    static int liveStreak(SharedPreferences prefs, String today) {
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
