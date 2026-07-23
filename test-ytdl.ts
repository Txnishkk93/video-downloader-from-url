import youtubedl from 'youtube-dl-exec';
import * as fs from 'fs';

async function test() {
  try {
    console.log("Starting download...");
    const subprocess = youtubedl.exec('https://youtu.be/8sTePrdPZlc', {
      output: '-',
      format: 'best',
    });
    
    // pipe stdout to a file to verify
    subprocess.stdout?.pipe(fs.createWriteStream('test-output.mp4'));
    
    subprocess.on('close', (code) => {
      console.log(`Process exited with code ${code}`);
    });
  } catch (err) {
    console.error("Error:", err);
  }
}

test();
