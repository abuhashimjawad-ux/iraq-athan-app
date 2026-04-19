type AudioSlot = 1 | 2;

const LOCAL_AUDIO_ASSETS: Record<string, Partial<Record<AudioSlot, any>>> = {
  'abu_ata': {
    1: require('../assets/sounds/abu_ata_1.mp3'),
    2: require('../assets/sounds/abu_ata_2.mp3'),
  },
  'ajam': {
    1: require('../assets/sounds/ajam_1.mp3'),
    2: require('../assets/sounds/ajam_2.mp3'),
  },
  'athar_kurd': {
    1: require('../assets/sounds/athar_kurd_1.mp3'),
    2: require('../assets/sounds/athar_kurd_2.mp3'),
  },
  'awshar': {
    1: require('../assets/sounds/awshar_1.mp3'),
    2: require('../assets/sounds/awshar_2.mp3'),
  },
  'ayyash': {
    1: require('../assets/sounds/ayyash_1.mp3'),
    2: require('../assets/sounds/ayyash_2.mp3'),
  },
  'banjkah': {
    1: require('../assets/sounds/banjkah_1.mp3'),
    2: require('../assets/sounds/banjkah_2.mp3'),
  },
  'bayat': {
    1: require('../assets/sounds/bayat_1.mp3'),
    2: require('../assets/sounds/bayat_2.mp3'),
  },
  'dasht': {
    1: require('../assets/sounds/dasht_1.mp3'),
    2: require('../assets/sounds/dasht_2.mp3'),
  },
  'hadidi': {
    1: require('../assets/sounds/hadidi_1.mp3'),
    2: require('../assets/sounds/hadidi_2.mp3'),
  },
  'hakimi': {
    1: require('../assets/sounds/hakimi_1.mp3'),
    2: require('../assets/sounds/hakimi_2.mp3'),
  },
  'halilawi': {
    1: require('../assets/sounds/halilawi_1.mp3'),
    2: require('../assets/sounds/halilawi_2.mp3'),
  },
  'hamayoun_qatar': {
    1: require('../assets/sounds/hamayoun_qatar_1.mp3'),
    2: require('../assets/sounds/hamayoun_qatar_2.mp3'),
  },
  'haywai': {
    1: require('../assets/sounds/haywai_1.mp3'),
    2: require('../assets/sounds/haywai_2.mp3'),
  },
  'hijaz': {
    1: require('../assets/sounds/hijaz_1.mp3'),
    2: require('../assets/sounds/hijaz_2.mp3'),
  },
  'hijaz_gharib': {
    1: require('../assets/sounds/hijaz_gharib_1.mp3'),
    2: require('../assets/sounds/hijaz_gharib_2.mp3'),
  },
  'hijaz_kar': {
    1: require('../assets/sounds/hijaz_kar_1.mp3'),
    2: require('../assets/sounds/hijaz_kar_2.mp3'),
  },
  'hijaz_turki': {
    1: require('../assets/sounds/hijaz_turki_1.mp3'),
    2: require('../assets/sounds/hijaz_turki_2.mp3'),
  },
  'hijran': {
    1: require('../assets/sounds/hijran_1.mp3'),
    2: require('../assets/sounds/hijran_2.mp3'),
  },
  'husseini': {
    1: require('../assets/sounds/husseini_1.mp3'),
    2: require('../assets/sounds/husseini_2.mp3'),
  },
  'huwaizawi': {
    1: require('../assets/sounds/huwaizawi_1.mp3'),
    2: require('../assets/sounds/huwaizawi_2.mp3'),
  },
  'jaharkah': {
    1: require('../assets/sounds/jaharkah_1.mp3'),
    2: require('../assets/sounds/jaharkah_2.mp3'),
  },
  'jammal': {
    1: require('../assets/sounds/jammal_1.mp3'),
    2: require('../assets/sounds/jammal_2.mp3'),
  },
  'jubouri': {
    1: require('../assets/sounds/jubouri_1.mp3'),
    2: require('../assets/sounds/jubouri_2.mp3'),
  },
  'kar_kurd': {
    1: require('../assets/sounds/kar_kurd_1.mp3'),
    2: require('../assets/sounds/kar_kurd_2.mp3'),
  },
  'khanabat': {
    1: require('../assets/sounds/khanabat_1.mp3'),
    2: require('../assets/sounds/khanabat_2.mp3'),
  },
  'kurd': {
    1: require('../assets/sounds/kurd_1.mp3'),
    2: require('../assets/sounds/kurd_2.mp3'),
  },
  'lami': {
    1: require('../assets/sounds/lami_1.mp3'),
    2: require('../assets/sounds/lami_2.mp3'),
  },
  'lami_mubarqa': {
    1: require('../assets/sounds/lami_mubarqa_1.mp3'),
    2: require('../assets/sounds/lami_mubarqa_2.mp3'),
  },
  'madmi': {
    1: require('../assets/sounds/madmi_1.mp3'),
    2: require('../assets/sounds/madmi_2.mp3'),
  },
  'mahouri': {
    1: require('../assets/sounds/mahouri_1.mp3'),
    2: require('../assets/sounds/mahouri_2.mp3'),
  },
  'mansouri': {
    1: require('../assets/sounds/mansouri_1.mp3'),
    2: require('../assets/sounds/mansouri_2.mp3'),
  },
  'mathnawi': {
    1: require('../assets/sounds/mathnawi_1.mp3'),
    2: require('../assets/sounds/mathnawi_2.mp3'),
  },
  'mukhalif': {
    1: require('../assets/sounds/mukhalif_1.mp3'),
    2: require('../assets/sounds/mukhalif_2.mp3'),
  },
  'nahawand': {
    1: require('../assets/sounds/nahawand_1.mp3'),
    2: require('../assets/sounds/nahawand_2.mp3'),
  },
  'nakriz': {
    1: require('../assets/sounds/nakriz_1.mp3'),
    2: require('../assets/sounds/nakriz_2.mp3'),
  },
  'nayil_janoub': {
    1: require('../assets/sounds/nayil_janoub_1.mp3'),
    2: require('../assets/sounds/nayil_janoub_2.mp3'),
  },
  'rashidi': {
    1: require('../assets/sounds/rashidi_1.mp3'),
    2: require('../assets/sounds/rashidi_2.mp3'),
  },
  'rast': {
    1: require('../assets/sounds/rast_1.mp3'),
    2: require('../assets/sounds/rast_2.mp3'),
  },
  'rukbani': {
    1: require('../assets/sounds/rukbani_1.mp3'),
    2: require('../assets/sounds/rukbani_2.mp3'),
  },
  'saba': {
    1: require('../assets/sounds/saba_1.mp3'),
    2: require('../assets/sounds/saba_2.mp3'),
  },
  'sharqi_dukah': {
    1: require('../assets/sounds/sharqi_dukah_1.mp3'),
    2: require('../assets/sounds/sharqi_dukah_2.mp3'),
  },
  'sharqi_rast': {
    1: require('../assets/sounds/sharqi_rast_1.mp3'),
    2: require('../assets/sounds/sharqi_rast_2.mp3'),
  },
  'shatait': {
    1: require('../assets/sounds/shatait_1.mp3'),
    2: require('../assets/sounds/shatait_2.mp3'),
  },
  'shatrawi': {
    1: require('../assets/sounds/shatrawi_1.mp3'),
    2: require('../assets/sounds/shatrawi_2.mp3'),
  },
  'sikah': {
    1: require('../assets/sounds/sikah_1.mp3'),
    2: require('../assets/sounds/sikah_2.mp3'),
  },
  'tahir': {
    1: require('../assets/sounds/tahir_1.mp3'),
    2: require('../assets/sounds/tahir_2.mp3'),
  },
  'tour_jubair_alkon': {
    1: require('../assets/sounds/tour_jubair_alkon_1.mp3'),
    2: require('../assets/sounds/tour_jubair_alkon_2.mp3'),
  },
  'tour_sabi': {
    1: require('../assets/sounds/tour_sabi_1.mp3'),
    2: require('../assets/sounds/tour_sabi_2.mp3'),
  },
  'tour_shaji': {
    1: require('../assets/sounds/tour_shaji_1.mp3'),
    2: require('../assets/sounds/tour_shaji_2.mp3'),
  },
  'urfa': {
    1: require('../assets/sounds/urfa_1.mp3'),
    2: require('../assets/sounds/urfa_2.mp3'),
  },
  'zanjaran': {
    1: require('../assets/sounds/zanjaran_1.mp3'),
    2: require('../assets/sounds/zanjaran_2.mp3'),
  },
};

const AUDIO_ID_ALIASES: Record<string, string> = {
  'khanbat': 'khanabat',
  'rakbani': 'rukbani',
  'shteet': 'shatait',
  'nail_janub': 'nayil_janoub',
  'tour_jubair': 'tour_jubair_alkon',
  'humayun_qatar': 'hamayoun_qatar',
  'jamal': 'jammal',
  'mudmi': 'madmi',
  'karkurd': 'kar_kurd',
  'hayawi': 'haywai',
};

function normalizeAudioId(rawId?: string) {
  const cleaned = String(rawId || '').trim().replace(/^maqam_/, '');
  return AUDIO_ID_ALIASES[cleaned] || cleaned;
}

export function getLocalAudioSource(rawId?: string, audioNumber: AudioSlot = 1) {
  const id = normalizeAudioId(rawId);
  return LOCAL_AUDIO_ASSETS[id]?.[audioNumber] ?? null;
}

export function hasLocalAudio(rawId?: string, audioNumber?: AudioSlot) {
  const id = normalizeAudioId(rawId);
  if (!id || !LOCAL_AUDIO_ASSETS[id]) return false;
  if (audioNumber) return Boolean(LOCAL_AUDIO_ASSETS[id]?.[audioNumber]);
  return Boolean(LOCAL_AUDIO_ASSETS[id]?.[1] || LOCAL_AUDIO_ASSETS[id]?.[2]);
}
