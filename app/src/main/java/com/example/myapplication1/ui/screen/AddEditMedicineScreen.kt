package com.example.myapplication1.ui.screen

import android.app.DatePickerDialog
import android.app.TimePickerDialog
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.rounded.ArrowBack
import androidx.compose.material.icons.rounded.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.example.myapplication1.data.entity.MedicineEntity
import com.example.myapplication1.ui.viewmodel.MedicineViewModel
import java.text.SimpleDateFormat
import java.util.Calendar
import java.util.Locale

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun AddEditMedicineScreen(
    viewModel: MedicineViewModel,
    existingMedicineId: Long? = null,
    onNavigateBack: () -> Unit,
    onNavigateToScan: () -> Unit
) {
    val context = LocalContext.current
    val isEdit = existingMedicineId != null && existingMedicineId > 0
    val selectedMedicine by viewModel.selectedMedicine.collectAsState()

    var name by remember { mutableStateOf("") }
    var dosage by remember { mutableStateOf("") }
    var frequency by remember { mutableStateOf("Once daily") }
    var reminderTime by remember { mutableStateOf("08:00 AM") }
    var timeOfDay by remember { mutableStateOf("Morning") }
    var expiryDate by remember { mutableStateOf("") }
    var instructions by remember { mutableStateOf("") }
    var supplyCountStr by remember { mutableStateOf("30") }

    LaunchedEffect(existingMedicineId) {
        if (isEdit) {
            viewModel.loadMedicine(existingMedicineId!!)
        }
    }

    LaunchedEffect(selectedMedicine) {
        if (isEdit && selectedMedicine != null) {
            val med = selectedMedicine!!
            name = med.name
            dosage = med.dosage
            frequency = med.frequency
            reminderTime = med.reminderTime
            timeOfDay = med.timeOfDay
            expiryDate = med.expiryDate
            instructions = med.instructions.ifBlank { med.notes }
            supplyCountStr = med.supplyCount.toString()
        }
    }

    val frequencies = listOf("Once daily", "Twice daily", "Three times daily", "As needed", "Weekly")
    val timePresets = listOf(
        "Morning" to "08:00 AM",
        "Noon" to "12:00 PM",
        "Evening" to "06:00 PM",
        "Night" to "09:00 PM"
    )

    Scaffold(
        topBar = {
            TopAppBar(
                title = {
                    Text(
                        text = if (isEdit) "Edit Medicine" else "Add Medicine",
                        fontWeight = FontWeight.Bold,
                        fontSize = 22.sp
                    )
                },
                navigationIcon = {
                    IconButton(onClick = onNavigateBack, modifier = Modifier.size(48.dp)) {
                        Icon(Icons.AutoMirrored.Rounded.ArrowBack, contentDescription = "Back", modifier = Modifier.size(28.dp))
                    }
                },
                colors = TopAppBarDefaults.topAppBarColors(
                    containerColor = MaterialTheme.colorScheme.surface,
                    titleContentColor = MaterialTheme.colorScheme.onSurface
                )
            )
        }
    ) { padding ->
        Box(
            modifier = Modifier
                .fillMaxSize()
                .padding(padding)
                .background(MaterialTheme.colorScheme.background)
        ) {
            Column(
                modifier = Modifier
                    .fillMaxSize()
                    .verticalScroll(rememberScrollState())
                    .padding(20.dp),
                verticalArrangement = Arrangement.spacedBy(20.dp)
            ) {
                // Scan Package Accelerator Button
                if (!isEdit) {
                    ElevatedButton(
                        onClick = onNavigateToScan,
                        modifier = Modifier
                            .fillMaxWidth()
                            .height(56.dp),
                        shape = RoundedCornerShape(16.dp),
                        colors = ButtonDefaults.elevatedButtonColors(
                            containerColor = MaterialTheme.colorScheme.secondaryContainer
                        )
                    ) {
                        Icon(Icons.Rounded.PhotoCamera, contentDescription = null, modifier = Modifier.size(24.dp))
                        Spacer(modifier = Modifier.width(10.dp))
                        Text("Scan Medicine Box with Camera", fontSize = 16.sp, fontWeight = FontWeight.Bold)
                    }
                }

                // Medicine Name
                OutlinedTextField(
                    value = name,
                    onValueChange = { name = it },
                    label = { Text("Medicine Name *", fontSize = 17.sp, fontWeight = FontWeight.Bold) },
                    placeholder = { Text("e.g. Aspirin, Lisinopril", fontSize = 17.sp) },
                    modifier = Modifier.fillMaxWidth(),
                    textStyle = TextStyle(fontSize = 20.sp, fontWeight = FontWeight.Bold),
                    shape = RoundedCornerShape(14.dp),
                    singleLine = true
                )

                // Dosage
                OutlinedTextField(
                    value = dosage,
                    onValueChange = { dosage = it },
                    label = { Text("Dosage / Strength *", fontSize = 17.sp, fontWeight = FontWeight.Bold) },
                    placeholder = { Text("e.g. 500mg, 1 tablet", fontSize = 17.sp) },
                    modifier = Modifier.fillMaxWidth(),
                    textStyle = TextStyle(fontSize = 19.sp),
                    shape = RoundedCornerShape(14.dp),
                    singleLine = true
                )

                // Reminder Time & Quick Presets
                Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                    Text(
                        text = "Scheduled Reminder Time",
                        style = MaterialTheme.typography.titleMedium.copy(fontWeight = FontWeight.Bold, fontSize = 17.sp)
                    )

                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.spacedBy(8.dp)
                    ) {
                        timePresets.forEach { (label, timeVal) ->
                            FilterChip(
                                selected = reminderTime == timeVal,
                                onClick = {
                                    reminderTime = timeVal
                                    timeOfDay = label
                                },
                                label = { Text("$label ($timeVal)", fontSize = 13.sp) },
                                modifier = Modifier.weight(1f)
                            )
                        }
                    }

                    OutlinedButton(
                        onClick = {
                            val cal = Calendar.getInstance()
                            TimePickerDialog(
                                context,
                                { _, hour, minute ->
                                    val amPm = if (hour < 12) "AM" else "PM"
                                    val hour12 = when {
                                        hour == 0 -> 12
                                        hour > 12 -> hour - 12
                                        else -> hour
                                    }
                                    reminderTime = String.format(Locale.US, "%02d:%02d %s", hour12, minute, amPm)
                                },
                                cal.get(Calendar.HOUR_OF_DAY),
                                cal.get(Calendar.MINUTE),
                                false
                            ).show()
                        },
                        modifier = Modifier
                            .fillMaxWidth()
                            .height(54.dp),
                        shape = RoundedCornerShape(14.dp)
                    ) {
                        Icon(Icons.Rounded.AccessTime, contentDescription = null)
                        Spacer(modifier = Modifier.width(8.dp))
                        Text("Custom Time: $reminderTime", fontSize = 17.sp, fontWeight = FontWeight.SemiBold)
                    }
                }

                // Frequency Selector
                Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                    Text(
                        text = "How often do you take this?",
                        style = MaterialTheme.typography.titleMedium.copy(fontWeight = FontWeight.Bold, fontSize = 17.sp)
                    )
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.spacedBy(8.dp)
                    ) {
                        frequencies.take(3).forEach { freq ->
                            FilterChip(
                                selected = frequency == freq,
                                onClick = { frequency = freq },
                                label = { Text(freq, fontSize = 14.sp) },
                                modifier = Modifier.weight(1f)
                            )
                        }
                    }
                }

                // Expiry Date Picker
                Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                    Text(
                        text = "Medicine Expiry Date",
                        style = MaterialTheme.typography.titleMedium.copy(fontWeight = FontWeight.Bold, fontSize = 17.sp)
                    )

                    OutlinedButton(
                        onClick = {
                            val cal = Calendar.getInstance()
                            DatePickerDialog(
                                context,
                                { _, year, month, day ->
                                    expiryDate = String.format(Locale.US, "%04d-%02d-%02d", year, month + 1, day)
                                },
                                cal.get(Calendar.YEAR),
                                cal.get(Calendar.MONTH),
                                cal.get(Calendar.DAY_OF_MONTH)
                            ).show()
                        },
                        modifier = Modifier
                            .fillMaxWidth()
                            .height(54.dp),
                        shape = RoundedCornerShape(14.dp)
                    ) {
                        Icon(Icons.Rounded.CalendarMonth, contentDescription = null)
                        Spacer(modifier = Modifier.width(8.dp))
                        Text(
                            text = if (expiryDate.isNotBlank()) "Expiry: $expiryDate" else "Tap to Select Expiry Date",
                            fontSize = 17.sp,
                            fontWeight = FontWeight.SemiBold
                        )
                    }
                }

                // Notes / Instructions
                OutlinedTextField(
                    value = instructions,
                    onValueChange = { instructions = it },
                    label = { Text("Special Notes / Instructions", fontSize = 16.sp) },
                    placeholder = { Text("e.g. Take with plenty of water after meals", fontSize = 16.sp) },
                    modifier = Modifier.fillMaxWidth(),
                    textStyle = TextStyle(fontSize = 17.sp),
                    shape = RoundedCornerShape(14.dp),
                    minLines = 2
                )

                // Remaining Supply Count
                OutlinedTextField(
                    value = supplyCountStr,
                    onValueChange = { supplyCountStr = it },
                    label = { Text("Pill / Dose Count in Cabinet", fontSize = 16.sp) },
                    modifier = Modifier.fillMaxWidth(),
                    textStyle = TextStyle(fontSize = 18.sp),
                    shape = RoundedCornerShape(14.dp),
                    singleLine = true
                )

                Spacer(modifier = Modifier.height(8.dp))

                // Big Save Button (64dp height for elderly touch targets)
                Button(
                    onClick = {
                        val supply = supplyCountStr.toIntOrNull() ?: 30
                        viewModel.saveMedicine(
                            context = context,
                            id = existingMedicineId ?: 0L,
                            name = name.ifBlank { "Prescription Medicine" },
                            dosage = dosage.ifBlank { "1 dose" },
                            instructions = instructions,
                            notes = instructions,
                            expiryDate = expiryDate.ifBlank { "2027-12-31" },
                            frequency = frequency,
                            reminderTime = reminderTime,
                            timeOfDay = timeOfDay,
                            supplyCount = supply,
                            onSuccess = onNavigateBack
                        )
                    },
                    modifier = Modifier
                        .fillMaxWidth()
                        .height(64.dp),
                    shape = RoundedCornerShape(16.dp),
                    colors = ButtonDefaults.buttonColors(containerColor = MaterialTheme.colorScheme.primary)
                ) {
                    Icon(Icons.Rounded.Save, contentDescription = null, modifier = Modifier.size(26.dp))
                    Spacer(modifier = Modifier.width(10.dp))
                    Text(
                        text = if (isEdit) "Update Medicine" else "Save Medicine Reminder",
                        fontSize = 19.sp,
                        fontWeight = FontWeight.Bold
                    )
                }

                Spacer(modifier = Modifier.height(24.dp))
            }
        }
    }
}
