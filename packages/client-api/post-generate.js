import fs from 'node:fs';
import path from 'node:path';

const generatedPackageJson = path.join(process.cwd(), 'src', 'generated', 'package.json');

if (fs.existsSync(generatedPackageJson)) {
  const raw = fs.readFileSync(generatedPackageJson, 'utf8');
  const pkg = JSON.parse(raw);
  pkg.main = './src/index.ts';
  pkg.types = './src/index.ts';
  fs.writeFileSync(generatedPackageJson, JSON.stringify(pkg, null, 2));
}
