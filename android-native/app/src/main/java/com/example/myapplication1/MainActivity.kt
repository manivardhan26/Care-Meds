package com.example.myapplication1

import android.Manifest
import android.content.pm.PackageManager
import android.os.Build
import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.layout.*
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.rounded.CalendarMonth
import androidx.compose.material.icons.rounded.History
import androidx.compose.material.icons.rounded.Home
import androidx.compose.material.icons.rounded.Settings
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.core.content.ContextCompat
import androidx.lifecycle.viewmodel.compose.viewModel
import com.example.myapplication1.data.database.CareMedsDatabase
import com.example.myapplication1.data.repository.CareMedsRepository
import com.example.myapplication1.receiver.ReminderScheduler
import com.example.myapplication1.ui.screen.*
import com.example.myapplication1.ui.theme.CareMedsTheme
import com.example.myapplication1.ui.viewmodel.*

enum class CareMedsTab(val title: String, val icon: ImageVector) {
    HOME("Home", Icons.Rounded.Home),
    CALENDAR("Calendar", Icons.Rounded.CalendarMonth),
    HISTORY("History", Icons.Rounded.History),
    SETTINGS("Settings", Icons.Rounded.Settings)
}

sealed class Screen {
    object Main : Screen()
    object AddMedicine : Screen()
    data class EditMedicine(val id: Long) : Screen()
    data class MedicineDetail(val id: Long) : Screen()
    object Scan : Screen()
    object ScanReview : Screen()
}

class MainActivity : ComponentActivity() {

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        enableEdgeToEdge()

        // Create notification channel for medication reminders
        ReminderScheduler.createNotificationChannel(this)

        setContent {
            val context = LocalContext.current
            val db = remember { CareMedsDatabase.getDatabase(context) }
            val repository = remember { CareMedsRepository(db.medicineDao(), db.adherenceDao()) }

            val settingsViewModel: SettingsViewModel = viewModel(factory = SettingsViewModel.Factory(context))
            val settingsState by settingsViewModel.uiState.collectAsState()

            // Request Notification Permission on Android 13+
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
                val permissionLauncher = rememberLauncherForActivityResult(
                    contract = ActivityResultContracts.RequestPermission()
                ) { _ -> }

                LaunchedEffect(Unit) {
                    if (ContextCompat.checkSelfPermission(
                            context,
                            Manifest.permission.POST_NOTIFICATIONS
                        ) != PackageManager.PERMISSION_GRANTED
                    ) {
                        permissionLauncher.launch(Manifest.permission.POST_NOTIFICATIONS)
                    }
                }
            }

            CareMedsTheme(darkTheme = settingsState.isDarkMode) {
                CareMedsApp(
                    repository = repository,
                    settingsViewModel = settingsViewModel
                )
            }
        }
    }
}

@Composable
fun CareMedsApp(
    repository: CareMedsRepository,
    settingsViewModel: SettingsViewModel
) {
    val context = LocalContext.current

    val dashboardViewModel: DashboardViewModel = viewModel(factory = DashboardViewModel.Factory(repository))
    val medicineViewModel: MedicineViewModel = viewModel(factory = MedicineViewModel.Factory(repository))
    val calendarViewModel: CalendarViewModel = viewModel(factory = CalendarViewModel.Factory(repository))
    val historyViewModel: HistoryViewModel = viewModel(factory = HistoryViewModel.Factory(repository))
    val scanViewModel: ScanViewModel = viewModel(factory = ScanViewModel.Factory(repository))

    var currentTab by remember { mutableStateOf(CareMedsTab.HOME) }
    var currentScreen by remember { mutableStateOf<Screen>(Screen.Main) }

    when (val screen = currentScreen) {
        is Screen.AddMedicine -> {
            AddEditMedicineScreen(
                viewModel = medicineViewModel,
                existingMedicineId = null,
                onNavigateBack = { currentScreen = Screen.Main },
                onNavigateToScan = { currentScreen = Screen.Scan }
            )
        }

        is Screen.EditMedicine -> {
            AddEditMedicineScreen(
                viewModel = medicineViewModel,
                existingMedicineId = screen.id,
                onNavigateBack = { currentScreen = Screen.Main },
                onNavigateToScan = { currentScreen = Screen.Scan }
            )
        }

        is Screen.MedicineDetail -> {
            MedicineDetailScreen(
                medicineId = screen.id,
                viewModel = medicineViewModel,
                onNavigateBack = { currentScreen = Screen.Main },
                onNavigateToEdit = { id -> currentScreen = Screen.EditMedicine(id) }
            )
        }

        is Screen.Scan -> {
            ScanScreen(
                viewModel = scanViewModel,
                onNavigateToReview = { currentScreen = Screen.ScanReview },
                onBack = { currentScreen = Screen.Main }
            )
        }

        is Screen.ScanReview -> {
            ScanReviewScreen(
                viewModel = scanViewModel,
                onSaveSuccess = { currentScreen = Screen.Main },
                onRetake = { currentScreen = Screen.Scan }
            )
        }

        is Screen.Main -> {
            Scaffold(
                bottomBar = {
                    NavigationBar(
                        containerColor = MaterialTheme.colorScheme.surface,
                        tonalElevation = 8.dp,
                        modifier = Modifier.height(72.dp)
                    ) {
                        CareMedsTab.values().forEach { tab ->
                            val selected = currentTab == tab
                            NavigationBarItem(
                                selected = selected,
                                onClick = { currentTab = tab },
                                icon = {
                                    Icon(
                                        imageVector = tab.icon,
                                        contentDescription = tab.title,
                                        modifier = Modifier.size(28.dp)
                                    )
                                },
                                label = {
                                    Text(
                                        text = tab.title,
                                        fontSize = 14.sp,
                                        fontWeight = if (selected) FontWeight.Bold else FontWeight.Medium
                                    )
                                },
                                colors = NavigationBarItemDefaults.colors(
                                    selectedIconColor = MaterialTheme.colorScheme.primary,
                                    selectedTextColor = MaterialTheme.colorScheme.primary,
                                    indicatorColor = MaterialTheme.colorScheme.secondaryContainer
                                )
                            )
                        }
                    }
                }
            ) { innerPadding ->
                Box(modifier = Modifier.padding(innerPadding)) {
                    when (currentTab) {
                        CareMedsTab.HOME -> {
                            DashboardScreen(
                                viewModel = dashboardViewModel,
                                onNavigateToAdd = { currentScreen = Screen.AddMedicine },
                                onNavigateToDetail = { id -> currentScreen = Screen.MedicineDetail(id) }
                            )
                        }

                        CareMedsTab.CALENDAR -> {
                            CalendarScreen(viewModel = calendarViewModel)
                        }

                        CareMedsTab.HISTORY -> {
                            HistoryScreen(viewModel = historyViewModel)
                        }

                        CareMedsTab.SETTINGS -> {
                            SettingsScreen(viewModel = settingsViewModel)
                        }
                    }
                }
            }
        }
    }
}