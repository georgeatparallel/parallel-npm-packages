import { defineConfig } from 'vitest/config';
import { readFileSync, readdirSync, existsSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

// Dynamically read all packages and create version defines
const packagesDir = resolve(__dirname, 'packages');
const packageDirs = readdirSync(packagesDir, { withFileTypes: true })
  .filter((dirent) => dirent.isDirectory())
  .map((dirent) => dirent.name);

const defines: Record<string, string> = {};

for (const pkgDir of packageDirs) {
  const pkgJsonPath = resolve(packagesDir, pkgDir, 'package.json');
  if (existsSync(pkgJsonPath)) {
    const pkg = JSON.parse(readFileSync(pkgJsonPath, 'utf-8'));
    // Convert package dir name to constant name: ai-sdk-tools -> __AI_SDK_TOOLS_VERSION__
    const constName = `__${pkgDir.toUpperCase().replace(/-/g, '_')}_VERSION__`;
    defines[constName] = JSON.stringify(pkg.version);
    // Also define __PACKAGE_VERSION__ for backwards compatibility (used by source files)
    defines['__PACKAGE_VERSION__'] = JSON.stringify(pkg.version);
  }
}

export default defineConfig({
  define: defines,
  test: {
    globals: true,
    environment: 'node',
    include: ['packages/**/src/**/*.test.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: ['node_modules/', 'dist/', '**/*.config.ts', '**/*.d.ts'],
    },
  },
});
