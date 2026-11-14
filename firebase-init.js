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

// Função Global de Logout do NexOS (Limpa toda a sessão e cache do tenant)
async function fazerLogout() {
  try {
    await firebase.auth().signOut();

    // Remove todas as chaves rg_* do localStorage para evitar vazamento entre sessões
    Object.keys(localStorage).forEach((key) => {
      if (key.startsWith('rg_')) {
        localStorage.removeItem(key);
      }
    });

    window.location.href = 'login.html';
  } catch (error) {
    console.error("[NexOS] Erro ao encerrar sessão:", error);
    alert("Erro ao encerrar sessão. Tente novamente.");
  }
}
