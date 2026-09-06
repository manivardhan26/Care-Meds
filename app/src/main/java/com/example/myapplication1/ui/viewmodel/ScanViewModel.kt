package com.example.myapplication1.ui.viewmodel

import android.net.Uri
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.setValue
import androidx.lifecycle.ViewModel
import androidx.lifecycle.ViewModelProvider
import androidx.lifecycle.viewModelScope
import com.example.myapplication1.data.entity.MedicineEntity
import com.example.myapplication1.data.repository.CareMedsRepository
import com.example.myapplication1.data.util.ParsedMedicineInfo
import kotlinx.coroutines.launch

class ScanViewModel(
    private val repository: CareMedsRepository
) : ViewModel() {

    var isScanning by mutableStateOf(false)
        private set

    var errorMessage by mutableStateOf<String?>(null)
        private set

    var scannedInfo by mutableStateOf<ParsedMedicineInfo?>(null)
        private set

    fun processImage(uri: Uri) {
        scannedInfo = ParsedMedicineInfo(
            name = "Prescription Med",
            dosage = "10mg",
            instructions = "Take 1 tablet daily",
            expiryDate = "12/2026",
            supplyCount = 30
        )
    }

    fun selectSamplePackage(sample: ParsedMedicineInfo) {
        scannedInfo = sample
    }

    fun saveMedicine(
        name: String,
        dosage: String,
        instructions: String,
        expiryDate: String,
        supplyCount: Int,
        onSuccess: () -> Unit
    ) {
        viewModelScope.launch {
            repository.insertMedicine(
                MedicineEntity(
                    name = name,
                    dosage = dosage,
                    instructions = instructions,
                    expiryDate = expiryDate,
                    supplyCount = supplyCount
                )
            )
            onSuccess()
        }
    }

    class Factory(private val repository: CareMedsRepository) : ViewModelProvider.Factory {
        @Suppress("UNCHECKED_CAST")
        override fun <T : ViewModel> create(modelClass: Class<T>): T {
            return ScanViewModel(repository) as T
        }
    }
}
