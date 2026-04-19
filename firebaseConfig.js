import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

// إعدادات مشروعك الجديد (موسوعة الأذان العراقية)
const firebaseConfig = {
  apiKey: "AIzaSyAbbK9TEHu2ktuQN3kHfIvZIx-aL2OCbSg",
  authDomain: "iraqi-adhan-encyclopedia.firebaseapp.com",
  projectId: "iraqi-adhan-encyclopedia",
  storageBucket: "iraqi-adhan-encyclopedia.firebasestorage.app", // ملاحظة: هذا المخزن يحتاج تفعيل
  messagingSenderId: "902049063364",
  appId: "1:902049063364:web:b3a16aadcf13c2b3548491",
  measurementId: "G-0HWC47VXCJ"
};

// تهيئة التطبيق
const app = initializeApp(firebaseConfig);

// تصدير الخدمات لاستخدامها في التطبيق
export const db = getFirestore(app);
export const storage = getStorage(app);

export default app;