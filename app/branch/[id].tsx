import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ImageBackground,
  ActivityIndicator,
  Linking,
  Platform,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import Constants from 'expo-constants';
import { Audio, type AVPlaybackStatus } from 'expo-av';
import { getAudioUri, initializeAudioCache, clearAudioCache } from '../../utils/audioCache';
import { getLocalAudioSource, getLocalPerformerName } from '../../constants/localAudioMap';

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
const SPECIAL_BRANCH_AUDIO_BY_NAME: Record<
  string,
  { audio1_url: string; audio2_url: string; performer1: string; performer2: string }
> = {
  'الشطيت': {
    audio1_url: `/api/audio/${encodeURIComponent('shteet_audio1_غسان_المعموري_20260419.mp3')}`,
    audio2_url: `/api/audio/${encodeURIComponent('shteet_audio2_غسان_المعموري_20260419.mp3')}`,
    performer1: 'القارئ غسان المعموري',
    performer2: 'القارئ غسان المعموري',
  },
};

type BranchDetail = {
  id: string;
  name: string;
  maqam_id: string;
  audio1_url: string;
  audio2_url: string;
  performer1: string;
  performer2: string;
  telegram_url: string;
};

function formatTime(ms: number): string {
  const totalSec = Math.floor(ms / 1000);
  const min = Math.floor(totalSec / 60);
  const sec = totalSec % 60;
  return `${min}:${sec.toString().padStart(2, '0')}`;
}

const PERFORMER_OVERRIDES: Record<string, string> = {
  'mansouri_2': 'القارئ علي جاسم',
  'sharqi_dukah_1': 'القارئ عبد المعز شاكر',
};

const PERFORMER_OVERRIDES_BY_NAME: Record<string, Record<number, string>> = {
  'الشطيت': {
    1: 'القارئ غسان المعموري',
    2: 'القارئ غسان المعموري',
  },
};

function inferPerformerFromUrl(audioUrl: string, fallback = '', branchId = '', audioNumber = 0, branchName = ''): string {
  const namedOverride = PERFORMER_OVERRIDES_BY_NAME[branchName]?.[audioNumber];
  if (namedOverride) {
    return namedOverride;
  }

  const overrideKey = `${branchId}_${audioNumber}`;
  if (PERFORMER_OVERRIDES[overrideKey]) {
    return PERFORMER_OVERRIDES[overrideKey];
  }

  const baseText = fallback?.trim();
  const cleanPerformerText = (value: string) => {
    let cleaned = value;
    [
      'بمقام المنصوري',
      'بطور جبير الكون',
      'بمقام',
      'بطور',
      'اذان',
      'الاذان',
      'آذان',
    ].forEach((phrase) => {
      cleaned = cleaned.replaceAll(phrase, ' ');
    });

    cleaned = cleaned.replace(/_/g, ' ').replace(/\s+/g, ' ').trim();

    const titleMatch = cleaned.match(/(القارئ|الشيخ|الحاج).*/);
    if (titleMatch) {
      cleaned = titleMatch[0].trim();
    }

    if (!cleaned) return '';
    return /القارئ|الشيخ|الحاج/.test(cleaned) ? cleaned : `القارئ ${cleaned}`;
  };

  if (/عبد\s*المعز\s*شاكر/.test(baseText || audioUrl)) {
    return 'القارئ عبد المعز شاكر';
  }

  if (baseText) return cleanPerformerText(baseText);
  if (!audioUrl) return '';

  try {
    const decoded = decodeURIComponent(audioUrl.split('/').pop() || '');
    const withoutExtension = decoded.replace(/\.(mp3|m4a|wav)$/i, '');
    const rawName = withoutExtension.includes('_-_')
      ? withoutExtension.split('_-_').pop() || ''
      : withoutExtension.split('_').slice(3).join(' ');

    return cleanPerformerText(rawName);
  } catch {
    return baseText || '';
  }
}

function AudioPlayerCard({
  label,
  audioUrl,
  performer,
  themeColor,
  testIdPrefix,
  branchId,
  audioNumber,
  branchName,
}: {
  label: string;
  audioUrl: string;
  performer: string;
  themeColor: string;
  testIdPrefix: string;
  branchId: string;
  audioNumber: number;
  branchName: string;
}) {
  const localSource = getLocalAudioSource(branchId, audioNumber as 1 | 2);
  const localPerformer = getLocalPerformerName(branchId, audioNumber as 1 | 2);
  const hasAudio = Boolean(localSource || (audioUrl && audioUrl.length > 0));
  const displayPerformer = inferPerformerFromUrl(
    audioUrl === 'local' ? '' : audioUrl,
    performer || localPerformer,
    branchId,
    audioNumber,
    branchName
  );
  const [sound, setSound] = useState<Audio.Sound | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [duration, setDuration] = useState(0);
  const [position, setPosition] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [isLocal, setIsLocal] = useState(false);

  useEffect(() => {
    return () => {
      if (sound) {
        sound.unloadAsync();
      }
    };
  }, [sound]);

  const onPlaybackStatusUpdate = (status: AVPlaybackStatus) => {
    if (!status.isLoaded) {
      return;
    }

    setDuration(status.durationMillis || 0);
    setPosition(status.positionMillis || 0);
    setIsPlaying(status.isPlaying);
    if (status.didJustFinish) {
      setIsPlaying(false);
      setPosition(0);
    }
  };

  const togglePlay = async () => {
    try {
      if (sound) {
        if (isPlaying) {
          await sound.pauseAsync();
        } else {
          await sound.playAsync();
        }
      } else {
        setIsLoading(true);
        await Audio.setAudioModeAsync({
          playsInSilentModeIOS: true,
          staysActiveInBackground: false,
        });
        
        if (localSource) {
          // localSource is a Firebase Storage URL - download/cache then play
          const { uri, isLocal: local } = await getAudioUri(localSource, branchId, audioNumber);
          setIsLocal(local);
          const { sound: newSound } = await Audio.Sound.createAsync(
            { uri },
            { shouldPlay: true },
            onPlaybackStatusUpdate
          );
          setSound(newSound);
          setIsLoading(false);
          return;
        }

        if (!audioUrl || !BACKEND_URL) {
          throw new Error('No available audio source for this item');
        }

        const fullUrl = audioUrl.startsWith('http') ? audioUrl : `${BACKEND_URL}${audioUrl}`;
        const { uri, isLocal: local } = await getAudioUri(fullUrl, branchId, audioNumber);

        setIsLocal(local);
        console.log(`Playing audio from ${local ? 'cache' : 'server'}: ${uri}`);

        const { sound: newSound } = await Audio.Sound.createAsync(
          { uri },
          { shouldPlay: true },
          onPlaybackStatusUpdate
        );
        setSound(newSound);
        setIsLoading(false);
      }
    } catch (err) {
      console.error('Audio error:', err);
      setIsLoading(false);
    }
  };

  const progressPct = duration > 0 ? (position / duration) * 100 : 0;

  return (
    <View style={styles.playerCard} testID={`${testIdPrefix}-card`}>
      <View style={styles.playerHeader}>
        <View style={[styles.playerIcon, { backgroundColor: themeColor + '15' }]}>
          <Ionicons
            name={label === 'المثال الأول' ? 'musical-notes' : 'musical-note'}
            size={20}
            color={themeColor}
          />
        </View>
        <View style={styles.playerTextWrap}>
          <Text style={styles.playerLabel}>{label}</Text>
          {displayPerformer ? (
            <Text style={styles.performerName}>{displayPerformer}</Text>
          ) : null}
        </View>
        {isLocal && (
          <View style={styles.cachedBadge}>
            <Ionicons name="download-outline" size={12} color="#10b981" />
            <Text style={styles.cachedText}>محفوظ</Text>
          </View>
        )}
      </View>

      {hasAudio ? (
        <View style={styles.playerControls}>
          <TouchableOpacity
            testID={`${testIdPrefix}-play-btn`}
            style={[styles.playButton, { backgroundColor: themeColor }]}
            activeOpacity={0.7}
            onPress={togglePlay}
            disabled={isLoading}
          >
            {isLoading ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <Ionicons name={isPlaying ? 'pause' : 'play'} size={24} color="#FFFFFF" />
            )}
          </TouchableOpacity>
          <View style={styles.progressContainer}>
            <View style={styles.progressBar}>
              <View
                style={[
                  styles.progressFill,
                  { backgroundColor: themeColor, width: `${progressPct}%` },
                ]}
              />
            </View>
            <View style={styles.timeRow}>
              <Text style={styles.timeText}>{formatTime(position)}</Text>
              <Text style={styles.timeText}>{formatTime(duration)}</Text>
            </View>
          </View>
        </View>
      ) : (
        <View style={styles.placeholderContainer}>
          <Ionicons name="time-outline" size={32} color="#D1D5DB" />
          <Text style={styles.placeholderText}>سيتم الإضافة قريباً</Text>
        </View>
      )}
    </View>
  );
}

export default function BranchScreen() {
  const router = useRouter();
  const { id, name, maqamName } = useLocalSearchParams<{
    id: string;
    name: string;
    maqamName: string;
  }>();

  const [branch, setBranch] = useState<BranchDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const themeColor = '#CCA147';

  const fetchBranch = useCallback(async () => {
    try {
      const branchName = String(name || '').trim();
      const specialBranchAudio = SPECIAL_BRANCH_AUDIO_BY_NAME[branchName];

      if (specialBranchAudio) {
        setBranch({
          id: String(id || 'shteet'),
          name: branchName,
          maqam_id: '',
          audio1_url: String(specialBranchAudio.audio1_url || ''),
          audio2_url: String(specialBranchAudio.audio2_url || ''),
          performer1: String(specialBranchAudio.performer1 || ''),
          performer2: String(specialBranchAudio.performer2 || ''),
          telegram_url: 'https://t.me/Maqamatalathan',
        });
        return;
      }

      if (!BACKEND_URL || !id || String(id).includes('_static_')) {
        setBranch({
          id: String(id || ''),
          name: String(name || ''),
          maqam_id: '',
          audio1_url: '',
          audio2_url: '',
          performer1: '',
          performer2: '',
          telegram_url: 'https://t.me/Maqamatalathan',
        });
        return;
      }

      const res = await fetch(`${BACKEND_URL}/api/branches/${id}`);
      if (!res.ok) {
        throw new Error(`Branch request failed: ${res.status}`);
      }

      const data = await res.json();
      setBranch(data);
    } catch {
      setBranch({
        id: String(id || ''),
        name: String(name || ''),
        maqam_id: '',
        audio1_url: '',
        audio2_url: '',
        performer1: '',
        performer2: '',
        telegram_url: 'https://t.me/Maqamatalathan',
      });
    } finally {
      setLoading(false);
    }
  }, [id, name]);

  useEffect(() => {
    initializeAudioCache().catch(() => null);
    clearAudioCache().catch(() => null);
    fetchBranch();
  }, [fetchBranch]);

  const openTelegram = () => {
    Linking.openURL('https://t.me/ridhaquranschool');
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={themeColor} />
      </View>
    );
  }

  return (
    <ImageBackground
      source={require('../../assets/images/bg_maqam.jpg')}
      style={styles.background}
      imageStyle={styles.backgroundImage}
      resizeMode="stretch"
    >
      <View style={styles.overlay}>
        <SafeAreaView style={styles.safeArea}>
          <View style={styles.header}>
            <TouchableOpacity
              testID="back-button-branch"
              onPress={() => router.back()}
              style={styles.backButton}
            >
              <Ionicons name="chevron-forward" size={24} color="#111827" />
            </TouchableOpacity>
            <View style={styles.headerCenter}>
              <Text style={styles.headerTitle} testID="branch-title">
                {name}
              </Text>
              <Text style={styles.headerSubtitle}>مقام {maqamName}</Text>
            </View>
            <View style={styles.placeholder} />
          </View>

          <ScrollView
            style={styles.scrollView}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
          >
            <AudioPlayerCard
              label="المثال الأول"
              audioUrl={branch?.audio1_url || ''}
              performer={branch?.performer1 || ''}
              themeColor={themeColor}
              testIdPrefix="audio-1"
              branchId={branch?.id || ''}
              audioNumber={1}
              branchName={String(name || branch?.name || '')}
            />
            <AudioPlayerCard
              label="المثال الثاني"
              audioUrl={branch?.audio2_url || ''}
              performer={branch?.performer2 || ''}
              themeColor={themeColor}
              testIdPrefix="audio-2"
              branchId={branch?.id || ''}
              audioNumber={2}
              branchName={String(name || branch?.name || '')}
            />


            <TouchableOpacity
              testID="send-audio-application-btn"
              style={[styles.sendButton, { backgroundColor: themeColor }]}
              activeOpacity={0.8}
              onPress={openTelegram}
            >
              <Ionicons name="mic" size={22} color="#FFFFFF" />
              <Text style={styles.sendButtonText}>أرسل تطبيقك الصوتي</Text>
            </TouchableOpacity>
          </ScrollView>
        </SafeAreaView>
      </View>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  background: { flex: 1, backgroundColor: '#F5EEDB' },
  backgroundImage: { opacity: 1 },
  overlay: { flex: 1, backgroundColor: 'transparent' },
  safeArea: { flex: 1 },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#F5EEDB' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 248, 232, 0.68)',
    borderWidth: 1,
    borderColor: '#E6D2A2',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerCenter: { alignItems: 'center' },
  headerTitle: {
    fontFamily: 'Cairo_700Bold',
    fontSize: 28,
    color: '#111827',
    writingDirection: 'rtl',
    textAlign: 'center',
  },
  headerSubtitle: {
    fontFamily: 'Cairo_400Regular', fontSize: 13, color: '#6B7280', marginTop: 2, writingDirection: 'rtl' },
  placeholder: { width: 40 },
  scrollView: { flex: 1 },
  scrollContent: { paddingHorizontal: 16, paddingBottom: 32 },
  playerCard: {
    backgroundColor: 'rgba(255, 251, 242, 0.54)',
    borderRadius: 20,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E8D8B0',
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 10 },
      android: { elevation: 3 },
      default: { boxShadow: '0px 2px 10px rgba(0, 0, 0, 0.06)' },
    }),
  },
  playerHeader: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    gap: 10,
  },
  playerIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  playerTextWrap: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  playerLabel: { fontFamily: 'Cairo_700Bold', fontSize: 16, color: '#111827', writingDirection: 'rtl', textAlign: 'center' },
  cachedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#d1fae5',
    paddingVertical: 3,
    paddingHorizontal: 8,
    borderRadius: 10,
    gap: 3,
  },
  cachedText: {
    fontFamily: 'Cairo_700Bold',
    fontSize: 10,
    color: '#10b981',
  },
  performerName: { fontFamily: 'Cairo_400Regular', fontSize: 13, color: '#8B6B16', writingDirection: 'rtl', marginTop: 2, textAlign: 'center' },
  playerControls: { flexDirection: 'row-reverse', alignItems: 'center', gap: 14, paddingHorizontal: 10 },
  playButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginHorizontal: 6,
  },
  progressContainer: { flex: 1 },
  progressBar: {
    height: 6,
    backgroundColor: '#F3F4F6',
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressFill: { height: '100%', borderRadius: 3 },
  timeRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 6 },
  timeText: { fontFamily: 'Cairo_400Regular', fontSize: 11, color: '#9CA3AF' },
  placeholderContainer: { alignItems: 'center', paddingVertical: 20, gap: 8 },
  placeholderText: { fontFamily: 'Cairo_400Regular', fontSize: 14, color: '#9CA3AF', writingDirection: 'rtl' },
  sendButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 16,
    paddingVertical: 16,
    gap: 10,
    marginTop: 8,
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.15, shadowRadius: 12 },
      android: { elevation: 6 },
      default: { boxShadow: '0px 4px 12px rgba(0, 0, 0, 0.15)' },
    }),
  },
  sendButtonText: { fontFamily: 'Cairo_700Bold', color: '#FFFFFF', fontSize: 17, writingDirection: 'rtl' },
});
