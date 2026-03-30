import { execSync } from 'child_process';

async function publish() {
    console.log('🚀 Iniciando proceso de PUBLICACIÓN DIRECTA...');
    try {
        // 1. Guardar cambios locales (Auto-publish)
        console.log('📦 Guardando cambios locales (Git)...');
        execSync('git add .', { stdio: 'inherit' });
        try {
            execSync('git commit -m "Auto-publish from Antigravity"', { stdio: 'inherit' });
        } catch (e) {
            console.log('ℹ️ No hay cambios nuevos que commitear.');
        }

        // 2. Compilar (Build)
        console.log('🏽 Compilando aplicación (Vite)...');
        execSync('npm run build', { stdio: 'inherit' });

        // 3. Desplegar (Firebase Hosting)
        console.log('🔥 Desplegando en Google Cloud (Firebase Hosting)...');
        execSync('firebase deploy --only hosting', { stdio: 'inherit' });

        console.log('🔥 ¡SITIO ACTUALIZADO EN VIVO CON ÉXITO! 🔥');
    } catch (error) {
        console.error('❌ Error durante el proceso de publicación:', error.message);
        process.exit(1);
    }
}

publish();
