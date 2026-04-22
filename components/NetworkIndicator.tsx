/**
 * Network Status Indicator
 * Shows online/offline status at the top of the app
 */
import React, { useState, useEffect } from 'react';
import { Text, StyleSheet, Animated } from 'react-native';

function supportsWindowEvents() {
  return (
    typeof window !== 'undefined' &&
    typeof window.addEventListener === 'function' &&
    typeof window.removeEventListener === 'function'
  );
}

function getOnlineStatus() {
  if (typeof navigator !== 'undefined' && typeof navigator.onLine === 'boolean') {
    return navigator.onLine;
  }
  return true;
}

export default function NetworkIndicator() {
  const [isConnected, setIsConnected] = useState(getOnlineStatus());
  const [showIndicator, setShowIndicator] = useState(false);
  const fadeAnim = useState(new Animated.Value(0))[0];

  useEffect(() => {
    const updateStatus = (connected: boolean) => {
      setIsConnected((prev) => {
        if (prev !== connected) {
          setShowIndicator(true);
          Animated.timing(fadeAnim, {
            toValue: 1,
            duration: 300,
            useNativeDriver: true,
          }).start();

          setTimeout(() => {
            Animated.timing(fadeAnim, {
              toValue: 0,
              duration: 300,
              useNativeDriver: true,
            }).start(() => setShowIndicator(false));
          }, 3000);
        }
        return connected;
      });
    };

    updateStatus(getOnlineStatus());

    if (supportsWindowEvents()) {
      const handleOnline = () => updateStatus(true);
      const handleOffline = () => updateStatus(false);
      window.addEventListener('online', handleOnline);
      window.addEventListener('offline', handleOffline);

      return () => {
        window.removeEventListener('online', handleOnline);
        window.removeEventListener('offline', handleOffline);
      };
    }

    return undefined;
  }, [fadeAnim]);

  if (!showIndicator) {
    return null;
  }

  return (
    <Animated.View
      style={[
        styles.container,
        isConnected ? styles.online : styles.offline,
        { opacity: fadeAnim },
      ]}
    >
      <Text style={styles.text}>
        {isConnected ? '🟢 متصل بالإنترنت' : '🔴 وضع Offline - بدون إنترنت'}
      </Text>
    </Animated.View>
  );
}

export function useNetworkStatus() {
  const [isConnected, setIsConnected] = useState(getOnlineStatus());
  const isLoading = false;

  useEffect(() => {
    if (supportsWindowEvents()) {
      const handleOnline = () => setIsConnected(true);
      const handleOffline = () => setIsConnected(false);
      window.addEventListener('online', handleOnline);
      window.addEventListener('offline', handleOffline);

      return () => {
        window.removeEventListener('online', handleOnline);
        window.removeEventListener('offline', handleOffline);
      };
    }

    return undefined;
  }, []);

  return { isConnected, isLoading };
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    paddingVertical: 8,
    paddingHorizontal: 16,
    zIndex: 1000,
    alignItems: 'center',
    justifyContent: 'center',
  },
  online: {
    backgroundColor: '#10b981',
  },
  offline: {
    backgroundColor: '#ef4444',
  },
  text: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
  },
});
