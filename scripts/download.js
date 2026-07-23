const fs = require('fs');
const path = require('path');
const https = require('https');
const { execSync } = require('child_process');
const os = require('os');

const isWin = os.platform() === 'win32';
const binName = isWin ? 'yt-dlp.exe' : 'yt-dlp_linux';
const binDir = path.join(__dirname, '..', 'bin');
const binPath = path.join(binDir, binName);

if (!fs.existsSync(binDir)) {
  fs.mkdirSync(binDir, { recursive: true });
}

function download(url, dest) {
  return new Promise((resolve, reject) => {
    https.get(url, (response) => {
      if (response.statusCode === 301 || response.statusCode === 302) {
        return download(response.headers.location, dest).then(resolve).catch(reject);
      }
      
      const file = fs.createWriteStream(dest);
      response.pipe(file);
      
      file.on('finish', () => {
        file.close();
        resolve();
      });
    }).on('error', (err) => {
      fs.unlink(dest, () => reject(err));
    });
  });
}

async function main() {
  if (fs.existsSync(binPath)) {
    console.log(`${binName} already exists.`);
    return;
  }
  
  console.log(`Downloading ${binName}...`);
  const url = `https://github.com/yt-dlp/yt-dlp/releases/latest/download/${binName}`;
  await download(url, binPath);
  
  if (!isWin) {
    execSync(`chmod +x ${binPath}`);
  }
  console.log('Download complete!');
}

main().catch(console.error);
