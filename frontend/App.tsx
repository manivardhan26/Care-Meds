import React, { useMemo, useState, useEffect } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { NavigationContainer, DefaultTheme, DarkTheme, Theme } from '@react-navigation/native';
import { StatusBar } from 'expo-status-bar';
import { ThemeProvider, useTheme } from './src/theme/ThemeContext';
import RootNavigator from './src/navigation/RootNavigator';
import { initNotifications, addReminderTriggerListener } from './src/services/notificationService';
import { getMedicines } from './src/storage/medicineStorage';
import ReminderModal from './src/components/ReminderModal';
import { Medicine } from './src/types';

function AppContent() {
  const { isDarkMode, colors } = useTheme();
  const [triggeredMed, setTriggeredMed] = useState<Medicine | null>(null);
  const [triggeredIsSnooze, setTriggeredIsSnooze] = useState(false);

  useEffect(() => {
    // Re-arm stored notifications upon app startup
    initNotifications().catch((e) => console.warn('initNotifications error:', e));

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
