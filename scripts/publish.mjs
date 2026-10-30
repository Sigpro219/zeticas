import { execSync } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

// [LEGACY-VITE-LOCK-01] CANDADO FÍSICO SDD:
// El repositorio legacy `zeticas` (Vite) está DESCOMISIONADO para despliegues.
// Cualquier invocación a `npm run publish` desde `zeticas` redirige automáticamente
// al publicador canónico de `zeticas-next` para impedir que `dist/` sobrescriba zeticas.com.

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const nextRoot = path.resolve(__dirname, '..', '..', 'zeticas-next');
const args = process.argv.slice(2).join(' ');

console.log('🛡️ [LEGACY-VITE-LOCK-01] Redirigiendo publish hacia la Fuente Única de Verdad: zeticas-next...');
execSync(`node scripts/publish.mjs ${args}`, {
    cwd: nextRoot,
    stdio: 'inherit'
});
