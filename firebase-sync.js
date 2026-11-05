// Módulo de Sincronização Blindado e Compatível com Firestore
const DataSync = {
  // 1. Função para obter o ID do utilizador atual de forma segura
  getUid: function() {
    const user = firebase.auth().currentUser;
    return user ? user.uid : null;
  },

  // 2. Carregar dados isolados do utilizador
  load: async function(collectionName) {
    const uid = this.getUid();
    if (!uid) {
      console.warn("Utilizador não autenticado. A carregar dados locais (se houver).");
      const localData = localStorage.getItem(collectionName);
      return localData ? JSON.parse(localData) : [];
    }

    try {
      // Vai buscar o documento que tem o mesmo nome do UID do utilizador
      const doc = await db.collection(collectionName).doc(uid).get();
      if (doc.exists) {
        const data = doc.data().items || [];
        localStorage.setItem(collectionName, JSON.stringify(data)); // Backup offline
        return data;
      }
      return [];
    } catch (error) {
      console.error(`Erro ao carregar ${collectionName}:`, error);
      return [];
    }
  },

  // 3. Guardar dados isolados do utilizador
  save: async function(collectionName, dataArray) {
    const uid = this.getUid();
    if (!uid) return;

    try {
      // Atualiza o localStorage para velocidade imediata no ecrã
      localStorage.setItem(collectionName, JSON.stringify(dataArray));
      
      // Grava na nuvem no documento exclusivo do utilizador
      await db.collection(collectionName).doc(uid).set({ 
        items: dataArray,
        updatedAt: firebase.firestore.FieldValue.serverTimestamp()
      });
    } catch (error) {
      console.error(`Erro ao guardar ${collectionName}:`, error);
    }
  },

  // 4. Listener em tempo real (opcional, já usado no seu historico.html)
  listen: function(collectionName, callback) {
    const uid = this.getUid();
    if (!uid) return;

    db.collection(collectionName).doc(uid).onSnapshot((doc) => {
      if (doc.exists) {
        const data = doc.data().items || [];
        localStorage.setItem(collectionName, JSON.stringify(data));
        callback(data);
      }
    });
  }
};
