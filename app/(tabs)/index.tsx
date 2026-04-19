import React from 'react';
import {
  View,
  StyleSheet,
  Pressable,
  Image,
  useWindowDimensions,
  Linking,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';

const HOME_BG = require('../../assets/images/home_bg.png');
const DESIGN_WIDTH = 1182;
const DESIGN_HEIGHT = 2320;

const MAQAM_ITEMS = [
  { id: 'saba', name: 'الصبا', color: '#8D6E63' },
  { id: 'nahawand', name: 'النهاوند', color: '#607D8B' },
  { id: 'ajam', name: 'العجم', color: '#FF8F00' },
  { id: 'bayat', name: 'البيات', color: '#E64A19' },
  { id: 'sikah', name: 'السيكاه', color: '#2E7D32' },
  { id: 'hijaz', name: 'الحجاز', color: '#C62828' },
  { id: 'rast', name: 'الرست', color: '#00897B' },
  { id: 'kurd', name: 'الكرد', color: '#6A1B9A' },
];

const TOUCH_ITEMS = [...MAQAM_ITEMS, { id: 'channel', name: 'قناة تيليغرام', color: '#8B5E3C' }];

const UI_ZOOM_FACTOR = 1.02;
const WHOLE_UI_LIFT = 8;

const HOTSPOT_LEFT = 134;
const HOTSPOT_WIDTH = 914;
const HOTSPOT_HEIGHT = 124;
const HOTSPOT_TOPS = [642, 793, 944, 1096, 1247, 1398, 1550, 1701, 1852];

export default function HomeScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { width: screenWidth, height: screenHeight } = useWindowDimensions();

  const estimatedBottomBarSpace = 64;
  const availableHeight = screenHeight - insets.top - insets.bottom - estimatedBottomBarSpace;
  const baseScale = Math.min(screenWidth / DESIGN_WIDTH, availableHeight / DESIGN_HEIGHT);
  const scale = baseScale * UI_ZOOM_FACTOR;
  const renderedWidth = DESIGN_WIDTH * scale;
  const renderedHeight = DESIGN_HEIGHT * scale;
  const touchItems = TOUCH_ITEMS.map((item, index) => ({
    ...item,
    topPx: (HOTSPOT_TOPS[index] ?? HOTSPOT_TOPS[HOTSPOT_TOPS.length - 1]) * scale,
  }));

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.stage}>
        <View
          style={[
            styles.imageFrame,
            {
              width: renderedWidth,
              height: renderedHeight,
              transform: [{ translateY: -WHOLE_UI_LIFT }],
            },
          ]}
        >
          <Image
            source={HOME_BG}
            style={styles.backgroundImage}
            resizeMode="contain"
          />

          <View style={styles.touchLayer} pointerEvents="box-none">
            {touchItems.map((item) => (
              <View
                key={item.id}
                style={[
                  styles.maqamContainer,
                  {
                    top: item.topPx,
                    left: HOTSPOT_LEFT * scale,
                    width: HOTSPOT_WIDTH * scale,
                    height: HOTSPOT_HEIGHT * scale,
                    borderRadius: (HOTSPOT_HEIGHT * scale) / 2,
                  },
                ]}
              >
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={item.name}
                  onPress={() =>
                    item.id === 'channel'
                      ? Linking.openURL('https://t.me/ridhaquranschool')
                      : router.push({
                          pathname: '/maqam/[id]',
                          params: { id: item.id, name: item.name, color: item.color },
                        })
                  }
                  hitSlop={0}
                  android_disableSound={false}
                  style={({ pressed }) => [
                    styles.orangeStrip,
                    {
                      width: '100%',
                      height: '100%',
                      borderRadius: (HOTSPOT_HEIGHT * scale) / 2,
                    },
                    pressed && styles.orangeStripActive,
                  ]}
                >
                  <View pointerEvents="none" style={styles.overlaySheen} />
                </Pressable>
              </View>
            ))}
          </View>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f3ead2',
  },
  stage: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F3EAD2',
  },
  imageFrame: {
    position: 'relative',
  },
  backgroundImage: {
    width: '100%',
    height: '100%',
  },
  touchLayer: {
    ...StyleSheet.absoluteFillObject,
  },
  maqamContainer: {
    position: 'absolute',
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
    zIndex: 5,
  },
  orangeStrip: {
    justifyContent: 'center',
    alignItems: 'center',
    alignSelf: 'center',
    backgroundColor: 'transparent',
    borderWidth: 0,
    borderColor: 'transparent',
    shadowOpacity: 0,
    elevation: 0,
    overflow: 'hidden',
  },
  overlaySheen: {
    position: 'absolute',
    top: '8%',
    left: '8%',
    right: '8%',
    height: '34%',
    borderRadius: 999,
    backgroundColor: 'transparent',
  },
  orangeStripActive: {
    backgroundColor: 'transparent',
    borderColor: 'transparent',
  },
});
