const fs = require('fs');
const path = require('path');
const { generateImageAsync } = require('@expo/image-utils');

const sourceLogoPath = 'C:\\Users\\hello\\.gemini\\antigravity-ide\\brain\\da38a93d-8439-4821-a454-6a9f4d5debed\\.user_uploaded\\media_1789496612834.png';
const assetsDir = path.resolve(__dirname, '../assets');

async function main() {
  console.log('Starting branding icon generation from source logo...');
  const sourceBuffer = fs.readFileSync(sourceLogoPath);

  // 1. Copy full 1024x1024 as app_logo.png, icon.png, splash-icon.png
  fs.writeFileSync(path.join(assetsDir, 'app_logo.png'), sourceBuffer);
  fs.writeFileSync(path.join(assetsDir, 'icon.png'), sourceBuffer);
  fs.writeFileSync(path.join(assetsDir, 'splash-icon.png'), sourceBuffer);
  console.log('✓ Wrote app_logo.png, icon.png, splash-icon.png (1024x1024)');

  // 2. Generate android-icon-foreground.png (512x512)
  const foregroundResult = await generateImageAsync(
    { projectRoot: path.resolve(__dirname, '..') },
    {
      src: sourceLogoPath,
      width: 512,
      height: 512,
      resizeMode: 'contain',
      backgroundColor: 'transparent',
    }
  );
  fs.writeFileSync(path.join(assetsDir, 'android-icon-foreground.png'), foregroundResult.source);
  console.log('✓ Generated android-icon-foreground.png (512x512)');

  // 3. Generate favicon.png (48x48)
  const faviconResult = await generateImageAsync(
    { projectRoot: path.resolve(__dirname, '..') },
    {
      src: sourceLogoPath,
      width: 48,
      height: 48,
      resizeMode: 'contain',
      backgroundColor: 'transparent',
    }
  );
  fs.writeFileSync(path.join(assetsDir, 'favicon.png'), faviconResult.source);
  console.log('✓ Generated favicon.png (48x48)');

  console.log('All branding icons generated successfully!');
}

main().catch((err) => {
  console.error('Error generating icons:', err);
  process.exit(1);
});
