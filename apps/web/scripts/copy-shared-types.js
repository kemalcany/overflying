import fs from 'fs';
import path from 'path';
import {fileURLToPath} from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const source = path.resolve(__dirname, '../../../packages/shared-types/ts');
const dest = path.resolve(__dirname, '../src/generated/shared-types');

// Create destination directory
fs.mkdirSync(dest, {recursive: true});

// Copy index.ts
fs.copyFileSync(path.join(source, 'index.ts'), path.join(dest, 'index.ts'));

// eslint-disable-next-line no-console
console.log('✓ Shared types copied to apps/web/src/generated/shared-types');
