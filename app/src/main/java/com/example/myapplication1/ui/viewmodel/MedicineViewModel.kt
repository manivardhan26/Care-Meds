package com.example.myapplication1.ui.viewmodel

import android.content.Context
import androidx.lifecycle.ViewModel
import androidx.lifecycle.ViewModelProvider
import androidx.lifecycle.viewModelScope
import com.example.myapplication1.data.entity.MedicineEntity
import com.example.myapplication1.data.repository.CareMedsRepository
import com.example.myapplication1.receiver.ReminderScheduler
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch

class MedicineViewModel(
    private val repository: CareMedsRepository
) : ViewModel() {

    private val _selectedMedicine = MutableStateFlow<MedicineEntity?>(null)
    val selectedMedicine: StateFlow<MedicineEntity?> = _selectedMedicine.asStateFlow()

    fun loadMedicine(id: Long) {
        viewModelScope.launch {
            _selectedMedicine.value = repository.getMedicineById(id)
        }
    }

    fun saveMedicine(
        context: Context,
        id: Long = 0L,
        name: String,
        dosage: String,
        instructions: String,
        notes: String,
        expiryDate: String,
        frequency: String,
        reminderTime: String,
        timeOfDay: String,
        supplyCount: Int,
        onSuccess: () -> Unit
    ) {
        viewModelScope.launch {
            val med = MedicineEntity(
                id = id,
                name = name.trim(),
                dosage = dosage.trim(),
                instructions = instructions.trim(),
                notes = notes.trim(),
                expiryDate = expiryDate.trim(),
                frequency = frequency,
                reminderTime = reminderTime,
                timeOfDay = timeOfDay,
                supplyCount = supplyCount
            )

            val savedId = if (id == 0L) {
                repository.insertMedicine(med)
            } else {
                repository.updateMedicine(med)
                id
            }

            // Schedule reminder for this medicine
            ReminderScheduler.scheduleReminder(context, med.copy(id = savedId))
            onSuccess()
        }
    }

    fun deleteMedicine(context: Context, medicine: MedicineEntity, onSuccess: () -> Unit) {
        viewModelScope.launch {
            ReminderScheduler.cancelReminder(context, medicine.id)
            repository.deleteMedicine(medicine)
            onSuccess()
        }
    }

    fun updateSupply(medicineId: Long, newCount: Int) {
        viewModelScope.launch {
            val med = repository.getMedicineById(medicineId) ?: return@launch
            repository.updateMedicine(med.copy(supplyCount = newCount))
            _selectedMedicine.value = med.copy(supplyCount = newCount)
        }
    }

    class Factory(private val repository: CareMedsRepository) : ViewModelProvider.Factory {
        @Suppress("UNCHECKED_CAST")
        override fun <T : ViewModel> create(modelClass: Class<T>): T {
            return MedicineViewModel(repository) as T
        }
    }
}
