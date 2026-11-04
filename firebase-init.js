// Configuração unificada do Firebase para o projeto Laser Expert
const firebaseConfig = {
  apiKey: "AIzaSyDWoTdE-LCuHg1GrIVFHmVhAYnIL06PRr0",
  authDomain: "otavio-b80a5.firebaseapp.com",
  projectId: "otavio-b80a5",
  storageBucket: "otavio-b80a5.appspot.com",
  messagingSenderId: "54639570167",
  appId: "1:54639570167:web:b68950efc1bca86495b7f2"
};

// Inicializar o Firebase (versão Compat para HTML estático sem conflitos)
if (!firebase.apps.length) {
  firebase.initializeApp(firebaseConfig);
}

// Instâncias globais partilhadas em todo o sistema
const db = firebase.firestore();
const auth = firebase.auth();
