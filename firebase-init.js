// Configuração unificada do Firebase para o projeto NexOS
const firebaseConfig = {
  apiKey: "AIzaSyA_Br3Hp3Dz5ur7lKjUJ-pSCBQCZQNqPK0",
  authDomain: "sistema-ee7d0.firebaseapp.com",
  projectId: "sistema-ee7d0",
  storageBucket: "sistema-ee7d0.firebasestorage.app",
  messagingSenderId: "879155372243",
  appId: "1:879155372243:web:360e87c48e91c45b353426"
};

// Inicializar o Firebase (versão Compat para HTML estático sem conflitos)
if (!firebase.apps.length) {
  firebase.initializeApp(firebaseConfig);
}

// Instâncias globais partilhadas em todo o sistema
const db = firebase.firestore();
const auth = firebase.auth();