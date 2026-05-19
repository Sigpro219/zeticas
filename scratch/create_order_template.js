import { initializeApp } from "firebase/app";
import { getFirestore, doc, setDoc } from "firebase/firestore";

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
        <h1 style="color: #025357; font-size: 28px; margin-bottom: 10px;">¡Gracias por tu compra, {{client}}!</h1>
        <p style="font-size: 16px; color: #555;">Hemos recibido tu pedido con éxito y ya está en preparación.</p>
    </center>
    
    <div style="background: white; padding: 30px; border-radius: 15px; margin-top: 30px; border-left: 5px solid #D6BD98; box-shadow: 0 4px 12px rgba(0,0,0,0.02);">
        <h3 style="color: #025357; margin-top: 0; font-size: 18px; border-bottom: 1px solid #f0f0f0; padding-bottom: 10px;">Resumen del Pedido #{{order_number}}</h3>
        <p style="font-size: 13px; color: #666; margin-bottom: 20px;"><b>Fecha:</b> {{date}}</p>
        
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
        
        <div style="margin-top: 20px; padding-top: 15px; border-top: 2px solid #025357; text-align: right;">
            <p style="font-size: 16px; color: #025357; margin: 0;"><b>Total: \${{total_amount}}</b></p>
        </div>
    </div>

    <p style="margin-top: 30px; text-align: center; color: #666; font-size: 14px;">
        Te enviaremos otra notificación cuando tu pedido esté en camino.<br>
        Si tienes alguna duda o deseas realizar cambios, puedes responder a este correo.
    </p>
    
    <hr style="border: 0; border-top: 1px solid #D6BD98; margin: 40px 0;">
    
    <center>
        <p style="font-size: 12px; color: #94a3b8; text-transform: uppercase; letter-spacing: 2px;">Propósito Artesanal • Zeticas</p>
    </center>
</div>
`;

async function createTemplate() {
    try {
        await setDoc(doc(db, "mail_templates", "order_confirmation"), {
            subject: "🌿 Confirmación de tu Pedido #{{order_number}}",
            html: htmlContent
        });
        console.log("Template 'order_confirmation' creado exitosamente!");
    } catch (e) {
        console.error("Error al crear el template:", e);
    }
}

createTemplate();
