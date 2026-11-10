/**
 * NexOS - Módulo de Autenticação / Login (login.js)
 */

document.addEventListener('contextmenu', event => event.preventDefault());

function escapeHTML(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

async function validarAcessoSaaS(userEmail) {
  try {
    const docRef = db.collection('saas_users').doc(userEmail);
    const docSnap = await docRef.get();

    if (docSnap.exists) {
      const userData = docSnap.data();
      if (userData.status === 'ativo') {
        return userData;
      }
    }
    return false;
  } catch (err) {
    console.error("Erro ao validar acesso SaaS:", err);
    return false;
  }
}

window.handleGoogleLogin = async function() {
  const errorBox = document.getElementById('loginError');
  const btnGoogle = document.getElementById('btnGoogle');

  if (errorBox) {
    errorBox.style.display = 'none';
    errorBox.textContent = '';
  }

  try {
    if (btnGoogle) {
      btnGoogle.disabled = true;
      btnGoogle.textContent = 'A ligar à Google...';
    }

    const provider = new firebase.auth.GoogleAuthProvider();
    const result = await firebase.auth().signInWithPopup(provider);
    const user = result.user;

    const acessoSaaS = await validarAcessoSaaS(user.email);
    
    if (!acessoSaaS) {
      await firebase.auth().signOut();
      throw new Error(`Acesso negado: O e-mail (${user.email}) não está registado no sistema ou encontra-se inativo.`);
    }

    localStorage.setItem('rg_logged', 'true');
    localStorage.setItem('rg_user_email', escapeHTML(user.email));
    localStorage.setItem('rg_user_uid', escapeHTML(user.uid));
    localStorage.setItem('rg_tenant_id', escapeHTML(acessoSaaS.tenant_id));
    localStorage.setItem('rg_user_role', escapeHTML(acessoSaaS.role));
    
    // --- BUSCA E ARMAZENA AS PERMISSÕES VISUAIS E A LOGO PARA NÃO PISCAR ---
    try {
      const configDoc = await db.collection('rg_config').doc(acessoSaaS.tenant_id).get();
      if (configDoc.exists) {
        const cfg = configDoc.data();
        localStorage.setItem('rg_page_orcamentos', cfg.pageOrcamentos !== false ? 'true' : 'false');
        localStorage.setItem('rg_page_manutencoes', cfg.pageManutencoes !== false ? 'true' : 'false');
        localStorage.setItem('rg_mod_horas_extras', cfg.modHorasExtras === true ? 'true' : 'false');
        
        if (cfg.logoBase64 && cfg.logoBase64.startsWith('data:image')) {
          localStorage.setItem('rg_logo_base64', cfg.logoBase64);
        } else {
          localStorage.removeItem('rg_logo_base64');
        }
      } else {
        localStorage.setItem('rg_page_orcamentos', 'true');
        localStorage.setItem('rg_page_manutencoes', 'true');
        localStorage.setItem('rg_mod_horas_extras', 'false');
        localStorage.removeItem('rg_logo_base64');
      }
    } catch (cErr) {
      console.warn("Aviso ao carregar permissões visuais:", cErr);
    }

    window.location.href = 'index.html';

  } catch (error) {
    console.error("Erro no login Google:", error);
    if (errorBox) {
      errorBox.textContent = error.message || 'Erro ao autenticar com a conta Google.';
      errorBox.style.display = 'block';
    }
    if (btnGoogle) {
      btnGoogle.disabled = false;
      btnGoogle.innerHTML = `<svg width="18" height="18" viewBox="0 0 18 18"><path fill="#4285F4" d="M17.64 9.2c0-.63-.06-1.25-.16-1.84H9v3.49h4.84c-.21 1.12-.85 2.08-1.81 2.72v2.26h2.92c1.71-1.57 2.69-3.88 2.69-6.63z"/><path fill="#34A853" d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.92-2.26c-.81.54-1.84.86-3.04.86-2.34 0-4.32-1.58-5.03-3.71H.95v2.33C2.43 15.98 5.48 18 9 18z"/><path fill="#FBBC05" d="M3.97 10.71c-.18-.54-.28-1.12-.28-1.71s.1-1.17.28-1.71V4.96H.95C.35 6.15 0 7.52 0 9s.35 2.85.95 4.04l3.02-2.33z"/><path fill="#EA4335" d="M9 3.58c1.32 0 2.5.45 3.44 1.35l2.58-2.58C13.47.89 11.43 0 9 0 5.48 0 2.43 2.02.95 4.96l3.02 2.33c.71-2.13 2.69-3.71 5.03-3.71z"/></svg> Entrar com Conta Google`;
    }
  }
};
