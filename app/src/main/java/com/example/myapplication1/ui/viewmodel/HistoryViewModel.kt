package com.example.myapplication1.ui.viewmodel

import androidx.lifecycle.ViewModel
import androidx.lifecycle.ViewModelProvider
import androidx.lifecycle.viewModelScope
import com.example.myapplication1.data.entity.AdherenceLogEntity
import com.example.myapplication1.data.repository.CareMedsRepository
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.SharingStarted
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.combine
import kotlinx.coroutines.flow.stateIn
import kotlinx.coroutines.launch

enum class HistoryFilter {
    ALL,
    TAKEN,
    MISSED,
    SKIPPED,
    SNOOZED
}

data class HistoryUiState(
    val filter: HistoryFilter = HistoryFilter.ALL,
    val logs: List<AdherenceLogEntity> = emptyList(),
    val totalCount: Int = 0,
    val takenCount: Int = 0,
    val missedCount: Int = 0
)

class HistoryViewModel(
    private val repository: CareMedsRepository
) : ViewModel() {

    private val _filter = MutableStateFlow(HistoryFilter.ALL)
    val filter: StateFlow<HistoryFilter> = _filter

    val uiState: StateFlow<HistoryUiState> = combine(
        _filter,
        repository.allAdherenceLogs
    ) { currentFilter, allLogs ->
        val filtered = when (currentFilter) {
            HistoryFilter.ALL -> allLogs
            HistoryFilter.TAKEN -> allLogs.filter { it.status == "TAKEN" }
            HistoryFilter.MISSED -> allLogs.filter { it.status == "MISSED" }
            HistoryFilter.SKIPPED -> allLogs.filter { it.status == "SKIPPED" }
            HistoryFilter.SNOOZED -> allLogs.filter { it.status == "SNOOZED" }
        }

        HistoryUiState(
            filter = currentFilter,
            logs = filtered,
            totalCount = allLogs.size,
            takenCount = allLogs.count { it.status == "TAKEN" },
            missedCount = allLogs.count { it.status == "MISSED" }
        )
    }.stateIn(
        scope = viewModelScope,
        started = SharingStarted.WhileSubscribed(5000),
        initialValue = HistoryUiState()
    )

    fun setFilter(filter: HistoryFilter) {
        _filter.value = filter
    }

    fun deleteLog(id: Long) {
        viewModelScope.launch {
            repository.deleteLogById(id)
        }
    }

    class Factory(private val repository: CareMedsRepository) : ViewModelProvider.Factory {
        @Suppress("UNCHECKED_CAST")
        override fun <T : ViewModel> create(modelClass: Class<T>): T {
            return HistoryViewModel(repository) as T
        }
    }
}
