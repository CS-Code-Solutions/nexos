/**
 * NexOS - Módulo de Configurações (configuracao.js)
 * BLINDADO: Padrão CS Code Solutions (Zero Trust Input + Validação de Backup)
 */

function higienizarTexto(texto) {
  if (typeof texto !== 'string') return texto;
  return texto
    .replace(/<[^>]*>?/gm, '')
    .replace(/[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{1F900}-\u{1F9FF}\u{1FA70}-\u{1FAFF}]/gu, '')
    .trim();
}

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

const btnInstall = document.getElementById('btnInstall');
window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  window.nexosInstallPrompt = e;
});

window.abrirModalAndroid = function(modo) {
  const modal = document.getElementById('androidInstallModal');
  const titulo = document.getElementById('androidModalTitulo');
  const subtitulo = document.getElementById('androidModalSubtitulo');
  const passos = document.getElementById('androidModalPassos');
  if (!modal) return;

  if (modo === 'instalado') {
    titulo.innerHTML = '<i class="fa-solid fa-circle-check"></i> Aplicativo Já Instalado';
    subtitulo.innerHTML = 'Você já está utilizando o <strong>NexOS</strong> como aplicativo instalado neste aparelho.';
    passos.innerHTML = `
      <div style="background: #1C2541; padding: 12px; border-radius: 8px; border-left: 3px solid #10B981; font-size: 0.88rem; line-height: 1.4;">
        <strong style="color: #10B981;">Tudo pronto!</strong> O atalho do NexOS já está ativo na tela inicial do seu celular em modo tela cheia.
      </div>
    `;
  } else if (modo === 'whatsapp') {
    titulo.innerHTML = '<i class="fa-brands fa-android"></i> Abrir no Google Chrome';
    subtitulo.innerHTML = 'Você abriu o link dentro do navegador interno do WhatsApp. Para instalar direto:';
    passos.innerHTML = `
      <div style="background: #1C2541; padding: 11px 12px; border-radius: 8px; border-left: 3px solid #00F5D4; font-size: 0.88rem; line-height: 1.4;">
        <strong style="color: #00F5D4;">1. Toque nos 3 pontinhos:</strong> No canto superior direito da tela <span style="display: inline-block; background: rgba(0,245,212,0.15); color: #00F5D4; padding: 1px 7px; border-radius: 4px; font-weight: bold;"><i class="fa-solid fa-ellipsis-vertical"></i></span>.
      </div>
      <div style="background: #1C2541; padding: 11px 12px; border-radius: 8px; border-left: 3px solid #00F5D4; font-size: 0.88rem; line-height: 1.4;">
        <strong style="color: #00F5D4;">2. Escolha "Abrir no Chrome":</strong> Assim que abrir no Chrome, toque novamente em <strong>Instalar no Android</strong>.
      </div>
    `;
  } else {
    titulo.innerHTML = '<i class="fa-brands fa-android"></i> Instalar NexOS no Android';
    subtitulo.innerHTML = 'Siga os passos abaixo no <strong>Google Chrome</strong> para adicionar o aplicativo à tela inicial:';
    passos.innerHTML = `
      <div style="background: #1C2541; padding: 11px 12px; border-radius: 8px; border-left: 3px solid #00F5D4; font-size: 0.88rem; line-height: 1.4;">
        <strong style="color: #00F5D4;">1. Abra no Google Chrome:</strong> Certifique-se de estar acessando pelo navegador <strong>Chrome</strong>.
      </div>
      <div style="background: #1C2541; padding: 11px 12px; border-radius: 8px; border-left: 3px solid #00F5D4; font-size: 0.88rem; line-height: 1.4;">
        <strong style="color: #00F5D4;">2. Toque no menu superior:</strong> Toque nos <strong>3 pontinhos</strong> <span style="display: inline-block; background: rgba(0,245,212,0.15); color: #00F5D4; padding: 1px 7px; border-radius: 4px; font-weight: bold;"><i class="fa-solid fa-ellipsis-vertical"></i></span> no canto superior direito.
      </div>
      <div style="background: #1C2541; padding: 11px 12px; border-radius: 8px; border-left: 3px solid #00F5D4; font-size: 0.88rem; line-height: 1.4;">
        <strong style="color: #00F5D4;">3. Instale o aplicativo:</strong> Selecione <strong>"Instalar aplicativo"</strong> ou <strong>"Adicionar à tela inicial"</strong> e confirme.
      </div>
    `;
  }

  modal.style.display = 'flex';
};

window.fecharModalAndroid = function() {
  const modal = document.getElementById('androidInstallModal');
  if (modal) modal.style.display = 'none';
};

if (btnInstall) {
  const jaInstalado = window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true;
  if (jaInstalado) {
    btnInstall.innerHTML = '<i class="fa-solid fa-circle-check" style="font-size: 1.2rem;"></i> Aplicativo Já Instalado';
    btnInstall.style.backgroundColor = '#10B981';
    btnInstall.style.color = '#FFFFFF';
  }

  btnInstall.addEventListener('click', async () => {
    if (jaInstalado) {
      abrirModalAndroid('instalado');
      return;
    }

    if (window.nexosInstallPrompt) {
      window.nexosInstallPrompt.prompt();
      const { outcome } = await window.nexosInstallPrompt.userChoice;
      if (outcome === 'accepted') {
        btnInstall.innerHTML = '<i class="fa-solid fa-circle-check" style="font-size: 1.2rem;"></i> Aplicativo Instalado!';
        btnInstall.style.backgroundColor = '#10B981';
        btnInstall.style.color = '#FFFFFF';
      }
      window.nexosInstallPrompt = null;
      return;
    }

    const ua = navigator.userAgent || '';
    const isInApp = /FBAN|FBAV|Instagram|WhatsApp/i.test(ua);
    if (isInApp) {
      abrirModalAndroid('whatsapp');
    } else {
      abrirModalAndroid('manual');
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
    if (dataUrl && typeof dataUrl === 'string' && dataUrl.startsWith('data:image/') && dataUrl.length > 100) {
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

const PAGINAS_PERMITIDAS = ['relatorios.html', 'novo-relatorio.html', 'cadastros.html', 'manutencoes.html'];

const selectPaginaInicialEl = document.getElementById('configPaginaInicial');
if (selectPaginaInicialEl) {
  selectPaginaInicialEl.addEventListener('change', async () => {
    const val = selectPaginaInicialEl.value;
    const destino = PAGINAS_PERMITIDAS.includes(val) ? val : 'relatorios.html';
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

    let paginaInicial = config.paginaInicial || localStorage.getItem('rg_pagina_inicial') || 'relatorios.html';
    if (!PAGINAS_PERMITIDAS.includes(paginaInicial)) {
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

    if (config.techSignature && typeof config.techSignature === 'string' && config.techSignature.startsWith('data:image/') && config.techSignature.length > 100 && ctx && canvas) {
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

      const rawPag = document.getElementById('configPaginaInicial')?.value || 'relatorios.html';
      const paginaSelecionada = PAGINAS_PERMITIDAS.includes(rawPag) ? rawPag : 'relatorios.html';
      localStorage.setItem('rg_pagina_inicial', paginaSelecionada);

      dadosPendentesSalvar = {
        ...configAtual,
        name: higienizarTexto(document.getElementById('configName').value || ''),
        tech: higienizarTexto(document.getElementById('configTech').value || ''),
        techSignature: currentTechSignature,
        doc: higienizarTexto(document.getElementById('configDoc').value || ''),
        email: higienizarTexto(document.getElementById('configEmail').value || ''),
        contact: higienizarTexto(document.getElementById('configContact').value || ''),
        location: higienizarTexto(document.getElementById('configLocation').value || ''),
        paginaInicial: paginaSelecionada,
        nomeConta1: higienizarTexto(document.getElementById('configNomeConta1').value || ''),
        bank1: higienizarTexto(document.getElementById('configBank1').value || ''),
        agency1: higienizarTexto(document.getElementById('configAgency1').value || ''),
        account1: higienizarTexto(document.getElementById('configAccount1').value || ''),
        nomeConta2: higienizarTexto(document.getElementById('configNomeConta2').value || ''),
        bank2: higienizarTexto(document.getElementById('configBank2').value || ''),
        agency2: higienizarTexto(document.getElementById('configAgency2').value || ''),
        account2: higienizarTexto(document.getElementById('configAccount2').value || ''),
        nextRsNumber: String(parseInt(document.getElementById('configNextRs').value, 10) || 1000),
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
    const keys = ['rg_config', 'rg_clients', 'rg_machines', 'rg_reports', 'rg_orcamentos', 'rg_manutencoes', 'rg_horas_extras'];
    const backupData = {};
    for (const key of keys) {
      backupData[key] = await DataSync.load(key) || (key === 'rg_config' ? {} : []);
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
  if (file.size > 15 * 1024 * 1024) {
    alert('Erro: O ficheiro de backup excede o limite de segurança (15MB).');
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
        'rg_orcamentos': 'rg_orcamentos',
        'rg_manutencoes': 'rg_manutencoes',
        'rg_horas_extras': 'rg_horas_extras'
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
