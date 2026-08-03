import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const src = path.resolve(__dirname, '../../website/dist');
const dest = path.resolve(__dirname, '../public');

if (fs.existsSync(src)) {
  fs.mkdirSync(dest, { recursive: true });
  fs.cpSync(src, dest, { recursive: true });
  console.log('Successfully copied website assets to server/public');
} else {
  console.warn('Warning: Website dist folder not found. Skipping copy.');
}
