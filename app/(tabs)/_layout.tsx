import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function TabLayout() {
  const insets = useSafeAreaInsets();

  const bottomOffset = Platform.OS === 'ios'
    ? Math.max(insets.bottom, 12) + 28
    : 42;

  const tabBarHeight = Platform.OS === 'ios'
    ? 54 + insets.bottom
    : 68;
  
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        sceneStyle: {
          backgroundColor: '#F3EAD2',
        },
        tabBarStyle: {
          position: 'absolute',
          left: 12,
          right: 12,
          bottom: bottomOffset,
          backgroundColor: '#1E3A5F',
          borderTopColor: '#162D4A',
          borderTopWidth: 1,
          borderRadius: 18,
          height: tabBarHeight,
          paddingBottom: Platform.OS === 'ios' ? Math.max(insets.bottom, 8) : 10,
          paddingTop: 8,
          elevation: 10,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: -2 },
          shadowOpacity: 0.1,
          shadowRadius: 3,
          overflow: 'hidden',
        },
        tabBarActiveTintColor: '#C9A95F',
        tabBarInactiveTintColor: '#7A9BBF',
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '600',
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'المقامات',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="musical-notes" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="prayers"
        options={{
          title: 'الصلوات',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="moon" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="qibla"
        options={{
          title: 'القبلة',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="compass" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: 'الإعدادات',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="settings" size={size} color={color} />
          ),
        }}
      />
    </Tabs>
  );
}