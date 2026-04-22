/**
 * Uploads all MP3 files from assets/sounds/ to Firebase Storage under adhans/
 * Run: node upload_to_firebase.js
 */
const { initializeApp } = require('firebase/app');
const { getStorage, ref, uploadBytes, getDownloadURL } = require('firebase/storage');
const fs = require('fs');
const path = require('path');

const firebaseConfig = {
  apiKey: "AIzaSyAbbK9TEHu2ktuQN3kHfIvZIx-aL2OCbSg",
  authDomain: "iraqi-adhan-encyclopedia.firebaseapp.com",
  projectId: "iraqi-adhan-encyclopedia",
  storageBucket: "iraqi-adhan-encyclopedia.firebasestorage.app",
  messagingSenderId: "902049063364",
  appId: "1:902049063364:web:b3a16aadcf13c2b3548491",
};

const app = initializeApp(firebaseConfig);
const storage = getStorage(app);

const SOUNDS_DIR = path.join(__dirname, 'assets', 'sounds');

async function uploadAll() {
  const files = fs.readdirSync(SOUNDS_DIR).filter(f => f.toLowerCase().endsWith('.mp3'));
  console.log(`Found ${files.length} MP3 files to upload...\n`);

  let success = 0;
  let failed = 0;

  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    const filePath = path.join(SOUNDS_DIR, file);
    const storageRef = ref(storage, `adhans/${file}`);

    try {
      const buffer = fs.readFileSync(filePath);
      await uploadBytes(storageRef, buffer, { contentType: 'audio/mpeg' });
      success++;
      process.stdout.write(`\r[${i + 1}/${files.length}] ✓ ${file}                    `);
    } catch (err) {
      failed++;
      console.error(`\n✗ Failed: ${file} - ${err.message}`);
    }
  }

  console.log(`\n\nDone! ${success} uploaded, ${failed} failed.`);
  process.exit(0);
}

uploadAll().catch(err => {
  console.error('Fatal error:', err.message);
  process.exit(1);
});
