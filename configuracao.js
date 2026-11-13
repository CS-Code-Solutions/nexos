/**
 * NexOS - Módulo de Configurações (configuracao.js)
 */

firebase.auth().onAuthStateChanged(async (user) => {
  if (!user) {
    window.location.href = 'login.html';
  } else {
    const statusText = document.getElementById('statusText');
    if (statusText) {
      statusText.innerHTML = "🟢 Conectado à Nuvem (Sessão Segura)";
      statusText.style.color = "#10B981";
    }

    try {
      const userDoc = await db.collection('saas_users').doc(user.email).get();
      if (userDoc.exists) {
        const data = userDoc.data();
        if (data.role === 'super_admin' && data.status === 'ativo') {
          const adminCard = document.getElementById('superAdminCard');
          if (adminCard) adminCard.style.display = 'block';
        }
      }
    } catch (err) {
      console.error("Erro ao verificar privilégios de administrador:", err);
    }

    await carregarConfiguracoesIniciais();
  }
});

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('sw.js').catch((err) => console.log('Falha ao registar SW:', err));
  });
}

let deferredPrompt;
const btnInstall = document.getElementById('btnInstall');
window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  deferredPrompt = e;
});

if (btnInstall) {
  btnInstall.addEventListener('click', async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      deferredPrompt = null;
    } else {
      alert('Para instalar no Android:\n\n1. Abra o sistema no navegador Google Chrome.\n2. Toque nos 3 pontos (menu) no canto superior direito.\n3. Selecione "Instalar aplicativo" ou "Adicionar à tela inicial".');
    }
  });
}

window.abrirModalIphone = function() {
  const modal = document.getElementById('iphoneInstallModal');
  if (modal) modal.style.display = 'flex';
};

window.fecharModalIphone = function() {
  const modal = document.getElementById('iphoneInstallModal');
  if (modal) modal.style.display = 'none';
};

const canvas = document.getElementById('techSignatureCanvas');
const ctx = canvas ? canvas.getContext('2d') : null;
let painting = false;
let hasDrawn = false;
let currentTechSignature = '';

if (canvas && ctx) {
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  function startPosition(e) { painting = true; draw(e); }
  
  function finishedPosition() { 
    if (painting) {
      painting = false; 
      ctx.beginPath(); 
      if (hasDrawn) {
        currentTechSignature = canvas.toDataURL('image/png');
        atualizarPreviewAssinatura(currentTechSignature);
      }
    }
  }
  
  function draw(e) {
    if (!painting) return;
    hasDrawn = true;
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    ctx.strokeStyle = '#0B132B';
    
    const rect = canvas.getBoundingClientRect();
    const clientX = e.clientX || (e.touches && e.touches[0].clientX);
    const clientY = e.clientY || (e.touches && e.touches[0].clientY);
    const x = clientX - rect.left;
    const y = clientY - rect.top;

    ctx.lineTo(x, y);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(x, y);
  }

  canvas.addEventListener('mousedown', startPosition);
  canvas.addEventListener('mouseup', finishedPosition);
  canvas.addEventListener('mousemove', draw);
  canvas.addEventListener('touchstart', startPosition);
  canvas.addEventListener('touchend', finishedPosition);
  canvas.addEventListener('touchmove', draw);
}

function atualizarPreviewAssinatura(dataUrl) {
  const boxPreview = document.getElementById('containerPreviewAssinatura');
  const imgPreview = document.getElementById('imgPreviewAssinatura');
  if (boxPreview && imgPreview) {
    if (dataUrl && dataUrl.length > 100) {
      imgPreview.src = dataUrl;
      boxPreview.style.display = 'block';
    } else {
      boxPreview.style.display = 'none';
    }
  }
}

window.limparAssinaturaTech = async function() {
  if (ctx && canvas) {
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }
  hasDrawn = false;
  currentTechSignature = '';
  atualizarPreviewAssinatura('');
  
  try {
    let configAtual = await DataSync.load('rg_config') || {};
    configAtual.techSignature = '';
    await DataSync.save('rg_config', configAtual);
  } catch (err) {
    console.error("Erro ao limpar assinatura:", err);
  }
};

window.salvarAssinaturaTech = async function() {
  try {
    if (hasDrawn && canvas) { currentTechSignature = canvas.toDataURL('image/png'); }
    
    let configAtual = await DataSync.load('rg_config') || {};
    configAtual.techSignature = currentTechSignature;
    
    await DataSync.save('rg_config', configAtual);
    atualizarPreviewAssinatura(currentTechSignature);
    alert('Assinatura salva com sucesso!');
    hasDrawn = false;
  } catch (err) {
    alert('Erro ao guardar assinatura: ' + err.message);
  }
};

// Salva automaticamente ao trocar a Página Inicial no select
const selectPaginaInicialEl = document.getElementById('configPaginaInicial');
if (selectPaginaInicialEl) {
  selectPaginaInicialEl.addEventListener('change', async () => {
    const destino = selectPaginaInicialEl.value || 'relatorios.html';
    localStorage.setItem('rg_pagina_inicial', destino);
    
    const linkLogoHeader = document.getElementById('linkLogoHeader');
    if (linkLogoHeader) linkLogoHeader.href = destino;

    try {
      let configAtual = await DataSync.load('rg_config') || {};
      configAtual.paginaInicial = destino;
      await DataSync.save('rg_config', configAtual);
    } catch (err) {
      console.warn("Aviso ao sincronizar página inicial:", err);
    }
  });
}

let dadosPendentesSalvar = null;

async function carregarConfiguracoesIniciais() {
  try {
    let config = await DataSync.load('rg_config') || {};
    
    document.getElementById('configName').value = config.name || '';
    document.getElementById('configTech').value = config.tech || '';
    document.getElementById('configDoc').value = config.doc || '';
    document.getElementById('configEmail').value = config.email || '';
    document.getElementById('configContact').value = config.contact || '';
    document.getElementById('configLocation').value = config.location || '';
    
    document.getElementById('configNomeConta1').value = config.nomeConta1 || '';
    document.getElementById('configBank1').value = config.bank1 || '';
    document.getElementById('configAgency1').value = config.agency1 || '';
    document.getElementById('configAccount1').value = config.account1 || '';

    document.getElementById('configNomeConta2').value = config.nomeConta2 || '';
    document.getElementById('configBank2').value = config.bank2 || '';
    document.getElementById('configAgency2').value = config.agency2 || '';
    document.getElementById('configAccount2').value = config.account2 || '';

    document.getElementById('configNextRs').value = config.nextRsNumber || '1000';

    // Carrega e sincroniza a Página Inicial (ignorando dashboard.html por hora)
    let paginaInicial = config.paginaInicial || localStorage.getItem('rg_pagina_inicial') || 'relatorios.html';
    if (paginaInicial === 'dashboard.html') {
      paginaInicial = 'relatorios.html';
    }
    localStorage.setItem('rg_pagina_inicial', paginaInicial);

    const selectPagina = document.getElementById('configPaginaInicial');
    if (selectPagina && [...selectPagina.options].some(o => o.value === paginaInicial)) {
      selectPagina.value = paginaInicial;
    }
    const linkLogoHeader = document.getElementById('linkLogoHeader');
    if (linkLogoHeader) {
      linkLogoHeader.href = paginaInicial;
    }

    if (config.techSignature && config.techSignature.length > 100 && ctx && canvas) {
      currentTechSignature = config.techSignature;
      const img = new Image();
      img.onload = () => {
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        atualizarPreviewAssinatura(config.techSignature);
        hasDrawn = false;
      };
      img.src = config.techSignature;
    }
  } catch (err) {
    console.error("Erro ao carregar configurações:", err);
  }
}

const configFormEl = document.getElementById('configForm');
if (configFormEl) {
  configFormEl.addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = e.target.querySelector('button[type="submit"]');
    const txtAntigo = btn.innerHTML;
    btn.innerHTML = 'A GUARDAR DADOS...';
    btn.disabled = true;

    try {
      let configAtual = {};
      try { configAtual = await DataSync.load('rg_config') || {}; } 
      catch (loadErr) { console.warn("Aviso: Sem configuração prévia.", loadErr); }

      if (hasDrawn && canvas) {
        currentTechSignature = canvas.toDataURL('image/png');
      } else {
        currentTechSignature = currentTechSignature || configAtual.techSignature || '';
      }

      const paginaSelecionada = document.getElementById('configPaginaInicial')?.value || 'relatorios.html';
      localStorage.setItem('rg_pagina_inicial', paginaSelecionada);

      dadosPendentesSalvar = {
        ...configAtual,
        name: document.getElementById('configName').value || '',
        tech: document.getElementById('configTech').value || '',
        techSignature: currentTechSignature,
        doc: document.getElementById('configDoc').value || '',
        email: document.getElementById('configEmail').value || '',
        contact: document.getElementById('configContact').value || '',
        location: document.getElementById('configLocation').value || '',
        paginaInicial: paginaSelecionada,
        nomeConta1: document.getElementById('configNomeConta1').value || '',
        bank1: document.getElementById('configBank1').value || '',
        agency1: document.getElementById('configAgency1').value || '',
        account1: document.getElementById('configAccount1').value || '',
        nomeConta2: document.getElementById('configNomeConta2').value || '',
        bank2: document.getElementById('configBank2').value || '',
        agency2: document.getElementById('configAgency2').value || '',
        account2: document.getElementById('configAccount2').value || '',
        nextRsNumber: document.getElementById('configNextRs').value || '1000',
        lgpdConsent: true
      };

      const lgpdAceitoLocal = localStorage.getItem('rg_lgpd_consent');
      
      if (lgpdAceitoLocal === 'true' || configAtual.lgpdConsent === true) {
        await executarSalvamentoConfiguracoes();
      } else {
        document.getElementById('lgpdModal').style.display = 'flex';
      }
    } catch (err) {
      console.error("Erro geral no submit:", err);
      alert("Ocorreu um erro ao preparar os dados: " + err.message);
    } finally {
      btn.innerHTML = txtAntigo;
      btn.disabled = false;
    }
  });
}

async function executarSalvamentoConfiguracoes() {
  if (!dadosPendentesSalvar) return;
  try {
    await DataSync.save('rg_config', dadosPendentesSalvar);
    
    const tenantId = localStorage.getItem('rg_tenant_id');
    if (tenantId) {
       await db.collection('rg_config').doc(tenantId).set(dadosPendentesSalvar, { merge: true });
    }

    if (dadosPendentesSalvar.paginaInicial) {
      localStorage.setItem('rg_pagina_inicial', dadosPendentesSalvar.paginaInicial);
      const linkLogoHeader = document.getElementById('linkLogoHeader');
      if (linkLogoHeader) linkLogoHeader.href = dadosPendentesSalvar.paginaInicial;
    }

    localStorage.setItem('rg_lgpd_consent', 'true');
    alert('Todas as configurações da empresa foram salvas com sucesso!');
    hasDrawn = false;
    dadosPendentesSalvar = null;
  } catch (err) {
    console.error("Erro no DataSync.save:", err);
    alert('Erro ao guardar na nuvem: ' + err.message);
  }
}

window.aceitarLgpd = async function() {
  document.getElementById('lgpdModal').style.display = 'none';
  localStorage.setItem('rg_lgpd_consent', 'true');
  await executarSalvamentoConfiguracoes();
};

window.recusarLgpd = function() {
  document.getElementById('lgpdModal').style.display = 'none';
  dadosPendentesSalvar = null;
  alert('Erro: Consentimento negado. Operação cancelada.');
};

window.fazerBackup = async function() {
  try {
    const keys = ['rg_config', 'rg_clients', 'rg_machines', 'rg_reports', 'rg_orcamentos'];
    const backupData = {};
    for (const key of keys) {
      backupData[key] = await DataSync.load(key) || [];
    }
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(backupData, null, 2));
    const downloadAnchor = document.createElement('a');
    const dataAtual = new Date().toISOString().split('T')[0];
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `nexos_backup_${dataAtual}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
    alert('Backup gerado com sucesso!');
  } catch (err) {
    alert('Erro ao gerar backup: ' + err.message);
  }
};

window.restaurarBackup = async function(event) {
  const file = event.target.files[0];
  if (!file) return;
  if (!file.name.endsWith('.json') && file.type !== 'application/json') {
    alert('Erro: Por favor, selecione um ficheiro JSON válido.');
    event.target.value = '';
    return;
  }
  if (!confirm('Atenção: A restauração irá substituir os dados atuais. Deseja continuar?')) {
    event.target.value = '';
    return;
  }
  const reader = new FileReader();
  reader.onload = async function(e) {
    try {
      const backupData = JSON.parse(e.target.result);
      if (!backupData || typeof backupData !== 'object') throw new Error('Formato JSON inválido.');
      const validKeysMap = {
        'rg_config': 'rg_config',
        'rg_clients': 'rg_clients',
        'rg_machines': 'rg_machines',
        'rg_reports': 'rg_reports',
        'rg_orcamentos': 'rg_orcamentos'
      };
      let restoredAny = false;
      for (const [fileKey, targetKey] of Object.entries(validKeysMap)) {
        if (backupData[fileKey] !== undefined) {
          const dataToSave = backupData[fileKey];
          if (targetKey === 'rg_config' && (typeof dataToSave !== 'object' || Array.isArray(dataToSave))) continue;
          if (targetKey !== 'rg_config' && !Array.isArray(dataToSave)) continue;
          await DataSync.save(targetKey, dataToSave);
          restoredAny = true;
        }
      }
      if (!restoredAny) {
        alert('Aviso: O ficheiro não contém dados compatíveis.');
        return;
      }
      alert('Dados restaurados com sucesso!');
      location.reload();
    } catch (err) {
      alert('Erro ao processar ficheiro de backup.');
      console.error(err);
    } finally {
      event.target.value = '';
    }
  };
  reader.readAsText(file);
};
