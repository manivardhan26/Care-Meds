package com.example.myapplication1.ui.theme

import android.os.Build
import androidx.compose.foundation.isSystemInDarkTheme
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.darkColorScheme
import androidx.compose.material3.dynamicDarkColorScheme
import androidx.compose.material3.dynamicLightColorScheme
import androidx.compose.material3.lightColorScheme
import androidx.compose.runtime.Composable
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext

private val DarkColorScheme = darkColorScheme(
    primary = CareTealPrimaryContainer,
    onPrimary = CareTealOnPrimaryContainer,
    primaryContainer = CareTealPrimary,
    onPrimaryContainer = Color.White,
    secondary = CareSecondaryContainer,
    onSecondary = CareOnSecondaryContainer,
    background = Color(0xFF191C1D),
    surface = Color(0xFF1F2424),
    onBackground = Color(0xFFE0E3E3),
    onSurface = Color(0xFFE0E3E3),
    error = ExpiryAlertRed,
    onError = Color.White
)

private val LightColorScheme = lightColorScheme(
    primary = CareTealPrimary,
    onPrimary = CareTealOnPrimary,
    primaryContainer = CareTealPrimaryContainer,
    onPrimaryContainer = CareTealOnPrimaryContainer,
    secondary = CareSecondary,
    onSecondary = CareOnSecondary,
    secondaryContainer = CareSecondaryContainer,
    onSecondaryContainer = CareOnSecondaryContainer,
    background = CareBackground,
    surface = CareSurface,
    onBackground = CareOnBackground,
    onSurface = CareOnSurface,
    error = ExpiryAlertRed,
    onError = Color.White,
    errorContainer = ExpiryAlertRedContainer,
    onErrorContainer = OnExpiryAlertRedContainer
)

@Composable
fun CareMedsTheme(
    darkTheme: Boolean = isSystemInDarkTheme(),
    dynamicColor: Boolean = false, // Set false to prioritize high-contrast CareMeds healthcare identity
    content: @Composable () -> Unit
) {
    val colorScheme = when {
        dynamicColor && Build.VERSION.SDK_INT >= Build.VERSION_CODES.S -> {
            val context = LocalContext.current
            if (darkTheme) dynamicDarkColorScheme(context) else dynamicLightColorScheme(context)
        }
        darkTheme -> DarkColorScheme
        else -> LightColorScheme
    }

    MaterialTheme(
        colorScheme = colorScheme,
        typography = Typography,
        content = content
    )
}

// Retain alias for existing references
@Composable
fun MyApplication1Theme(
    darkTheme: Boolean = isSystemInDarkTheme(),
    dynamicColor: Boolean = false,
    content: @Composable () -> Unit
) {
    CareMedsTheme(darkTheme = darkTheme, dynamicColor = dynamicColor, content = content)
}