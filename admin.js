/**
 * NexOS - Módulo de Painel Super Admin (admin.js)
 */

firebase.auth().onAuthStateChanged(async (user) => {
  if (!user) {
    window.location.href = 'login.html';
  } else {
    await carregarPainelAdmin();
  }
});

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('sw.js').catch((err) => console.log('Falha ao registar SW:', err));
  });
}

let tenantsCache = [];
let tenantParaExcluir = null;

async function carregarPainelAdmin() {
  const container = document.getElementById('adminTenantList');
  if (!container) return;

  try {
    const configSnapshot = await db.collection('rg_config').get();
    
    container.innerHTML = '';
    if (configSnapshot.empty) {
      container.innerHTML = '<p style="text-align: center; color: #64748B;">Nenhum tenant registado na base de dados.</p>';
      return;
    }

    tenantsCache = [];
    let html = '';

    for (const doc of configSnapshot.docs) {
      const data = doc.data();
      const uid = doc.id;
      const emailEmpresa = (data.email || '').trim().toLowerCase();
      const nomeEmpresaStr = (data.name || data.nomeEmpresa || '').trim();

      const ehMaster = (uid === 'cs_master');
      const semNome = (nomeEmpresaStr === "" || nomeEmpresaStr === "Empresa Sem Nome" || nomeEmpresaStr === "Sem Nome");
      const semEmail = (emailEmpresa === "" || emailEmpresa.includes("não informado") || emailEmpresa === " e-mail não informado");

      if (!ehMaster && semNome && semEmail) {
        continue;
      }

      tenantsCache.push({ uid, ...data });

      let contratoAssinadoUrl = null;
      try {
        const contractDoc = await db.collection('rg_contracts').doc(uid).get();
        if (contractDoc.exists && contractDoc.data().status === 'assinado') {
          contratoAssinadoUrl = contractDoc.data().pdfAssinadoUrl;
        }
      } catch (e) {}

      let totalBytes = 0;
      const colecoes = ['rg_clients', 'rg_machines', 'rg_reports', 'rg_orcamentos', 'rg_config'];
      for (const col of colecoes) {
        try {
          const dSnap = await db.collection(col).doc(uid).get();
          if (dSnap.exists) {
            totalBytes += JSON.stringify(dSnap.data()).length;
          }
        } catch (e) {}
      }
      const tamanhoKb = (totalBytes / 1024).toFixed(1);

      const nomeEmpresa = data.name || data.nomeEmpresa || 'Empresa Sem Nome';
      const exibeEmail = data.email || 'E-mail não informado';
      const temLogo = data.logoBase64 ? 'Sim (Personalizado)' : 'Padrão (marca.png)';

      let botaoContratoHtml = '';
      if (contratoAssinadoUrl) {
        botaoContratoHtml = `<a href="${contratoAssinadoUrl}" target="_blank" class="btn" style="background-color: #10B981; color: white; padding: 6px 10px; font-size: 0.8rem; font-weight: bold; text-decoration: none; display: inline-flex; align-items: center; gap: 5px;"><i class="fa-solid fa-file-pdf"></i> Contrato Assinado</a>`;
      } else {
        const linkAssinatura = `assinar-contrato.html?id=${uid}`;
        botaoContratoHtml = `<a href="${linkAssinatura}" target="_blank" class="btn" style="background-color: #64748B; color: white; padding: 6px 10px; font-size: 0.8rem; font-weight: bold; text-decoration: none; display: inline-flex; align-items: center; gap: 5px;"><i class="fa-solid fa-file-pen"></i> Assinar Contrato</a>`;
      }

      html += `
        <div style="background: #F8FAFC; border: 1px solid #CBD5E1; border-left: 5px solid var(--tech-blue); padding: 15px; border-radius: 6px; display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 15px;">
          <div style="flex: 1; min-width: 250px;">
            <strong style="font-size: 1.1rem; color: #0B132B;">${escapeHTML(nomeEmpresa)}</strong><br>
            <span style="font-size: 0.85rem; color: #475569;"><strong>UID:</strong> ${uid} | <strong>E-mail:</strong> ${escapeHTML(exibeEmail)}</span><br>
            <span style="font-size: 0.85rem; color: #0D9488;"><strong>Logótipo:</strong> ${temLogo}</span><br>
            <span style="font-size: 0.85rem; color: #D97706; font-weight: bold;">💾 Consumo DB: ${tamanhoKb} KB</span>
          </div>
          <div style="display: flex; gap: 8px; flex-wrap: wrap; align-items: center;">
            ${botaoContratoHtml}
            <button class="btn" style="background-color: #F59E0B; color: white; padding: 6px 12px; font-size: 0.85rem; font-weight: bold;" onclick="editarTenant('${uid}')"><i class="fa-solid fa-pen"></i> Editar</button>
            
            <button class="btn" style="background-color: #3B82F6; color: white; padding: 6px 10px; font-size: 0.85rem; font-weight: bold;" onclick="exportarBackupJSON('${uid}', '${escapeHTML(nomeEmpresa)}')"><i class="fa-solid fa-file-code"></i> JSON</button>
            <button class="btn" style="background-color: #8B5CF6; color: white; padding: 6px 10px; font-size: 0.85rem; font-weight: bold;" onclick="exportarBackupCSV('${uid}', '${escapeHTML(nomeEmpresa)}')"><i class="fa-solid fa-file-csv"></i> CSV</button>

            <button class="btn" style="background-color: #EF4444; color: white; padding: 6px 12px; font-size: 0.85rem; font-weight: bold;" onclick="excluirTenant('${uid}')"><i class="fa-solid fa-trash"></i> Excluir</button>
          </div>
        </div>
      `;
    }

    if (html === '') {
      container.innerHTML = '<p style="text-align: center; color: #64748B;">Nenhum cliente válido registado.</p>';
    } else {
      container.innerHTML = html;
    }
  } catch (err) {
    console.error(err);
    container.innerHTML = '<p style="text-align: center; color: red;">Erro ao carregar dados do painel administrativo.</p>';
  }
}

window.exportarBackupJSON = async function(uid, nomeEmpresa) {
  try {
    const docRef = await db.collection('rg_reports').doc(uid).get();
    if (!docRef.exists) {
      alert(`Nenhum histórico de relatórios encontrado para o cliente: ${nomeEmpresa}`);
      return;
    }

    const dados = docRef.data();
    const jsonStr = JSON.stringify(dados, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = `backup_relatorios_${uid}_${Date.now()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  } catch (err) {
    console.error("Erro ao exportar JSON:", err);
    alert("Erro ao descarregar backup em JSON.");
  }
};

window.exportarBackupCSV = async function(uid, nomeEmpresa) {
  try {
    const docRef = await db.collection('rg_reports').doc(uid).get();
    if (!docRef.exists) {
      alert(`Nenhum histórico de relatórios encontrado para o cliente: ${nomeEmpresa}`);
      return;
    }

    const dados = docRef.data();
    const listaRelatorios = dados.items || dados.reports || (Array.isArray(dados) ? dados : [dados]);

    if (!listaRelatorios.length) {
      alert("O documento existe, mas a lista de relatórios está vazia.");
      return;
    }

    const chaves = Object.keys(listaRelatorios[0]);
    let csvContent = chaves.join(';') + '\n';

    listaRelatorios.forEach(row => {
      const valores = chaves.map(key => {
        let val = row[key];
        if (val === null || val === undefined) val = '';
        val = String(val).replace(/;/g, ',').replace(/\n/g, ' ');
        return `"${val}"`;
      });
      csvContent += valores.join(';') + '\n';
    });

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = `backup_relatorios_${uid}_${Date.now()}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  } catch (err) {
    console.error("Erro ao exportar CSV:", err);
    alert("Erro ao descarregar backup em CSV.");
  }
};

/**
 * Processa o upload de imagem otimizando a largura/altura para no máximo 350px.
 * Mantém o ficheiro leve (< 40KB) para evitar exceder o limite de documento do Firestore.
 */
window.processarUploadLogo = function(event) {
  const file = event.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = function(e) {
    const img = new Image();
    img.onload = function() {
      const canvas = document.createElement('canvas');
      const MAX_WIDTH = 350;
      const MAX_HEIGHT = 150;
      let width = img.width;
      let height = img.height;

      if (width > height) {
        if (width > MAX_WIDTH) {
          height *= MAX_WIDTH / width;
          width = MAX_WIDTH;
        }
      } else {
        if (height > MAX_HEIGHT) {
          width *= MAX_HEIGHT / height;
          height = MAX_HEIGHT;
        }
      }

      canvas.width = width;
      canvas.height = height;

      const ctx = canvas.getContext('2d');
      ctx.clearRect(0, 0, width, height);
      ctx.drawImage(img, 0, 0, width, height);

      const resizedBase64 = canvas.toDataURL('image/png');
      document.getElementById('tenantLogoBase64').value = resizedBase64;

      const preview = document.getElementById('logoPreviewImg');
      preview.src = resizedBase64;
      document.getElementById('logoPreviewContainer').style.display = 'block';
    };
    img.src = e.target.result;
  };
  reader.readAsDataURL(file);
};

window.removerLogoForm = function() {
  document.getElementById('tenantLogoBase64').value = '';
  document.getElementById('tenantLogoFile').value = '';
  document.getElementById('logoPreviewImg').src = '';
  document.getElementById('logoPreviewContainer').style.display = 'none';
};

window.abrirModalCliente = function() {
  document.getElementById('tenantForm').reset();
  const inputUid = document.getElementById('tenantUid');
  inputUid.value = '';
  inputUid.readOnly = false;
  inputUid.style.background = '#F8FAFC';
  
  removerLogoForm();
  document.getElementById('modalTenantTitle').textContent = 'Adicionar Novo Cliente / Tenant';
  document.getElementById('tenantModal').style.display = 'flex';
};

window.fecharModalCliente = function() {
  document.getElementById('tenantModal').style.display = 'none';
};

window.editarTenant = function(uid) {
  const t = tenantsCache.find(item => item.uid === uid);
  if (!t) return;

  const inputUid = document.getElementById('tenantUid');
  inputUid.value = t.uid;
  inputUid.readOnly = true;
  inputUid.style.background = '#F1F5F9';

  document.getElementById('tenantNome').value = t.name || t.nomeEmpresa || '';
  document.getElementById('tenantEmail').value = t.email || '';
  document.getElementById('tenantWatermark').value = t.watermark || '';
  
  const logoBase64Val = t.logoBase64 || '';
  document.getElementById('tenantLogoBase64').value = logoBase64Val;
  if (logoBase64Val) {
    document.getElementById('logoPreviewImg').src = logoBase64Val;
    document.getElementById('logoPreviewContainer').style.display = 'block';
  } else {
    document.getElementById('logoPreviewContainer').style.display = 'none';
  }

  // Feature Flags
  document.getElementById('pageCadastros').checked = t.pageCadastros !== false;
  document.getElementById('pageRelatorios').checked = t.pageRelatorios !== false;
  document.getElementById('pageOrcamentos').checked = t.pageOrcamentos !== false;
  document.getElementById('pageManutencoes').checked = t.pageManutencoes !== false;
  document.getElementById('modHorasExtras').checked = t.modHorasExtras === true;

  document.getElementById('criterioHorarioIntervalo').checked = t.criterioHorarioIntervalo !== false;
  document.getElementById('criterioHorarioDireto').checked = t.criterioHorarioDireto !== false;

  document.getElementById('criterioEmpreitada').checked = t.criterioEmpreitada !== false;
  document.getElementById('criterioHoraTrabalhada').checked = t.criterioHoraTrabalhada !== false;
  document.getElementById('criterioHoraDeslocamento').checked = t.criterioHoraDeslocamento !== false;
  document.getElementById('criterioHospedagem').checked = t.criterioHospedagem !== false;
  document.getElementById('criterioOutrasDespesas').checked = t.criterioOutrasDespesas !== false;

  document.getElementById('modalTenantTitle').textContent = `Editar Configurações - ${t.name || t.nomeEmpresa || uid}`;
  document.getElementById('tenantModal').style.display = 'flex';
};

const tenantFormEl = document.getElementById('tenantForm');
if (tenantFormEl) {
  tenantFormEl.addEventListener('submit', async (e) => {
    e.preventDefault();
    let uid = document.getElementById('tenantUid').value.trim();
    const emailCliente = document.getElementById('tenantEmail').value.trim();
    const nomeCliente = document.getElementById('tenantNome').value.trim() || 'Empresa Sem Nome';
    
    if (!uid) {
      uid = 'tenant_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7);
    }

    const logoBase64Final = document.getElementById('tenantLogoBase64').value.trim();

    const tenantData = {
      name: nomeCliente,
      nomeEmpresa: nomeCliente,
      email: emailCliente,
      logoBase64: logoBase64Final,
      watermark: document.getElementById('tenantWatermark').value.trim(),
      
      pageCadastros: document.getElementById('pageCadastros').checked,
      pageRelatorios: document.getElementById('pageRelatorios').checked,
      pageOrcamentos: document.getElementById('pageOrcamentos').checked,
      pageManutencoes: document.getElementById('pageManutencoes').checked,
      modHorasExtras: document.getElementById('modHorasExtras').checked,

      criterioHorarioIntervalo: document.getElementById('criterioHorarioIntervalo').checked,
      criterioHorarioDireto: document.getElementById('criterioHorarioDireto').checked,

      criterioEmpreitada: document.getElementById('criterioEmpreitada').checked,
      criterioHoraTrabalhada: document.getElementById('criterioHoraTrabalhada').checked,
      criterioHoraDeslocamento: document.getElementById('criterioHoraDeslocamento').checked,
      criterioHospedagem: document.getElementById('criterioHospedagem').checked,
      criterioOutrasDespesas: document.getElementById('criterioOutrasDespesas').checked,

      updatedAt: firebase.firestore.FieldValue.serverTimestamp()
    };

    try {
      // 1. Grava no Firestore para o tenant alvo
      await db.collection('rg_config').doc(uid).set(tenantData, { merge: true });

      // 2. ISOLAMENTO MULTI-TENANT: SÓ atualiza o localStorage local se o administrador estiver a editar o SEU próprio tenant
      const meuTenantId = localStorage.getItem('rg_tenant_id') || 'cs_master';
      if (uid === meuTenantId) {
        if (logoBase64Final) {
          localStorage.setItem('rg_logo_base64', logoBase64Final);
          const headerLogo = document.getElementById('logo-cliente');
          if (headerLogo) headerLogo.src = logoBase64Final;
        } else {
          localStorage.removeItem('rg_logo_base64');
          const headerLogo = document.getElementById('logo-cliente');
          if (headerLogo) headerLogo.src = 'marca.png';
        }
      }

      if (emailCliente) {
        await db.collection('saas_users').doc(emailCliente).set({
          role: "client",
          status: "ativo",
          tenant_id: uid,
          email: emailCliente,
          createdAt: firebase.firestore.FieldValue.serverTimestamp()
        }, { merge: true });
      }

      alert('✅ Configurações e logótipo salvos no banco de dados com sucesso!');
      fecharModalCliente();
      carregarPainelAdmin();
    } catch (err) {
      console.error(err);
      alert('Erro ao salvar tenant e permissões: ' + err.message);
    }
  });
}

window.excluirTenant = function(uid) {
  const t = tenantsCache.find(item => item.uid === uid);
  const nomeCliente = t ? (t.name || t.nomeEmpresa || '').trim() : '';

  tenantParaExcluir = { uid, nome: nomeCliente };

  document.getElementById('deleteTenantUid').textContent = `(ID: ${uid})`;
  document.getElementById('deleteTenantNameTarget').textContent = nomeCliente;
  
  const inputConfirm = document.getElementById('deleteTenantInputConfirm');
  inputConfirm.value = '';
  inputConfirm.style.borderColor = '#CBD5E1';
  
  document.getElementById('deleteErrorMsg').style.display = 'none';

  const btnConfirmar = document.getElementById('btnConfirmarExclusaoModal');
  btnConfirmar.disabled = true;
  btnConfirmar.style.opacity = '0.5';
  btnConfirmar.style.cursor = 'not-allowed';

  document.getElementById('deleteConfirmModal').style.display = 'flex';
  setTimeout(() => inputConfirm.focus(), 100);
};

window.validarDigitacaoExclusao = function() {
  if (!tenantParaExcluir) return;

  const digitado = document.getElementById('deleteTenantInputConfirm').value.trim();
  const esperado = tenantParaExcluir.nome;

  const btnConfirmar = document.getElementById('btnConfirmarExclusaoModal');
  const inputConfirm = document.getElementById('deleteTenantInputConfirm');
  const errorMsg = document.getElementById('deleteErrorMsg');

  if (digitado === esperado && digitado !== '') {
    btnConfirmar.disabled = false;
    btnConfirmar.style.opacity = '1';
    btnConfirmar.style.cursor = 'pointer';
    inputConfirm.style.borderColor = '#10B981';
    errorMsg.style.display = 'none';
  } else {
    btnConfirmar.disabled = true;
    btnConfirmar.style.opacity = '0.5';
    btnConfirmar.style.cursor = 'not-allowed';
    
    if (digitado.length >= esperado.length && digitado !== esperado) {
      inputConfirm.style.borderColor = '#EF4444';
      errorMsg.style.display = 'block';
    } else {
      inputConfirm.style.borderColor = '#CBD5E1';
      errorMsg.style.display = 'none';
    }
  }
};

window.fecharModalExclusao = function() {
  document.getElementById('deleteConfirmModal').style.display = 'none';
  tenantParaExcluir = null;
};

window.executarExclusaoTenant = async function() {
  if (!tenantParaExcluir) return;
  const uid = tenantParaExcluir.uid;

  try {
    await db.collection('rg_config').doc(uid).delete();
    alert('✅ Configurações e registro do cliente removidos com sucesso.');
    fecharModalExclusao();
    carregarPainelAdmin();
  } catch (err) {
    alert('Erro ao excluir tenant: ' + err.message);
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
