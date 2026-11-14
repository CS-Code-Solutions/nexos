/**
 * NexOS - Guardião Universal de Rotas (Route Guard)
 * Executa de forma síncrona no <head> para evitar renderização indevida (Zero Flash)
 * e revalida permissões no Firestore após o carregamento do Firebase.
 */
(function () {
  const path = window.location.pathname.toLowerCase();
  const pageName = path.split('/').pop() || 'index.html';

  // Páginas públicas que não exigem bloqueio de rota
  const publicPages = ['login.html', '403.html', '404.html', 'assinar-contrato.html'];
  if (publicPages.includes(pageName)) return;

  // 1. Verifica se existe sessão mínima armazenada (evita acesso anônimo direto pela URL)
  const userRole = localStorage.getItem('rg_user_role');
  const tenantId = localStorage.getItem('rg_tenant_id');
  const userUid = localStorage.getItem('rg_user_uid');

  // Se não houver nenhum dado de sessão no localStorage, aguarda auth ou envia ao login
  // (Se firebase-sync já gravou sessão anteriormente, estes valores existem)
  const isSuperAdmin = (userRole === 'super_admin');

  // Mapa de permissões por rota
  const routePermissions = {
    'admin.html': () => isSuperAdmin,
    'cadastros.html': () => isSuperAdmin || localStorage.getItem('rg_page_cadastros') !== 'false',
    'index.html': () => isSuperAdmin || localStorage.getItem('rg_page_cadastros') !== 'false',
    'relatorios.html': () => isSuperAdmin || localStorage.getItem('rg_page_relatorios') !== 'false',
    'novo-relatorio.html': () => isSuperAdmin || localStorage.getItem('rg_page_relatorios') !== 'false',
    'manutencoes.html': () => isSuperAdmin || localStorage.getItem('rg_page_manutencoes') !== 'false',
    'orcamentos.html': () => isSuperAdmin || localStorage.getItem('rg_page_orcamentos') !== 'false',
    'novo-orcamento.html': () => isSuperAdmin || localStorage.getItem('rg_page_orcamentos') !== 'false',
    'horas-extras.html': () => isSuperAdmin || localStorage.getItem('rg_mod_horas_extras') === 'true',
    'configuracao.html': () => true // Configurações permanece acessível para dados/logout
  };

  // Encontra a primeira rota permitida para redirecionamento seguro
  function getFirstAllowedRoute() {
    const fallbackOrder = [
      { url: 'relatorios.html', key: 'rg_page_relatorios', defaultAllow: true },
      { url: 'cadastros.html', key: 'rg_page_cadastros', defaultAllow: true },
      { url: 'manutencoes.html', key: 'rg_page_manutencoes', defaultAllow: true },
      { url: 'horas-extras.html', key: 'rg_mod_horas_extras', defaultAllow: false },
      { url: 'configuracao.html', key: null, defaultAllow: true }
    ];

    for (const item of fallbackOrder) {
      if (!item.key) return item.url;
      const val = localStorage.getItem(item.key);
      if (item.defaultAllow ? val !== 'false' : val === 'true') {
        return item.url;
      }
    }
    return '403.html';
  }

  // 2. Validação Síncrona Imediata (antes do DOM renderizar)
  if (routePermissions[pageName] && !routePermissions[pageName]()) {
    const destino = (pageName === 'admin.html') ? '403.html' : getFirstAllowedRoute();
    if (destino !== pageName) {
      window.location.replace(destino);
      return;
    }
  }

  // 3. Injeta CSS síncrono para ocultar links de navegação não permitidos (Desktop e Mobile)
  (function applyNavVisibilityCSS() {
    if (isSuperAdmin) return;

    let css = '';
    if (localStorage.getItem('rg_page_cadastros') === 'false') {
      css += 'a[href="cadastros.html"], a[href="index.html"] { display: none !important; }';
    }
    if (localStorage.getItem('rg_page_relatorios') === 'false') {
      css += 'a[href="relatorios.html"], a[href="novo-relatorio.html"] { display: none !important; }';
    }
    if (localStorage.getItem('rg_page_manutencoes') === 'false') {
      css += 'a[href="manutencoes.html"], #nav-item-plan, #d-nav-plan { display: none !important; }';
    }
    if (localStorage.getItem('rg_page_orcamentos') === 'false') {
      css += 'a[href="orcamentos.html"], a[href="novo-orcamento.html"], #nav-item-orcamentos, #d-nav-orcamentos { display: none !important; }';
    }
    if (localStorage.getItem('rg_mod_horas_extras') !== 'true') {
      css += 'a[href="horas-extras.html"], #nav-item-horas, #d-nav-horas { display: none !important; }';
    }

    if (css) {
      const style = document.createElement('style');
      style.id = 'nexos-route-guard-css';
      style.textContent = css;
      document.head.appendChild(style);
    }
  })();

  // 4. Revalidação Assíncrona contra adulteração manual do localStorage (via Firebase Auth/Firestore)
  window.addEventListener('DOMContentLoaded', () => {
    if (typeof firebase === 'undefined' || !firebase.auth) return;

    firebase.auth().onAuthStateChanged(async (user) => {
      if (!user) {
        window.location.replace('login.html');
        return;
      }

      try {
        if (typeof db === 'undefined') return;
        const userDoc = await db.collection('saas_users').doc(user.uid).get();
        if (!userDoc.exists) return;

        const uData = userDoc.data();
        const realRole = uData.role || 'user';
        localStorage.setItem('rg_user_role', realRole);

        if (realRole === 'super_admin') return;

        // Se tentou forçar admin.html alterando localStorage
        if (pageName === 'admin.html') {
          window.location.replace('403.html');
          return;
        }

        const tId = uData.tenant_id || tenantId;
        if (!tId) return;

        const tenantDoc = await db.collection('saas_tenants').doc(tId).get();
        if (!tenantDoc.exists) return;

        const tData = tenantDoc.data();
        const flags = tData.feature_flags || tData;

        // Sincroniza permissões reais da nuvem
        if (flags.page_cadastros !== undefined) localStorage.setItem('rg_page_cadastros', String(flags.page_cadastros));
        if (flags.page_relatorios !== undefined) localStorage.setItem('rg_page_relatorios', String(flags.page_relatorios));
        if (flags.page_manutencoes !== undefined) localStorage.setItem('rg_page_manutencoes', String(flags.page_manutencoes));
        if (flags.page_orcamentos !== undefined) localStorage.setItem('rg_page_orcamentos', String(flags.page_orcamentos));
        if (flags.mod_horas_extras !== undefined) localStorage.setItem('rg_mod_horas_extras', String(flags.mod_horas_extras));

        // Re-checa se a página atual continua permitida
        if (routePermissions[pageName] && !routePermissions[pageName]()) {
          window.location.replace(getFirstAllowedRoute());
        }
      } catch (err) {
        console.warn('[RouteGuard] Falha silenciosa na revalidação:', err);
      }
    });
  });
})();
