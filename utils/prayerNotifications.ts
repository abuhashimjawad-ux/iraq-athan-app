import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import { Audio, type AVPlaybackStatus } from 'expo-av';
import { Coordinates, CalculationMethod, PrayerTimes, Madhab } from 'adhan';
import { getLocalAudioSource } from '../constants/localAudioMap';
import { getAudioUri } from './audioCache';

const CHANNEL_ID = 'prayer-alerts-default';
const CHANNEL_PREFIX = 'prayer-adhan-v3';
const LAST_PRAYER_CONTEXT_KEY = 'last_prayer_context';
const LAST_ADHAN_CHANNEL_KEY = 'last_adhan_channel_id';
const SCHEDULE_AHEAD_DAYS = 7;
const RESCHEDULE_GRACE_MS = 10_000;

type SavedPrayerContext = {
  latitude: number;
  longitude: number;
  waqfType: string;
};

type SelectedAdhanMeta = {
  id?: string;
  name?: string;
  audioUrl?: string;
  branchName?: string;
  exampleLabel?: string;
  maqamName?: string;
};

let notificationAudioInitialized = false;
let notificationSubscription: Notifications.EventSubscription | null = null;
let notificationResponseSubscription: Notifications.EventSubscription | null = null;
let activeForegroundSound: Audio.Sound | null = null;

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

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
  const envUrl = String(process.env.EXPO_PUBLIC_BACKEND_URL || '').trim().replace(/\/$/, '');
  if (envUrl) {
    return envUrl;
  }

  const previewHost = getHostFromValue(
    (Constants.expoConfig as any)?.hostUri ||
      (Constants as any)?.expoGoConfig?.debuggerHost ||
      (Constants as any)?.manifest2?.extra?.expoGo?.debuggerHost ||
      ''
  );

  return !isExpoHostedHost(previewHost) && isPrivateHost(previewHost)
    ? `http://${previewHost}:8000`
    : '';
}

function getParamsForWaqfType(waqfType: string) {
  const params = waqfType === 'shia' ? CalculationMethod.Tehran() : CalculationMethod.MuslimWorldLeague();
  if (waqfType !== 'shia') {
    params.madhab = Madhab.Shafi;
  }
  return params;
}

function getPrayerEntries(prayerTimes: PrayerTimes, waqfType: string) {
  if (waqfType === 'shia') {
    return [
      { key: 'fajr', name: 'الفجر', time: prayerTimes.fajr },
      { key: 'dhuhr', name: 'الظهر والعصر', time: prayerTimes.dhuhr },
      { key: 'maghrib', name: 'المغرب والعشاء', time: prayerTimes.maghrib },
    ];
  }

  return [
    { key: 'fajr', name: 'الفجر', time: prayerTimes.fajr },
    { key: 'dhuhr', name: 'الظهر', time: prayerTimes.dhuhr },
    { key: 'asr', name: 'العصر', time: prayerTimes.asr },
    { key: 'maghrib', name: 'المغرب', time: prayerTimes.maghrib },
    { key: 'isha', name: 'العشاء', time: prayerTimes.isha },
  ];
}

function buildUpcomingPrayerEntries(
  prayerTimes: PrayerTimes,
  waqfType: string,
  coords?: { latitude: number; longitude: number } | null
) {
  const entries = [...getPrayerEntries(prayerTimes, waqfType)];

  if (!coords) {
    return entries;
  }

  for (let offset = 1; offset < SCHEDULE_AHEAD_DAYS; offset += 1) {
    const date = new Date();
    date.setDate(date.getDate() + offset);

    const futureTimes = new PrayerTimes(
      new Coordinates(coords.latitude, coords.longitude),
      date,
      getParamsForWaqfType(waqfType)
    );

    entries.push(...getPrayerEntries(futureTimes, waqfType));
  }

  return entries;
}

function parseSelectedAdhanId(rawId?: string) {
  const value = String(rawId || '').trim();
  const match = value.match(/^(.*)_(1|2)$/);

  if (!match) {
    return { branchId: value, audioNumber: 1 as 1 | 2 };
  }

  return {
    branchId: match[1],
    audioNumber: Number(match[2]) as 1 | 2,
  };
}

async function stopActiveForegroundSound() {
  if (!activeForegroundSound) {
    return;
  }

  try {
    await activeForegroundSound.unloadAsync();
  } catch {}

  activeForegroundSound = null;
}

async function playPreferredAdhanInForeground() {
  try {
    const metaRaw = await AsyncStorage.getItem('selected_adhan_meta');
    const fallbackName = await AsyncStorage.getItem('selected_adhan');
    const meta: SelectedAdhanMeta = metaRaw ? JSON.parse(metaRaw) : { name: fallbackName || '' };

    const { branchId, audioNumber } = parseSelectedAdhanId(meta.id);
    const localSource = getLocalAudioSource(branchId, audioNumber);

    await Audio.setAudioModeAsync({
      playsInSilentModeIOS: true,
      staysActiveInBackground: true,
    });

    await stopActiveForegroundSound();

    let sound: Audio.Sound | null = null;

    if (localSource) {
      // localSource is a Firebase Storage URL - download/cache then play
      const { uri } = await getAudioUri(localSource, branchId || 'preferred_adhan', audioNumber);
      const result = await Audio.Sound.createAsync({ uri }, { shouldPlay: true });
      sound = result.sound;
    } else if (meta.audioUrl && meta.audioUrl !== 'local') {
      const backendUrl = resolveBackendUrl();
      if (!backendUrl) {
        return;
      }

      const fullUrl = meta.audioUrl.startsWith('http') ? meta.audioUrl : `${backendUrl}${meta.audioUrl}`;
      const { uri } = await getAudioUri(fullUrl, branchId || 'preferred_adhan', audioNumber);
      const result = await Audio.Sound.createAsync({ uri }, { shouldPlay: true });
      sound = result.sound;
    }

    if (!sound) {
      return;
    }

    activeForegroundSound = sound;
    sound.setOnPlaybackStatusUpdate(async (status: AVPlaybackStatus) => {
      if (status.isLoaded && status.didJustFinish) {
        await stopActiveForegroundSound();
      }
    });
  } catch (error) {
    console.log('Foreground adhan playback skipped:', error);
  }
}

export async function initializePrayerNotifications() {
  if (notificationAudioInitialized) {
    return;
  }

  notificationAudioInitialized = true;

  // Fires when notification arrives while app is in the FOREGROUND
  notificationSubscription = Notifications.addNotificationReceivedListener(async (event) => {
    if (event.request.content.data?.type === 'prayer-alert') {
      await playPreferredAdhanInForeground();
    }
  });

  // Fires when user TAPS the notification (app was in background or killed)
  notificationResponseSubscription = Notifications.addNotificationResponseReceivedListener(async (response) => {
    const data = response.notification.request.content.data;
    if (data?.type === 'prayer-alert') {
      await playPreferredAdhanInForeground();
    }
  });
}

export async function disposePrayerNotifications() {
  if (notificationSubscription) {
    notificationSubscription.remove();
    notificationSubscription = null;
  }

  if (notificationResponseSubscription) {
    notificationResponseSubscription.remove();
    notificationResponseSubscription = null;
  }

  notificationAudioInitialized = false;
  await stopActiveForegroundSound();
}

function getAdhanChannelId(branchId: string, audioNumber: number): string {
  if (!branchId) return CHANNEL_ID;
  return `${CHANNEL_PREFIX}-${branchId}-${audioNumber}`;
}

function getAdhanSoundName(branchId: string, audioNumber: number): string {
  if (!branchId) return 'default';
  return `${branchId}_${audioNumber}`;
}

async function ensureAdhanChannel(branchId: string, audioNumber: number): Promise<string> {
  const channelId = getAdhanChannelId(branchId, audioNumber);
  const soundName = getAdhanSoundName(branchId, audioNumber);

  await Notifications.setNotificationChannelAsync(channelId, {
    name: 'Prayer Alerts',
    importance: Notifications.AndroidImportance.MAX,
    vibrationPattern: [0, 250, 250, 250],
    lightColor: '#D4AF37',
    sound: soundName,
  });

  await AsyncStorage.setItem(LAST_ADHAN_CHANNEL_KEY, channelId);
  return channelId;
}

export async function ensurePrayerNotificationPermissions() {
  const current = await Notifications.getPermissionsAsync();
  let granted = current.granted || current.ios?.status === Notifications.IosAuthorizationStatus.PROVISIONAL;

  if (!granted) {
    const requested = await Notifications.requestPermissionsAsync();
    granted = requested.granted || requested.ios?.status === Notifications.IosAuthorizationStatus.PROVISIONAL;
  }

  // Always ensure the fallback channel exists with a default sound.
  // Android locks channel sound after first creation, so CHANNEL_ID uses a
  // versioned name (prayer-alerts-default) to avoid conflicts with older builds.
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync(CHANNEL_ID, {
      name: 'تنبيهات الصلاة',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 500, 200, 500],
      lightColor: '#D4AF37',
      sound: 'default',
    });
  }

  return granted;
}

export async function cancelPrayerNotifications() {
  const scheduled = await Notifications.getAllScheduledNotificationsAsync();
  const prayerNotifications = scheduled.filter((item) => item.content.data?.type === 'prayer-alert');

  await Promise.all(
    prayerNotifications.map((item) => Notifications.cancelScheduledNotificationAsync(item.identifier))
  );

  return prayerNotifications.length;
}

export async function scheduleTestNotification(delaySeconds = 10) {
  const permissionGranted = await ensurePrayerNotificationPermissions();
  if (!permissionGranted) {
    return { scheduled: false, permissionGranted: false };
  }

  const scheduled = await Notifications.getAllScheduledNotificationsAsync();
  const existingTests = scheduled.filter((item) => item.content.data?.type === 'prayer-test');
  await Promise.all(
    existingTests.map((item) => Notifications.cancelScheduledNotificationAsync(item.identifier))
  );

  // Ensure the fallback channel exists before scheduling the test notification.
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync(CHANNEL_ID, {
      name: 'تنبيهات الصلاة',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 500, 200, 500],
      lightColor: '#D4AF37',
      sound: 'default',
    });
  }

  await Notifications.scheduleNotificationAsync({
    content: {
      title: 'اختبار تنبيه الأذان',
      body: `إذا وصلتك هذه الرسالة خلال ${delaySeconds} ثوانٍ فالتنبيهات تعمل بشكل صحيح.`,
      sound: 'default',
      priority: Notifications.AndroidNotificationPriority.MAX,
      data: {
        type: 'prayer-test',
        scheduledFor: new Date(Date.now() + delaySeconds * 1000).toISOString(),
      },
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
      seconds: delaySeconds,
      channelId: CHANNEL_ID,
    },
  });

  return { scheduled: true, permissionGranted: true };
}

export async function getPrayerNotificationStatus() {
  const current = await Notifications.getPermissionsAsync();
  const permissionGranted = current.granted || current.ios?.status === Notifications.IosAuthorizationStatus.PROVISIONAL;
  const notificationsEnabled = (await AsyncStorage.getItem('notifications_enabled')) !== 'false';
  const scheduled = await Notifications.getAllScheduledNotificationsAsync();
  const prayerNotifications = scheduled
    .filter((item) => item.content.data?.type === 'prayer-alert')
    .sort((a, b) => {
      const aTime = new Date(String(a.content.data?.scheduledFor || 0)).getTime();
      const bTime = new Date(String(b.content.data?.scheduledFor || 0)).getTime();
      return aTime - bTime;
    });

  const nextNotification = prayerNotifications[0];

  return {
    permissionGranted,
    notificationsEnabled,
    scheduledCount: prayerNotifications.length,
    nextPrayerName: String(nextNotification?.content.data?.prayerName || ''),
    nextScheduledFor: String(nextNotification?.content.data?.scheduledFor || ''),
  };
}

export async function savePrayerContext(latitude: number, longitude: number, waqfType: string) {
  const payload: SavedPrayerContext = { latitude, longitude, waqfType };
  await AsyncStorage.setItem(LAST_PRAYER_CONTEXT_KEY, JSON.stringify(payload));
}

export async function schedulePrayerNotifications(
  prayerTimes: PrayerTimes,
  waqfType: string,
  coords?: { latitude: number; longitude: number } | null
) {
  if (coords) {
    await savePrayerContext(coords.latitude, coords.longitude, waqfType);
  }

  const notificationsEnabled = (await AsyncStorage.getItem('notifications_enabled')) !== 'false';
  if (!notificationsEnabled) {
    await cancelPrayerNotifications();
    return { scheduledCount: 0, permissionGranted: true };
  }

  const permissionGranted = await ensurePrayerNotificationPermissions();
  if (!permissionGranted) {
    return { scheduledCount: 0, permissionGranted: false };
  }

  await cancelPrayerNotifications();

  const selectedAdhan = (await AsyncStorage.getItem('selected_adhan')) || 'الأذان المختار';
  const metaRaw = await AsyncStorage.getItem('selected_adhan_meta');
  const meta: SelectedAdhanMeta = metaRaw ? JSON.parse(metaRaw) : {};
  const { branchId, audioNumber } = parseSelectedAdhanId(meta.id);
  const soundName = getAdhanSoundName(branchId, audioNumber);

  // On Android: create (or reuse) a channel whose sound is the selected adhan.
  // The OS plays this sound automatically when the notification fires,
  // even if the app is completely killed.
  const channelId = Platform.OS === 'android'
    ? await ensureAdhanChannel(branchId, audioNumber)
    : CHANNEL_ID;

  const now = new Date();
  const allEntries = buildUpcomingPrayerEntries(prayerTimes, waqfType, coords);

  let scheduledCount = 0;

  for (const prayer of allEntries) {
    if (prayer.time.getTime() <= now.getTime() + RESCHEDULE_GRACE_MS) {
      continue;
    }

    await Notifications.scheduleNotificationAsync({
      content: {
        title: `حان الآن وقت صلاة ${prayer.name}`,
        body: `الأذان المختار: ${selectedAdhan}`,
        // iOS: filename causes the OS to play the bundled sound directly.
        // Android: the channel sound is used; this value is informational.
        sound: soundName,
        data: {
          type: 'prayer-alert',
          prayerKey: prayer.key,
          prayerName: prayer.name,
          scheduledFor: prayer.time.toISOString(),
        },
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DATE,
        date: prayer.time,
        channelId,
      },
    });

    scheduledCount += 1;
  }

  return { scheduledCount, permissionGranted: true };
}

export async function reschedulePrayerNotificationsFromStorage() {
  const raw = await AsyncStorage.getItem(LAST_PRAYER_CONTEXT_KEY);
  if (!raw) {
    return { scheduledCount: 0, restored: false };
  }

  try {
    const context = JSON.parse(raw) as SavedPrayerContext;

    // Always use the currently selected waqf type from settings,
    // not the one that was stored when notifications were last scheduled.
    const currentWaqfType = await AsyncStorage.getItem('waqf_type');
    const waqfType = currentWaqfType || context.waqfType;

    const params = getParamsForWaqfType(waqfType);
    const prayerTimes = new PrayerTimes(
      new Coordinates(context.latitude, context.longitude),
      new Date(),
      params
    );

    const result = await schedulePrayerNotifications(prayerTimes, waqfType, {
      latitude: context.latitude,
      longitude: context.longitude,
    });

    return { ...result, restored: true };
  } catch {
    return { scheduledCount: 0, restored: false };
  }
}
