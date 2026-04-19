/**
 * Offline Manager - Centralized caching and offline data management
 */
import AsyncStorage from '@react-native-async-storage/async-storage';

// Cache Keys
const CACHE_KEYS = {
  PRAYER_TIMES: '@prayer_times_cache',
  LOCATION: '@last_known_location',
  MAQAMAT: '@maqamat_cache',
  BRANCHES: '@branches_cache',
  SELECTED_CITY: '@selected_city',
  PRAYER_METHOD: '@prayer_method', // Sunni or Shia
};

// Cache Expiry Times
const CACHE_EXPIRY = {
  PRAYER_TIMES: 7 * 24 * 60 * 60 * 1000, // 7 days in milliseconds
  LOCATION: 24 * 60 * 60 * 1000, // 1 day
  MAQAMAT: 30 * 24 * 60 * 60 * 1000, // 30 days
};

/**
 * Save data to cache with timestamp
 */
export async function saveToCache(key, data) {
  try {
    const cacheData = {
      data,
      timestamp: Date.now(),
    };
    await AsyncStorage.setItem(key, JSON.stringify(cacheData));
    return true;
  } catch (error) {
    console.error('Error saving to cache:', error);
    return false;
  }
}

/**
 * Get data from cache
 */
export async function getFromCache(key, maxAge = null) {
  try {
    const cacheString = await AsyncStorage.getItem(key);
    if (!cacheString) {
      return null;
    }

    const cacheData = JSON.parse(cacheString);
    const { data, timestamp } = cacheData;

    // Check if cache has expired
    if (maxAge && Date.now() - timestamp > maxAge) {
      return null;
    }

    return data;
  } catch (error) {
    console.error('Error reading from cache:', error);
    return null;
  }
}

/**
 * Clear specific cache
 */
export async function clearCache(key) {
  try {
    await AsyncStorage.removeItem(key);
    return true;
  } catch (error) {
    console.error('Error clearing cache:', error);
    return false;
  }
}

/**
 * Clear all cache
 */
export async function clearAllCache() {
  try {
    await AsyncStorage.clear();
    return true;
  } catch (error) {
    console.error('Error clearing all cache:', error);
    return false;
  }
}

// Prayer Times Cache Functions
export const PrayerTimesCache = {
  async save(prayerData, location, method) {
    const data = {
      prayers: prayerData,
      location,
      method,
    };
    return await saveToCache(CACHE_KEYS.PRAYER_TIMES, data);
  },

  async get() {
    return await getFromCache(CACHE_KEYS.PRAYER_TIMES, CACHE_EXPIRY.PRAYER_TIMES);
  },

  async clear() {
    return await clearCache(CACHE_KEYS.PRAYER_TIMES);
  },

  async isExpired() {
    const cached = await getFromCache(CACHE_KEYS.PRAYER_TIMES);
    if (!cached) return true;

    const cacheString = await AsyncStorage.getItem(CACHE_KEYS.PRAYER_TIMES);
    const { timestamp } = JSON.parse(cacheString);
    return Date.now() - timestamp > CACHE_EXPIRY.PRAYER_TIMES;
  },
};

// Location Cache Functions
export const LocationCache = {
  async save(latitude, longitude, city = null) {
    const data = { latitude, longitude, city };
    return await saveToCache(CACHE_KEYS.LOCATION, data);
  },

  async get() {
    return await getFromCache(CACHE_KEYS.LOCATION);
  },

  async clear() {
    return await clearCache(CACHE_KEYS.LOCATION);
  },
};

// Selected City Cache (for manual selection)
export const SelectedCityCache = {
  async save(cityData) {
    return await saveToCache(CACHE_KEYS.SELECTED_CITY, cityData);
  },

  async get() {
    return await getFromCache(CACHE_KEYS.SELECTED_CITY);
  },

  async clear() {
    return await clearCache(CACHE_KEYS.SELECTED_CITY);
  },
};

// Prayer Method Cache
export const PrayerMethodCache = {
  async save(method) {
    return await saveToCache(CACHE_KEYS.PRAYER_METHOD, method);
  },

  async get() {
    const method = await getFromCache(CACHE_KEYS.PRAYER_METHOD);
    return method || 'MWL'; // Default to Muslim World League
  },

  async clear() {
    return await clearCache(CACHE_KEYS.PRAYER_METHOD);
  },
};

// Maqamat Cache Functions
export const MaqamatCache = {
  async save(maqamatData) {
    return await saveToCache(CACHE_KEYS.MAQAMAT, maqamatData);
  },

  async get() {
    return await getFromCache(CACHE_KEYS.MAQAMAT, CACHE_EXPIRY.MAQAMAT);
  },

  async clear() {
    return await clearCache(CACHE_KEYS.MAQAMAT);
  },
};

// Branches Cache Functions
export const BranchesCache = {
  async save(maqamId, branchesData) {
    const key = `${CACHE_KEYS.BRANCHES}_${maqamId}`;
    return await saveToCache(key, branchesData);
  },

  async get(maqamId) {
    const key = `${CACHE_KEYS.BRANCHES}_${maqamId}`;
    return await getFromCache(key, CACHE_EXPIRY.MAQAMAT);
  },

  async clear(maqamId) {
    const key = `${CACHE_KEYS.BRANCHES}_${maqamId}`;
    return await clearCache(key);
  },
};

export { CACHE_KEYS, CACHE_EXPIRY };
