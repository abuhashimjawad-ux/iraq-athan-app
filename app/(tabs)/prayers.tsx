import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ImageBackground,
  ActivityIndicator,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Coordinates, CalculationMethod, PrayerTimes, Madhab } from 'adhan';
import { schedulePrayerNotifications } from '../../utils/prayerNotifications';

const PRAYER_NAMES_SUNNI = [
  { key: 'fajr', name: 'الفجر', icon: 'sunny-outline' as const, color: '#5B7FA5' },
  { key: 'dhuhr', name: 'الظهر', icon: 'sunny' as const, color: '#D4AF37' },
  { key: 'asr', name: 'العصر', icon: 'partly-sunny' as const, color: '#E8913A' },
  { key: 'maghrib', name: 'المغرب', icon: 'cloudy-night' as const, color: '#C4534A' },
  { key: 'isha', name: 'العشاء', icon: 'moon' as const, color: '#4A5568' },
];

const PRAYER_NAMES_SHIA = [
  { key: 'fajr', name: 'الفجر', icon: 'sunny-outline' as const, color: '#5B7FA5' },
  { key: 'dhuhr', name: 'الظهر والعصر', icon: 'sunny' as const, color: '#D4AF37' },
  { key: 'maghrib', name: 'المغرب والعشاء', icon: 'cloudy-night' as const, color: '#C4534A' },
];

function formatTime(date: Date): string {
  const hours = date.getHours();
  const minutes = date.getMinutes();
  const period = hours >= 12 ? 'م' : 'ص';
  const h = hours > 12 ? hours - 12 : hours === 0 ? 12 : hours;
  return `${h}:${minutes.toString().padStart(2, '0')} ${period}`;
}

function getNextPrayer(prayerTimes: PrayerTimes, waqfType: string): { name: string; time: Date } | null {
  const now = new Date();
  const prayers = waqfType === 'shia'
    ? [
        { name: 'الفجر', time: prayerTimes.fajr },
        { name: 'الظهر والعصر', time: prayerTimes.dhuhr },
        { name: 'المغرب والعشاء', time: prayerTimes.maghrib },
      ]
    : [
        { name: 'الفجر', time: prayerTimes.fajr },
        { name: 'الظهر', time: prayerTimes.dhuhr },
        { name: 'العصر', time: prayerTimes.asr },
        { name: 'المغرب', time: prayerTimes.maghrib },
        { name: 'العشاء', time: prayerTimes.isha },
      ];
  for (const p of prayers) {
    if (p.time > now) return p;
  }
  return prayers[0];
}

function getTimeRemaining(target: Date): string {
  const now = new Date();
  let diff = target.getTime() - now.getTime();
  if (diff < 0) diff += 24 * 60 * 60 * 1000;
  const hours = Math.floor(diff / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  if (hours > 0) return `${hours} ساعة و ${minutes} دقيقة`;
  return `${minutes} دقيقة`;
}

export default function PrayersScreen() {
  const [prayerTimes, setPrayerTimes] = useState<PrayerTimes | null>(null);
  const [loading, setLoading] = useState(true);
  const [locationName, setLocationName] = useState('');
  const [waqfType, setWaqfType] = useState('sunni');
  const [errorMsg, setErrorMsg] = useState('');
  const [coords, setCoords] = useState<{ latitude: number; longitude: number } | null>(null);

  // ref so recalculate stays stable and never causes cascading re-renders
  const waqfTypeRef = useRef('sunni');

  const recalculate = useCallback((latitude: number, longitude: number) => {
    const wt = waqfTypeRef.current;
    const coordinates = new Coordinates(latitude, longitude);
    const date = new Date();
    const params = wt === 'shia' ? CalculationMethod.Tehran() : CalculationMethod.MuslimWorldLeague();
    if (wt !== 'shia') params.madhab = Madhab.Shafi;
    const times = new PrayerTimes(coordinates, date, params);
    setPrayerTimes(times);
    schedulePrayerNotifications(times, wt, { latitude, longitude }).catch(console.error);
  }, []); // stable - uses ref instead of closure

  const fetchLocation = useCallback(async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setErrorMsg('يرجى السماح بالوصول للموقع لعرض مواعيد الصلاة');
        setLoading(false);
        return;
      }
      const location = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      const { latitude, longitude } = location.coords;
      setCoords({ latitude, longitude });
      try {
        const geocode = await Location.reverseGeocodeAsync({ latitude, longitude });
        if (geocode.length > 0) {
          const place = geocode[0];
          setLocationName(place.city || place.region || place.country || '');
        }
      } catch (error) {
        console.error('Error geocoding:', error);
      }
      recalculate(latitude, longitude);
    } catch (error) {
      console.error('Error fetching location:', error);
      setErrorMsg('حدث خطأ في حساب مواعيد الصلاة');
    } finally {
      setLoading(false);
    }
  }, [recalculate]);

  const loadSettings = useCallback(async () => {
    try {
      const saved = await AsyncStorage.getItem('waqf_type');
      if (saved) {
        waqfTypeRef.current = saved; // update ref BEFORE calling fetchLocation
        setWaqfType(saved);
      }
    } catch (error) {
      console.error('Error loading settings:', error);
    }
    await fetchLocation();
  }, [fetchLocation]);

  // runs once on mount only (fetchLocation and loadSettings are now stable)
  useEffect(() => {
    loadSettings();
  }, [loadSettings]);

  const handleWaqfChange = useCallback(async (type: string) => {
    waqfTypeRef.current = type;
    setWaqfType(type);
    await AsyncStorage.setItem('waqf_type', type);
    if (coords) recalculate(coords.latitude, coords.longitude);
  }, [coords, recalculate]);

  const prayers = waqfType === 'shia' ? PRAYER_NAMES_SHIA : PRAYER_NAMES_SUNNI;
  const nextPrayer = prayerTimes ? getNextPrayer(prayerTimes, waqfType) : null;

  const getPrayerTime = (key: string): string => {
    if (!prayerTimes) return '--:--';
    const timeMap: Record<string, Date> = {
      fajr: prayerTimes.fajr,
      dhuhr: prayerTimes.dhuhr,
      asr: prayerTimes.asr,
      maghrib: prayerTimes.maghrib,
      isha: prayerTimes.isha,
    };
    return formatTime(timeMap[key]);
  };

  const currentDate = new Date();
  const dateStr = currentDate.toLocaleDateString('ar-IQ', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

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
            <Ionicons name="moon" size={22} color="#D4AF37" />
            <Text style={styles.title} testID="prayers-title">مواعيد الصلاة</Text>
          </View>

          {locationName ? (
            <View style={styles.infoBar}>
              <View style={styles.locationChip}>
                <Ionicons name="location" size={14} color="#D4AF37" />
                <Text style={styles.locationText}>{locationName}</Text>
              </View>
              <Text style={styles.dateText}>{dateStr}</Text>
            </View>
          ) : null}

          {errorMsg ? (
            <View style={styles.errorContainer}>
              <Ionicons name="warning" size={48} color="#E64A19" />
              <Text style={styles.errorText}>{errorMsg}</Text>
              <TouchableOpacity testID="retry-location-btn" style={styles.retryButton}
                onPress={() => { setLoading(true); setErrorMsg(''); fetchLocation(); }}>
                <Text style={styles.retryText}>إعادة المحاولة</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <>
              {nextPrayer && (
                <View style={styles.nextPrayerCard} testID="next-prayer-card">
                  <View style={styles.nextPrayerTop}>
                    <Text style={styles.nextLabel}>الصلاة القادمة</Text>
                    <View style={styles.nextBadge}>
                      <Ionicons name="notifications" size={14} color="#D4AF37" />
                    </View>
                  </View>
                  <Text style={styles.nextName}>{nextPrayer.name}</Text>
                  <Text style={styles.nextTime}>{formatTime(nextPrayer.time)}</Text>
                  <View style={styles.nextRemainingRow}>
                    <Ionicons name="time-outline" size={16} color="rgba(255,255,255,0.6)" />
                    <Text style={styles.nextRemaining}>باقي {getTimeRemaining(nextPrayer.time)}</Text>
                  </View>
                </View>
              )}

              <View style={styles.toggleContainer}>
                <TouchableOpacity testID="toggle-sunni"
                  style={[styles.toggleBtn, waqfType === 'sunni' && styles.toggleActive]}
                  onPress={() => handleWaqfChange('sunni')}>
                  <Text style={[styles.toggleText, waqfType === 'sunni' && styles.toggleTextActive]}>سني (5)</Text>
                </TouchableOpacity>
                <TouchableOpacity testID="toggle-shia"
                  style={[styles.toggleBtn, waqfType === 'shia' && styles.toggleActive]}
                  onPress={() => handleWaqfChange('shia')}>
                  <Text style={[styles.toggleText, waqfType === 'shia' && styles.toggleTextActive]}>شيعي (3)</Text>
                </TouchableOpacity>
              </View>

              <View style={styles.prayersList}>
                {prayers.map((prayer) => {
                  const isNext = nextPrayer?.name === prayer.name;
                  return (
                    <View key={prayer.key} testID={`prayer-${prayer.key}`}
                      style={[styles.prayerRow, isNext && { borderColor: prayer.color, backgroundColor: prayer.color + '08' }]}>
                      <View style={styles.prayerLeft}>
                        <View style={[styles.prayerIcon, { backgroundColor: prayer.color + '18' }]}>
                          <Ionicons name={prayer.icon} size={22} color={prayer.color} />
                        </View>
                        <View>
                          <Text style={[styles.prayerName, isNext && { color: prayer.color }]}>{prayer.name}</Text>
                          {isNext && <Text style={styles.prayerNextLabel}>القادمة</Text>}
                        </View>
                      </View>
                      <Text style={[styles.prayerTime, isNext && { color: prayer.color }]}>{getPrayerTime(prayer.key)}</Text>
                    </View>
                  );
                })}
              </View>
            </>
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
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingTop: 16, paddingBottom: 4 },
  title: { fontSize: 24, fontWeight: '800', color: '#111827', writingDirection: 'rtl' },
  infoBar: { alignItems: 'center', paddingBottom: 8, gap: 4 },
  locationChip: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#FFFBEB', paddingHorizontal: 12, paddingVertical: 4, borderRadius: 20 },
  locationText: { fontSize: 13, color: '#D4AF37', fontWeight: '600', writingDirection: 'rtl' },
  dateText: { fontSize: 12, color: '#9CA3AF', writingDirection: 'rtl' },
  errorContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 32 },
  errorText: { fontSize: 16, color: '#6B7280', textAlign: 'center', marginTop: 16, writingDirection: 'rtl', lineHeight: 24 },
  retryButton: { marginTop: 20, backgroundColor: '#D4AF37', borderRadius: 12, paddingHorizontal: 24, paddingVertical: 12 },
  retryText: { color: '#FFFFFF', fontSize: 16, fontWeight: '600', writingDirection: 'rtl' },
  nextPrayerCard: {
    marginHorizontal: 16,
    marginTop: 8,
    backgroundColor: '#111827',
    borderRadius: 24,
    padding: 24,
    alignItems: 'center',
  },
  nextPrayerTop: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  nextLabel: { fontSize: 13, color: 'rgba(255,255,255,0.5)', writingDirection: 'rtl' },
  nextBadge: { width: 24, height: 24, borderRadius: 12, backgroundColor: 'rgba(212,175,55,0.2)', justifyContent: 'center', alignItems: 'center' },
  nextName: { fontSize: 26, fontWeight: '800', color: '#D4AF37', marginTop: 6, writingDirection: 'rtl' },
  nextTime: { fontSize: 44, fontWeight: '900', color: '#FFFFFF', marginTop: 2, letterSpacing: 2 },
  nextRemainingRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 8 },
  nextRemaining: { fontSize: 14, color: 'rgba(255,255,255,0.5)', writingDirection: 'rtl' },
  toggleContainer: {
    flexDirection: 'row',
    marginHorizontal: 16,
    marginTop: 14,
    backgroundColor: '#F3F4F6',
    borderRadius: 12,
    padding: 3,
  },
  toggleBtn: { flex: 1, paddingVertical: 9, borderRadius: 10, alignItems: 'center' },
  toggleActive: {
    backgroundColor: '#FFFFFF',
    boxShadow: '0 1px 4px rgba(0,0,0,0.08)',
  },
  toggleText: { fontSize: 14, fontWeight: '600', color: '#9CA3AF', writingDirection: 'rtl' },
  toggleTextActive: { color: '#111827' },
  prayersList: { marginTop: 12, paddingHorizontal: 16 },
  prayerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 14,
    marginBottom: 8,
    borderWidth: 1.5,
    borderColor: '#F3F4F6',
  },
  prayerLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  prayerIcon: { width: 44, height: 44, borderRadius: 14, justifyContent: 'center', alignItems: 'center' },
  prayerName: { fontSize: 16, fontWeight: '700', color: '#111827', writingDirection: 'rtl' },
  prayerNextLabel: { fontSize: 11, color: '#D4AF37', fontWeight: '500', writingDirection: 'rtl', marginTop: 1 },
  prayerTime: { fontSize: 20, fontWeight: '800', color: '#4B5563' },
});
