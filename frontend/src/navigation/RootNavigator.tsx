import React from 'react';
import { View, TouchableOpacity, StyleSheet } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../theme/ThemeContext';

import HomeScreen from '../screens/HomeScreen';
import CalendarScreen from '../screens/CalendarScreen';
import HistoryScreen from '../screens/HistoryScreen';
import SettingsScreen from '../screens/SettingsScreen';
import AddEditMedicineScreen from '../screens/AddEditMedicineScreen';
import MedicineDetailScreen from '../screens/MedicineDetailScreen';
import ScanScreen from '../screens/ScanScreen';
import ScanReviewScreen from '../screens/ScanReviewScreen';
import MedicineListScreen from '../screens/MedicineListScreen';
import RemindersScreen from '../screens/RemindersScreen';

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

function CustomCenterButton({ onPress, colors, isDarkMode }: any) {
  return (
    <TouchableOpacity
      style={[
        styles.centerButton,
        { backgroundColor: isDarkMode ? colors.fabGold : colors.fabGold || '#E5A91A' },
      ]}
      onPress={onPress}
      activeOpacity={0.88}
    >
      <Ionicons name="add" size={32} color="#FFFFFF" />
    </TouchableOpacity>
  );
}

function MainTabs({ navigation }: any) {
  const { colors, isDarkMode } = useTheme();

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarStyle: {
          height: 70,
          paddingBottom: 10,
          paddingTop: 8,
          backgroundColor: colors.surface,
          borderTopWidth: 1,
          borderTopColor: colors.border,
        },
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: '600',
        },
        tabBarIcon: ({ focused, color, size }) => {
          let iconName: any = 'home';
          if (route.name === 'Home') {
            iconName = focused ? 'home' : 'home-outline';
          } else if (route.name === 'Calendar') {
            iconName = focused ? 'calendar' : 'calendar-outline';
          } else if (route.name === 'Insights' || route.name === 'History') {
            iconName = focused ? 'bulb' : 'bulb-outline';
          } else if (route.name === 'Profile' || route.name === 'Settings') {
            iconName = focused ? 'person' : 'person-outline';
          }
          return <Ionicons name={iconName} size={24} color={color} />;
        },
      })}
    >
      <Tab.Screen name="Home" component={HomeScreen} />
      <Tab.Screen name="Calendar" component={CalendarScreen} />
      <Tab.Screen
        name="AddTab"
        component={View}
        options={{
          tabBarLabel: '',
          tabBarButton: (props) => (
            <CustomCenterButton
              {...props}
              colors={colors}
              isDarkMode={isDarkMode}
              onPress={() => navigation.navigate('AddMedicine')}
            />
          ),
        }}
      />
      <Tab.Screen
        name="Insights"
        component={HistoryScreen}
        options={{ tabBarLabel: 'Insights' }}
      />
      <Tab.Screen
        name="Profile"
        component={SettingsScreen}
        options={{ tabBarLabel: 'Profile' }}
      />
    </Tab.Navigator>
  );
}

export default function RootNavigator() {
  const { colors } = useTheme();

  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: colors.background },
      }}
    >
      <Stack.Screen name="MainTabs" component={MainTabs} />
      <Stack.Screen name="AddMedicine" component={AddEditMedicineScreen} />
      <Stack.Screen name="EditMedicine" component={AddEditMedicineScreen} />
      <Stack.Screen name="MedicineDetail" component={MedicineDetailScreen} />
      <Stack.Screen name="MedicineList" component={MedicineListScreen} />
      <Stack.Screen name="Reminders" component={RemindersScreen} />
      <Stack.Screen name="Scan" component={ScanScreen} />
      <Stack.Screen name="ScanReview" component={ScanReviewScreen} />
      {/* Route aliases for existing screen navigation */}
      <Stack.Screen name="History" component={HistoryScreen} />
      <Stack.Screen name="Settings" component={SettingsScreen} />
    </Stack.Navigator>
  );
}

const styles = StyleSheet.create({
  centerButton: {
    top: -16,
    width: 54,
    height: 54,
    borderRadius: 27,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 5,
    elevation: 6,
  },
});
