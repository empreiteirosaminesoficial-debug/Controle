import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getAnalytics, isSupported } from "firebase/analytics";

const firebaseConfig = {
  apiKey: "AIzaSyAjUToGIic5tYBn4TENSvhmHgNofy6NnlA",
  authDomain: "empreiteirosaminesgestao.firebaseapp.com",
  projectId: "empreiteirosaminesgestao",
  storageBucket: "empreiteirosaminesgestao.firebasestorage.app",
  messagingSenderId: "271877790806",
  appId: "1:271877790806:web:01119296a3853d591daff7",
  measurementId: "G-WSY5HRVBQ6",
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);

export const analyticsReady =
  typeof window !== "undefined"
    ? isSupported().then((supported) => (supported ? getAnalytics(app) : null))
    : Promise.resolve(null);

export default app;
