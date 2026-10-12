import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import {createHash} from 'crypto';
import {readFileSync, readdirSync, statSync} from 'fs';
import path from 'path';
import {defineConfig, type Plugin} from 'vite';

/** Files in public/, as paths relative to the site root */
function publicFiles(dir: string, prefix = ''): string[] {
  return readdirSync(dir).flatMap((name) => {
    const full = path.join(dir, name);
    return statSync(full).isDirectory() ? publicFiles(full, `${prefix}${name}/`) : [`${prefix}${name}`];
  });
}

/**
 * Emits sw.js with the list of build files to precache, so the games work offline.
 * Firestore is left out (only useful online, and it is the biggest chunk).
 */
function serviceWorker(): Plugin {
  return {
    name: 'fruit-arcade-sw',
    apply: 'build',
    generateBundle(_, bundle) {
      // Firestore (cloud sync, leaderboards) only loads online, so it isn't precached
      const built = Object.keys(bundle).filter((f) => !f.endsWith('.map') && !/userDataService|leaderboardService|firestore-/.test(f));
      const files = ['./', ...built.filter((f) => f !== 'index.html'), ...publicFiles(path.resolve(__dirname, 'public'))];
      const version = createHash('sha1').update(files.join('|')).digest('hex').slice(0, 10);
      const source = readFileSync(path.resolve(__dirname, 'pwa/sw.js'), 'utf8')
        .replace('__VERSION__', version)
        .replace('__PRECACHE__', JSON.stringify(files));
      this.emitFile({type: 'asset', fileName: 'sw.js', source});
    },
  };
}

export default defineConfig(() => {
  return {
    // Relative asset paths so the build works under any sub-path (GitHub Pages serves /FruitArcade/)
    base: './',
    plugins: [react(), tailwindcss(), serviceWorker()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    build: {
      // The largest chunk is Firestore, which is only downloaded after sign-in
      chunkSizeWarningLimit: 600,
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      hmr: process.env.DISABLE_HMR !== 'true',
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});
