/**
 * Config plugin: copies all MP3 files from assets/sounds/ into
 * android/app/src/main/res/raw/ so they can be used as custom
 * notification channel sounds (played by the OS even when app is killed).
 */
const { withDangerousMod } = require('@expo/config-plugins');
const path = require('path');
const fs = require('fs');

const withAndroidNotificationSounds = (config) =>
  withDangerousMod(config, [
    'android',
    (cfg) => {
      const soundsSrc = path.join(cfg.modRequest.projectRoot, 'assets', 'sounds_preview');
      const rawDest = path.join(
        cfg.modRequest.platformProjectRoot,
        'app',
        'src',
        'main',
        'res',
        'raw'
      );

      if (!fs.existsSync(rawDest)) {
        fs.mkdirSync(rawDest, { recursive: true });
      }

      if (fs.existsSync(soundsSrc)) {
        for (const file of fs.readdirSync(soundsSrc)) {
          if (file.toLowerCase().endsWith('.mp3')) {
            fs.copyFileSync(path.join(soundsSrc, file), path.join(rawDest, file));
          }
        }
      }

      return cfg;
    },
  ]);

module.exports = withAndroidNotificationSounds;
