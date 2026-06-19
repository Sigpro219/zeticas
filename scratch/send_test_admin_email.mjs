import { initializeApp } from "firebase/app";
import { getFirestore, collection, addDoc } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyAeHMdtEt04RtYarEx_h19gcCUzsIUUpSc",
  authDomain: "delta-core-cloud-45ea0.firebaseapp.com",
  projectId: "delta-core-cloud-45ea0",
  storageBucket: "delta-core-cloud-45ea0.firebasestorage.app",
  messagingSenderId: "378250949856",
  appId: "1:378250949856:web:7a0ce44de64bc9a5becc85"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function sendTestAdminEmail() {
    console.log("🚀 ENVIANDO CORREO DE PRUEBA AL ADMINISTRADOR...");
    const rootMailCol = collection(db, 'mail');
    
    const adminMailPayload = {
        to: 'zeticas@gmail.com',
        tenantId: 'zeticas',
        message: {
            subject: `🚨 PRUEBA DE FUNCIONAMIENTO: Nueva Suscripción Creada (Suscriptor de Prueba)`,
            text: `Se ha registrado una nueva suscripción en el sistema.\n\nDetalles del suscriptor:\n- Nombre: Cliente de Prueba SMTP\n- NIT/Cédula: 999888777\n- Email: test.smtp.zeticas@gmail.com\n- Teléfono: 3001234567\n- Plan: Membresía Delta Test (3 Meses)\n\nPor favor, ingresa al panel de administración para validar si este perfil aplica para precios de Distribuidor (B2B) o Consumo (B2C) y actualizar su ficha de cliente si es necesario.\n\nEnlace al maestro de clientes: https://zeticas.com/gestion/clientes`,
            html: `
                <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #f1f5f9; border-radius: 8px;">
                    <h2 style="color: #025357; border-bottom: 2px solid #025357; padding-bottom: 10px; margin-top: 0;">🚨 Nueva Suscripción Registrada (PRUEBA)</h2>
                    <p>Se ha registrado una nueva suscripción en el sistema que requiere clasificación de segmento (B2B/B2C).</p>
                    
                    <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
                        <tr style="background-color: #fafafa;">
                            <td style="padding: 8px; font-weight: bold; width: 35%;">Nombre/Razón Social:</td>
                            <td style="padding: 8px;">Cliente de Prueba SMTP</td>
                        </tr>
                        <tr>
                            <td style="padding: 8px; font-weight: bold;">NIT/Cédula:</td>
                            <td style="padding: 8px;">999888777</td>
                        </tr>
                        <tr style="background-color: #fafafa;">
                            <td style="padding: 8px; font-weight: bold;">Email:</td>
                            <td style="padding: 8px;">test.smtp.zeticas@gmail.com</td>
                        </tr>
                        <tr>
                            <td style="padding: 8px; font-weight: bold;">Teléfono:</td>
                            <td style="padding: 8px;">3001234567</td>
                        </tr>
                        <tr style="background-color: #fafafa;">
                            <td style="padding: 8px; font-weight: bold;">Plan:</td>
                            <td style="padding: 8px;">Membresía Delta Test (3 Meses)</td>
                        </tr>
                    </table>
                    
                    <p>Por favor, ingresa al panel de administración para validar si este perfil califica para precios de Distribuidor (B2B) o si se mantiene en Consumo (B2C) y actualizar su ficha según corresponda.</p>
                    
                    <div style="text-align: center; margin-top: 30px; margin-bottom: 10px;">
                        <a href="https://zeticas.com/gestion/clientes" style="display: inline-block; padding: 12px 24px; background-color: #025357; color: #fff; text-decoration: none; border-radius: 6px; font-weight: bold;">Ir al Maestro de Clientes</a>
                    </div>
                </div>
            `
        },
        created_at: new Date().toISOString()
    };
    
    const docRef = await addDoc(rootMailCol, adminMailPayload);
    console.log(`\n✅ CORREO DE PRUEBA ENCOLADO CORRECTAMENTE.`);
    console.log(`   ID del documento: ${docRef.id}`);
    console.log(`   Destinatario: zeticas@gmail.com`);
    console.log(`   Esperando procesamiento por Trigger Email...`);
}

sendTestAdminEmail().catch(console.error);
