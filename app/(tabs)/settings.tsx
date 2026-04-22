import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ImageBackground,
  TouchableOpacity,
  ScrollView,
  Switch,
  Platform,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import { maqamatById } from '../../constants/maqamatData';
import { hasLocalAudio } from '../../constants/localAudioMap';
import {
  cancelPrayerNotifications,
  getPrayerNotificationStatus,
  reschedulePrayerNotificationsFromStorage,
  scheduleTestNotification,
} from '../../utils/prayerNotifications';

const ENV_BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL;

function getHostFromValue(value?: string) {
  return String(value || '')
    .trim()
    .replace(/^[a-z]+:\/\//i, '')
    .split('/')[0]
    .split(':')[0]
    .toLowerCase();
}

function isPrivateHost(host: string) {
  return /^(localhost|127\.0\.0\.1|10\.|192\.168\.|172\.(1[6-9]|2\d|3[0-1])\.)/i.test(host);
}

function isExpoHostedHost(host: string) {
  return /(^|\.)(exp\.direct|exp\.host|expo\.dev|expo\.io)$/i.test(host);
}

function resolveBackendUrl() {
  const previewHost = getHostFromValue(
    (Constants.expoConfig as any)?.hostUri ||
      (Constants as any)?.expoGoConfig?.debuggerHost ||
      (Constants as any)?.manifest2?.extra?.expoGo?.debuggerHost ||
      ''
  );

  const explicitUrl = String(ENV_BACKEND_URL || '').trim().replace(/\/$/, '');
  if (explicitUrl) {
    const explicitHost = getHostFromValue(explicitUrl);
    if (!isExpoHostedHost(previewHost) || !isPrivateHost(explicitHost)) {
      return explicitUrl;
    }
    return '';
  }

  return !isExpoHostedHost(previewHost) && isPrivateHost(previewHost)
    ? `http://${previewHost}:8000`
    : '';
}

const BACKEND_URL = resolveBackendUrl();

function normalizeArabicName(value?: string) {
  return String(value || '')
    .replace(/[أإآ]/g, 'ا')
    .replace(/ى/g, 'ي')
    .replace(/ة/g, 'ه')
    .replace(/\s+/g, ' ')
    .trim();
}

const LOCAL_BRANCH_IDS = Object.fromEntries(
  Object.entries({
    'المنصوري': 'mansouri',
    'الحديدي': 'hadidi',
    'الشطراوي': 'shatrawi',
    'نايل الجنوب': 'nail_janub',
    'طور جبير الكون': 'tour_jubair',
    'طور جبير كون': 'tour_jubair',
    'الخنابات': 'khanbat',
    'الخنبات': 'khanbat',
    'طور الصبي': 'tour_sabi',
    'طور الشجي': 'tour_shaji',
    'النكريز': 'nakriz',
    'الماهوري': 'mahouri',
    'الماحوري': 'mahouri',
    'الجهاركاه': 'jaharkah',
    'الراشدي': 'rashidi',
    'الطاهر': 'tahir',
    'الحياوي': 'hayawi',
    'الجبوري': 'jubouri',
    'الدشت': 'dasht',
    'الحسيني': 'husseini',
    'الأورفة': 'urfa',
    'الاورفة': 'urfa',
    'الأورفى': 'urfa',
    'الاورفى': 'urfa',
    'أبو عطا': 'abu_ata',
    'ابو عطا': 'abu_ata',
    'الشرقي دوكاه': 'sharqi_dukah',
    'الهجران': 'hijran',
    'الشطيت': 'shteet',
    'الحكيمي': 'hakimi',
    'الركباني': 'rakbani',
    'الأوشار': 'awshar',
    'الاوشار': 'awshar',
    'الجمال': 'jamal',
    'المخالف': 'mukhalif',
    'الحويزاوي': 'huwaizawi',
    'المدامي': 'mudmi',
    'المدمي': 'mudmi',
    'المثنوي': 'mathnawi',
    'الهمايون والقطر': 'humayun_qatar',
    'العياش': 'ayyash',
    'الحجاز كار': 'hijaz_kar',
    'الحجاز التركي': 'hijaz_turki',
    'الحجاز الغريب': 'hijaz_gharib',
    'الزنجران': 'zanjaran',
    'البنجكاه': 'banjkah',
    'الشرقي رست والاصفهان': 'sharqi_rast',
    'الشرقي رست والإصفهان': 'sharqi_rast',
    'الحليلاوي': 'halilawi',
    'الحليوي': 'halilawi',
    'الكاركرد': 'karkurd',
    'الأثر كرد': 'athar_kurd',
    'الاثر كرد': 'athar_kurd',
    'اللامي والحليوي': 'lami_halawi',
    'اللامي والحليلاوي': 'lami_halawi',
    'اللامي المبرقع': 'lami_mubarqa',
  }).map(([key, value]) => [normalizeArabicName(key), value])
) as Record<string, string>;

function getLocalBranchId(branchName: string, maqamId: string, index: number) {
  return LOCAL_BRANCH_IDS[normalizeArabicName(branchName)] || `${maqamId}_static_${index + 1}`;
}

function buildLocalAdhanList() {
  const list: {
    id: string;
    name: string;
    branchName: string;
    exampleLabel: string;
    maqamName: string;
    audioUrl: string;
  }[] = [];

  Object.values(maqamatById).forEach((maqam) => {
    maqam.branches
      .filter((branch) => branch !== 'المقام الرئيسي')
      .forEach((branchName, index) => {
        const branchId = getLocalBranchId(branchName, maqam.id, index);

        if (hasLocalAudio(branchId, 1)) {
          list.push({
            id: `${branchId}_1`,
            name: `${branchName} — المثال الأول — ${maqam.family}`,
            branchName,
            exampleLabel: 'المثال الأول',
            maqamName: maqam.family,
            audioUrl: 'local',
          });
        }

        if (hasLocalAudio(branchId, 2)) {
          list.push({
            id: `${branchId}_2`,
            name: `${branchName} — المثال الثاني — ${maqam.family}`,
            branchName,
            exampleLabel: 'المثال الثاني',
            maqamName: maqam.family,
            audioUrl: 'local',
          });
        }
      });
  });

  return list;
}

export default function SettingsScreen() {
  const [waqfType, setWaqfType] = useState('sunni');
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [selectedAdhan, setSelectedAdhan] = useState('');
  const [showAdhanPicker, setShowAdhanPicker] = useState(false);
  const [notificationStatus, setNotificationStatus] = useState({
    permissionGranted: false,
    notificationsEnabled: true,
    scheduledCount: 0,
    nextPrayerName: '',
    nextScheduledFor: '',
  });
  const [adhanList, setAdhanList] = useState<{
    id: string;
    name: string;
    branchName: string;
    exampleLabel: string;
    maqamName: string;
    audioUrl: string;
  }[]>([]);

  useEffect(() => {
    loadSettings();
    fetchAdhanList();
    refreshNotificationStatus();
  }, []);

  const fetchAdhanList = async () => {
    const fallbackList = buildLocalAdhanList();
    setAdhanList(fallbackList);

    try {
      if (!BACKEND_URL) {
        return;
      }

      const res = await fetch(`${BACKEND_URL}/api/maqamat`);
      if (!res.ok) {
        return;
      }

      const maqamat = await res.json();
      const list: {
        id: string;
        name: string;
        branchName: string;
        exampleLabel: string;
        maqamName: string;
        audioUrl: string;
      }[] = [];

      for (const m of maqamat) {
        const brRes = await fetch(`${BACKEND_URL}/api/maqamat/${m.id}/branches`);
        const branches = brRes.ok ? await brRes.json() : [];
        for (const b of branches) {
          if (b.audio1_url || hasLocalAudio(b.id, 1)) {
            list.push({
              id: `${b.id}_1`,
              name: `${b.name} — المثال الأول — مقام ${m.name}`,
              branchName: b.name,
              exampleLabel: 'المثال الأول',
              maqamName: m.name,
              audioUrl: String(b.audio1_url || 'local'),
            });
          }
          if (b.audio2_url || hasLocalAudio(b.id, 2)) {
            list.push({
              id: `${b.id}_2`,
              name: `${b.name} — المثال الثاني — مقام ${m.name}`,
              branchName: b.name,
              exampleLabel: 'المثال الثاني',
              maqamName: m.name,
              audioUrl: String(b.audio2_url || 'local'),
            });
          }
        }
      }

      if (list.length > 0) {
        setAdhanList(list);
      }
    } catch {}
  };

  const loadSettings = async () => {
    try {
      const waqf = await AsyncStorage.getItem('waqf_type');
      const notif = await AsyncStorage.getItem('notifications_enabled');
      const adhan = await AsyncStorage.getItem('selected_adhan');
      if (waqf) setWaqfType(waqf);
      if (notif !== null) setNotificationsEnabled(notif === 'true');
      if (adhan) setSelectedAdhan(adhan);
    } catch {}
  };

  const refreshNotificationStatus = async () => {
    try {
      const status = await getPrayerNotificationStatus();
      setNotificationStatus(status);
    } catch {}
  };

  const formatStatusTime = (value: string) => {
    if (!value) return '';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '';
    return date.toLocaleString('ar-IQ', {
      weekday: 'short',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
  };

  const saveWaqfType = async (type: string) => {
    setWaqfType(type);
    await AsyncStorage.setItem('waqf_type', type);
    if (notificationsEnabled) {
      const result = await reschedulePrayerNotificationsFromStorage();
      await refreshNotificationStatus();
      if (!result.permissionGranted) {
        Alert.alert('الإشعارات غير مفعلة', 'اسمح بإشعارات التطبيق من إعدادات الهاتف أولًا.');
        return;
      }
      if (!result.scheduledCount) {
        Alert.alert('تنبيه مهم', 'افتح صفحة مواعيد الصلاة مرة واحدة لتحديد الموقع وتسجيل مواقيت اليوم قبل الاعتماد على المنبّه.');
      }
    }
  };

  const toggleNotifications = async (value: boolean) => {
    setNotificationsEnabled(value);
    await AsyncStorage.setItem('notifications_enabled', value.toString());

    if (value) {
      const result = await reschedulePrayerNotificationsFromStorage();
      await refreshNotificationStatus();
      if (!result.permissionGranted) {
        Alert.alert('الإشعارات غير مفعلة', 'اسمح للتطبيق بإرسال الإشعارات من إعدادات الهاتف، ثم أعد تشغيل زر التنبيه.');
        return;
      }
      if (!result.scheduledCount) {
        Alert.alert('التنبيهات فُعّلت', 'الخطوة التالية: افتح صفحة مواعيد الصلاة لتحديد موقعك، ثم اضغط زر اختبار التنبيه خلال 10 ثوانٍ.');
      }
    } else {
      await cancelPrayerNotifications();
      await refreshNotificationStatus();
    }
  };

  return (
    <ImageBackground
      source={require('../../assets/images/marble.jpg')}
      style={styles.background}
      resizeMode="cover"
    >
      <View style={styles.overlay}>
        <SafeAreaView style={styles.safeArea}>
          <View style={styles.header}>
            <View style={styles.heroBadge}>
              <Ionicons name="sparkles" size={18} color="#D4AF37" />
              <Text style={styles.heroBadgeText}>تخصيص التطبيق</Text>
            </View>
            <View style={styles.heroIconWrap}>
              <Ionicons name="settings" size={30} color="#D4AF37" />
            </View>
            <Text style={styles.title} testID="settings-title">الإعدادات</Text>
            <Text style={styles.subtitle}>رتّب تجربة الأذان والتنبيهات بشكل أجمل وأنسب لك</Text>
          </View>

          <ScrollView
            style={styles.scrollView}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
          >
            {/* Waqf Type Section */}
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <View style={styles.sectionIconWrap}><Ionicons name="moon" size={16} color="#D4AF37" /></View>
                <Text style={styles.sectionTitle}>نوع الوقف الإسلامي</Text>
              </View>
              <View style={styles.sectionContent}>
                <TouchableOpacity
                  testID="setting-sunni"
                  style={[styles.radioRow, waqfType === 'sunni' && styles.radioRowActive]}
                  onPress={() => saveWaqfType('sunni')}
                >
                  <View style={styles.radioLeft}>
                    <View style={[styles.radio, waqfType === 'sunni' && styles.radioSelected]}>
                      {waqfType === 'sunni' && <View style={styles.radioDot} />}
                    </View>
                    <View>
                      <Text style={styles.radioLabel}>الوقف السني</Text>
                      <Text style={styles.radioDesc}>5 أوقات: الفجر، الظهر، العصر، المغرب، العشاء</Text>
                    </View>
                  </View>
                </TouchableOpacity>

                <TouchableOpacity
                  testID="setting-shia"
                  style={[styles.radioRow, waqfType === 'shia' && styles.radioRowActive]}
                  onPress={() => saveWaqfType('shia')}
                >
                  <View style={styles.radioLeft}>
                    <View style={[styles.radio, waqfType === 'shia' && styles.radioSelected]}>
                      {waqfType === 'shia' && <View style={styles.radioDot} />}
                    </View>
                    <View>
                      <Text style={styles.radioLabel}>الوقف الشيعي</Text>
                      <Text style={styles.radioDesc}>3 أوقات: الفجر، الظهر والعصر، المغرب والعشاء</Text>
                    </View>
                  </View>
                </TouchableOpacity>
              </View>
            </View>

            {/* Notifications Section */}
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <View style={styles.sectionIconWrap}><Ionicons name="notifications" size={16} color="#D4AF37" /></View>
                <Text style={styles.sectionTitle}>التنبيهات</Text>
              </View>
              <View style={styles.sectionContent}>
                <View style={styles.switchRow}>
                  <View style={styles.switchLeft}>
                    <Ionicons name="notifications" size={22} color="#D4AF37" />
                    <View>
                      <Text style={styles.switchLabel}>تنبيه وقت الصلاة</Text>
                      <Text style={styles.switchDesc}>تنبيه بصوت الأذان المختار</Text>
                    </View>
                  </View>
                  <Switch
                    testID="notifications-switch"
                    value={notificationsEnabled}
                    onValueChange={toggleNotifications}
                    trackColor={{ false: '#D1D5DB', true: '#D4AF37' }}
                    thumbColor="#FFFFFF"
                  />
                </View>

                <View style={styles.statusCard}>
                  <View style={styles.statusHeaderRow}>
                    <Ionicons name="shield-checkmark" size={18} color="#2E7D32" />
                    <Text style={styles.statusTitle}>حالة جدولة الصلاة</Text>
                  </View>

                  {!notificationStatus.notificationsEnabled ? (
                    <Text style={styles.statusText}>التنبيهات متوقفة حاليًا.</Text>
                  ) : !notificationStatus.permissionGranted ? (
                    <Text style={styles.statusText}>إذن الإشعارات غير ممنوح من الهاتف.</Text>
                  ) : notificationStatus.scheduledCount > 0 ? (
                    <>
                      <Text style={styles.statusText}>تمت جدولة {notificationStatus.scheduledCount} تنبيهًا للصلاة.</Text>
                      <Text style={styles.statusSubtext}>
                        الصلاة القادمة: {notificationStatus.nextPrayerName || '—'}
                        {notificationStatus.nextScheduledFor ? ` • ${formatStatusTime(notificationStatus.nextScheduledFor)}` : ''}
                      </Text>
                    </>
                  ) : (
                    <Text style={styles.statusText}>لم تُجدول صلوات بعد. افتح صفحة مواعيد الصلاة لتسجيل موقعك ومواقيت اليوم.</Text>
                  )}
                </View>

                <TouchableOpacity
                  style={styles.testNotificationButton}
                  onPress={async () => {
                    const result = await scheduleTestNotification(10);
                    await refreshNotificationStatus();
                    if (!result.permissionGranted) {
                      Alert.alert('تعذّر الإذن', 'يجب السماح بإشعارات التطبيق من إعدادات الهاتف أولًا.');
                      return;
                    }
                    Alert.alert('تم جدولة الاختبار', 'أغلق الشاشة وانتظر 10 ثوانٍ. هذا يثبت الإشعار، أما بطاقة الحالة أعلاه فتؤكد أن صلوات اليوم نفسها مسجّلة.');
                  }}
                >
                  <Ionicons name="flash" size={18} color="#FFFFFF" />
                  <Text style={styles.testNotificationText}>اختبار التنبيه خلال 10 ثوانٍ</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.refreshStatusButton}
                  onPress={refreshNotificationStatus}
                >
                  <Ionicons name="refresh" size={18} color="#D4AF37" />
                  <Text style={styles.refreshStatusText}>تحديث حالة الجدولة</Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Adhan Selection Section */}
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <View style={styles.sectionIconWrap}><Ionicons name="musical-notes" size={16} color="#D4AF37" /></View>
                <Text style={styles.sectionTitle}>صوت الأذان المفضل</Text>
              </View>
              <View style={styles.sectionContent}>
                {selectedAdhan ? (
                  <View style={styles.selectedAdhan}>
                    <View style={styles.selectedAdhanTextWrap}>
                      <Text style={styles.selectedAdhanLabel}>الأذان المختار</Text>
                      <Text style={styles.selectedAdhanText}>{selectedAdhan}</Text>
                    </View>
                    <View style={styles.selectedAdhanIconWrap}>
                      <Ionicons name="checkmark-circle" size={20} color="#2E7D32" />
                    </View>
                  </View>
                ) : (
                  <View style={styles.selectedAdhan}>
                    <View style={styles.selectedAdhanTextWrap}>
                      <Text style={[styles.selectedAdhanText, { color: '#9CA3AF' }]}>
                      لم يتم اختيار أذان بعد
                    </Text>
                    </View>
                    <View style={styles.selectedAdhanIconWrap}>
                      <Ionicons name="time" size={20} color="#9CA3AF" />
                    </View>
                  </View>
                )}
                <TouchableOpacity
                  testID="choose-adhan-btn"
                  style={styles.chooseAdhanBtn}
                  onPress={() => setShowAdhanPicker(!showAdhanPicker)}
                >
                  <Ionicons name="musical-notes" size={18} color="#D4AF37" />
                  <Text style={styles.chooseAdhanText}>
                    {showAdhanPicker ? 'إغلاق القائمة' : 'اختيار صوت الأذان'}
                  </Text>
                </TouchableOpacity>
                {showAdhanPicker && adhanList.map((item) => (
                  <TouchableOpacity
                    key={item.id}
                    style={[styles.adhanItem, selectedAdhan === item.name && styles.adhanItemActive]}
                    onPress={async () => {
                      setSelectedAdhan(item.name);
                      await AsyncStorage.multiSet([
                        ['selected_adhan', item.name],
                        ['selected_adhan_id', item.id],
                        ['selected_adhan_meta', JSON.stringify(item)],
                      ]);
                      if (notificationsEnabled) {
                        const result = await reschedulePrayerNotificationsFromStorage();
                        await refreshNotificationStatus();
                        if (!result.permissionGranted) {
                          Alert.alert('الإشعارات غير مفعلة', 'فعّل إذن الإشعارات من الهاتف حتى يعمل الأذان في وقته.');
                        } else if (!result.scheduledCount) {
                          Alert.alert('تم حفظ الأذان', 'افتح صفحة مواعيد الصلاة لتسجيل المواقيت، ثم جرّب زر الاختبار السريع.');
                        }
                      }
                      setShowAdhanPicker(false);
                    }}
                  >
                    <View style={styles.adhanTextBlock}>
                      <Text style={[styles.adhanItemText, selectedAdhan === item.name && { color: '#D4AF37' }]}>
                        {item.branchName}
                      </Text>
                      <Text style={styles.adhanMetaText}>
                        {item.exampleLabel} • مقام {item.maqamName}
                      </Text>
                    </View>
                    <View style={styles.adhanCheckWrap}>
                      {selectedAdhan === item.name ? (
                        <Ionicons name="checkmark" size={18} color="#D4AF37" />
                      ) : (
                        <View style={styles.adhanCheckPlaceholder} />
                      )}
                    </View>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* App Info */}
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <View style={styles.sectionIconWrap}><Ionicons name="information-circle" size={16} color="#D4AF37" /></View>
                <Text style={styles.sectionTitle}>حول التطبيق</Text>
              </View>
              <View style={styles.sectionContent}>
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>التطبيق</Text>
                  <Text style={styles.infoValue}>موسوعة الأذان العراقي</Text>
                </View>
                <View style={styles.divider} />
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>المطور</Text>
                  <Text style={styles.infoValue}>مدرسة الإمام الرضا القرآنية</Text>
                </View>
                <View style={styles.divider} />
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>الإصدار</Text>
                  <Text style={styles.infoValue}>1.0.6</Text>
                </View>
              </View>
            </View>

          </ScrollView>
        </SafeAreaView>
      </View>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  background: { flex: 1 },
  overlay: { flex: 1, backgroundColor: 'rgba(250, 247, 239, 0.90)' },
  safeArea: { flex: 1 },
  header: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 18,
    paddingBottom: 10,
    paddingHorizontal: 20,
  },
  heroBadge: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(255, 248, 225, 0.95)',
    borderWidth: 1,
    borderColor: '#E7D39A',
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginBottom: 10,
  },
  heroBadgeText: {
    fontSize: 12,
    color: '#8B6B16',
    fontFamily: 'Cairo_700Bold',
  },
  heroIconWrap: {
    width: 62,
    height: 62,
    borderRadius: 31,
    backgroundColor: 'rgba(255,255,255,0.88)',
    borderWidth: 2,
    borderColor: '#E6D2A2',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.08, shadowRadius: 10 },
      android: { elevation: 3 },
      default: { boxShadow: '0px 4px 10px rgba(0,0,0,0.08)' },
    }),
  },
  title: { fontSize: 28, fontFamily: 'Cairo_700Bold', color: '#111827', writingDirection: 'rtl' },
  subtitle: {
    fontSize: 13,
    color: '#6B7280',
    textAlign: 'center',
    writingDirection: 'rtl',
    lineHeight: 22,
    marginTop: 4,
  },
  scrollView: { flex: 1 },
  scrollContent: { paddingHorizontal: 16, paddingBottom: 40 },
  section: { marginTop: 18 },
  sectionHeader: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 8,
    marginBottom: 10,
    alignSelf: 'flex-end',
  },
  sectionIconWrap: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(212, 175, 55, 0.12)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  sectionTitle: { fontSize: 16, fontFamily: 'Cairo_700Bold', color: '#6B7280', writingDirection: 'rtl', textAlign: 'right' },
  sectionContent: {
    backgroundColor: 'rgba(255,255,255,0.94)',
    borderRadius: 20,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#EFE2BF',
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.05, shadowRadius: 8 },
      android: { elevation: 2 },
      default: { boxShadow: '0px 3px 8px rgba(0,0,0,0.05)' },
    }),
  },
  radioRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F6EFD9',
  },
  radioRowActive: { backgroundColor: '#FFF9EA' },
  radioLeft: { flexDirection: 'row-reverse', alignItems: 'center', gap: 12, flex: 1 },
  radio: { width: 22, height: 22, borderRadius: 11, borderWidth: 2, borderColor: '#D1D5DB', justifyContent: 'center', alignItems: 'center' },
  radioSelected: { borderColor: '#D4AF37' },
  radioDot: { width: 12, height: 12, borderRadius: 6, backgroundColor: '#D4AF37' },
  radioLabel: { fontSize: 16, fontFamily: 'Cairo_700Bold', color: '#111827', writingDirection: 'rtl', textAlign: 'right' },
  radioDesc: { fontSize: 12, color: '#9CA3AF', marginTop: 2, writingDirection: 'rtl', textAlign: 'right', lineHeight: 19 },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
  },
  switchLeft: { flexDirection: 'row-reverse', alignItems: 'center', gap: 12, flex: 1 },
  switchLabel: { fontSize: 16, fontFamily: 'Cairo_700Bold', color: '#111827', writingDirection: 'rtl', textAlign: 'right' },
  switchDesc: { fontSize: 12, color: '#9CA3AF', marginTop: 2, writingDirection: 'rtl', textAlign: 'right' },
  statusCard: {
    marginHorizontal: 16,
    marginTop: 4,
    marginBottom: 12,
    padding: 14,
    borderRadius: 14,
    backgroundColor: '#F8FAF5',
    borderWidth: 1,
    borderColor: '#DDEAD7',
  },
  statusHeaderRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 8,
    marginBottom: 6,
  },
  statusTitle: {
    color: '#2E7D32',
    fontSize: 14,
    fontFamily: 'Cairo_700Bold',
    writingDirection: 'rtl',
  },
  statusText: {
    color: '#1F2937',
    fontSize: 13,
    writingDirection: 'rtl',
    textAlign: 'right',
    lineHeight: 21,
  },
  statusSubtext: {
    color: '#6B7280',
    fontSize: 12,
    marginTop: 4,
    writingDirection: 'rtl',
    textAlign: 'right',
    lineHeight: 20,
  },
  testNotificationButton: {
    marginHorizontal: 16,
    marginBottom: 12,
    marginTop: 4,
    backgroundColor: '#D4AF37',
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 14,
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  testNotificationText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontFamily: 'Cairo_700Bold',
    writingDirection: 'rtl',
  },
  refreshStatusButton: {
    marginHorizontal: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E7D39A',
    borderRadius: 14,
    paddingVertical: 11,
    paddingHorizontal: 14,
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#FFFDF6',
  },
  refreshStatusText: {
    color: '#8B6B16',
    fontSize: 14,
    fontFamily: 'Cairo_700Bold',
    writingDirection: 'rtl',
  },
  adhanNote: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    padding: 16,
    backgroundColor: '#F9FAFB',
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  adhanNoteText: { flex: 1, fontSize: 13, color: '#6B7280', writingDirection: 'rtl', textAlign: 'right', lineHeight: 20 },
  selectedAdhan: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 16,
    minHeight: 68,
    transform: [{ scaleX: -1 }],
  },
  selectedAdhanIconWrap: {
    width: 22,
    alignItems: 'center',
    justifyContent: 'center',
    transform: [{ scaleX: -1 }],
  },
  selectedAdhanTextWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    transform: [{ scaleX: -1 }],
  },
  selectedAdhanLabel: {
    fontSize: 12,
    color: '#6B7280',
    writingDirection: 'rtl',
    textAlign: 'center',
    width: '100%',
  },
  selectedAdhanText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#111827',
    writingDirection: 'rtl',
    textAlign: 'center',
    marginTop: 2,
    width: '100%',
  },
  chooseAdhanBtn: {
    flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'center', gap: 8,
    padding: 13, borderTopWidth: 1, borderTopColor: '#F6EFD9', backgroundColor: '#FFFDF6'
  },
  chooseAdhanText: { fontSize: 15, fontFamily: 'Cairo_700Bold', color: '#D4AF37', writingDirection: 'rtl' },
  adhanItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 14,
    minHeight: 72,
    borderTopWidth: 1,
    borderTopColor: '#F6EFD9',
    transform: [{ scaleX: -1 }],
  },
  adhanItemActive: { backgroundColor: '#FFFBEB' },
  adhanTextBlock: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    transform: [{ scaleX: -1 }],
  },
  adhanItemText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#111827',
    writingDirection: 'rtl',
    textAlign: 'center',
    width: '100%',
  },
  adhanMetaText: {
    fontSize: 12,
    color: '#8A8F98',
    writingDirection: 'rtl',
    textAlign: 'center',
    marginTop: 3,
    width: '100%',
  },
  adhanCheckWrap: {
    width: 18,
    alignItems: 'center',
    justifyContent: 'center',
    transform: [{ scaleX: -1 }],
  },
  adhanCheckPlaceholder: {
    width: 18,
    height: 18,
  },
  infoRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
  },
  infoLabel: { fontSize: 14, color: '#9CA3AF', writingDirection: 'rtl' },
  infoValue: { fontSize: 14, fontFamily: 'Cairo_700Bold', color: '#111827', writingDirection: 'rtl' },
  divider: { height: 1, backgroundColor: '#F6EFD9' },
  adminButton: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.94)',
    borderRadius: 18,
    padding: 16,
    gap: 12,
    borderWidth: 1,
    borderColor: '#EFE2BF',
  },
  adminButtonText: { flex: 1, fontSize: 15, fontFamily: 'Cairo_700Bold', color: '#111827', writingDirection: 'rtl', textAlign: 'right' },
});
