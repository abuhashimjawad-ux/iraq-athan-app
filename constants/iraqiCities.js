/**
 * Iraqi Cities with GPS Coordinates
 * Used for manual city selection in offline mode
 */

export const IRAQI_CITIES = [
  {
    id: 'baghdad',
    name: 'بغداد',
    nameEn: 'Baghdad',
    latitude: 33.3152,
    longitude: 44.3661,
  },
  {
    id: 'basra',
    name: 'البصرة',
    nameEn: 'Basra',
    latitude: 30.5085,
    longitude: 47.7835,
  },
  {
    id: 'mosul',
    name: 'الموصل',
    nameEn: 'Mosul',
    latitude: 36.3350,
    longitude: 43.1189,
  },
  {
    id: 'erbil',
    name: 'أربيل',
    nameEn: 'Erbil',
    latitude: 36.1911,
    longitude: 44.0091,
  },
  {
    id: 'najaf',
    name: 'النجف',
    nameEn: 'Najaf',
    latitude: 32.0000,
    longitude: 44.3450,
  },
  {
    id: 'karbala',
    name: 'كربلاء',
    nameEn: 'Karbala',
    latitude: 32.6160,
    longitude: 44.0246,
  },
  {
    id: 'sulaymaniyah',
    name: 'السليمانية',
    nameEn: 'Sulaymaniyah',
    latitude: 35.5561,
    longitude: 45.4329,
  },
  {
    id: 'kirkuk',
    name: 'كركوك',
    nameEn: 'Kirkuk',
    latitude: 35.4681,
    longitude: 44.3922,
  },
  {
    id: 'ramadi',
    name: 'الرمادي',
    nameEn: 'Ramadi',
    latitude: 33.4206,
    longitude: 43.3061,
  },
  {
    id: 'duhok',
    name: 'دهوك',
    nameEn: 'Duhok',
    latitude: 36.8675,
    longitude: 42.9533,
  },
  {
    id: 'amarah',
    name: 'العمارة',
    nameEn: 'Amarah',
    latitude: 31.8356,
    longitude: 47.1447,
  },
  {
    id: 'nasiriyah',
    name: 'الناصرية',
    nameEn: 'Nasiriyah',
    latitude: 31.0569,
    longitude: 46.2572,
  },
  {
    id: 'samawah',
    name: 'السماوة',
    nameEn: 'Samawah',
    latitude: 31.3117,
    longitude: 45.2842,
  },
  {
    id: 'diwaniyah',
    name: 'الديوانية',
    nameEn: 'Diwaniyah',
    latitude: 31.9929,
    longitude: 44.9258,
  },
  {
    id: 'kut',
    name: 'الكوت',
    nameEn: 'Kut',
    latitude: 32.5128,
    longitude: 45.8189,
  },
];

/**
 * Calculate distance between two coordinates in kilometers
 */
export function calculateDistance(lat1, lon1, lat2, lon2) {
  const R = 6371; // Radius of the Earth in km
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * (Math.PI / 180)) *
      Math.cos(lat2 * (Math.PI / 180)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distance = R * c;
  return distance;
}

/**
 * Find nearest city to given coordinates
 */
export function findNearestCity(latitude, longitude) {
  let nearestCity = IRAQI_CITIES[0];
  let minDistance = calculateDistance(
    latitude,
    longitude,
    nearestCity.latitude,
    nearestCity.longitude
  );

  IRAQI_CITIES.forEach((city) => {
    const distance = calculateDistance(
      latitude,
      longitude,
      city.latitude,
      city.longitude
    );
    if (distance < minDistance) {
      minDistance = distance;
      nearestCity = city;
    }
  });

  return { city: nearestCity, distance: minDistance };
}
