import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  ImageBackground,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import Constants from 'expo-constants';
import { maqamatById } from '../../constants/maqamatData';
import { hasLocalAudio } from '../../constants/localAudioMap';

const ENV_BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL;

function resolveBackendUrl() {
  const explicitUrl = String(ENV_BACKEND_URL || '').trim().replace(/\/$/, '');
  if (explicitUrl) {
    return explicitUrl;
  }

  const hostUri =
    (Constants.expoConfig as any)?.hostUri ||
    (Constants as any)?.expoGoConfig?.debuggerHost ||
    (Constants as any)?.manifest2?.extra?.expoGo?.debuggerHost ||
    '';
  const host = String(hostUri).split(':')[0];

  return host ? `http://${host}:8000` : '';
}

const BACKEND_URL = resolveBackendUrl();

type BranchItem = {
  id: string;
  name: string;
  maqam_id: string;
  audio1_url: string;
  audio2_url: string;
  telegram_url: string;
};

const BRANCH_NAME_ALIASES: Record<string, string[]> = {
  'الخنابات': ['الخنبات'],
  'الشرقي رست والاصفهان': ['الشرقي رست والإصفهان'],
};

function normalizeArabicName(value?: string) {
  return String(value || '')
    .replace(/[أإآ]/g, 'ا')
    .replace(/ى/g, 'ي')
    .replace(/ة/g, 'ه')
    .replace(/\s+/g, ' ')
    .trim();
}

function getFallbackBranchId(branchName: string, maqamId: string, index: number) {
  const mappedIds: Record<string, string> = {
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
    'الكاركرد': 'karkurd',
    'الأثر كرد': 'athar_kurd',
    'الاثر كرد': 'athar_kurd',
    'اللامي والحليوي': 'lami_halawi',
    'اللامي المبرقع': 'lami_mubarqa',
  };

  return mappedIds[normalizeArabicName(branchName)] || `${maqamId}_static_${index + 1}`;
}

function buildStaticBranches(maqamId: string, apiBranches: Partial<BranchItem>[] = []): BranchItem[] {
  const saved = maqamatById[maqamId];
  if (!saved) {
    return (apiBranches as BranchItem[]) || [];
  }

  const desiredNames = saved.branches.filter((branch) => branch !== 'المقام الرئيسي');

  return desiredNames.map((branchName, index) => {
    const acceptableNames = [branchName, ...(BRANCH_NAME_ALIASES[branchName] || [])].map(normalizeArabicName);
    const apiBranch = apiBranches.find((branch) => acceptableNames.includes(normalizeArabicName(branch.name))) || {};
    const fallbackId = String(apiBranch.id || getFallbackBranchId(branchName, maqamId, index));

    return {
      id: fallbackId,
      name: branchName,
      maqam_id: String(apiBranch.maqam_id || maqamId),
      audio1_url: String(apiBranch.audio1_url || (hasLocalAudio(fallbackId, 1) ? 'local' : '')),
      audio2_url: String(apiBranch.audio2_url || (hasLocalAudio(fallbackId, 2) ? 'local' : '')),
      telegram_url: String(apiBranch.telegram_url || 'https://t.me/Maqamatalathan'),
    };
  });
}

export default function MaqamScreen() {
  const router = useRouter();
  const { id, name, color } = useLocalSearchParams<{
    id: string;
    name: string;
    color: string;
  }>();
  const [branches, setBranches] = useState<BranchItem[]>([]);
  const [maqamAudio, setMaqamAudio] = useState<{ audio1_url: string; audio2_url: string }>({ audio1_url: '', audio2_url: '' });
  const [loading, setLoading] = useState(false);
  const headerTitle = `مقام ${name || ''}`;

  useEffect(() => {
    const fallbackBranches = buildStaticBranches(String(id || ''));
    setBranches(fallbackBranches);
    setMaqamAudio({
      audio1_url: hasLocalAudio(String(id || ''), 1) ? 'local' : '',
      audio2_url: hasLocalAudio(String(id || ''), 2) ? 'local' : '',
    });
    setLoading(false);
    fetchData();
  }, [id]);

  const fetchData = async () => {
    const fallbackBranches = buildStaticBranches(String(id || ''));
    setBranches(fallbackBranches);

    try {
      if (!BACKEND_URL) {
        return;
      }

      const [branchRes, maqamRes] = await Promise.all([
        fetch(`${BACKEND_URL}/api/maqamat/${id}/branches`),
        fetch(`${BACKEND_URL}/api/maqamat`),
      ]);

      let branchData: Partial<BranchItem>[] = [];
      if (branchRes.ok) {
        const branchJson = await branchRes.json();
        branchData = Array.isArray(branchJson) ? branchJson : [];
      }
      setBranches(buildStaticBranches(String(id || ''), branchData));

      if (maqamRes.ok) {
        const maqamatData = await maqamRes.json();
        const current = Array.isArray(maqamatData) ? maqamatData.find((m: any) => m.id === id) : null;
        if (current) {
          setMaqamAudio({ audio1_url: current.audio1_url || '', audio2_url: current.audio2_url || '' });
        }
      }
    } catch (err) {
      console.error('Error fetching data:', err);
      setBranches(fallbackBranches);
    }
  };

  const themeColor = '#CCA147';

  const renderBranch = ({ item, index }: { item: BranchItem; index: number }) => (
    <TouchableOpacity
      testID={`branch-item-${item.id}`}
      style={styles.branchCard}
      activeOpacity={0.7}
      onPress={() =>
        router.push({
          pathname: '/branch/[id]',
          params: {
            id: item.id,
            name: item.name,
            maqamName: name,
            color: themeColor,
          },
        })
      }
    >
      <View style={styles.branchContent}>
        <View style={[styles.branchNumber, { backgroundColor: themeColor + '15' }]}>
          <Text style={[styles.branchNumberText, { color: themeColor }]}>
            {index + 1}
          </Text>
        </View>
        <View style={styles.branchInfo}>
          <Text style={styles.branchName}>{item.name}</Text>
          <View style={styles.branchMeta}>
            {item.audio1_url ? (
              <View style={styles.statusBadge}>
                <Ionicons name="checkmark-circle" size={14} color="#2E7D32" />
                <Text style={styles.statusText}>متوفر</Text>
              </View>
            ) : (
              <View style={styles.statusBadge}>
                <Ionicons name="time" size={14} color="#9CA3AF" />
                <Text style={[styles.statusText, { color: '#9CA3AF' }]}>قريباً</Text>
              </View>
            )}
          </View>
        </View>
      </View>
      <Ionicons name="chevron-back" size={20} color="#D1D5DB" />
    </TouchableOpacity>
  );

  return (
    <ImageBackground
      source={require('../../assets/images/bg_maqam.jpg')}
      style={styles.background}
      imageStyle={styles.backgroundImage}
      resizeMode="stretch"
    >
      <View style={styles.overlay}>
        <SafeAreaView style={styles.safeArea}>
          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity
              testID="back-button"
              onPress={() => router.back()}
              style={styles.backButton}
            >
              <Ionicons name="chevron-forward" size={24} color="#111827" />
            </TouchableOpacity>
            <View style={styles.headerCenter}>
              <Text style={styles.headerTitle} testID="maqam-title">
                {headerTitle}
              </Text>
            </View>
            <View style={styles.placeholder} />
          </View>

          <View style={[styles.countBar, { backgroundColor: themeColor + '10' }]}>
            <Ionicons name="musical-notes" size={16} color={themeColor} />
            <Text style={[styles.countText, { color: themeColor }]}>
              {branches.length} فرع نغمي
            </Text>
          </View>

          {loading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={themeColor} />
            </View>
          ) : (
            <FlatList
              data={branches}
              renderItem={renderBranch}
              keyExtractor={(item) => item.id}
              contentContainerStyle={styles.list}
              showsVerticalScrollIndicator={false}
              testID="branches-list"
              ListHeaderComponent={
                <TouchableOpacity
                  testID="main-maqam-card"
                  style={[styles.mainMaqamCard, { borderColor: themeColor }]}
                  activeOpacity={0.7}
                  onPress={() =>
                    router.push({
                      pathname: '/branch/[id]',
                      params: {
                        id: `maqam_${id}`,
                        name: `المقام الرئيسي - ${name}`,
                        maqamName: name,
                        color: themeColor,
                      },
                    })
                  }
                >
                  <View style={styles.branchContent}>
                    <View style={[styles.mainMaqamIcon, { backgroundColor: themeColor + '20' }]}>
                      <Ionicons name="star" size={20} color={themeColor} />
                    </View>
                    <View style={styles.branchInfo}>
                      <Text style={[styles.branchName, { color: themeColor }]}>المقام الرئيسي</Text>
                      <View style={styles.branchMeta}>
                        {maqamAudio.audio1_url ? (
                          <View style={styles.statusBadge}>
                            <Ionicons name="checkmark-circle" size={14} color="#2E7D32" />
                            <Text style={styles.statusText}>متوفر</Text>
                          </View>
                        ) : (
                          <View style={styles.statusBadge}>
                            <Ionicons name="time" size={14} color="#9CA3AF" />
                            <Text style={[styles.statusText, { color: '#9CA3AF' }]}>قريباً</Text>
                          </View>
                        )}
                      </View>
                    </View>
                  </View>
                  <Ionicons name="chevron-back" size={20} color="#D1D5DB" />
                </TouchableOpacity>
              }
            />
          )}
        </SafeAreaView>
      </View>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  background: {
    flex: 1,
    backgroundColor: '#F5EEDB',
  },
  backgroundImage: {
    opacity: 1,
  },
  overlay: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  safeArea: {
    flex: 1,
  },
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
  headerCenter: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 28,
    fontFamily: 'Cairo_700Bold',
    color: '#111827',
    writingDirection: 'rtl',
    textAlign: 'center',
    lineHeight: 42,
  },
  placeholder: {
    width: 40,
  },
  countBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 8,
    marginHorizontal: 16,
    marginBottom: 8,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 248, 232, 0.78)',
    borderWidth: 1,
    borderColor: '#E6D2A2',
  },
  countText: {
    fontSize: 15,
    fontFamily: 'Cairo_400Regular',
    writingDirection: 'rtl',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  list: {
    paddingHorizontal: 16,
    paddingBottom: 24,
  },
  branchCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(255, 251, 242, 0.54)',
    borderRadius: 16,
    padding: 16,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#E8D8B0',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.06,
        shadowRadius: 8,
      },
      android: {
        elevation: 2,
      },
      default: {
        boxShadow: '0px 2px 8px rgba(0, 0, 0, 0.06)',
      },
    }),
  },
  branchContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 12,
  },
  branchNumber: {
    width: 36,
    height: 36,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  branchNumberText: {
    fontSize: 16,
    fontFamily: 'Cairo_700Bold',
  },
  branchInfo: {
    flex: 1,
  },
  branchName: {
    fontFamily: 'Cairo_700Bold',
    fontSize: 16,
    color: '#111827',
    writingDirection: 'rtl',
    textAlign: 'right',
  },
  branchMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
    justifyContent: 'flex-end',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  statusText: {
    fontSize: 12,
    fontFamily: 'Cairo_400Regular',
    color: '#2E7D32',
    writingDirection: 'rtl',
  },
  mainMaqamCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(255, 251, 235, 0.54)',
    borderRadius: 16,
    padding: 16,
    marginBottom: 14,
    borderWidth: 2,
  },
  mainMaqamIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
});

