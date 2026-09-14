const QRCode = require('qrcode');
const path = require('path');
const fs = require('fs');

const ip = '10.90.106.114';
const port = 8081;
const expoUrl = `exp://${ip}:${port}`;
const httpUrl = `http://${ip}:${port}`;

async function main() {
  const artifactDir = 'C:\\Users\\hello\\.gemini\\antigravity-ide\\brain\\48acca8e-03ae-4ca5-a675-a590419c2485';
  const qrPngPath = path.resolve(__dirname, '../expo_qr.png');
  const artifactExpPng = path.join(artifactDir, 'expo_qr.png');
  const artifactHttpPng = path.join(artifactDir, 'expo_qr_http.png');

  // Generate PNG for exp://
  await QRCode.toFile(qrPngPath, expoUrl, {
    errorCorrectionLevel: 'M',
    type: 'png',
    margin: 2,
    width: 480,
    color: {
      dark: '#000000',
      light: '#ffffff',
    },
  });

  // Save to current artifact directory
  fs.copyFileSync(qrPngPath, artifactExpPng);

  // Generate PNG for http://
  await QRCode.toFile(artifactHttpPng, httpUrl, {
    errorCorrectionLevel: 'M',
    type: 'png',
    margin: 2,
    width: 480,
    color: {
      dark: '#000000',
      light: '#ffffff',
    },
  });

  // Generate Terminal ASCII QR string for exp://
  const terminalQR = await QRCode.toString(expoUrl, {
    type: 'terminal',
    small: true,
  });

  console.log('EXPO_URL:', expoUrl);
  console.log('HTTP_URL:', httpUrl);
  console.log('\n--- TERMINAL QR CODE (exp://10.90.106.114:8081) ---\n');
  console.log(terminalQR);
  console.log('\n----------------------------------------------------\n');
  console.log('QR Code PNG saved to:', qrPngPath);
  console.log('Artifact exp:// QR saved to:', artifactExpPng);
  console.log('Artifact http:// QR saved to:', artifactHttpPng);
}

main().catch((err) => {
  console.error('Failed to generate QR:', err);
  process.exit(1);
});
