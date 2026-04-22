import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ImageBackground,
  ActivityIndicator,
  Dimensions,
  Platform,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import { LocationCache } from '../../utils/offlineManager';

const { width } = Dimensions.get('window');
const COMPASS_SIZE = width - 80;
const DEGREE_MARKS = Array.from({ length: 12 }, (_, index) => index * 30);

function normalizeDegrees(value: number) {
  return ((value % 360) + 360) % 360;
}

function shortestAngleDifference(from: number, to: number) {
  return ((to - from + 540) % 360) - 180;
}

function smoothHeading(previous: number, next: number) {
  const diff = shortestAngleDifference(previous, next);

  if (Math.abs(diff) > 35) {
    return normalizeDegrees(next);
  }

  return normalizeDegrees(previous + diff * 0.55);
}

function getDirectionLabel(angle: number) {
  const directions = ['شمال', 'شمال شرقي', 'شرق', 'جنوب شرقي', 'جنوب', 'جنوب غربي', 'غرب', 'شمال غربي'];
  return directions[Math.round(normalizeDegrees(angle) / 45) % 8];
}

function calculateQibla(lat: number, lon: number) {
  const meccaLat = (21.4225 * Math.PI) / 180;
  const meccaLon = (39.8262 * Math.PI) / 180;
  const userLat = (lat * Math.PI) / 180;
  const userLon = (lon * Math.PI) / 180;
  const dLon = meccaLon - userLon;
  const x = Math.sin(dLon);
  const y = Math.cos(userLat) * Math.tan(meccaLat) - Math.sin(userLat) * Math.cos(dLon);
  const qibla = (Math.atan2(x, y) * 180) / Math.PI;
  return normalizeDegrees(qibla);
}

function getQiblaGuidance(qiblaAngle: number, heading: number) {
  const diff = shortestAngleDifference(heading, qiblaAngle);
  const absDiff = Math.abs(diff);
  const side = diff > 0 ? 'اليمين' : 'اليسار';

  if (absDiff <= 8) {
    return {
      title: 'اتجاهك صحيح الآن',
      message: 'ثبّت وضع الهاتف، واجعل رأس السهم الذهبي مقابل علامة القبلة أعلى البوصلة.',
      color: '#16a34a',
      icon: 'checkmark-circle',
      isAligned: true,
    };
  }

  if (absDiff <= 25) {
    return {
      title: `حرّك قليلًا نحو ${side}`,
      message: `لف الهاتف ببطء نحو ${side} حتى يطابق رأس السهم علامة القبلة في أعلى الدائرة.`,
      color: '#d97706',
      icon: 'compass',
      isAligned: false,
    };
  }

  return {
    title: `اتجه أكثر نحو ${side}`,
    message: `واصل الدوران نحو ${side}. كلما اقترب السهم من علامة القبلة أعلى البوصلة فأنت أقرب للاتجاه الصحيح.`,
    color: '#6b7280',
    icon: 'navigate',
    isAligned: false,
  };
}

export default function QiblaScreen() {
  const [heading, setHeading] = useState(0);
  const [qiblaAngle, setQiblaAngle] = useState(0);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');
  const [locationName, setLocationName] = useState('');
  const [isOfflineMode, setIsOfflineMode] = useState(false);
  const [calibrationHint, setCalibrationHint] = useState('');
  const [isRefreshingLocation, setIsRefreshingLocation] = useState(false);
  const headingSubscription = useRef<any>(null);

  const setupHeadingWatcher = useCallback(async () => {
    try {
      headingSubscription.current?.remove?.();

      const initialHeadingData = await Location.getHeadingAsync();
      const initialHeading =
        typeof initialHeadingData.trueHeading === 'number' && initialHeadingData.trueHeading >= 0
          ? initialHeadingData.trueHeading
          : initialHeadingData.magHeading || 0;
      setHeading(normalizeDegrees(initialHeading));

      headingSubscription.current = await Location.watchHeadingAsync((data) => {
        const rawHeading =
          typeof data.trueHeading === 'number' && data.trueHeading >= 0
            ? data.trueHeading
            : data.magHeading || 0;

        const normalizedHeading = normalizeDegrees(rawHeading);
        setHeading((prev) => smoothHeading(prev, normalizedHeading));

        if ((data.accuracy ?? 0) < 2) {
          setCalibrationHint('لتحسين دقة القبلة، أبعد الهاتف عن المعادن وحرّكه على شكل 8 لبضع ثوانٍ.');
        } else {
          setCalibrationHint('');
        }
      });
    } catch (error) {
      console.log('Heading watcher failed:', error);
      setCalibrationHint('قد تكون دقة البوصلة محدودة على هذا الجهاز.');
    }
  }, []);

  const setupQibla = useCallback(async () => {
    try {
      setErrorMsg('');
      setIsRefreshingLocation(true);

      const cachedLocation = await LocationCache.get();
      const { status } = await Location.requestForegroundPermissionsAsync();

      if (status !== 'granted') {
        if (cachedLocation) {
          const angle = calculateQibla(cachedLocation.latitude, cachedLocation.longitude);
          setQiblaAngle(angle);
          setLocationName(cachedLocation.city || 'الموقع المحفوظ');
          setIsOfflineMode(true);
          await setupHeadingWatcher();
          setLoading(false);
          return;
        }

        setErrorMsg('يرجى السماح بالوصول للموقع لتحديد اتجاه القبلة');
        setLoading(false);
        return;
      }

      try {
        if (Platform.OS === 'android') {
          try {
            await Location.enableNetworkProviderAsync();
          } catch (providerError) {
            console.log('Network provider prompt skipped:', providerError);
          }
        }

        const location = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Highest,
          mayShowUserSettingsDialog: true,
        });

        const { latitude, longitude } = location.coords;
        const angle = calculateQibla(latitude, longitude);
        setQiblaAngle(angle);

        let cityName = '';
        try {
          const geocode = await Location.reverseGeocodeAsync({ latitude, longitude });
          if (geocode.length > 0) {
            const place = geocode[0];
            cityName = place.city || place.region || place.country || '';
            setLocationName(cityName);
          }
        } catch (error) {
          console.log('Geocoding failed:', error);
        }

        await LocationCache.save(latitude, longitude, (cityName || null) as any);
        setIsOfflineMode(false);
      } catch (locationError) {
        console.log('Location fetch error:', locationError);

        if (cachedLocation) {
          const angle = calculateQibla(cachedLocation.latitude, cachedLocation.longitude);
          setQiblaAngle(angle);
          setLocationName(cachedLocation.city || 'الموقع المحفوظ');
          setIsOfflineMode(true);
        } else {
          throw locationError;
        }
      }

      await setupHeadingWatcher();
      setLoading(false);
    } catch (err) {
      console.error('Qibla setup error:', err);
      setErrorMsg('حدث خطأ في تحديد الموقع');
      setLoading(false);
    } finally {
      setIsRefreshingLocation(false);
    }
  }, [setupHeadingWatcher]);

  useEffect(() => {
    setupQibla();
    return () => {
      headingSubscription.current?.remove?.();
    };
  }, [setupQibla]);

  const qiblaDifference = shortestAngleDifference(heading, qiblaAngle);
  const qiblaDirectionLabel = getDirectionLabel(qiblaAngle);
  const qiblaDifferenceText =
    Math.abs(qiblaDifference) <= 2
      ? 'أنت على القبلة الآن'
      : `لف ${Math.round(Math.abs(qiblaDifference))}° ${qiblaDifference > 0 ? 'يمين' : 'يسار'}`;
  const qiblaGuidance = getQiblaGuidance(qiblaAngle, heading);

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#D4AF37" />
        <Text style={styles.loadingText}>جاري تحديد الموقع...</Text>
      </View>
    );
  }

  return (
    <ImageBackground
      source={require('../../assets/images/marble.jpg')}
      style={styles.background}
      resizeMode="cover"
    >
      <View style={styles.overlay}>
        <SafeAreaView style={styles.safeArea}>
          <View style={styles.header}>
            <Text style={styles.title} testID="qibla-title">اتجاه القبلة</Text>
            {isOfflineMode && (
              <View style={styles.offlineBadge}>
                <Ionicons name="cloud-offline" size={12} color="#fff" />
                <Text style={styles.offlineBadgeText}>موقع محفوظ</Text>
              </View>
            )}
            {locationName ? (
              <View style={styles.locationRow}>
                <Ionicons name="location" size={16} color="#D4AF37" />
                <Text style={styles.locationText}>{locationName}</Text>
              </View>
            ) : null}
            <TouchableOpacity
              style={styles.refreshLocationButton}
              activeOpacity={0.8}
              onPress={() => {
                setLoading(true);
                setupQibla();
              }}
            >
              {isRefreshingLocation ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <>
                  <Ionicons name="locate" size={16} color="#FFFFFF" />
                  <Text style={styles.refreshLocationText}>تحديث موقعي الآن</Text>
                </>
              )}
            </TouchableOpacity>
          </View>

          {errorMsg ? (
            <View style={styles.errorContainer}>
              <Ionicons name="warning" size={48} color="#E64A19" />
              <Text style={styles.errorText}>{errorMsg}</Text>
            </View>
          ) : (
            <View style={styles.compassContainer}>
              <View style={styles.compassOuter} testID="qibla-compass">
                <View style={[styles.qiblaGlowRing, qiblaGuidance.isAligned && styles.qiblaGlowRingActive]} />

                <View style={[styles.targetMarker, qiblaGuidance.isAligned && styles.targetMarkerActive]}>
                  <Text style={styles.targetMarkerText}>أمامك</Text>
                  <Text style={styles.targetMarkerIcon}>↑</Text>
                </View>

                {qiblaGuidance.isAligned ? (
                  <View style={styles.precisionBadge}>
                    <Ionicons name="checkmark-circle" size={16} color="#16a34a" />
                    <Text style={styles.precisionBadgeText}>تمت المحاذاة بدقة</Text>
                  </View>
                ) : null}

                <View style={[styles.compassFace, { transform: [{ rotate: `${-heading}deg` }] }]}>
                  <View style={styles.degreeRing}>
                    {DEGREE_MARKS.map((degree) => (
                      <View
                        key={degree}
                        style={[styles.degreeMarkWrap, { transform: [{ rotate: `${degree}deg` }] }]}
                      >
                        <View style={[styles.degreeTick, degree % 90 === 0 && styles.degreeTickMajor]} />
                        <Text
                          style={[
                            styles.degreeMarkText,
                            degree % 90 === 0 && styles.degreeMarkTextMajor,
                            { transform: [{ rotate: `${-degree}deg` }] },
                          ]}
                        >
                          {degree}°
                        </Text>
                      </View>
                    ))}
                  </View>

                  <View style={styles.compassInner}>
                    <Text style={[styles.cardinal, styles.cardinalN]}>N</Text>
                    <Text style={[styles.cardinal, styles.cardinalE]}>E</Text>
                    <Text style={[styles.cardinal, styles.cardinalS]}>S</Text>
                    <Text style={[styles.cardinal, styles.cardinalW]}>W</Text>

                    <View
                      style={[
                        styles.qiblaArrow,
                        { transform: [{ rotate: `${qiblaAngle}deg` }] },
                      ]}
                    >
                      <Text style={styles.kabaLabel}>🕋</Text>
                      <View style={[styles.arrowHead, qiblaGuidance.isAligned && styles.arrowHeadActive]}>
                        <Ionicons
                          name="caret-up"
                          size={32}
                          color={qiblaGuidance.isAligned ? '#16a34a' : '#D4AF37'}
                        />
                      </View>
                      <View style={[styles.arrowLine, qiblaGuidance.isAligned && styles.arrowLineActive]} />
                    </View>
                  </View>
                </View>

                {/* Center dot */}
                <View style={[styles.centerDot, qiblaGuidance.isAligned && styles.centerDotActive]} />
              </View>

              <View style={styles.infoCard}>
                <Text style={styles.infoLabel}>التصحيح المطلوب الآن</Text>
                <Text style={styles.infoDegree}>{qiblaDifferenceText}</Text>
                <Text style={styles.referenceText}>الاتجاه المرجعي للقبلة: {Math.round(qiblaAngle)}° • {qiblaDirectionLabel}</Text>

                <View style={styles.degreeInfoRow}>
                  <View style={styles.degreeInfoBox}>
                    <Text style={styles.degreeInfoValue}>{Math.round(heading)}°</Text>
                    <Text style={styles.degreeInfoLabel}>اتجاه الهاتف الآن</Text>
                  </View>
                  <View style={styles.degreeInfoBox}>
                    <Text style={styles.degreeInfoValue}>{qiblaDifferenceText}</Text>
                    <Text style={styles.degreeInfoLabel}>الفارق عن القبلة</Text>
                  </View>
                </View>

                <View style={[styles.guidanceBadge, { backgroundColor: `${qiblaGuidance.color}15` }]}>
                  <Ionicons name={qiblaGuidance.icon as any} size={16} color={qiblaGuidance.color} />
                  <Text style={[styles.guidanceTitle, { color: qiblaGuidance.color }]}>{qiblaGuidance.title}</Text>
                </View>
                <Text style={styles.infoHint}>{qiblaGuidance.message}</Text>
                <Text style={styles.infoSubHint}>
                  اجعل أعلى الهاتف أمامك، ثم لف نفسك ببطء حتى تصل علامة الكعبة إلى أعلى الدائرة تحت مؤشر أمامك.
                </Text>
                {calibrationHint ? <Text style={styles.calibrationHint}>{calibrationHint}</Text> : null}
              </View>
            </View>
          )}
        </SafeAreaView>
      </View>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  background: { flex: 1 },
  overlay: { flex: 1, backgroundColor: 'rgba(255, 255, 255, 0.92)' },
  safeArea: { flex: 1 },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#FAFAFA' },
  loadingText: { marginTop: 16, fontSize: 16, color: '#6B7280', writingDirection: 'rtl' },
  header: { alignItems: 'center', paddingTop: 16, paddingBottom: 8 },
  title: { fontSize: 24, fontWeight: '700', color: '#111827', writingDirection: 'rtl' },
  offlineBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ef4444',
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 12,
    marginTop: 6,
    gap: 4,
  },
  offlineBadgeText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '600',
  },
  locationRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 6 },
  locationText: { fontSize: 14, color: '#D4AF37', fontWeight: '500', writingDirection: 'rtl' },
  refreshLocationButton: {
    marginTop: 10,
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#1E3A5F',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
  },
  refreshLocationText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
    writingDirection: 'rtl',
  },
  errorContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 32 },
  errorText: { fontSize: 16, color: '#6B7280', textAlign: 'center', marginTop: 16, writingDirection: 'rtl', lineHeight: 24 },
  compassContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingBottom: 40 },
  compassOuter: {
    width: COMPASS_SIZE,
    height: COMPASS_SIZE,
    borderRadius: COMPASS_SIZE / 2,
    backgroundColor: '#FFFCF5',
    borderWidth: 4,
    borderColor: '#D4AF37',
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'visible',
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 16 },
      android: { elevation: 8 },
      default: { boxShadow: '0 4px 16px rgba(0,0,0,0.1)' },
    }),
  },
  compassInner: {
    width: COMPASS_SIZE - 20,
    height: COMPASS_SIZE - 20,
    borderRadius: (COMPASS_SIZE - 20) / 2,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.92)',
    borderWidth: 1,
    borderColor: '#F1E2B8',
  },
  qiblaGlowRing: {
    position: 'absolute',
    width: COMPASS_SIZE + 18,
    height: COMPASS_SIZE + 18,
    borderRadius: (COMPASS_SIZE + 18) / 2,
    borderWidth: 10,
    borderColor: 'rgba(212, 175, 55, 0.10)',
  },
  compassFace: {
    position: 'absolute',
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  degreeRing: {
    position: 'absolute',
    width: COMPASS_SIZE - 4,
    height: COMPASS_SIZE - 4,
    borderRadius: (COMPASS_SIZE - 4) / 2,
  },
  degreeMarkWrap: {
    position: 'absolute',
    width: '100%',
    height: '100%',
    alignItems: 'center',
  },
  degreeTick: {
    width: 2,
    height: 10,
    backgroundColor: '#D6C089',
    marginTop: 8,
    borderRadius: 2,
  },
  degreeTickMajor: {
    height: 16,
    width: 3,
    backgroundColor: '#B78A12',
  },
  degreeMarkText: {
    position: 'absolute',
    top: 24,
    fontSize: 9,
    color: '#8B7355',
    fontWeight: '600',
  },
  degreeMarkTextMajor: {
    fontSize: 10,
    color: '#6B5A2B',
    fontWeight: '700',
  },
  qiblaGlowRingActive: {
    borderColor: 'rgba(22, 163, 74, 0.22)',
  },
  targetMarker: {
    position: 'absolute',
    top: -14,
    zIndex: 5,
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#FFF8E1',
    borderWidth: 1,
    borderColor: '#D4AF37',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
  },
  targetMarkerActive: {
    backgroundColor: '#ECFDF5',
    borderColor: '#16a34a',
  },
  targetMarkerText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#8B6B16',
    writingDirection: 'rtl',
  },
  targetMarkerIcon: {
    fontSize: 14,
  },
  precisionBadge: {
    position: 'absolute',
    bottom: -18,
    zIndex: 5,
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#ECFDF5',
    borderWidth: 1,
    borderColor: '#16a34a',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
  },
  precisionBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#166534',
    writingDirection: 'rtl',
  },
  cardinal: { position: 'absolute', fontSize: 18, fontWeight: '700', color: '#6B7280' },
  cardinalN: { top: 8 },
  cardinalE: { right: 8 },
  cardinalS: { bottom: 8 },
  cardinalW: { left: 8 },
  qiblaArrow: {
    position: 'absolute',
    width: '100%',
    height: '100%',
    justifyContent: 'flex-start',
    alignItems: 'center',
    paddingTop: 8,
  },
  arrowLine: {
    width: 4,
    height: '35%',
    backgroundColor: '#D4AF37',
    borderRadius: 3,
    marginTop: -6,
  },
  arrowLineActive: {
    backgroundColor: '#16a34a',
  },
  arrowHead: {
    backgroundColor: 'rgba(255,255,255,0.96)',
    borderRadius: 999,
    padding: 2,
    borderWidth: 1,
    borderColor: '#F1E2B8',
  },
  arrowHeadActive: {
    borderColor: '#16a34a',
    backgroundColor: '#ECFDF5',
  },
  kabaLabel: { fontSize: 24, marginTop: -2, marginBottom: -2 },
  centerDot: {
    position: 'absolute',
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#D4AF37',
  },
  centerDotActive: {
    backgroundColor: '#16a34a',
    width: 14,
    height: 14,
    borderRadius: 7,
  },
  infoCard: {
    marginTop: 32,
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 20,
    alignItems: 'center',
    marginHorizontal: 32,
    borderWidth: 1,
    borderColor: '#F3F4F6',
  },
  infoLabel: { fontSize: 14, color: '#9CA3AF', writingDirection: 'rtl' },
  infoDegree: { fontSize: 28, fontWeight: '800', color: '#D4AF37', marginVertical: 4, textAlign: 'center', writingDirection: 'rtl' },
  referenceText: { fontSize: 13, color: '#6B7280', textAlign: 'center', writingDirection: 'rtl', marginBottom: 10 },
  degreeInfoRow: {
    flexDirection: 'row-reverse',
    gap: 10,
    marginBottom: 10,
  },
  degreeInfoBox: {
    backgroundColor: '#FAF7EF',
    borderWidth: 1,
    borderColor: '#EADCB3',
    borderRadius: 12,
    paddingVertical: 8,
    paddingHorizontal: 10,
    minWidth: 118,
    alignItems: 'center',
  },
  degreeInfoValue: {
    fontSize: 15,
    fontWeight: '800',
    color: '#7C5E10',
  },
  degreeInfoLabel: {
    fontSize: 11,
    color: '#7B7280',
    writingDirection: 'rtl',
    marginTop: 2,
  },
  guidanceBadge: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    marginBottom: 10,
    marginTop: 4,
  },
  guidanceTitle: {
    fontSize: 13,
    fontWeight: '700',
    writingDirection: 'rtl',
  },
  infoHint: { fontSize: 13, color: '#374151', textAlign: 'center', writingDirection: 'rtl', lineHeight: 22 },
  infoSubHint: { fontSize: 12, color: '#6B7280', textAlign: 'center', writingDirection: 'rtl', lineHeight: 20, marginTop: 8 },
  calibrationHint: {
    fontSize: 12,
    color: '#b45309',
    textAlign: 'center',
    writingDirection: 'rtl',
    lineHeight: 20,
    marginTop: 8,
  },
});
