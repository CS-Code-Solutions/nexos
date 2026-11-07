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
// CONTROLO GLOBAL INSTANTÂNEO: LOGÓTIPO + BOTTOM-NAV (SEM PULOS)
// ============================================================
(function aplicarLayoutGlobalInstantaneo() {
  function renderizarInterface() {
    const imgLogo = document.getElementById('logo-cliente');
    const bottomNav = document.querySelector('.bottom-nav');

    // 1. CARREGAMENTO INSTANTÂNEO DO LOGÓTIPO (SEM PISCADA)
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

    // 2. CARREGAMENTO INSTANTÂNEO DA BARRA INFERIOR (SEM PULOS)
    if (bottomNav) {
      const userRole = localStorage.getItem('rg_user_role');
      const pageOrcamentos = localStorage.getItem('rg_page_orcamentos');
      const modHorasExtras = localStorage.getItem('rg_mod_horas_extras');
      const isSuperAdmin = (userRole === 'super_admin');

      if (!isSuperAdmin && pageOrcamentos === 'false') {
        const btnOrcamentos = bottomNav.querySelector('a[href="orcamentos.html"]');
        if (btnOrcamentos) btnOrcamentos.classList.add('nav-item-hidden');
      }

      if (isSuperAdmin || modHorasExtras === 'true') {
        if (!bottomNav.querySelector('a[href="horas-extras.html"]')) {
          const btnHoras = document.createElement('a');
          btnHoras.href = 'horas-extras.html';
          const isActive = window.location.pathname.includes('horas-extras.html') ? 'active' : '';
          btnHoras.className = isActive;
          btnHoras.innerHTML = `<i class="fa-solid fa-clock"></i><span>Horas</span>`;
          bottomNav.insertBefore(btnHoras, bottomNav.lastElementChild);
        }
      }
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', renderizarInterface);
  } else {
    renderizarInterface();
  }
})();
