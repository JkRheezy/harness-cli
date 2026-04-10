const fs = require('fs');
const path = require('path');

function copyDir(src, dest) {
  fs.mkdirSync(dest, { recursive: true });
  const entries = fs.readdirSync(src, { withFileTypes: true });
  
  for (const entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);
    
    if (entry.isDirectory()) {
      copyDir(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

// Copy static files
const rootDir = path.join(__dirname, '..');

copyDir(
  path.join(rootDir, 'src/telemetry/server/static'),
  path.join(rootDir, 'dist/telemetry/server/static')
);

copyDir(
  path.join(rootDir, 'src/templates'),
  path.join(rootDir, 'dist/templates')
);

console.log('✅ Build completed: Static files copied');
