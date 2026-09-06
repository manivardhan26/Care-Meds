package com.example.myapplication1.ui.viewmodel

import android.content.Context
import androidx.lifecycle.ViewModel
import androidx.lifecycle.ViewModelProvider
import com.example.myapplication1.data.util.VoiceReminderHelper
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow

data class SettingsUiState(
    val voiceRemindersEnabled: Boolean = true,
    val soundAlertsEnabled: Boolean = true,
    val snoozeMinutes: Int = 15,
    val isDarkMode: Boolean = false
)

class SettingsViewModel(context: Context) : ViewModel() {

    private val prefs = context.getSharedPreferences("caremeds_prefs", Context.MODE_PRIVATE)
    private val voiceHelper = VoiceReminderHelper(context)

    private val _uiState = MutableStateFlow(
        SettingsUiState(
            voiceRemindersEnabled = prefs.getBoolean("voice_reminders_enabled", true),
            soundAlertsEnabled = prefs.getBoolean("sound_alerts_enabled", true),
            snoozeMinutes = prefs.getInt("snooze_minutes", 15),
            isDarkMode = prefs.getBoolean("dark_mode_enabled", false)
        )
    )
    val uiState: StateFlow<SettingsUiState> = _uiState.asStateFlow()

    fun setVoiceRemindersEnabled(enabled: Boolean) {
        prefs.edit().putBoolean("voice_reminders_enabled", enabled).apply()
        _uiState.value = _uiState.value.copy(voiceRemindersEnabled = enabled)
    }

    fun setSoundAlertsEnabled(enabled: Boolean) {
        prefs.edit().putBoolean("sound_alerts_enabled", enabled).apply()
        _uiState.value = _uiState.value.copy(soundAlertsEnabled = enabled)
    }

    fun setSnoozeMinutes(minutes: Int) {
        prefs.edit().putInt("snooze_minutes", minutes).apply()
        _uiState.value = _uiState.value.copy(snoozeMinutes = minutes)
    }

    fun setDarkMode(enabled: Boolean) {
        prefs.edit().putBoolean("dark_mode_enabled", enabled).apply()
        _uiState.value = _uiState.value.copy(isDarkMode = enabled)
    }

    fun testVoiceReminder() {
        voiceHelper.speakText("This is a test of your CareMeds voice reminder. Have you taken your medicine today?")
    }

    override fun onCleared() {
        super.onCleared()
        voiceHelper.shutdown()
    }

    class Factory(private val context: Context) : ViewModelProvider.Factory {
        @Suppress("UNCHECKED_CAST")
        override fun <T : ViewModel> create(modelClass: Class<T>): T {
            return SettingsViewModel(context) as T
        }
    }
}
