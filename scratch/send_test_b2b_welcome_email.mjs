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

const clientName = "Distribuidora El Manantial SAS";
const emails = ["zeticas@gmail.com", "pruebas@zeticas.com"];

async function sendTestB2bWelcomeEmail() {
    console.log("🚀 ENVIANDO NUEVO CORREO AJUSTADO DISTRIBUIDOR B2B A:", emails);
    const rootMailCol = collection(db, 'mail');
    
    for (const email of emails) {
        const emailPayload = {
            to: email,
            tenantId: 'zeticas',
            message: {
                subject: '🌿 ¡Bienvenido al equipo de distribuidores de Zeticas!',
                text: `¡Hola, ${clientName}!\n\nEs un gran gusto darte la bienvenida oficial al equipo de distribuidores de Zeticas. Tu cuenta ha sido aprobada y configurada en nuestra categoría B2B (Corporativo).\n\nA partir de este momento, gozarás de los siguientes beneficios exclusivos al ingresar a tu portal:\n\n🌿 Precios Especiales: Acceso directo a nuestras tarifas de distribución en todos nuestros productos.\n🚚 Envíos Gratis: Fletes cubiertos al 100% en todas tus despensas recurrentes y compras de distribuidor.\n\nEstamos muy felices de trabajar juntos para llevar la despensa artesanal de Zeticas a más personas.`,
                html: `
                    <div style="font-family: 'Playfair Display', serif; color: #025357; padding: 40px; background-color: #f8f9f5; border-radius: 20px; max-width: 600px; margin: auto;">
                        <center>
                            <img src="https://zeticas.com/favicon.png" width="80" style="margin-bottom: 20px;">
                            <h1 style="color: #025357; font-size: 28px; margin-bottom: 10px;">¡Hola, ${clientName}!</h1>
                            <p style="font-size: 16px; color: #555;">Es un gran gusto darte la bienvenida oficial al equipo de distribuidores de Zeticas. Tu cuenta ha sido aprobada y configurada en nuestra categoría B2B (Corporativo).</p>
                        </center>
                        
                        <div style="background: white; padding: 30px; border-radius: 15px; margin-top: 30px; border-left: 5px solid #D6BD98; box-shadow: 0 4px 12px rgba(0,0,0,0.02);">
                            <h3 style="color: #025357; margin-top: 0; font-size: 18px; border-bottom: 1px solid #f0f0f0; padding-bottom: 10px;">Beneficios Exclusivos</h3>
                            
                            <p style="font-size: 14px; color: #333; margin: 15px 0; line-height: 1.6; font-family: sans-serif;">
                                🌿 <b>Precios Especiales:</b> Acceso directo a nuestras tarifas de distribución en todos nuestros productos.<br><br>
                                🚚 <b>Envíos Gratis:</b> Fletes cubiertos al 100% en todas tus despensas recurrentes y compras de distribuidor.
                            </p>
                        </div>

                        <p style="margin-top: 30px; text-align: center; color: #666; font-size: 14px; line-height: 1.6;">
                            Estamos muy felices de trabajar juntos para llevar la despensa artesanal de Zeticas a más personas.<br>
                            Si tienes dudas o deseas realizar cambios en tu abastecimiento, puedes responder a este correo.
                        </p>
                        
                        <hr style="border: 0; border-top: 1px solid #D6BD98; margin: 40px 0;">
                        
                        <center>
                            <p style="font-size: 12px; color: #94a3b8; text-transform: uppercase; letter-spacing: 2px;">Propósito Artesanal • Zeticas</p>
                        </center>
                    </div>
                `
            },
            created_at: new Date().toISOString()
        };
        
        const docRef = await addDoc(rootMailCol, emailPayload);
        console.log(`✅ NUEVO CORREO PARA ${email} ENCOLADO CORRECTAMENTE (ID: ${docRef.id})`);
    }
}

sendTestB2bWelcomeEmail().catch(console.error);
