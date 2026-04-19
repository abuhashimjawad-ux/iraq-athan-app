/**
 * Audio Cache Manager - Hybrid audio system
 * Manages downloading, caching, and playing audio files
 */
import * as FileSystem from 'expo-file-system/legacy';
import AsyncStorage from '@react-native-async-storage/async-storage';

const AUDIO_CACHE_DIR = `${FileSystem.documentDirectory}audio_cache/`;
const AUDIO_INDEX_KEY = '@audio_files_index';

/**
 * Initialize audio cache directory
 */
export async function initializeAudioCache() {
  try {
    const dirInfo = await FileSystem.getInfoAsync(AUDIO_CACHE_DIR);
    if (!dirInfo.exists) {
      await FileSystem.makeDirectoryAsync(AUDIO_CACHE_DIR, { intermediates: true });
      console.log('Audio cache directory created');
    }
    return true;
  } catch (error) {
    console.error('Error initializing audio cache:', error);
    return false;
  }
}

/**
 * Get audio index (list of cached files)
 */
async function getAudioIndex() {
  try {
    const indexString = await AsyncStorage.getItem(AUDIO_INDEX_KEY);
    return indexString ? JSON.parse(indexString) : {};
  } catch (error) {
    console.error('Error reading audio index:', error);
    return {};
  }
}

/**
 * Update audio index
 */
async function updateAudioIndex(branchId, audioNumber, localUri, sourceUrl) {
  try {
    const index = await getAudioIndex();
    const key = `${branchId}_audio${audioNumber}`;
    const normalizedSourceUrl = sourceUrl ? sourceUrl.split('?')[0] : '';
    index[key] = {
      localUri,
      sourceUrl: normalizedSourceUrl,
      timestamp: Date.now(),
    };
    await AsyncStorage.setItem(AUDIO_INDEX_KEY, JSON.stringify(index));
    return true;
  } catch (error) {
    console.error('Error updating audio index:', error);
    return false;
  }
}

/**
 * Check if audio file is cached locally
 */
export async function getLocalAudioUri(branchId, audioNumber, serverUrl) {
  try {
    const index = await getAudioIndex();
    const key = `${branchId}_audio${audioNumber}`;
    const normalizedServerUrl = serverUrl ? serverUrl.split('?')[0] : '';
    
    if (index[key]) {
      const { localUri, sourceUrl } = index[key];

      if (!sourceUrl || sourceUrl !== normalizedServerUrl) {
        if (localUri) {
          await FileSystem.deleteAsync(localUri, { idempotent: true });
        }
        delete index[key];
        await AsyncStorage.setItem(AUDIO_INDEX_KEY, JSON.stringify(index));
        return null;
      }

      const fileInfo = await FileSystem.getInfoAsync(localUri);
      if (fileInfo.exists) {
        return localUri;
      } else {
        delete index[key];
        await AsyncStorage.setItem(AUDIO_INDEX_KEY, JSON.stringify(index));
      }
    }
    
    return null;
  } catch (error) {
    console.error('Error checking local audio:', error);
    return null;
  }
}

/**
 * Download and cache audio file
 */
export async function downloadAndCacheAudio(serverUrl, branchId, audioNumber) {
  try {
    await initializeAudioCache();
    
    const fileName = `${branchId}_audio${audioNumber}.mp3`;
    const localUri = `${AUDIO_CACHE_DIR}${fileName}`;
    
    console.log(`Downloading audio from: ${serverUrl}`);
    
    const downloadResult = await FileSystem.downloadAsync(serverUrl, localUri);
    
    if (downloadResult.status === 200) {
      await updateAudioIndex(branchId, audioNumber, localUri, serverUrl);
      console.log(`Audio cached successfully: ${fileName}`);
      return localUri;
    } else {
      console.error('Download failed with status:', downloadResult.status);
      return null;
    }
  } catch (error) {
    console.error('Error downloading audio:', error);
    return null;
  }
}

/**
 * Get audio URI (local if cached, server URL otherwise)
 * Also starts background download if not cached
 */
export async function getAudioUri(serverUrl, branchId, audioNumber) {
  const localUri = await getLocalAudioUri(branchId, audioNumber, serverUrl);
  
  if (localUri) {
    console.log('Playing from cache:', localUri);
    return { uri: localUri, isLocal: true };
  }

  const freshUrl = `${serverUrl}${serverUrl.includes('?') ? '&' : '?'}t=${Date.now()}`;

  downloadAndCacheAudio(freshUrl, branchId, audioNumber).catch((err) => {
    console.log('Background download failed:', err);
  });
  
  console.log('Streaming from server:', freshUrl);
  return { uri: freshUrl, isLocal: false };
}

/**
 * Pre-download all audio files for a branch
 */
export async function preDownloadBranchAudio(branch) {
  const downloads = [];
  
  if (branch.audio1_url) {
    downloads.push(
      downloadAndCacheAudio(branch.audio1_url, branch.id, 1)
    );
  }
  
  if (branch.audio2_url) {
    downloads.push(
      downloadAndCacheAudio(branch.audio2_url, branch.id, 2)
    );
  }
  
  try {
    await Promise.all(downloads);
    return true;
  } catch (error) {
    console.error('Error pre-downloading branch audio:', error);
    return false;
  }
}

/**
 * Get cache size in MB
 */
export async function getCacheSize() {
  try {
    const dirInfo = await FileSystem.getInfoAsync(AUDIO_CACHE_DIR);
    if (!dirInfo.exists) {
      return 0;
    }
    
    const files = await FileSystem.readDirectoryAsync(AUDIO_CACHE_DIR);
    let totalSize = 0;
    
    for (const file of files) {
      const fileInfo = await FileSystem.getInfoAsync(`${AUDIO_CACHE_DIR}${file}`);
      totalSize += fileInfo.size || 0;
    }
    
    return (totalSize / (1024 * 1024)).toFixed(2); // Convert to MB
  } catch (error) {
    console.error('Error calculating cache size:', error);
    return 0;
  }
}

/**
 * Clear all cached audio files
 */
export async function clearAudioCache() {
  try {
    const dirInfo = await FileSystem.getInfoAsync(AUDIO_CACHE_DIR);
    if (dirInfo.exists) {
      await FileSystem.deleteAsync(AUDIO_CACHE_DIR, { idempotent: true });
      await FileSystem.makeDirectoryAsync(AUDIO_CACHE_DIR, { intermediates: true });
    }
    
    // Clear index
    await AsyncStorage.removeItem(AUDIO_INDEX_KEY);
    
    console.log('Audio cache cleared');
    return true;
  } catch (error) {
    console.error('Error clearing audio cache:', error);
    return false;
  }
}

/**
 * Get list of cached audio files
 */
export async function getCachedAudioList() {
  try {
    const index = await getAudioIndex();
    return Object.keys(index).map((key) => ({
      key,
      ...index[key],
    }));
  } catch (error) {
    console.error('Error getting cached audio list:', error);
    return [];
  }
}
