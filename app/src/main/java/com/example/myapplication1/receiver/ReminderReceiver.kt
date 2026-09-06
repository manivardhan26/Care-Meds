package com.example.myapplication1.receiver

import android.app.NotificationManager
import android.app.PendingIntent
import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import androidx.core.app.NotificationCompat
import com.example.myapplication1.MainActivity
import com.example.myapplication1.data.database.CareMedsDatabase
import com.example.myapplication1.data.repository.CareMedsRepository
import com.example.myapplication1.data.util.VoiceReminderHelper
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.launch
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale

class ReminderReceiver : BroadcastReceiver() {

    companion object {
        const val ACTION_REMIND = "com.example.myapplication1.ACTION_REMIND"
        const val ACTION_TAKEN = "com.example.myapplication1.ACTION_TAKEN"
        const val ACTION_SNOOZE = "com.example.myapplication1.ACTION_SNOOZE"
        const val ACTION_SKIP = "com.example.myapplication1.ACTION_SKIP"

        const val EXTRA_MEDICINE_ID = "extra_medicine_id"
        const val EXTRA_MEDICINE_NAME = "extra_medicine_name"
        const val EXTRA_DOSAGE = "extra_dosage"
        const val EXTRA_SCHEDULED_TIME = "extra_scheduled_time"
    }

    override fun onReceive(context: Context, intent: Intent) {
        val action = intent.action ?: return
        val medicineId = intent.getLongExtra(EXTRA_MEDICINE_ID, -1L)
        val medicineName = intent.getStringExtra(EXTRA_MEDICINE_NAME) ?: "Medicine"
        val dosage = intent.getStringExtra(EXTRA_DOSAGE) ?: "1 dose"
        val scheduledTime = intent.getStringExtra(EXTRA_SCHEDULED_TIME) ?: "08:00 AM"

        val notificationManager = context.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
        val todayStr = SimpleDateFormat("yyyy-MM-dd", Locale.US).format(Date())

        when (action) {
            ACTION_REMIND -> {
                showNotification(context, notificationManager, medicineId, medicineName, dosage, scheduledTime)

                // Check voice reminders setting
                val prefs = context.getSharedPreferences("caremeds_prefs", Context.MODE_PRIVATE)
                val voiceEnabled = prefs.getBoolean("voice_reminders_enabled", true)
                if (voiceEnabled) {
                    try {
                        val voiceHelper = VoiceReminderHelper(context)
                        CoroutineScope(Dispatchers.Main).launch {
                            // Delay slightly so TTS can initialize before speaking
                            kotlinx.coroutines.delay(1200)
                            voiceHelper.speakReminder(medicineName, dosage)
                        }
                    } catch (_: Exception) {}
                }
            }

            ACTION_TAKEN -> {
                notificationManager.cancel(medicineId.toInt())
                CoroutineScope(Dispatchers.IO).launch {
                    val db = CareMedsDatabase.getDatabase(context)
                    val repo = CareMedsRepository(db.medicineDao(), db.adherenceDao())
                    repo.logAdherence(
                        medicineId = medicineId,
                        medicineName = medicineName,
                        dosage = dosage,
                        scheduledTime = scheduledTime,
                        dateString = todayStr,
                        status = "TAKEN"
                    )
                }
            }

            ACTION_SNOOZE -> {
                notificationManager.cancel(medicineId.toInt())
                ReminderScheduler.scheduleSnooze(context, medicineId, medicineName, dosage, scheduledTime, 15)
                CoroutineScope(Dispatchers.IO).launch {
                    val db = CareMedsDatabase.getDatabase(context)
                    val repo = CareMedsRepository(db.medicineDao(), db.adherenceDao())
                    repo.logAdherence(
                        medicineId = medicineId,
                        medicineName = medicineName,
                        dosage = dosage,
                        scheduledTime = scheduledTime,
                        dateString = todayStr,
                        status = "SNOOZED"
                    )
                }
            }

            ACTION_SKIP -> {
                notificationManager.cancel(medicineId.toInt())
                CoroutineScope(Dispatchers.IO).launch {
                    val db = CareMedsDatabase.getDatabase(context)
                    val repo = CareMedsRepository(db.medicineDao(), db.adherenceDao())
                    repo.logAdherence(
                        medicineId = medicineId,
                        medicineName = medicineName,
                        dosage = dosage,
                        scheduledTime = scheduledTime,
                        dateString = todayStr,
                        status = "SKIPPED"
                    )
                }
            }

            Intent.ACTION_BOOT_COMPLETED -> {
                // Reschedule all medicine reminders on reboot
                CoroutineScope(Dispatchers.IO).launch {
                    val db = CareMedsDatabase.getDatabase(context)
                    val repo = CareMedsRepository(db.medicineDao(), db.adherenceDao())
                    val meds = repo.allMedicines.first()
                    meds.forEach { med ->
                        ReminderScheduler.scheduleReminder(context, med)
                    }
                }
            }
        }
    }

    private fun showNotification(
        context: Context,
        notificationManager: NotificationManager,
        medicineId: Long,
        medicineName: String,
        dosage: String,
        scheduledTime: String
    ) {
        val tapIntent = Intent(context, MainActivity::class.java).apply {
            flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TASK
        }
        val tapPendingIntent = PendingIntent.getActivity(
            context,
            medicineId.toInt(),
            tapIntent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )

        // Taken Action
        val takenIntent = Intent(context, ReminderReceiver::class.java).apply {
            action = ACTION_TAKEN
            putExtra(EXTRA_MEDICINE_ID, medicineId)
            putExtra(EXTRA_MEDICINE_NAME, medicineName)
            putExtra(EXTRA_DOSAGE, dosage)
            putExtra(EXTRA_SCHEDULED_TIME, scheduledTime)
        }
        val takenPendingIntent = PendingIntent.getBroadcast(
            context,
            (medicineId * 10 + 1).toInt(),
            takenIntent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )

        // Snooze Action
        val snoozeIntent = Intent(context, ReminderReceiver::class.java).apply {
            action = ACTION_SNOOZE
            putExtra(EXTRA_MEDICINE_ID, medicineId)
            putExtra(EXTRA_MEDICINE_NAME, medicineName)
            putExtra(EXTRA_DOSAGE, dosage)
            putExtra(EXTRA_SCHEDULED_TIME, scheduledTime)
        }
        val snoozePendingIntent = PendingIntent.getBroadcast(
            context,
            (medicineId * 10 + 2).toInt(),
            snoozeIntent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )

        // Skip Action
        val skipIntent = Intent(context, ReminderReceiver::class.java).apply {
            action = ACTION_SKIP
            putExtra(EXTRA_MEDICINE_ID, medicineId)
            putExtra(EXTRA_MEDICINE_NAME, medicineName)
            putExtra(EXTRA_DOSAGE, dosage)
            putExtra(EXTRA_SCHEDULED_TIME, scheduledTime)
        }
        val skipPendingIntent = PendingIntent.getBroadcast(
            context,
            (medicineId * 10 + 3).toInt(),
            skipIntent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )

        val notification = NotificationCompat.Builder(context, ReminderScheduler.CHANNEL_ID)
            .setSmallIcon(android.R.drawable.ic_lock_idle_alarm)
            .setContentTitle("CareMeds: Time to take $medicineName")
            .setContentText("Dose: $dosage (Scheduled: $scheduledTime)")
            .setStyle(
                NotificationCompat.BigTextStyle()
                    .bigText("It is time to take your scheduled dose of $medicineName ($dosage). Tap an action below:")
            )
            .setPriority(NotificationCompat.PRIORITY_MAX)
            .setCategory(NotificationCompat.CATEGORY_REMINDER)
            .setAutoCancel(true)
            .setContentIntent(tapPendingIntent)
            .addAction(android.R.drawable.checkbox_on_background, "Taken", takenPendingIntent)
            .addAction(android.R.drawable.ic_popup_sync, "Snooze 15m", snoozePendingIntent)
            .addAction(android.R.drawable.ic_delete, "Skip", skipPendingIntent)
            .build()

        notificationManager.notify(medicineId.toInt(), notification)
    }
}
