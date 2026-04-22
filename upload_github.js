/**
 * Uploads all MP3 files from assets/sounds/ to GitHub Releases
 * as release assets on repo: abuhashimjawad-ux/iraqi-adhan-audio
 */
const https = require('https');
const fs = require('fs');
const path = require('path');

const OWNER = 'abuhashimjawad-ux';
const REPO = 'iraqi-adhan-audio';
const TAG = 'v1.0';
const TOKEN = process.env.GH_TOKEN;
const SOUNDS_DIR = path.join(__dirname, 'assets', 'sounds');

function apiRequest(method, urlPath, body, extraHeaders = {}) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'api.github.com',
      path: urlPath,
      method,
      headers: {
        'Authorization': `Bearer ${TOKEN}`,
        'Accept': 'application/vnd.github+json',
        'User-Agent': 'adhan-uploader',
        'X-GitHub-Api-Version': '2022-11-28',
        ...extraHeaders,
      },
    };
    if (body) {
      const data = JSON.stringify(body);
      options.headers['Content-Type'] = 'application/json';
      options.headers['Content-Length'] = Buffer.byteLength(data);
    }

    const req = https.request(options, (res) => {
      let raw = '';
      res.on('data', d => raw += d);
      res.on('end', () => {
        try { resolve({ status: res.statusCode, body: JSON.parse(raw) }); }
        catch { resolve({ status: res.statusCode, body: raw }); }
      });
    });
    req.on('error', reject);
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

function uploadAsset(uploadUrl, filePath, fileName) {
  return new Promise((resolve, reject) => {
    const fileBuffer = fs.readFileSync(filePath);
    const baseUrl = uploadUrl.replace('{?name,label}', '');
    const url = new URL(`${baseUrl}?name=${encodeURIComponent(fileName)}`);

    const options = {
      hostname: url.hostname,
      path: url.pathname + url.search,
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${TOKEN}`,
        'Accept': 'application/vnd.github+json',
        'User-Agent': 'adhan-uploader',
        'X-GitHub-Api-Version': '2022-11-28',
        'Content-Type': 'audio/mpeg',
        'Content-Length': fileBuffer.length,
      },
    };

    const req = https.request(options, (res) => {
      let raw = '';
      res.on('data', d => raw += d);
      res.on('end', () => resolve({ status: res.statusCode }));
    });
    req.on('error', reject);
    req.write(fileBuffer);
    req.end();
  });
}

async function main() {
  // 1. Create repo (ignore error if exists)
  console.log('Creating repo...');
  await apiRequest('POST', '/user/repos', { name: REPO, private: false, auto_init: true });

  // 2. Wait a moment for repo init
  await new Promise(r => setTimeout(r, 3000));

  // 3. Create release
  console.log('Creating release...');
  let releaseId, uploadUrl;
  const rel = await apiRequest('POST', `/repos/${OWNER}/${REPO}/releases`, {
    tag_name: TAG, name: 'Adhan Audio Files v1.0',
    body: 'Iraqi Adhan Encyclopedia audio files', draft: false, prerelease: false,
  });

  if (rel.status === 201) {
    releaseId = rel.body.id;
    uploadUrl = rel.body.upload_url;
    console.log(`Release created: ${releaseId}`);
  } else if (rel.status === 422) {
    // Tag already exists - get existing release
    const existing = await apiRequest('GET', `/repos/${OWNER}/${REPO}/releases/tags/${TAG}`);
    releaseId = existing.body.id;
    uploadUrl = existing.body.upload_url;
    console.log(`Using existing release: ${releaseId}`);
  } else {
    console.error('Failed to create release:', rel.body);
    process.exit(1);
  }

  // 4. Upload all MP3 files
  const files = fs.readdirSync(SOUNDS_DIR).filter(f => f.toLowerCase().endsWith('.mp3'));
  console.log(`\nUploading ${files.length} files...\n`);

  let success = 0, failed = 0;
  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    const filePath = path.join(SOUNDS_DIR, file);
    try {
      const res = await uploadAsset(uploadUrl, filePath, file);
      if (res.status === 201) {
        success++;
        process.stdout.write(`\r[${i+1}/${files.length}] ✓ ${file}                    `);
      } else {
        failed++;
        console.log(`\n[${i+1}/${files.length}] ✗ ${file} (status ${res.status})`);
      }
    } catch (err) {
      failed++;
      console.log(`\n[${i+1}/${files.length}] ✗ ${file}: ${err.message}`);
    }
  }

  console.log(`\n\nDone! ${success} uploaded, ${failed} failed.`);
  console.log(`\nBase URL: https://github.com/${OWNER}/${REPO}/releases/download/${TAG}/`);
  process.exit(0);
}

main().catch(err => { console.error(err); process.exit(1); });
