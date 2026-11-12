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

    const btnOrcamentos = document.getElementById('nav-item-orcamentos');
    if (btnOrcamentos) {
      if (!isSuperAdmin && pageOrcamentos === 'false') {
        btnOrcamentos.style.display = 'none';
      } else {
        btnOrcamentos.style.display = 'flex';
      }
    }

    const btnHoras = document.getElementById('nav-item-horas');
    if (btnHoras) {
      if (isSuperAdmin || modHorasExtras === 'true') {
        btnHoras.style.display = 'flex';
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

// =========================================================================
// CONTROLE E BLOQUEIO AUTOMÁTICO DE LICENÇA (7 DIAS OU 1 ANO) - NEXOS
// =========================================================================
firebase.auth().onAuthStateChanged(async (user) => {
  if (!user || window.location.pathname.includes('login.html') || window.location.pathname.includes('admin.html')) {
    return;
  }

  try {
    const userRole = localStorage.getItem('rg_user_role');
    if (userRole === 'super_admin') return;

    let tipoLicenca = null;
    let dataInicioStr = null;
    let tenantId = localStorage.getItem('rg_tenant_id');

    // 1. Verifica primeiro no cadastro do usuário (saas_users)
    if (user.email) {
      const userDoc = await db.collection('saas_users').doc(user.email).get();
      if (userDoc.exists) {
        const uData = userDoc.data();
        if (uData.role === 'super_admin') return;
        if (uData.tenant_id) tenantId = uData.tenant_id;
        tipoLicenca = uData.tipoLicenca || null;
        dataInicioStr = uData.dataInicioLicenca || null;
      }
    }

    // 2. Verifica / complementa pelos dados da empresa (rg_config)
    if (tenantId) {
      const cfgDoc = await db.collection('rg_config').doc(tenantId).get();
      if (cfgDoc.exists) {
        const cData = cfgDoc.data();
        if (cData.tipoLicenca) tipoLicenca = cData.tipoLicenca;
        if (cData.dataInicioLicenca) dataInicioStr = cData.dataInicioLicenca;
      }
    }

    // Se não houver restrição configurada ou for vitalício, segue normalmente
    if (!tipoLicenca || tipoLicenca === 'definitivo') {
      window.nexosLicencaInfo = { tipoLicenca: 'definitivo' };
      window.dispatchEvent(new Event('nexosLicencaCarregada'));
      return;
    }

    // Se estiver em plano 7_dias ou 1_ano mas ainda sem data de início gravada, define hoje
    if (!dataInicioStr) {
      dataInicioStr = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
      if (user.email) {
        await db.collection('saas_users').doc(user.email).set({
          dataInicioLicenca: dataInicioStr,
          tipoLicenca: tipoLicenca
        }, { merge: true });
      }
      if (tenantId) {
        await db.collection('rg_config').doc(tenantId).set({
          dataInicioLicenca: dataInicioStr,
          tipoLicenca: tipoLicenca
        }, { merge: true });
      }
    }

    const diasPlano = (tipoLicenca === '1_ano') ? 365 : 7;
    const [ano, mes, dia] = dataInicioStr.split('-').map(Number);
    const dataInicio = new Date(ano, mes - 1, dia, 0, 0, 0);
    const dataExpiracao = new Date(dataInicio);
    dataExpiracao.setDate(dataExpiracao.getDate() + diasPlano);

    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);

    const diasRestantes = Math.ceil((dataExpiracao - hoje) / (1000 * 60 * 60 * 24));

    window.nexosLicencaInfo = {
      tipoLicenca,
      diasPlano,
      dataInicioStr,
      dataExpiracaoStr: dataExpiracao.toLocaleDateString('pt-BR'),
      diasRestantes
    };

    // Notifica a página de Configurações para exibir os dados
    window.dispatchEvent(new Event('nexosLicencaCarregada'));

    // Bloqueio automático se venceu
    if (diasRestantes <= 0) {
      exibirBloqueioExpirado(tipoLicenca);
    }
  } catch (err) {
    console.warn("[NexOS] Aviso ao verificar validade da licença:", err);
  }
});

function exibirBloqueioExpirado(tipoLicenca) {
  if (document.getElementById('nexos-lock-overlay')) return;

  const titulo = tipoLicenca === '1_ano' ? 'Licença Anual Expirada' : 'Período de Avaliação Encerrado';
  const msg = tipoLicenca === '1_ano'
    ? 'Sua licença anual de <strong>1 ano</strong> do <strong>NexOS</strong> chegou ao fim. Entre em contato para renovar seu acesso e manter seus dados ativos.'
    : 'Os <strong>7 dias</strong> de avaliação gratuita do <strong>NexOS</strong> foram concluídos. Para continuar utilizando o sistema, ative seu plano anual.';

  const whatsLink = "https://wa.me/5551981061618?text=" + encodeURIComponent("Olá! Gostaria de renovar/ativar minha licença do NexOS.");

  const overlay = document.createElement('div');
  overlay.id = 'nexos-lock-overlay';
  overlay.style.cssText = `
    position: fixed; inset: 0; background: rgba(11, 19, 43, 0.97);
    z-index: 99999; display: flex; justify-content: center; align-items: center; padding: 20px;
  `;
  overlay.innerHTML = `
    <div style="background: #FFFFFF; max-width: 420px; width: 100%; border-radius: 12px; padding: 28px; text-align: center; border-top: 5px solid #EF4444; box-shadow: 0 20px 40px rgba(0,0,0,0.4);">
      <i class="fa-solid fa-lock" style="font-size: 3rem; color: #EF4444; margin-bottom: 14px;"></i>
      <h2 style="color: #0B132B; margin: 0 0 10px 0; font-size: 1.35rem;">${titulo}</h2>
      <p style="color: #475569; font-size: 0.92rem; line-height: 1.5; margin-bottom: 22px;">${msg}</p>
      <a href="${whatsLink}" target="_blank" style="display: block; background: #10B981; color: white; font-weight: bold; padding: 12px 20px; border-radius: 8px; text-decoration: none; font-size: 0.95rem; margin-bottom: 10px;">
        <i class="fa-brands fa-whatsapp"></i> Falar com a CS Code Solutions
      </a>
      <button type="button" onclick="fazerLogout()" style="background: transparent; border: 1px solid #CBD5E1; color: #64748B; padding: 8px 16px; border-radius: 6px; cursor: pointer; font-size: 0.85rem; width: 100%;">
        Sair da Conta
      </button>
    </div>
  `;
  document.body.appendChild(overlay);
}
