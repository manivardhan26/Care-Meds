package com.example.myapplication1.ui.viewmodel

import android.content.Context
import androidx.lifecycle.ViewModel
import androidx.lifecycle.ViewModelProvider
import androidx.lifecycle.viewModelScope
import com.example.myapplication1.data.entity.MedicineEntity
import com.example.myapplication1.data.repository.CareMedsRepository
import com.example.myapplication1.data.util.ExpirySafetyEvaluator
import com.example.myapplication1.data.util.ExpiryState
import com.example.myapplication1.data.util.ExpiryStatus
import com.example.myapplication1.receiver.ReminderScheduler
import kotlinx.coroutines.flow.SharingStarted
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.combine
import kotlinx.coroutines.flow.stateIn
import kotlinx.coroutines.launch
import java.text.SimpleDateFormat
import java.util.Calendar
import java.util.Date
import java.util.Locale

data class DailyMedicineItem(
    val medicine: MedicineEntity,
    val status: String, // "UPCOMING", "TAKEN", "MISSED", "SKIPPED", "SNOOZED"
    val expiryStatus: ExpiryStatus
)

data class DashboardUiState(
    val greeting: String = "Good Morning",
    val todayFormatted: String = "",
    val items: List<DailyMedicineItem> = emptyList(),
    val totalCount: Int = 0,
    val takenCount: Int = 0,
    val expiredMedicines: List<MedicineEntity> = emptyList(),
    val isLoading: Boolean = true
)

class DashboardViewModel(
    private val repository: CareMedsRepository
) : ViewModel() {

    private val todayIso: String = SimpleDateFormat("yyyy-MM-dd", Locale.US).format(Date())

    val uiState: StateFlow<DashboardUiState> = combine(
        repository.allMedicines,
        repository.getLogsForDate(todayIso)
    ) { medicines, logs ->
        val logMap = logs.associateBy { it.medicineId }

        val expiredList = mutableListOf<MedicineEntity>()
        var taken = 0

        val items = medicines.map { med ->
            val expiry = ExpirySafetyEvaluator.evaluate(med.expiryDate)
            if (expiry.state == ExpiryState.EXPIRED) {
                expiredList.add(med)
            }

            val log = logMap[med.id]
            val status = when {
                log != null -> log.status
                isPastScheduledTime(med.reminderTime) -> "MISSED"
                else -> "UPCOMING"
            }

            if (status == "TAKEN") {
                taken++
            }

            DailyMedicineItem(
                medicine = med,
                status = status,
                expiryStatus = expiry
            )
        }

        DashboardUiState(
            greeting = getGreeting(),
            todayFormatted = SimpleDateFormat("EEEE, MMMM d", Locale.getDefault()).format(Date()),
            items = items,
            totalCount = items.size,
            takenCount = taken,
            expiredMedicines = expiredList,
            isLoading = false
        )
    }.stateIn(
        scope = viewModelScope,
        started = SharingStarted.WhileSubscribed(5000),
        initialValue = DashboardUiState()
    )

    fun markTaken(medicine: MedicineEntity) {
        viewModelScope.launch {
            repository.logAdherence(
                medicineId = medicine.id,
                medicineName = medicine.name,
                dosage = medicine.dosage,
                scheduledTime = medicine.reminderTime,
                dateString = todayIso,
                status = "TAKEN"
            )
        }
    }

    fun markSnooze(context: Context, medicine: MedicineEntity) {
        viewModelScope.launch {
            ReminderScheduler.scheduleSnooze(
                context = context,
                medicineId = medicine.id,
                medicineName = medicine.name,
                dosage = medicine.dosage,
                scheduledTime = medicine.reminderTime,
                snoozeMinutes = 15
            )
            repository.logAdherence(
                medicineId = medicine.id,
                medicineName = medicine.name,
                dosage = medicine.dosage,
                scheduledTime = medicine.reminderTime,
                dateString = todayIso,
                status = "SNOOZED"
            )
        }
    }

    fun markSkip(medicine: MedicineEntity) {
        viewModelScope.launch {
            repository.logAdherence(
                medicineId = medicine.id,
                medicineName = medicine.name,
                dosage = medicine.dosage,
                scheduledTime = medicine.reminderTime,
                dateString = todayIso,
                status = "SKIPPED"
            )
        }
    }

    fun deleteMedicine(medicine: MedicineEntity) {
        viewModelScope.launch {
            repository.deleteMedicine(medicine)
        }
    }

    private fun getGreeting(): String {
        val hour = Calendar.getInstance().get(Calendar.HOUR_OF_DAY)
        return when (hour) {
            in 5..11 -> "Good Morning"
            in 12..16 -> "Good Afternoon"
            in 17..21 -> "Good Evening"
            else -> "Good Night"
        }
    }

    private fun isPastScheduledTime(timeStr: String): Boolean {
        return try {
            val formats = listOf(
                SimpleDateFormat("hh:mm a", Locale.US),
                SimpleDateFormat("h:mm a", Locale.US),
                SimpleDateFormat("HH:mm", Locale.US)
            )
            for (fmt in formats) {
                val parsed = try { fmt.parse(timeStr.trim()) } catch (_: Exception) { null }
                if (parsed != null) {
                    val cal = Calendar.getInstance().apply { time = parsed }
                    val currentCal = Calendar.getInstance()
                    val targetMins = cal.get(Calendar.HOUR_OF_DAY) * 60 + cal.get(Calendar.MINUTE)
                    val currentMins = currentCal.get(Calendar.HOUR_OF_DAY) * 60 + currentCal.get(Calendar.MINUTE)
                    // If more than 60 mins past scheduled time, count as missed
                    return currentMins > (targetMins + 60)
                }
            }
            false
        } catch (_: Exception) {
            false
        }
    }

    class Factory(private val repository: CareMedsRepository) : ViewModelProvider.Factory {
        @Suppress("UNCHECKED_CAST")
        override fun <T : ViewModel> create(modelClass: Class<T>): T {
            return DashboardViewModel(repository) as T
        }
    }
}
