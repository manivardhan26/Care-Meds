package com.example.myapplication1.receiver

import android.app.AlarmManager
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.os.Build
import com.example.myapplication1.data.entity.MedicineEntity
import java.text.SimpleDateFormat
import java.util.Calendar
import java.util.Locale

object ReminderScheduler {

    const val CHANNEL_ID = "caremeds_reminders"
    const val CHANNEL_NAME = "CareMeds Medication Reminders"

    fun createNotificationChannel(context: Context) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val channel = NotificationChannel(
                CHANNEL_ID,
                CHANNEL_NAME,
                NotificationManager.IMPORTANCE_HIGH
            ).apply {
                description = "Urgent notifications and spoken alerts for scheduled medications"
                enableVibration(true)
                setShowBadge(true)
            }
            val manager = context.getSystemService(NotificationManager::class.java)
            manager?.createNotificationChannel(channel)
        }
    }

    fun scheduleReminder(context: Context, medicine: MedicineEntity) {
        val alarmManager = context.getSystemService(Context.ALARM_SERVICE) as? AlarmManager ?: return
        val targetTime = parseTimeToCalendar(medicine.reminderTime)

        // If target time is in the past for today, schedule for tomorrow
        if (targetTime.timeInMillis <= System.currentTimeMillis()) {
            targetTime.add(Calendar.DAY_OF_YEAR, 1)
        }

        val intent = Intent(context, ReminderReceiver::class.java).apply {
            action = ReminderReceiver.ACTION_REMIND
            putExtra(ReminderReceiver.EXTRA_MEDICINE_ID, medicine.id)
            putExtra(ReminderReceiver.EXTRA_MEDICINE_NAME, medicine.name)
            putExtra(ReminderReceiver.EXTRA_DOSAGE, medicine.dosage)
            putExtra(ReminderReceiver.EXTRA_SCHEDULED_TIME, medicine.reminderTime)
        }

        val pendingIntent = PendingIntent.getBroadcast(
            context,
            medicine.id.toInt(),
            intent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )

        try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                alarmManager.setExactAndAllowWhileIdle(
                    AlarmManager.RTC_WAKEUP,
                    targetTime.timeInMillis,
                    pendingIntent
                )
            } else {
                alarmManager.set(
                    AlarmManager.RTC_WAKEUP,
                    targetTime.timeInMillis,
                    pendingIntent
                )
            }
        } catch (_: SecurityException) {
            alarmManager.set(
                AlarmManager.RTC_WAKEUP,
                targetTime.timeInMillis,
                pendingIntent
            )
        }
    }

    fun scheduleSnooze(
        context: Context,
        medicineId: Long,
        medicineName: String,
        dosage: String,
        scheduledTime: String,
        snoozeMinutes: Int = 15
    ) {
        val alarmManager = context.getSystemService(Context.ALARM_SERVICE) as? AlarmManager ?: return
        val snoozeTime = System.currentTimeMillis() + (snoozeMinutes * 60 * 1000)

        val intent = Intent(context, ReminderReceiver::class.java).apply {
            action = ReminderReceiver.ACTION_REMIND
            putExtra(ReminderReceiver.EXTRA_MEDICINE_ID, medicineId)
            putExtra(ReminderReceiver.EXTRA_MEDICINE_NAME, medicineName)
            putExtra(ReminderReceiver.EXTRA_DOSAGE, dosage)
            putExtra(ReminderReceiver.EXTRA_SCHEDULED_TIME, scheduledTime)
        }

        val pendingIntent = PendingIntent.getBroadcast(
            context,
            (medicineId + 10000).toInt(),
            intent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )

        try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                alarmManager.setExactAndAllowWhileIdle(
                    AlarmManager.RTC_WAKEUP,
                    snoozeTime,
                    pendingIntent
                )
            } else {
                alarmManager.set(
                    AlarmManager.RTC_WAKEUP,
                    snoozeTime,
                    pendingIntent
                )
            }
        } catch (_: SecurityException) {
            alarmManager.set(
                AlarmManager.RTC_WAKEUP,
                snoozeTime,
                pendingIntent
            )
        }
    }

    fun cancelReminder(context: Context, medicineId: Long) {
        val alarmManager = context.getSystemService(Context.ALARM_SERVICE) as? AlarmManager ?: return
        val intent = Intent(context, ReminderReceiver::class.java).apply {
            action = ReminderReceiver.ACTION_REMIND
        }
        val pendingIntent = PendingIntent.getBroadcast(
            context,
            medicineId.toInt(),
            intent,
            PendingIntent.FLAG_NO_CREATE or PendingIntent.FLAG_IMMUTABLE
        )
        if (pendingIntent != null) {
            alarmManager.cancel(pendingIntent)
        }
    }

    private fun parseTimeToCalendar(timeStr: String): Calendar {
        val cal = Calendar.getInstance()
        val formats = listOf(
            SimpleDateFormat("hh:mm a", Locale.US),
            SimpleDateFormat("h:mm a", Locale.US),
            SimpleDateFormat("HH:mm", Locale.US)
        )
        for (fmt in formats) {
            try {
                val parsed = fmt.parse(timeStr.trim())
                if (parsed != null) {
                    val timeCal = Calendar.getInstance().apply { time = parsed }
                    cal.set(Calendar.HOUR_OF_DAY, timeCal.get(Calendar.HOUR_OF_DAY))
                    cal.set(Calendar.MINUTE, timeCal.get(Calendar.MINUTE))
                    cal.set(Calendar.SECOND, 0)
                    cal.set(Calendar.MILLISECOND, 0)
                    return cal
                }
            } catch (_: Exception) {}
        }
        // Fallback default 8:00 AM
        cal.set(Calendar.HOUR_OF_DAY, 8)
        cal.set(Calendar.MINUTE, 0)
        cal.set(Calendar.SECOND, 0)
        cal.set(Calendar.MILLISECOND, 0)
        return cal
    }
}
