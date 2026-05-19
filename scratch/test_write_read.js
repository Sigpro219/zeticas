import { initializeApp } from "firebase/app";
import { getFirestore, doc, setDoc, getDoc } from "firebase/firestore";

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

const htmlContent = `
<div style="font-family: 'Playfair Display', serif; color: #025357; padding: 40px; background-color: #f8f9f5; border-radius: 20px; max-width: 600px; margin: auto;">
    <center>
        <img src="https://zeticas.com/favicon.png" width="80" style="margin-bottom: 20px;">
        <h1 style="color: #025357; font-size: 28px; margin-bottom: 10px;">¡Bienvenido a la familia Zeticas, {{name}}!</h1>
        <p style="font-size: 16px; color: #555;">Es un gusto darte la bienvenida a <b>Amig@s de Zeticas</b>.</p>
    </center>
    
    <div style="background: white; padding: 30px; border-radius: 15px; margin-top: 30px; border-left: 5px solid #D6BD98; box-shadow: 0 4px 12px rgba(0,0,0,0.02);">
        <h3 style="color: #025357; margin-top: 0; font-size: 18px; border-bottom: 1px solid #f0f0f0; padding-bottom: 10px;">Detalles de tu Membresía</h3>
        
        <p style="font-size: 14px; color: #555; margin: 10px 0; line-height: 1.6;">
            🌿 <b>Plan Seleccionado:</b> {{plan}}<br>
            📅 <b>Frecuencia de Despacho:</b> {{frequency}}
        </p>

        {{#if items}}
        <h4 style="color: #025357; margin-top: 25px; margin-bottom: 10px; font-size: 15px; border-bottom: 1px solid #f0f0f0; padding-bottom: 5px;">Tu Despensa Configurada</h4>
        <table style="width: 100%; border-collapse: collapse; font-family: sans-serif; font-size: 14px;">
            <thead>
                <tr style="border-bottom: 2px solid #025357; color: #025357; text-align: left;">
                    <th style="padding: 10px 5px; font-weight: bold;">Producto</th>
                    <th style="padding: 10px 5px; font-weight: bold; text-align: center;">Cant.</th>
                    <th style="padding: 10px 5px; font-weight: bold; text-align: right;">Total</th>
                </tr>
            </thead>
            <tbody>
                {{#each items}}
                <tr style="border-bottom: 1px solid #f0f0f0;">
                    <td style="padding: 12px 5px; color: #333;">{{name}}</td>
                    <td style="padding: 12px 5px; text-align: center; color: #666;">{{quantity}}</td>
                    <td style="padding: 12px 5px; text-align: right; color: #333; font-weight: bold;">\${{price}}</td>
                </tr>
                {{/each}}
            </tbody>
        </table>
        
        <div style="margin-top: 20px; padding-top: 15px; border-top: 2px solid #025357; text-align: right; line-height: 1.6;">
            {{#if savings}}
            <p style="font-size: 13px; color: #666; margin: 0;">Ahorro por Plan: \${{savings}}</p>
            {{/if}}
            {{#if shippingCost}}
            <p style="font-size: 13px; color: #666; margin: 0;">Envío: \${{shippingCost}}</p>
            {{/if}}
            <p style="font-size: 16px; color: #025357; margin: 5px 0 0 0;"><b>Total Estimado: \${{total}}</b></p>
        </div>
        {{/if}}
    </div>

    <p style="margin-top: 30px; text-align: center; color: #666; font-size: 14px;">
        Pronto nos pondremos en contacto contigo para coordinar tu primer despacho.<br>
        Si tienes dudas o deseas realizar cambios en tu despensa, puedes responder a este correo.
    </p>
    
    <hr style="border: 0; border-top: 1px solid #D6BD98; margin: 40px 0;">
    
    <center>
        <p style="font-size: 12px; color: #94a3b8; text-transform: uppercase; letter-spacing: 2px;">Propósito Artesanal • Zeticas</p>
    </center>
</div>
`;

async function testWriteRead() {
  const docRef = doc(db, "mail_templates", "welcome_subscription");
  
  console.log("Escribiendo template en Firestore...");
  await setDoc(docRef, {
    subject: "🌿 ¡Bienvenido a la familia Zeticas, {{name}}!",
    html: htmlContent
  });
  console.log("Template escrito. Leyéndolo de vuelta...");
  
  const snap = await getDoc(docRef);
  if (snap.exists()) {
    const data = snap.data();
    console.log("¿El documento en Firestore contiene 'Amig@s de Zeticas'?:", data.html.includes("Amig@s de Zeticas"));
    const welcomeIndex = data.html.indexOf("Es un gusto");
    if (welcomeIndex !== -1) {
      console.log("Extracto:", data.html.substring(welcomeIndex - 20, welcomeIndex + 120));
    }
  } else {
    console.log("Error: El documento no existe.");
  }
}

testWriteRead();
