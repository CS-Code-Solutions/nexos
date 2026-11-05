// Forçamos a variável para a janela global (window) para que qualquer página a encontre
window.DataSync = {
  getUid: function() {
    const user = firebase.auth().currentUser;
    return user ? user.uid : localStorage.getItem('rg_user_uid');
  },

  getTenantId: function() {
    return localStorage.getItem('rg_tenant_id') || 'default_tenant';
  },

  load: async function(collectionName) {
    const uid = this.getUid();
    if (!uid) {
      const localData = localStorage.getItem(collectionName);
      return localData ? JSON.parse(localData) : [];
    }

    try {
      const doc = await db.collection(collectionName).doc(uid).get();
      if (doc.exists) {
        const data = doc.data().items || [];
        localStorage.setItem(collectionName, JSON.stringify(data));
        return data;
      }
      return [];
    } catch (error) {
      console.error(`[NexOS] Erro ao carregar coleção ${collectionName}:`, error);
      const localData = localStorage.getItem(collectionName);
      return localData ? JSON.parse(localData) : [];
    }
  },

  save: async function(collectionName, dataArray) {
    const uid = this.getUid();
    const tenantId = this.getTenantId();

    if (!uid) {
      console.error(`[NexOS] Impossível guardar ${collectionName}: utilizador não identificado.`);
      return;
    }

    try {
      // 1. Grava no cache local
      localStorage.setItem(collectionName, JSON.stringify(dataArray));
      
      // 2. Grava na nuvem
      await db.collection(collectionName).doc(uid).set({
        tenant_id: tenantId,
        user_uid: uid,
        items: dataArray,
        updatedAt: firebase.firestore.FieldValue.serverTimestamp()
      }, { merge: true });

      console.log(`[NexOS] ${collectionName} sincronizado com a nuvem!`);
    } catch (error) {
      console.error(`[NexOS] ERRO ao guardar no Firestore:`, error);
      alert("Aviso: O registo foi guardado no telemóvel, mas a sincronização com a nuvem falhou.");
    }
  },

  listen: function(collectionName, callback) {
    const uid = this.getUid();
    if (!uid) return null;

    return db.collection(collectionName).doc(uid).onSnapshot((doc) => {
      if (doc.exists) {
        const data = doc.data().items || [];
        localStorage.setItem(collectionName, JSON.stringify(data));
        callback(data);
      }
    }, (error) => {
      console.error(`[NexOS] Erro no listener da coleção ${collectionName}:`, error);
    });
  }
};

console.log("[NexOS] Módulo DataSync carregado e pronto a usar!");
