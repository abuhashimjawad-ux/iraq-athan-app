type AudioSlot = 1 | 2;

// GitHub Releases base URL - files are stored as release assets
const FIREBASE_STORAGE_BASE =
  'https://github.com/abuhashimjawad-ux/iraqi-adhan-audio/releases/download/v1.0/';

// Available audio registry - no require() calls, files live on Firebase Storage
const AVAILABLE_AUDIO: Record<string, Partial<Record<AudioSlot, true>>> = {
  'abu_ata': { 1: true, 2: true },
  'ajam': { 1: true, 2: true },
  'athar_kurd': { 1: true, 2: true },
  'awshar': { 1: true, 2: true },
  'ayyash': { 1: true, 2: true },
  'banjkah': { 1: true, 2: true },
  'bayat': { 1: true, 2: true },
  'dasht': { 1: true, 2: true },
  'hadidi': { 1: true, 2: true },
  'hakimi': { 1: true, 2: true },
  'halilawi': { 1: true, 2: true },
  'hamayoun_qatar': { 1: true, 2: true },
  'haywai': { 1: true, 2: true },
  'hijaz': { 1: true, 2: true },
  'hijaz_gharib': { 1: true, 2: true },
  'hijaz_kar': { 1: true, 2: true },
  'hijaz_turki': { 1: true, 2: true },
  'hijran': { 1: true, 2: true },
  'husseini': { 1: true, 2: true },
  'huwaizawi': { 1: true, 2: true },
  'jaharkah': { 1: true, 2: true },
  'jammal': { 1: true, 2: true },
  'jubouri': { 1: true, 2: true },
  'kar_kurd': { 1: true, 2: true },
  'khanabat': { 1: true, 2: true },
  'kurd': { 1: true, 2: true },
  'lami': { 1: true, 2: true },
  'lami_halawi': { 1: true, 2: true },
  'lami_mubarqa': { 1: true, 2: true },
  'madmi': { 1: true, 2: true },
  'mahouri': { 1: true, 2: true },
  'mansouri': { 1: true, 2: true },
  'mathnawi': { 1: true, 2: true },
  'mukhalif': { 1: true, 2: true },
  'nahawand': { 1: true, 2: true },
  'nakriz': { 1: true, 2: true },
  'nayil_janoub': { 1: true, 2: true },
  'rashidi': { 1: true, 2: true },
  'rast': { 1: true, 2: true },
  'rukbani': { 1: true, 2: true },
  'saba': { 1: true, 2: true },
  'sharqi_dukah': { 1: true, 2: true },
  'sharqi_rast': { 1: true, 2: true },
  'shatait': { 1: true, 2: true },
  'shatrawi': { 1: true, 2: true },
  'sikah': { 1: true, 2: true },
  'tahir': { 1: true, 2: true },
  'tour_jubair_alkon': { 1: true, 2: true },
  'tour_sabi': { 1: true, 2: true },
  'tour_shaji': { 1: true, 2: true },
  'urfa': { 1: true, 2: true },
  'zanjaran': { 1: true, 2: true },
};

const LOCAL_AUDIO_PERFORMERS: Record<string, Partial<Record<AudioSlot, string>>> = {
  'abu_ata': { 1: 'القارئ ياس المهنا', 2: 'القارئ حسين الركابي' },
  'ajam': { 1: 'القارئ عمار العبيدي', 2: 'القارئ عبد الكريم جعفر' },
  'athar_kurd': { 1: 'القارئ حسين الركابي', 2: 'القارئ عامر الزيدي' },
  'awshar': { 1: 'القارئ محمد مشاري', 2: 'القارئ عبد المعز شاكر' },
  'ayyash': { 1: 'القارئ عباس كركوكلي', 2: 'القارئ محمد مشاري' },
  'banjkah': { 1: 'القارئ محمد مؤيد العكيدي', 2: 'القارئ حسين الركابي' },
  'bayat': { 1: 'القارئ ياس المهنا', 2: 'القارئ محمد حميد معيوف' },
  'dasht': { 1: 'القارئ عبد المعز شاكر', 2: 'القارئ حسين الركابي' },
  'hadidi': { 1: 'القارئ عبد المعز شاكر', 2: 'القارئ حسين الركابي' },
  'hakimi': { 1: 'القارئ عباس كركوكلي', 2: 'القارئ غسان المعموري' },
  'halilawi': { 1: 'القارئ عبد المعز شاكر', 2: 'القارئ مجيد المشهداني' },
  'hamayoun_qatar': { 1: 'القارئ عبد المعز شاكر', 2: 'القارئ مجيد المشهداني' },
  'haywai': { 1: 'القارئ عبد المعز شاكر', 2: 'القارئ غسان المعموري' },
  'hijaz': { 1: 'القارئ محمد العزاوي', 2: 'القارئ محمد جعفر' },
  'hijaz_gharib': { 1: 'القارئ مجيد المشهداني', 2: 'القارئ محمد مشاري' },
  'hijaz_kar': { 1: 'القارئ عبدالرزاق الدليمي', 2: 'القارئ محمد مشاري' },
  'hijaz_turki': { 1: 'القارئ حسين الركابي', 2: 'القارئ حيدر جلوخان' },
  'hijran': { 1: 'القارئ مهند العزاوي', 2: 'القارئ هلو أمين الكردي' },
  'husseini': { 1: 'القارئ غسان المعموري', 2: 'الحاج وجدي مصطفى' },
  'huwaizawi': { 1: 'القارئ غسان المعموري', 2: 'القارئ مجيد المشهداني' },
  'jaharkah': { 1: 'القارئ غسان المعموري', 2: 'القارئ حسين الركابي' },
  'jammal': { 1: 'القارئ مجيد المشهداني', 2: 'القارئ بهاء الدين أحمد' },
  'jubouri': { 1: 'القارئ عبد المعز شاكر', 2: 'القارئ حسين الركابي' },
  'kar_kurd': { 1: 'الشيخ عبد المعز شاكر', 2: 'القارئ حسين الركابي' },
  'khanabat': { 1: 'القارئ مجيد المشهداني', 2: 'القارئ حسين الركابي' },
  'kurd': { 1: 'القارئ محمد جعفر', 2: 'القارئ محمد رياض الجبوري' },
  'lami': { 1: 'القارئ محمد مشاري', 2: 'القارئ محمود عبد الرحمن' },
  'lami_halawi': { 1: 'القارئ محمد مشاري', 2: 'القارئ محمود عبد الرحمن' },
  'lami_mubarqa': { 1: 'القارئ عباس كركوكلي', 2: 'القارئ حسين الركابي' },
  'madmi': { 1: 'القارئ مجيد المشهداني', 2: 'القارئ وجدي مصطفى' },
  'mahouri': { 1: 'القارئ محمد جعفر', 2: 'القارئ سرمد البدراني' },
  'mansouri': { 1: 'القارئ حسين الركابي', 2: 'القارئ علي جاسم' },
  'mathnawi': { 1: 'القارئ محمد مشاري', 2: 'القارئ وجدي مصطفى' },
  'mukhalif': { 1: 'القارئ مجيد المشهداني', 2: 'القارئ غسان المعموري' },
  'nahawand': { 1: 'القارئ عبد المعز شاكر', 2: 'القارئ حسن فيصل' },
  'nakriz': { 1: 'القارئ عبد الرزاق الدليمي', 2: 'القارئ حسين الركابي' },
  'nayil_janoub': { 1: 'القارئ بهاء الدين أحمد', 2: 'القارئ غسان المعموري' },
  'rashidi': { 1: 'القارئ عبد المعز شاكر', 2: 'القارئ حسين الركابي' },
  'rast': { 1: 'القارئ بلاسم جليل', 2: 'القارئ محمد رياض الجبوري' },
  'rukbani': { 1: 'القارئ عباس كركوكلي', 2: 'القارئ عبد الكريم مشعان' },
  'saba': { 1: 'القارئ عبد المعز شاكر', 2: 'القارئ عبد الكريم جعفر' },
  'sharqi_dukah': { 1: 'القارئ عبد المعز شاكر', 2: 'القارئ عمر الحديدي' },
  'sharqi_rast': { 1: 'القارئ عبد المعز شاكر', 2: 'القارئ معاذ الجنابي' },
  'shatait': { 1: 'القارئ غسان المعموري', 2: 'القارئ غسان المعموري' },
  'shatrawi': { 1: 'القارئ عبد المعز شاكر', 2: 'القارئ ياس المهنا' },
  'sikah': { 1: 'القارئ محمد رياض الجبوري', 2: 'القارئ محمد جعفر' },
  'tahir': { 1: 'الشيخ عبد المعز شاكر', 2: 'القارئ غسان المعموري' },
  'tour_jubair_alkon': { 1: 'القارئ بهاء الدين أحمد', 2: 'القارئ محمد فيصل الجنابي' },
  'tour_sabi': { 1: 'القارئ غسان المعموري', 2: 'القارئ مجيد المشهداني' },
  'tour_shaji': { 1: 'القارئ حسين محمد الركابي', 2: 'القارئ أحمد خضر الجبوري' },
  'urfa': { 1: 'القارئ مجيد المشهداني', 2: 'القارئ حسين الركابي' },
  'zanjaran': { 1: 'القارئ محمد مشاري', 2: 'القارئ حسين الركابي' },
};

const AUDIO_ID_ALIASES: Record<string, string> = {
  'khanbat': 'khanabat',
  'rakbani': 'rukbani',
  'shteet': 'shatait',
  'nail_janub': 'nayil_janoub',
  'tour_jubair': 'tour_jubair_alkon',
  'tour_jubair_alkon': 'tour_jubair_alkon',
  'humayun_qatar': 'hamayoun_qatar',
  'jamal': 'jammal',
  'mudmi': 'madmi',
  'karkurd': 'kar_kurd',
  'hayawi': 'haywai',
  'orfa': 'urfa',
  'aurfa': 'urfa',
  'haliwi': 'halilawi',
  'halawi': 'halilawi',
  'lami_halawi': 'lami_halawi',
};

function normalizeAudioId(rawId?: string) {
  const cleaned = String(rawId || '')
    .trim()
    .replace(/^maqam_/, '')
    .replace(/-/g, '_')
    .toLowerCase();
  return AUDIO_ID_ALIASES[cleaned] || cleaned;
}

export function getLocalAudioSource(rawId?: string, audioNumber: AudioSlot = 1): string | null {
  const id = normalizeAudioId(rawId);
  if (!AVAILABLE_AUDIO[id]?.[audioNumber]) return null;
  return `${FIREBASE_STORAGE_BASE}${id}_${audioNumber}.mp3`;
}

export function getLocalPerformerName(rawId?: string, audioNumber: AudioSlot = 1) {
  const id = normalizeAudioId(rawId);
  return LOCAL_AUDIO_PERFORMERS[id]?.[audioNumber] ?? '';
}

export function hasLocalAudio(rawId?: string, audioNumber?: AudioSlot) {
  const id = normalizeAudioId(rawId);
  if (!id || !AVAILABLE_AUDIO[id]) return false;
  if (audioNumber) return Boolean(AVAILABLE_AUDIO[id]?.[audioNumber]);
  return Boolean(AVAILABLE_AUDIO[id]?.[1] || AVAILABLE_AUDIO[id]?.[2]);
}
