// Módulo de Sincronização NexOS - SaaS Multi-tenant
const DataSync = {
  // 1. Obter UID do utilizador (Firebase Auth com fallback síncrono para LocalStorage)
  getUid: function() {
    const user = firebase.auth().currentUser;
    return user ? user.uid : localStorage.getItem('rg_user_uid');
  },

  // 2. Obter Tenant ID da empresa/cliente registado no SaaS
  getTenantId: function() {
    return localStorage.getItem('rg_tenant_id') || 'default_tenant';
  },

  // 3. Carregar dados isolados do utilizador/tenant
  load: async function(collectionName) {
    const uid = this.getUid();

    if (!uid) {
      console.warn(`[NexOS] Utilizador não autenticado. A carregar ${collectionName} da memória local.`);
      const localData = localStorage.getItem(collectionName);
      return localData ? JSON.parse(localData) : [];
    }

    try {
      // Procura o documento isolado com o ID do utilizador
      const doc = await db.collection(collectionName).doc(uid).get();
      if (doc.exists) {
        const data = doc.data().items || [];
        localStorage.setItem(collectionName, JSON.stringify(data)); // Backup offline
        return data;
      }
      return [];
    } catch (error) {
      console.error(`[NexOS] Erro ao carregar coleção ${collectionName}:`, error);
      // Fallback para cache local em caso de instabilidade de rede
      const localData = localStorage.getItem(collectionName);
      return localData ? JSON.parse(localData) : [];
    }
  },

  // 4. Guardar dados vinculados ao Tenant ID e User UID
  save: async function(collectionName, dataArray) {
    const uid = this.getUid();
    const tenantId = this.getTenantId();

    if (!uid) {
      console.error(`[NexOS] Impossível guardar ${collectionName}: utilizador não identificado.`);
      return;
    }

    try {
      // Atualização imediata no cache local para resposta ultra-rápida na UI
      localStorage.setItem(collectionName, JSON.stringify(dataArray));
      
      // Persistência isolada na nuvem
      await db.collection(collectionName).doc(uid).set({
        tenant_id: tenantId,
        user_uid: uid,
        items: dataArray,
        updatedAt: firebase.firestore.FieldValue.serverTimestamp()
      }, { merge: true });

    } catch (error) {
      console.error(`[NexOS] Erro ao guardar coleção ${collectionName}:`, error);
    }
  },

  // 5. Listener em tempo real isolado por documento
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
