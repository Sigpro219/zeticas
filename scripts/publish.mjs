import { execSync } from 'child_process';
import fs from 'fs';

async function publish() {
    const args = process.argv.slice(2);
    const isAll = args.includes('--all');
    const isDeltacore = args.includes('--deltacore');
    const isZeticas = args.includes('--zeticas');

    console.log('🚀 Iniciando proceso de PUBLICACIÓN MULTISITIO...');
    
    try {
        // 0. Registrar fecha del publish
        const timestamp = new Date().toLocaleString('es-CO', {
            day: '2-digit', month: '2-digit', year: 'numeric',
            hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true
        });
        
        fs.writeFileSync('src/data/build_info.json', JSON.stringify({ lastPublish: timestamp }, null, 4));
        fs.writeFileSync('public/build_info.json', JSON.stringify({ lastPublish: timestamp }, null, 4));
        
        console.log(`🕒 Registrada fecha de publicación: ${timestamp}`);

        // 1. Git Push (Opcional, pero bueno para mantener sincronía)
        console.log('📦 Sincronizando repositorio local...');
        execSync('git add .', { stdio: 'inherit' });
        try {
            execSync('git commit -m "Multisite publish: ' + timestamp + '"', { stdio: 'inherit' });
        } catch (e) {
            console.log('ℹ️ No hay cambios nuevos.');
        }

        // 2. Compilar (Build)
        console.log('🏽 Compilando aplicación...');
        execSync('npm run build', { stdio: 'inherit' });

        // 3. Desplegar según Target
        if (isAll || (!isDeltacore && !isZeticas)) {
            console.log('🔥 Desplegando en AMBOS sitios (Zeticas y Delta CoreTech)...');
            execSync('cmd /c npx firebase deploy --only hosting', { stdio: 'inherit' });
        } else {
            if (isZeticas) {
                console.log('🔥 Desplegando solo en ZETICAS...');
                execSync('cmd /c npx firebase deploy --only hosting:zeticas', { stdio: 'inherit' });
            }
            if (isDeltacore) {
                console.log('🔥 Desplegando solo en DELTA CORETECH...');
                execSync('cmd /c npx firebase deploy --only hosting:deltacore', { stdio: 'inherit' });
            }
        }

        console.log('✅ ¡SITIO(S) ACTUALIZADO(S) CON ÉXITO! ✅');
    } catch (error) {
        console.error('❌ Error en el proceso de publicación:', error.message);
        process.exit(1);
    }
}

publish();
