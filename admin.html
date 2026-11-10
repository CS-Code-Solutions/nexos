/**
 * NexOS - Painel Super Admin (admin.js)
 * CS Code Solutions
 */

let todosTenants = [];
let tenantParaExcluir = null;

// Proteção de Rota e Inicialização
firebase.auth().onAuthStateChanged(async (user) => {
  if (!user) {
    window.location.href = 'login.html';
    return;
  }

  const userRole = localStorage.getItem('rg_user_role');
  if (userRole !== 'super_admin') {
    alert('Acesso restrito ao Super Admin.');
    window.location.href = 'index.html';
    return;
  }

  await carregarTenants();
});

// Carregar lista de clientes / tenants do Firestore
async function carregarTenants() {
  const container = document.getElementById('adminTenantList');
  if (!container) return;

  try {
    container.innerHTML = '<p style="text-align: center; color: #64748B; padding: 20px;">A carregar dados do Firestore...</p>';

    const snapshot = await db.collection('rg_config').get();
    todosTenants = [];

    snapshot.forEach(doc => {
      todosTenants.push({
        uid: doc.id,
        ...doc.data()
      });
    });

    renderizarTenants(todosTenants);
  } catch (err) {
    console.error('Erro ao carregar tenants:', err);
    container.innerHTML = `<p style="text-align: center; color: #EF4444; padding: 20px; font-weight: bold;">Erro ao carregar clientes: ${err.message}</p>`;
  }
}

// Renderizar cards dos clientes
function renderizarTenants(lista) {
  const container = document.getElementById('adminTenantList');
  if (!container) return;

  if (lista.length === 0) {
    container.innerHTML = '<p style="text-align: center; color: #64748B; padding: 20px;">Nenhum cliente registado.</p>';
    return;
  }

  let html = '';
  lista.forEach(t => {
    const safeUid = escapeHTML(t.uid || '');
    const safeNome = escapeHTML(t.nomeEmpresa || t.name || 'Sem Nome');
    const safeEmail = escapeHTML(t.email || t.emailAcesso || '-');
    const safeLogo = t.logoBase64 || t.logoUrl || 'marca.png';

    html += `
      <div style="background: #FFFFFF; border: 1px solid #E2E8F0; border-left: 5px solid #EF4444; border-radius: 6px; padding: 15px; display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 15px; box-shadow: 0 2px 4px rgba(0,0,0,0.05);">
        <div style="display: flex; align-items: center; gap: 15px; flex: 1; min-width: 250px;">
          <img src="${safeLogo}" alt="Logo" style="max-height: 45px; max-width: 90px; object-fit: contain; border: 1px solid #CBD5E1; padding: 2px; border-radius: 4px; background: #FFF;">
          <div>
            <h4 style="margin: 0 0 4px 0; color: #0B132B; font-size: 1.1rem;">${safeNome}</h4>
            <p style="margin: 0; font-size: 0.85rem; color: #64748B;"><strong>E-mail:</strong> ${safeEmail}</p>
            <p style="margin: 2px 0 0 0; font-size: 0.75rem; color: #94A3B8;"><strong>UID:</strong> ${safeUid}</p>
          </div>
        </div>
        
        <div style="display: flex; gap: 8px;">
          <button type="button" class="btn" style="background-color: #3B82F6; color: white; font-weight: bold; padding: 8px 14px; font-size: 0.85rem;" onclick="editarTenant('${safeUid}')">
            <i class="fa-solid fa-pen-to-square"></i> Editar
          </button>
          <button type="button" class="btn" style="background-color: #EF4444; color: white; font-weight: bold; padding: 8px 14px; font-size: 0.85rem;" onclick="abrirModalExclusao('${safeUid}', '${safeNome.replace(/'/g, "\\'")}')">
            <i class="fa-solid fa-trash"></i> Excluir
          </button>
        </div>
      </div>
    `;
  });

  container.innerHTML = html;
}

// Abrir modal para novo cliente
window.abrirModalCliente = function() {
  document.getElementById('tenantForm').reset();
  const uidInput = document.getElementById('tenantUid');
  if (uidInput) {
    uidInput.value = '';
    uidInput.disabled = false;
  }
  
  document.getElementById('tenantLogoBase64').value = '';
  
  const imgPreview = document.getElementById('logoPreviewImg');
  const previewContainer = document.getElementById('logoPreviewContainer');
  if (imgPreview) imgPreview.src = '';
  if (previewContainer) previewContainer.style.display = 'none';

  document.getElementById('modalTenantTitle').textContent = 'Configurar Novo Cliente';
  document.getElementById('tenantModal').style.display = 'flex';
};

// Fechar modal de cliente
window.fecharModalCliente = function() {
  document.getElementById('tenantModal').style.display = 'none';
};

// Editar Cliente / Tenant
window.editarTenant = async function(uid) {
  try {
    let tenant = todosTenants.find(t => t.uid === uid);
    
    // Se não estiver em memória, procura diretamente no Firestore
    if (!tenant) {
      const doc = await db.collection('rg_config').doc(uid).get();
      if (doc.exists) {
        tenant = { uid: doc.id, ...doc.data() };
      }
    }

    if (!tenant) {
      alert('Dados do cliente não encontrados.');
      return;
    }

    const uidInput = document.getElementById('tenantUid');
    if (uidInput) {
      uidInput.value = tenant.uid || '';
      uidInput.disabled = true; // Bloqueia edição do UID
    }

    document.getElementById('tenantNome').value = tenant.nomeEmpresa || tenant.name || '';
    document.getElementById('tenantEmail').value = tenant.email || tenant.emailAcesso || '';
    document.getElementById('tenantWatermark').value = tenant.watermark || tenant.marcaDagua || '';

    // Logótipo
    const logoVal = tenant.logoBase64 || tenant.logoUrl || '';
    document.getElementById('tenantLogoBase64').value = logoVal;
    const imgPreview = document.getElementById('logoPreviewImg');
    const previewContainer = document.getElementById('logoPreviewContainer');
    if (logoVal && imgPreview && previewContainer) {
      imgPreview.src = logoVal;
      previewContainer.style.display = 'block';
    } else if (previewContainer) {
      previewContainer.style.display = 'none';
    }

    // Checkboxes / Feature Flags com verificações seguras
    setCheckbox('pageClientes', tenant.pageClientes !== false);
    setCheckbox('pageMaquinas', tenant.pageMaquinas !== false);
    setCheckbox('pageRelatorios', tenant.pageRelatorios !== false && tenant.pageRS !== false);
    setCheckbox('pageOrcamentos', tenant.pageOrcamentos !== false);
    setCheckbox('pageManutencoes', tenant.pageManutencoes !== false);
    setCheckbox('modHorasExtras', tenant.modHorasExtras === true);

    setCheckbox('criterioHorarioIntervalo', tenant.criterioHorarioIntervalo !== false);
    setCheckbox('criterioHorarioDireto', tenant.criterioHorarioDireto !== false);

    setCheckbox('criterioEmpreitada', tenant.criterioEmpreitada !== false);
    setCheckbox('criterioHoraTrabalhada', tenant.criterioHoraTrabalhada !== false);
    setCheckbox('criterioHoraDeslocamento', tenant.criterioHoraDeslocamento !== false);
    setCheckbox('criterioHospedagem', tenant.criterioHospedagem !== false);
    setCheckbox('criterioOutrasDespesas', tenant.criterioOutrasDespesas !== false);

    document.getElementById('modalTenantTitle').textContent = `Editar Cliente - ${tenant.nomeEmpresa || tenant.name || tenant.uid}`;
    document.getElementById('tenantModal').style.display = 'flex';
  } catch (err) {
    console.error('Erro ao carregar cliente para edição:', err);
    alert('Erro ao carregar dados do cliente.');
  }
};

// Auxiliares para manipular checkboxes de forma segura
function setCheckbox(id, checkedVal) {
  const el = document.getElementById(id);
  if (el) el.checked = Boolean(checkedVal);
}

function getCheckbox(id) {
  const el = document.getElementById(id);
  return el ? el.checked : false;
}

// Processar Upload da Logo
window.processarUploadLogo = function(event) {
  const file = event.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = function(e) {
    const base64 = e.target.result;
    document.getElementById('tenantLogoBase64').value = base64;
    
    const imgPreview = document.getElementById('logoPreviewImg');
    const previewContainer = document.getElementById('logoPreviewContainer');
    if (imgPreview && previewContainer) {
      imgPreview.src = base64;
      previewContainer.style.display = 'block';
    }
  };
  reader.readAsDataURL(file);
};

// Submeter Formulário do Tenant
const tenantFormEl = document.getElementById('tenantForm');
if (tenantFormEl) {
  tenantFormEl.addEventListener('submit', async (e) => {
    e.preventDefault();

    const uidInput = document.getElementById('tenantUid');
    let uid = uidInput ? uidInput.value.trim() : '';
    if (!uid) {
      uid = 'tenant_' + Date.now();
    }

    const payload = {
      nomeEmpresa: document.getElementById('tenantNome').value.trim(),
      email: document.getElementById('tenantEmail').value.trim(),
      logoBase64: document.getElementById('tenantLogoBase64').value,
      watermark: document.getElementById('tenantWatermark').value.trim(),

      pageClientes: getCheckbox('pageClientes'),
      pageMaquinas: getCheckbox('pageMaquinas'),
      pageRelatorios: getCheckbox('pageRelatorios'),
      pageRS: getCheckbox('pageRelatorios'), // compatibilidade retroativa
      pageOrcamentos: getCheckbox('pageOrcamentos'),
      pageManutencoes: getCheckbox('pageManutencoes'),
      modHorasExtras: getCheckbox('modHorasExtras'),

      criterioHorarioIntervalo: getCheckbox('criterioHorarioIntervalo'),
      criterioHorarioDireto: getCheckbox('criterioHorarioDireto'),

      criterioEmpreitada: getCheckbox('criterioEmpreitada'),
      criterioHoraTrabalhada: getCheckbox('criterioHoraTrabalhada'),
      criterioHoraDeslocamento: getCheckbox('criterioHoraDeslocamento'),
      criterioHospedagem: getCheckbox('criterioHospedagem'),
      criterioOutrasDespesas: getCheckbox('criterioOutrasDespesas'),

      updatedAt: firebase.firestore.FieldValue.serverTimestamp()
    };

    try {
      await db.collection('rg_config').doc(uid).set(payload, { merge: true });
      alert('Configurações do cliente salvas com sucesso!');
      fecharModalCliente();
      await carregarTenants();
    } catch (err) {
      console.error('Erro ao salvar tenant:', err);
      alert('Erro ao salvar no Firestore: ' + err.message);
    }
  });
}

// Modal de Confirmação de Exclusão
window.abrirModalExclusao = function(uid, nome) {
  tenantParaExcluir = { uid, nome };
  document.getElementById('deleteTenantUid').textContent = uid;
  document.getElementById('deleteTenantNameTarget').textContent = nome;
  document.getElementById('deleteTenantInputConfirm').value = '';
  document.getElementById('deleteErrorMsg').style.display = 'none';
  
  const btn = document.getElementById('btnConfirmarExclusaoModal');
  if (btn) {
    btn.disabled = true;
    btn.style.opacity = '0.5';
    btn.style.cursor = 'not-allowed';
  }

  document.getElementById('deleteConfirmModal').style.display = 'flex';
};

window.fecharModalExclusao = function() {
  document.getElementById('deleteConfirmModal').style.display = 'none';
  tenantParaExcluir = null;
};

window.validarDigitacaoExclusao = function() {
  if (!tenantParaExcluir) return;

  const digitado = document.getElementById('deleteTenantInputConfirm').value.trim();
  const esperado = tenantParaExcluir.nome.trim();
  const btn = document.getElementById('btnConfirmarExclusaoModal');
  const errorMsg = document.getElementById('deleteErrorMsg');

  if (digitado === esperado) {
    btn.disabled = false;
    btn.style.opacity = '1';
    btn.style.cursor = 'pointer';
    errorMsg.style.display = 'none';
  } else {
    btn.disabled = true;
    btn.style.opacity = '0.5';
    btn.style.cursor = 'not-allowed';
    if (digitado.length >= esperado.length) {
      errorMsg.style.display = 'block';
    } else {
      errorMsg.style.display = 'none';
    }
  }
};

window.executarExclusaoTenant = async function() {
  if (!tenantParaExcluir) return;

  try {
    await db.collection('rg_config').doc(tenantParaExcluir.uid).delete();
    alert('Cliente excluído com sucesso!');
    fecharModalExclusao();
    await carregarTenants();
  } catch (err) {
    console.error('Erro ao excluir tenant:', err);
    alert('Erro ao excluir do Firestore: ' + err.message);
  }
};

function escapeHTML(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
