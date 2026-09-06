package com.example.myapplication1.ui.screen

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.rounded.Check
import androidx.compose.material.icons.rounded.Refresh
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.example.myapplication1.ui.viewmodel.ScanViewModel

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun ScanReviewScreen(
    viewModel: ScanViewModel,
    onSaveSuccess: () -> Unit,
    onRetake: () -> Unit
) {
    val scannedInfo = viewModel.scannedInfo

    var name by remember { mutableStateOf(scannedInfo?.name ?: "") }
    var dosage by remember { mutableStateOf(scannedInfo?.dosage ?: "") }
    var instructions by remember { mutableStateOf(scannedInfo?.instructions ?: "") }
    var expiryDate by remember { mutableStateOf(scannedInfo?.expiryDate ?: "") }
    var supplyCountStr by remember { mutableStateOf(scannedInfo?.supplyCount?.toString() ?: "30") }

    LaunchedEffect(scannedInfo) {
        scannedInfo?.let {
            name = it.name
            dosage = it.dosage
            instructions = it.instructions
            expiryDate = it.expiryDate
            supplyCountStr = it.supplyCount.toString()
        }
    }

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("Review & Confirm Medicine", fontSize = 22.sp, fontWeight = FontWeight.Bold) },
                colors = TopAppBarDefaults.topAppBarColors(
                    containerColor = MaterialTheme.colorScheme.primaryContainer,
                    titleContentColor = MaterialTheme.colorScheme.onPrimaryContainer
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
                    .padding(24.dp),
                verticalArrangement = Arrangement.spacedBy(20.dp),
                horizontalAlignment = Alignment.CenterHorizontally
            ) {
                Text(
                    text = "Please verify the extracted details below. You can tap any field to correct it before saving.",
                    style = MaterialTheme.typography.bodyLarge.copy(fontSize = 18.sp),
                    color = MaterialTheme.colorScheme.onBackground
                )

                OutlinedTextField(
                    value = name,
                    onValueChange = { name = it },
                    label = { Text("Medicine Name", fontSize = 16.sp, fontWeight = FontWeight.Bold) },
                    modifier = Modifier.fillMaxWidth(),
                    textStyle = TextStyle(fontSize = 20.sp, fontWeight = FontWeight.Bold),
                    shape = RoundedCornerShape(12.dp)
                )

                OutlinedTextField(
                    value = dosage,
                    onValueChange = { dosage = it },
                    label = { Text("Dosage (e.g. 500mg)", fontSize = 16.sp, fontWeight = FontWeight.Bold) },
                    modifier = Modifier.fillMaxWidth(),
                    textStyle = TextStyle(fontSize = 20.sp, fontWeight = FontWeight.Bold),
                    shape = RoundedCornerShape(12.dp)
                )

                OutlinedTextField(
                    value = instructions,
                    onValueChange = { instructions = it },
                    label = { Text("Instructions / Schedule", fontSize = 16.sp, fontWeight = FontWeight.Bold) },
                    modifier = Modifier.fillMaxWidth(),
                    textStyle = TextStyle(fontSize = 18.sp),
                    shape = RoundedCornerShape(12.dp),
                    minLines = 2
                )

                OutlinedTextField(
                    value = expiryDate,
                    onValueChange = { expiryDate = it },
                    label = { Text("Expiry Date", fontSize = 16.sp, fontWeight = FontWeight.Bold) },
                    modifier = Modifier.fillMaxWidth(),
                    textStyle = TextStyle(fontSize = 18.sp),
                    shape = RoundedCornerShape(12.dp)
                )

                OutlinedTextField(
                    value = supplyCountStr,
                    onValueChange = { supplyCountStr = it },
                    label = { Text("Supply Count (Pills/Capsules)", fontSize = 16.sp, fontWeight = FontWeight.Bold) },
                    modifier = Modifier.fillMaxWidth(),
                    textStyle = TextStyle(fontSize = 18.sp),
                    shape = RoundedCornerShape(12.dp)
                )

                Spacer(modifier = Modifier.height(10.dp))

                Button(
                    onClick = {
                        val supply = supplyCountStr.toIntOrNull() ?: 30
                        viewModel.saveMedicine(
                            name = name.ifBlank { "Medicine" },
                            dosage = dosage.ifBlank { "1 tablet" },
                            instructions = instructions.ifBlank { "As directed" },
                            expiryDate = expiryDate.ifBlank { "12/2026" },
                            supplyCount = supply,
                            onSuccess = onSaveSuccess
                        )
                    },
                    modifier = Modifier
                        .fillMaxWidth()
                        .height(64.dp),
                    shape = RoundedCornerShape(16.dp),
                    colors = ButtonDefaults.buttonColors(containerColor = MaterialTheme.colorScheme.primary)
                ) {
                    Icon(Icons.Rounded.Check, contentDescription = null, modifier = Modifier.size(28.dp))
                    Spacer(modifier = Modifier.width(12.dp))
                    Text("Confirm & Save to Meds", fontSize = 20.sp, fontWeight = FontWeight.Bold)
                }

                OutlinedButton(
                    onClick = onRetake,
                    modifier = Modifier
                        .fillMaxWidth()
                        .height(56.dp),
                    shape = RoundedCornerShape(16.dp)
                ) {
                    Icon(Icons.Rounded.Refresh, contentDescription = null, modifier = Modifier.size(24.dp))
                    Spacer(modifier = Modifier.width(8.dp))
                    Text("Scan Again / Pick Another", fontSize = 18.sp)
                }
            }
        }
    }
}
