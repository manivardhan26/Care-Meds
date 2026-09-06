package com.example.myapplication1.ui.screen

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.rounded.ArrowBack
import androidx.compose.material.icons.rounded.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.example.myapplication1.data.util.ExpirySafetyEvaluator
import com.example.myapplication1.data.util.ExpiryState
import com.example.myapplication1.ui.theme.*
import com.example.myapplication1.ui.viewmodel.MedicineViewModel

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun MedicineDetailScreen(
    medicineId: Long,
    viewModel: MedicineViewModel,
    onNavigateBack: () -> Unit,
    onNavigateToEdit: (Long) -> Unit
) {
    val context = LocalContext.current
    val medicine by viewModel.selectedMedicine.collectAsState()
    var showDeleteDialog by remember { mutableStateOf(false) }

    LaunchedEffect(medicineId) {
        viewModel.loadMedicine(medicineId)
    }

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("Medicine Details", fontWeight = FontWeight.Bold, fontSize = 22.sp) },
                navigationIcon = {
                    IconButton(onClick = onNavigateBack, modifier = Modifier.size(48.dp)) {
                        Icon(Icons.AutoMirrored.Rounded.ArrowBack, contentDescription = "Back", modifier = Modifier.size(28.dp))
                    }
                },
                actions = {
                    IconButton(onClick = { onNavigateToEdit(medicineId) }, modifier = Modifier.size(48.dp)) {
                        Icon(Icons.Rounded.Edit, contentDescription = "Edit Medicine", modifier = Modifier.size(26.dp))
                    }
                },
                colors = TopAppBarDefaults.topAppBarColors(
                    containerColor = MaterialTheme.colorScheme.surface,
                    titleContentColor = MaterialTheme.colorScheme.onSurface
                )
            )
        }
    ) { padding ->
        val med = medicine
        if (med == null) {
            Box(
                modifier = Modifier
                    .fillMaxSize()
                    .padding(padding),
                contentAlignment = Alignment.Center
            ) {
                CircularProgressIndicator()
            }
        } else {
            val expiryStatus = ExpirySafetyEvaluator.evaluate(med.expiryDate)
            val isExpired = expiryStatus.state == ExpiryState.EXPIRED
            val isExpiringSoon = expiryStatus.state == ExpiryState.EXPIRING_SOON

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
                    verticalArrangement = Arrangement.spacedBy(18.dp)
                ) {
                    // Critical Expiry Warning Banner
                    if (isExpired) {
                        Card(
                            colors = CardDefaults.cardColors(containerColor = ExpiryAlertRedContainer),
                            shape = RoundedCornerShape(16.dp),
                            modifier = Modifier.fillMaxWidth()
                        ) {
                            Column(
                                modifier = Modifier.padding(18.dp),
                                verticalArrangement = Arrangement.spacedBy(8.dp)
                            ) {
                                Row(
                                    verticalAlignment = Alignment.CenterVertically,
                                    horizontalArrangement = Arrangement.spacedBy(10.dp)
                                ) {
                                    Icon(
                                        Icons.Rounded.Dangerous,
                                        contentDescription = null,
                                        tint = ExpiryAlertRed,
                                        modifier = Modifier.size(36.dp)
                                    )
                                    Text(
                                        text = "SAFETY WARNING",
                                        fontWeight = FontWeight.Bold,
                                        fontSize = 18.sp,
                                        color = OnExpiryAlertRedContainer
                                    )
                                }
                                Text(
                                    text = "This medicine has expired. Please do not consume it.",
                                    fontWeight = FontWeight.Bold,
                                    fontSize = 18.sp,
                                    color = OnExpiryAlertRedContainer
                                )
                                Text(
                                    text = "Recorded Expiry Date: ${med.expiryDate}. Safely dispose of this medication and check with your pharmacy for replacement.",
                                    fontSize = 15.sp,
                                    color = OnExpiryAlertRedContainer
                                )
                            }
                        }
                    } else if (isExpiringSoon) {
                        Card(
                            colors = CardDefaults.cardColors(containerColor = ExpiryWarningAmberContainer),
                            shape = RoundedCornerShape(16.dp),
                            modifier = Modifier.fillMaxWidth()
                        ) {
                            Row(
                                modifier = Modifier.padding(16.dp),
                                verticalAlignment = Alignment.CenterVertically,
                                horizontalArrangement = Arrangement.spacedBy(12.dp)
                            ) {
                                Icon(Icons.Rounded.WarningAmber, contentDescription = null, tint = ExpiryWarningAmber, modifier = Modifier.size(32.dp))
                                Column {
                                    Text(
                                        text = "Expiring Soon",
                                        fontWeight = FontWeight.Bold,
                                        fontSize = 17.sp,
                                        color = ExpiryWarningAmber
                                    )
                                    Text(
                                        text = expiryStatus.message,
                                        fontSize = 15.sp,
                                        color = MaterialTheme.colorScheme.onSurface
                                    )
                                }
                            }
                        }
                    }

                    // Medicine Overview Card
                    Card(
                        modifier = Modifier.fillMaxWidth(),
                        shape = RoundedCornerShape(16.dp),
                        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
                        elevation = CardDefaults.cardElevation(defaultElevation = 2.dp)
                    ) {
                        Column(
                            modifier = Modifier.padding(20.dp),
                            verticalArrangement = Arrangement.spacedBy(12.dp)
                        ) {
                            Text(
                                text = med.name,
                                style = MaterialTheme.typography.headlineMedium.copy(
                                    fontWeight = FontWeight.Bold,
                                    fontSize = 26.sp
                                ),
                                color = MaterialTheme.colorScheme.onSurface
                            )

                            Text(
                                text = "Dosage: ${med.dosage}",
                                style = MaterialTheme.typography.titleMedium.copy(
                                    fontWeight = FontWeight.SemiBold,
                                    fontSize = 20.sp,
                                    color = MaterialTheme.colorScheme.primary
                                )
                            )

                            HorizontalDivider(color = MaterialTheme.colorScheme.outlineVariant)

                            DetailRow(label = "Schedule", value = "${med.reminderTime} (${med.frequency})")
                            DetailRow(label = "Expiry Date", value = med.expiryDate)

                            if (med.instructions.isNotBlank() || med.notes.isNotBlank()) {
                                val note = med.instructions.ifBlank { med.notes }
                                DetailRow(label = "Instructions", value = note)
                            }
                        }
                    }

                    // Supply Tracking Card
                    Card(
                        modifier = Modifier.fillMaxWidth(),
                        shape = RoundedCornerShape(16.dp),
                        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
                        elevation = CardDefaults.cardElevation(defaultElevation = 2.dp)
                    ) {
                        Row(
                            modifier = Modifier
                                .fillMaxWidth()
                                .padding(20.dp),
                            horizontalArrangement = Arrangement.SpaceBetween,
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Column {
                                Text(
                                    text = "Cabinet Supply",
                                    style = MaterialTheme.typography.titleMedium.copy(
                                        fontWeight = FontWeight.Bold,
                                        fontSize = 18.sp
                                    )
                                )
                                Text(
                                    text = "${med.supplyCount} doses remaining",
                                    style = MaterialTheme.typography.bodyLarge.copy(
                                        fontSize = 16.sp,
                                        color = MaterialTheme.colorScheme.onSurfaceVariant
                                    )
                                )
                            }

                            Row(
                                verticalAlignment = Alignment.CenterVertically,
                                horizontalArrangement = Arrangement.spacedBy(8.dp)
                            ) {
                                FilledIconButton(
                                    onClick = {
                                        if (med.supplyCount > 0) {
                                            viewModel.updateSupply(med.id, med.supplyCount - 1)
                                        }
                                    },
                                    shape = CircleShape,
                                    modifier = Modifier.size(48.dp)
                                ) {
                                    Icon(Icons.Rounded.Remove, contentDescription = "Decrease Dose")
                                }

                                FilledIconButton(
                                    onClick = {
                                        viewModel.updateSupply(med.id, med.supplyCount + 10)
                                    },
                                    shape = CircleShape,
                                    modifier = Modifier.size(48.dp)
                                ) {
                                    Icon(Icons.Rounded.Add, contentDescription = "Refill +10")
                                }
                            }
                        }
                    }

                    Spacer(modifier = Modifier.height(8.dp))

                    // Edit Button
                    Button(
                        onClick = { onNavigateToEdit(medicineId) },
                        modifier = Modifier
                            .fillMaxWidth()
                            .height(56.dp),
                        shape = RoundedCornerShape(14.dp)
                    ) {
                        Icon(Icons.Rounded.Edit, contentDescription = null)
                        Spacer(modifier = Modifier.width(8.dp))
                        Text("Edit Medicine Information", fontSize = 17.sp, fontWeight = FontWeight.Bold)
                    }

                    // Delete Button
                    OutlinedButton(
                        onClick = { showDeleteDialog = true },
                        modifier = Modifier
                            .fillMaxWidth()
                            .height(56.dp),
                        shape = RoundedCornerShape(14.dp),
                        colors = ButtonDefaults.outlinedButtonColors(contentColor = MaterialTheme.colorScheme.error)
                    ) {
                        Icon(Icons.Rounded.DeleteOutline, contentDescription = null)
                        Spacer(modifier = Modifier.width(8.dp))
                        Text("Delete Medicine", fontSize = 17.sp, fontWeight = FontWeight.Bold)
                    }
                }
            }

            if (showDeleteDialog) {
                AlertDialog(
                    onDismissRequest = { showDeleteDialog = false },
                    title = { Text("Delete ${med.name}?", fontWeight = FontWeight.Bold, fontSize = 20.sp) },
                    text = {
                        Text(
                            "Are you sure you want to delete this medicine and cancel all reminders?",
                            fontSize = 17.sp
                        )
                    },
                    confirmButton = {
                        Button(
                            onClick = {
                                showDeleteDialog = false
                                viewModel.deleteMedicine(context, med, onNavigateBack)
                            },
                            colors = ButtonDefaults.buttonColors(containerColor = MaterialTheme.colorScheme.error)
                        ) {
                            Text("Delete", fontWeight = FontWeight.Bold, fontSize = 16.sp)
                        }
                    },
                    dismissButton = {
                        OutlinedButton(onClick = { showDeleteDialog = false }) {
                            Text("Cancel", fontSize = 16.sp)
                        }
                    }
                )
            }
        }
    }
}

@Composable
fun DetailRow(label: String, value: String) {
    Column(modifier = Modifier.fillMaxWidth()) {
        Text(
            text = label,
            fontSize = 14.sp,
            color = MaterialTheme.colorScheme.onSurfaceVariant,
            fontWeight = FontWeight.Medium
        )
        Text(
            text = value,
            fontSize = 18.sp,
            color = MaterialTheme.colorScheme.onSurface,
            fontWeight = FontWeight.SemiBold
        )
    }
}
