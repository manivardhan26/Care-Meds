package com.example.myapplication1.ui.viewmodel

import androidx.lifecycle.ViewModel
import androidx.lifecycle.ViewModelProvider
import androidx.lifecycle.viewModelScope
import com.example.myapplication1.data.entity.AdherenceLogEntity
import com.example.myapplication1.data.entity.MedicineEntity
import com.example.myapplication1.data.repository.CareMedsRepository
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.SharingStarted
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.combine
import kotlinx.coroutines.flow.stateIn
import java.text.SimpleDateFormat
import java.util.Calendar
import java.util.Date
import java.util.Locale

data class CalendarDayStatus(
    val dateString: String,
    val dayNumber: Int,
    val isToday: Boolean,
    val hasLogs: Boolean,
    val allTaken: Boolean,
    val hasMissedOrSkipped: Boolean
)

data class CalendarUiState(
    val selectedDateIso: String,
    val displayMonthYear: String,
    val currentMonthCalendar: List<CalendarDayStatus>,
    val logsForSelectedDate: List<AdherenceLogEntity>,
    val scheduledMedicines: List<MedicineEntity>
)

class CalendarViewModel(
    private val repository: CareMedsRepository
) : ViewModel() {

    private val todayIso = SimpleDateFormat("yyyy-MM-dd", Locale.US).format(Date())
    private val _selectedDate = MutableStateFlow(todayIso)
    val selectedDate: StateFlow<String> = _selectedDate

    private val _currentMonthCal = MutableStateFlow(Calendar.getInstance())

    val uiState: StateFlow<CalendarUiState> = combine(
        _selectedDate,
        _currentMonthCal,
        repository.allAdherenceLogs,
        repository.allMedicines
    ) { selDate, cal, allLogs, allMeds ->
        val monthFmt = SimpleDateFormat("MMMM yyyy", Locale.getDefault())
        val displayMonth = monthFmt.format(cal.time)

        // Group logs by date
        val logsByDate = allLogs.groupBy { it.dateString }
        val logsForSelected = logsByDate[selDate] ?: emptyList()

        // Build days of month
        val daysInMonth = cal.getActualMaximum(Calendar.DAY_OF_MONTH)
        val year = cal.get(Calendar.YEAR)
        val month = cal.get(Calendar.MONTH) + 1

        val dayList = (1..daysInMonth).map { day ->
            val dateStr = String.format(Locale.US, "%04d-%02d-%02d", year, month, day)
            val dayLogs = logsByDate[dateStr] ?: emptyList()
            val hasLogs = dayLogs.isNotEmpty()
            val allTaken = hasLogs && dayLogs.all { it.status == "TAKEN" }
            val hasMissedOrSkipped = dayLogs.any { it.status == "MISSED" || it.status == "SKIPPED" }

            CalendarDayStatus(
                dateString = dateStr,
                dayNumber = day,
                isToday = dateStr == todayIso,
                hasLogs = hasLogs,
                allTaken = allTaken,
                hasMissedOrSkipped = hasMissedOrSkipped
            )
        }

        CalendarUiState(
            selectedDateIso = selDate,
            displayMonthYear = displayMonth,
            currentMonthCalendar = dayList,
            logsForSelectedDate = logsForSelected,
            scheduledMedicines = allMeds
        )
    }.stateIn(
        scope = viewModelScope,
        started = SharingStarted.WhileSubscribed(5000),
        initialValue = CalendarUiState(
            selectedDateIso = todayIso,
            displayMonthYear = "",
            currentMonthCalendar = emptyList(),
            logsForSelectedDate = emptyList(),
            scheduledMedicines = emptyList()
        )
    )

    fun selectDate(dateIso: String) {
        _selectedDate.value = dateIso
    }

    fun nextMonth() {
        val newCal = Calendar.getInstance().apply {
            timeInMillis = _currentMonthCal.value.timeInMillis
            add(Calendar.MONTH, 1)
        }
        _currentMonthCal.value = newCal
    }

    fun previousMonth() {
        val newCal = Calendar.getInstance().apply {
            timeInMillis = _currentMonthCal.value.timeInMillis
            add(Calendar.MONTH, -1)
        }
        _currentMonthCal.value = newCal
    }

    class Factory(private val repository: CareMedsRepository) : ViewModelProvider.Factory {
        @Suppress("UNCHECKED_CAST")
        override fun <T : ViewModel> create(modelClass: Class<T>): T {
            return CalendarViewModel(repository) as T
        }
    }
}
