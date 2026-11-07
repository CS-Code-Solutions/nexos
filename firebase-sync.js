// Forçamos a variável para a janela global (window) para que qualquer página a encontre
window.DataSync = {
  // Retorna o UID do utilizador logado no Auth
  getUid: function() {
    const user = firebase.auth().currentUser;
    return user ? user.uid : localStorage.getItem('rg_user_uid');
  },

  // Retorna o tenant_id da empresa, armazenado no momento do login
  getTenantId: function() {
    return localStorage.getItem('rg_tenant_id') || 'default_tenant';
  },

  // Usa o tenant_id para carregar configurações em rg_config,
  // ou usa o uid para outras coleções se necessário
  load: async function(collectionName) {
    const tenantId = this.getTenantId();
    const uid = this.getUid();
    
    // Se for a coleção de configuração, carrega pelo tenant_id
    const documentId = collectionName === 'rg_config' ? tenantId : uid;

    if (!documentId) {
      const localData = localStorage.getItem(collectionName);
      return localData ? JSON.parse(localData) : [];
    }

    try {
      const doc = await db.collection(collectionName).doc(documentId).get();
      if (doc.exists) {
        // Se for rg_config, retorna os dados diretamente em vez de procurar "items"
        const data = collectionName === 'rg_config' ? doc.data() : (doc.data().items || []);
        localStorage.setItem(collectionName, JSON.stringify(data));
        return data;
      }
      return collectionName === 'rg_config' ? null : [];
    } catch (error) {
      console.error(`[NexOS] Erro ao carregar coleção ${collectionName}:`, error);
      const localData = localStorage.getItem(collectionName);
      return localData ? JSON.parse(localData) : (collectionName === 'rg_config' ? null : []);
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
    const tenantId = this.getTenantId();
    const uid = this.getUid();
    
    const documentId = collectionName === 'rg_config' ? tenantId : uid;

    if (!documentId) return null;

    return db.collection(collectionName).doc(documentId).onSnapshot((doc) => {
      if (doc.exists) {
        const data = collectionName === 'rg_config' ? doc.data() : (doc.data().items || []);
        localStorage.setItem(collectionName, JSON.stringify(data));
        callback(data);
      }
    }, (error) => {
      console.error(`[NexOS] Erro no listener da coleção ${collectionName}:`, error);
    });
  }
};

console.log("[NexOS] Módulo DataSync carregado e pronto a usar com multi-tenant!");

// ============================================================
// CONTROLO GLOBAL INSTANTÂNEO: LOGÓTIPO + BOTTOM-NAV (SEM PISCAR)
// ============================================================
(function aplicarLayoutGlobalInstantaneo() {
  // Executa imediatamente para evitar qualquer atraso visual ou piscada
  const imgLogo = document.getElementById('logo-cliente');
  if (imgLogo) {
    const logoSalva = localStorage.getItem('rg_logo_base64');
    if (logoSalva && logoSalva.startsWith('data:image')) {
      imgLogo.src = logoSalva;
    } else {
      imgLogo.src = 'marca.png';
    }
    imgLogo.style.objectFit = 'contain';
    imgLogo.style.display = 'block';
  }

  const bottomNav = document.querySelector('.bottom-nav');
  if (bottomNav) {
    const userRole = localStorage.getItem('rg_user_role');
    const pageOrcamentos = localStorage.getItem('rg_page_orcamentos');
    const modHorasExtras = localStorage.getItem('rg_mod_horas_extras');
    const isSuperAdmin = (userRole === 'super_admin');

    // Controlo do botão Orçamentos
    const btnOrcamentos = document.getElementById('nav-item-orcamentos');
    if (btnOrcamentos) {
      if (!isSuperAdmin && pageOrcamentos === 'false') {
        btnOrcamentos.style.display = 'none';
      } else {
        btnOrcamentos.style.display = 'flex';
      }
    }

    // Controlo do botão Horas (agora comum, visível se for super admin ou se a mod_horas_extras for true)
    const btnHoras = document.getElementById('nav-item-horas');
    if (btnHoras) {
      if (isSuperAdmin || modHorasExtras === 'true') {
        btnHoras.style.display = 'flex';
        // Ativa a classe active se estivermos na página de horas
        if (window.location.pathname.includes('horas-extras.html')) {
          btnHoras.classList.add('active');
        } else {
          btnHoras.classList.remove('active');
        }
      } else {
        btnHoras.style.display = 'none';
      }
    }
  }
})();
