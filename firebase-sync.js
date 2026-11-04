// Módulo de Sincronização Blindado e Compatível com Firestore
const DataSync = {
  async save(key, data) {
    localStorage.setItem(key, JSON.stringify(data));
    try {
      if (typeof db !== 'undefined') {
        await db.collection('sistema_data').doc(key).set({
          content: data,
          updatedAt: new Date()
        });
        console.log(`[Firebase] Sincronizado com sucesso: ${key}`);
      } else {
        console.warn("[Firebase] Objeto 'db' não definido.");
      }
    } catch (err) {
      console.error(`[Firebase] Erro ao salvar ${key}:`, err);
      alert(`Erro de Sincronização na Nuvem (${key}): ` + err.message);
    }
  },

  async load(key) {
    try {
      if (typeof db !== 'undefined') {
        const docRef = await db.collection('sistema_data').doc(key).get();
        if (docRef.exists) {
          const rawData = docRef.data();
          // Compatibilidade robusta: verifica se está guardado em .content ou diretamente no documento
          const remoteData = (rawData && rawData.content !== undefined) ? rawData.content : rawData;
          
          if (remoteData !== null && remoteData !== undefined) {
            localStorage.setItem(key, JSON.stringify(remoteData));
            return remoteData;
          }
        }
      }
    } catch (err) {
      console.warn(`[Firebase] A carregar cache local para ${key} devido a erro:`, err);
    }

    const local = localStorage.getItem(key);
    return local ? JSON.parse(local) : null;
  },

  listen(key, callback) {
    try {
      if (typeof db !== 'undefined') {
        db.collection('sistema_data').doc(key).onSnapshot((doc) => {
          if (doc.exists) {
            const rawData = doc.data();
            const remoteData = (rawData && rawData.content !== undefined) ? rawData.content : rawData;
            
            if (remoteData !== null && remoteData !== undefined) {
              localStorage.setItem(key, JSON.stringify(remoteData));
              if (callback) callback(remoteData);
            }
          }
        }, (error) => {
          console.error(`[Firebase] Erro no listener de ${key}:`, error);
        });
      }
    } catch (err) {
      console.warn(`[Firebase] Erro ao ativar escuta para ${key}:`, err);
    }
  }
};
