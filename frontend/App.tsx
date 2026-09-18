import React, { useMemo, useState, useEffect } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { NavigationContainer, DefaultTheme, DarkTheme, Theme } from '@react-navigation/native';
import { StatusBar } from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';
import { ThemeProvider, useTheme } from './src/theme/ThemeContext';
import RootNavigator from './src/navigation/RootNavigator';
import { initNotifications, addReminderTriggerListener } from './src/services/notificationService';
import { getMedicines } from './src/storage/medicineStorage';
import ReminderModal from './src/components/ReminderModal';
import { Medicine } from './src/types';

// Prevent splash screen from auto-hiding before initialization is ready
SplashScreen.preventAutoHideAsync().catch(() => {});

function AppContent() {
  const { isDarkMode, colors } = useTheme();
  const [triggeredMed, setTriggeredMed] = useState<Medicine | null>(null);
  const [triggeredIsSnooze, setTriggeredIsSnooze] = useState(false);

  useEffect(() => {
    let isMounted = true;

    // Safety fallback: guaranteed hide after 1000ms even if any initialization throws
    const splashTimeout = setTimeout(() => {
      SplashScreen.hideAsync().catch(() => {});
    }, 1000);

    async function startup() {
      try {
        // 1. Initialize native notifications & channels
        await initNotifications();
      } catch (e) {
        console.warn('Startup notification initialization error:', e);
      } finally {
        clearTimeout(splashTimeout);
        if (isMounted) {
          await SplashScreen.hideAsync().catch(() => {});
        }
      }
    }

    startup();

    // Global in-app reminder trigger listener
    const unsubscribe = addReminderTriggerListener(async (item) => {
      try {
        const meds = await getMedicines();
        const found = meds.find((m) => m.id === item.medicineId);
        // If medicine was deleted from the app, suppress phantom reminder modal
        if (!found) {
          return;
        }
        setTriggeredMed(found);
        setTriggeredIsSnooze(Boolean(item.isSnooze));
      } catch (e) {
        console.warn('Failed to resolve triggered medicine:', e);
      }
    });

    return () => {
      isMounted = false;
      clearTimeout(splashTimeout);
      unsubscribe();
    };
  }, []);

  const navigationTheme: Theme = useMemo(() => {
    const baseTheme = isDarkMode ? DarkTheme : DefaultTheme;
    return {
      ...baseTheme,
      dark: isDarkMode,
      colors: {
        ...baseTheme.colors,
        primary: colors.primary,
        background: colors.background,
        card: colors.surface,
        text: colors.textPrimary,
        border: colors.border,
        notification: colors.alertRed,
      },
    };
  }, [isDarkMode, colors]);

  return (
    <NavigationContainer theme={navigationTheme}>
      <StatusBar style={isDarkMode ? 'light' : 'dark'} />
      <RootNavigator />
      <ReminderModal
        visible={!!triggeredMed}
        medicine={triggeredMed}
        isSnoozed={triggeredIsSnooze}
        onDismiss={() => setTriggeredMed(null)}
        onActionComplete={() => setTriggeredMed(null)}
      />
    </NavigationContainer>
  );
}

export default function App() {
  return (
    <SafeAreaProvider>
      <ThemeProvider>
        <AppContent />
      </ThemeProvider>
    </SafeAreaProvider>
  );
}
