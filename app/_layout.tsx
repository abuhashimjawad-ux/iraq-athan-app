import React, { useEffect } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { AppState, I18nManager } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { Cairo_400Regular, Cairo_700Bold, useFonts } from '@expo-google-fonts/cairo';
import NetworkIndicator from '../components/NetworkIndicator';
import {
  disposePrayerNotifications,
  initializePrayerNotifications,
  reschedulePrayerNotificationsFromStorage,
} from '../utils/prayerNotifications';

if (!I18nManager.isRTL) {
  I18nManager.allowRTL(true);
  I18nManager.forceRTL(true);
}

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    Cairo_400Regular,
    Cairo_700Bold,
  });

  useEffect(() => {
    initializePrayerNotifications().catch(console.error);
    reschedulePrayerNotificationsFromStorage().catch(() => undefined);

    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') {
        reschedulePrayerNotificationsFromStorage().catch(() => undefined);
      }
    });

    return () => {
      subscription.remove();
      disposePrayerNotifications().catch(() => undefined);
    };
  }, []);

  if (!fontsLoaded) {
    return null;
  }

  return (
    <SafeAreaProvider>
      <StatusBar style="dark" />
      <NetworkIndicator />
      <Stack
        screenOptions={{
          headerShown: false,
          animation: 'slide_from_left',
          contentStyle: { backgroundColor: '#F3EAD2' },
        }}
      />
    </SafeAreaProvider>
  );
}
