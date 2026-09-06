package com.example.myapplication1.data.util

import android.content.Context
import android.speech.tts.TextToSpeech
import android.util.Log
import java.util.Locale

class VoiceReminderHelper(context: Context) : TextToSpeech.OnInitListener {

    private var tts: TextToSpeech? = null
    private var isInitialized = false

    init {
        tts = TextToSpeech(context.applicationContext, this)
    }

    override fun onInit(status: Int) {
        if (status == TextToSpeech.SUCCESS) {
            val result = tts?.setLanguage(Locale.getDefault())
            if (result == TextToSpeech.LANG_MISSING_DATA || result == TextToSpeech.LANG_NOT_SUPPORTED) {
                tts?.setLanguage(Locale.US)
            }
            tts?.setSpeechRate(0.85f) // Slightly slower rate, easier for elderly users to comprehend
            tts?.setPitch(1.0f)
            isInitialized = true
        } else {
            Log.e("VoiceReminderHelper", "TextToSpeech initialization failed with code: $status")
        }
    }

    fun speakReminder(medicineName: String, dosage: String) {
        val text = "It is time to take your medicine: $medicineName, $dosage."
        speakText(text)
    }

    fun speakText(text: String) {
        if (isInitialized && tts != null) {
            tts?.speak(text, TextToSpeech.QUEUE_FLUSH, null, "CareMedsUtteranceId")
        }
    }

    fun stop() {
        tts?.stop()
    }

    fun shutdown() {
        tts?.stop()
        tts?.shutdown()
        tts = null
        isInitialized = false
    }
}
