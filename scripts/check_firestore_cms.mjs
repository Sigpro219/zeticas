import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs } from 'firebase/firestore';

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

async function checkFirestoreCMS() {
    console.log('--- FIRESTORE site_content DUMP ---');
    try {
        const querySnapshot = await getDocs(collection(db, 'site_content'));
        if (querySnapshot.empty) {
            console.log('No documents found.');
        } else {
            const results = [];
            querySnapshot.forEach((doc) => {
                const data = doc.data();
                results.push(`${data.section}.${data.key}: ${data.content}`);
            });
            // Sort to read easier
            results.sort().forEach(line => console.log(line));
        }
    } catch (error) {
        console.error('Error:', error);
    }
}

checkFirestoreCMS();
