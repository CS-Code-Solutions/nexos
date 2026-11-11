/**
 * NexOS - Módulo de Novo Relatório de Serviço (novo-relatorio.js)
 */

window.configHorariosTenant = { intervalo: true, direto: true };

firebase.auth().onAuthStateChanged(async (user) => {
  if (!user) {
    window.location.href = 'login.html';
  } else {
    await aplicarFeatureFlagsCriterios();
    await loadClients();
    gerarCamposDias();
    await verificarModoEdicao();
    verificarPreenchimentoPlaneado();
  }
});

let anexosList = [];
let clientMachines = [];
let clientCanvas = document.getElementById('clientCanvas');
let clientCtx = clientCanvas ? clientCanvas.getContext('2d') : null;
let paintingClient = false;
let hasSignature = false;
let tempAnexoBase64 = '';

function normalizarLista(dados) {
  if (!dados) return [];
  if (Array.isArray(dados)) return dados;
  if (Array.isArray(dados.items)) return dados.items;
  if (Array.isArray(dados.reports)) return dados.reports;
  if (Array.isArray(dados.orcamentos)) return dados.orcamentos;
  if (typeof dados === 'object') {
    return Object.values(dados).filter(item => item && typeof item === 'object');
  }
  return [];
}

window.avancarParaStep1 = function() {
  document.getElementById('step2').style.display = 'none';
  document.getElementById('step1').style.display = 'block';
  document.getElementById('ind-step2').classList.remove('active');
  document.getElementById('ind-step1').classList.add('active');
};

window.avancarParaStep2 = function() {
  const reqFields = document.querySelectorAll('#step1 [required]');
  let isValid = true;
  reqFields.forEach(f => {
    if (!f.value) { 
      isValid = false; 
      f.style.borderColor = '#EF4444'; 
    } else { 
      f.style.borderColor = '#CBD5E1'; 
    }
  });
  
  if (!isValid) {
    alert('Por favor, preencha todos os campos obrigatórios no Passo 1.');
    return;
  }

  document.getElementById('resumoCliente').textContent = document.getElementById('repClient').value;
  document.getElementById('resumoMaquina').textContent = document.getElementById('repEquipment').value;
  document.getElementById('resumoManutencao').textContent = document.getElementById('repServiceNature').value;
  document.getElementById('resumoServico').textContent = document.getElementById('repDesc').value;

  document.getElementById('step1').style.display = 'none';
  document.getElementById('step2').style.display = 'block';
  
  document.getElementById('ind-step1').classList.remove('active');
  document.getElementById('ind-step2').classList.add('active');
};

window.confirmarAssinatura = function() {
  const editIndex = document.getElementById('editIndex').value;
  
  if (!hasSignature && !editIndex) {
    alert('O cliente/responsável precisa desenhar a assinatura antes de salvar.');
    return;
  }

  document.getElementById('areaAssinatura').style.display = 'none';
  document.getElementById('btnVoltarStep1').style.display = 'none';
  document.getElementById('msgAssinaturaSucesso').style.display = 'block';
  document.getElementById('btnAvancarStep3').style.display = 'block';
};

window.avancarParaStep3 = function() {
  document.getElementById('step2').style.display = 'none';
  document.getElementById('step3').style.display = 'block';
  
  document.getElementById('ind-step2').classList.remove('active');
  document.getElementById('ind-step3').classList.add('active');
};

window.voltarParaStep1 = function() {
  document.getElementById('step2').style.display = 'none';
  document.getElementById('step1').style.display = 'block';
  
  document.getElementById('ind-step2').classList.remove('active');
  document.getElementById('ind-step1').classList.add('active');
};

window.voltarParaStep2 = function() {
  document.getElementById('step3').style.display = 'none';
  document.getElementById('step2').style.display = 'block';
  
  document.getElementById('ind-step3').classList.remove('active');
  document.getElementById('ind-step2').classList.add('active');
};

async function aplicarFeatureFlagsCriterios() {
  try {
    const tenantId = localStorage.getItem('rg_tenant_id') || DataSync.getUid();
    const configDoc = await db.collection('rg_config').doc(tenantId).get();

    if (configDoc.exists) {
      const config = configDoc.data();

      if (config.criterioEmpreitada === false) {
        const el = document.getElementById('selectEmpreitada');
        if (el && el.closest('div')) el.closest('div').style.display = 'none';
      }
      if (config.criterioHoraTrabalhada === false) {
        const el = document.getElementById('selectHora');
        if (el && el.closest('div')) el.closest('div').style.display = 'none';
      }
      if (config.criterioHoraDeslocamento === false) {
        const el = document.getElementById('selectDeslocamento');
        if (el && el.closest('div')) el.closest('div').style.display = 'none';
      }
      if (config.criterioHospedagem === false) {
        const el = document.getElementById('selectHospedagem');
        if (el && el.closest('div')) el.closest('div').style.display = 'none';
      }
      if (config.criterioOutrasDespesas === false) {
        const el = document.getElementById('selectOutras');
        if (el && el.closest('div')) el.closest('div').style.display = 'none';
      }

      window.configHorariosTenant = {
        intervalo: config.criterioHorarioIntervalo !== false,
        direto: config.criterioHorarioDireto !== false
      };
    }
  } catch (err) {
    console.error("Erro ao aplicar restrições de critérios:", err);
  }
}

if (clientCanvas && clientCtx) {
  function startClient(e) { paintingClient = true; hasSignature = true; drawClient(e); }
  function finishClient() { paintingClient = false; clientCtx.beginPath(); }
  function drawClient(e) {
    if (!paintingClient) return;
    e.preventDefault();
    clientCtx.lineWidth = 2;
    clientCtx.lineCap = 'round';
    clientCtx.strokeStyle = '#0B132B';
    const rect = clientCanvas.getBoundingClientRect();
    const x = (e.clientX || (e.touches && e.touches[0].clientX)) - rect.left;
    const y = (e.clientY || (e.touches && e.touches[0].clientY)) - rect.top;
    clientCtx.lineTo(x, y);
    clientCtx.stroke();
    clientCtx.beginPath();
    clientCtx.moveTo(x, y);
  }

  clientCanvas.addEventListener('mousedown', startClient);
  clientCanvas.addEventListener('mouseup', finishClient);
  clientCanvas.addEventListener('mousemove', drawClient);
  clientCanvas.addEventListener('touchstart', startClient, {passive: false});
  clientCanvas.addEventListener('touchend', finishClient);
  clientCanvas.addEventListener('touchmove', drawClient, {passive: false});
}

window.clearClientSig = function() {
  if (clientCtx && clientCanvas) {
    clientCtx.clearRect(0, 0, clientCanvas.width, clientCanvas.height);
    hasSignature = false;
  }
};

function gerarOpcoesHoras(selecionado = '08:00') {
  let html = '';
  for (let h = 0; h < 24; h++) {
    for (let m = 0; m < 60; m += 30) {
      let hs = String(h).padStart(2, '0');
      let ms = String(m).padStart(2, '0');
      let val = `${hs}:${ms}`;
      let sel = (val === selecionado) ? 'selected' : '';
      html += `<option value="${val}" ${sel}>${hs}:${ms}</option>`;
    }
  }
  return html;
}

window.alternarTipoHorarioDia = function(index) {
  const selectTipo = document.getElementById(`tipo_registo_${index}`);
  const boxTurnos = document.getElementById(`box_turnos_${index}`);
  const boxDireto = document.getElementById(`box_direto_${index}`);

  if (!selectTipo || !boxTurnos || !boxDireto) return;

  if (selectTipo.value === 'turnos') {
    boxTurnos.style.display = 'block';
    boxDireto.style.display = 'none';
  } else {
    boxTurnos.style.display = 'none';
    boxDireto.style.display = 'block';
  }
};

window.gerarCamposDias = function(dadosSalvos = []) {
  let qtd = parseInt(document.getElementById('numDiasTrabalho').value) || 1;
  if (qtd < 1) qtd = 1;
  if (qtd > 30) qtd = 30;

  const container = document.getElementById('containerDiasHorarios');
  if (!container) return;
  const valoresAtuais = [];
  const cardsAtuais = container.querySelectorAll('.dia-card-flutuante');

  cardsAtuais.forEach((card, idx) => {
    const tipoRegisto = document.getElementById(`tipo_registo_${idx}`) ? document.getElementById(`tipo_registo_${idx}`).value : 'turnos';

    let iniM = card.querySelector('.dia-ini-manha') ? card.querySelector('.dia-ini-manha').value : '08:00';
    let fimM = card.querySelector('.dia-fim-manha') ? card.querySelector('.dia-fim-manha').value : '12:00';
    let iniT = card.querySelector('.dia-ini-tarde') ? card.querySelector('.dia-ini-tarde').value : '13:00';
    let fimT = card.querySelector('.dia-fim-tarde') ? card.querySelector('.dia-fim-tarde').value : '17:00';

    let iniDir = card.querySelector('.dia-hora-ini-direto') ? card.querySelector('.dia-hora-ini-direto').value : '08:00';
    let fimDir = card.querySelector('.dia-hora-fim-direto') ? card.querySelector('.dia-hora-fim-direto').value : '17:00';

    let dataIni = card.querySelector('.dia-data-ini') ? card.querySelector('.dia-data-ini').value : '';

    valoresAtuais.push({
      tipo: tipoRegisto,
      dataIni,
      iniM, fimM, iniT, fimT,
      iniDir, fimDir
    });
  });

  container.innerHTML = '';
  
  const agoraLocal = new Date();
  const ano = agoraLocal.getFullYear();
  const mes = String(agoraLocal.getMonth() + 1).padStart(2, '0');
  const dia = String(agoraLocal.getDate()).padStart(2, '0');
  let hojeStr = `${ano}-${mes}-${dia}`;

  const permiteIntervalo = window.configHorariosTenant ? window.configHorariosTenant.intervalo : true;
  const permiteDireto = window.configHorariosTenant ? window.configHorariosTenant.direto : true;

  for (let i = 0; i < qtd; i++) {
    const d = dadosSalvos[i] || valoresAtuais[i] || {};

    let temSubTurnos = d.inicioManha || d.fimManha || d.iniM || (d.inicio && d.fimManha);
    let tipoVal = d.tipo || (temSubTurnos ? 'turnos' : 'direto');

    if (!permiteIntervalo && permiteDireto) tipoVal = 'direto';
    if (permiteIntervalo && !permiteDireto) tipoVal = 'turnos';

    let dataIniVal = d.dataIni || (d.inicio ? d.inicio.split('T')[0] : hojeStr);

    let iniM_val = d.iniM || (d.inicioManha ? d.inicioManha.split('T')[1] : '08:00');
    let fimM_val = d.fimM || (d.fimManha ? d.fimManha.split('T')[1] : '12:00');
    let iniT_val = d.iniT || (d.inicioTarde ? d.inicioTarde.split('T')[1] : '13:00');
    let fimT_val = d.fimT || (d.fimTarde ? d.fimTarde.split('T')[1] : '17:00');

    let iniDir_val = d.iniDir || (d.inicio ? d.inicio.split('T')[1] : '08:00');
    let fimDir_val = d.fimDir || (d.fim ? d.fim.split('T')[1] : '17:00');

    let opcoesSelectHTML = '';
    if (permiteIntervalo) {
      opcoesSelectHTML += `<option value="turnos" ${tipoVal === 'turnos' ? 'selected' : ''}>Com Intervalo (Manhã/Tarde)</option>`;
    }
    if (permiteDireto) {
      opcoesSelectHTML += `<option value="direto" ${tipoVal === 'direto' ? 'selected' : ''}>Direto / Turno Único</option>`;
    }

    let displaySeletor = (permiteIntervalo && permiteDireto) ? 'flex' : 'none';

    container.innerHTML += `
      <div class="dia-card-flutuante">
        <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid #E2E8F0; padding-bottom: 6px; margin-bottom: 10px;">
          <p style="font-weight: bold; font-size: 0.9rem; color: #0B132B; margin: 0;">📅 Dia ${i + 1}</p>
          <div style="display: ${displaySeletor}; align-items: center; gap: 6px;">
            <label style="font-size: 0.75rem; font-weight: bold; color: #475569; margin: 0;">Formato:</label>
            <select id="tipo_registo_${i}" onchange="alternarTipoHorarioDia(${i})" style="padding: 3px 6px; font-size: 0.8rem; border: 1px solid #CBD5E1; border-radius: 4px; background: #FFF;">
              ${opcoesSelectHTML}
            </select>
          </div>
        </div>

        <div style="margin-bottom: 8px;">
          <label style="font-size: 0.8rem; font-weight: bold; color: #475569; display: block; margin-bottom: 2px;">Data do Atendimento:</label>
          <input type="date" class="dia-data-ini" value="${dataIniVal}" style="width:100%; padding:6px; border:1px solid #CBD5E1; border-radius:4px; background:#FFF;">
        </div>

        <div id="box_turnos_${i}" style="display: ${tipoVal === 'turnos' ? 'block' : 'none'};">
          <div style="margin-bottom: 8px;">
            <label style="font-size: 0.78rem; font-weight: bold; color: #0D9488; display: block; margin-bottom: 2px;">Início Manhã:</label>
            <select class="dia-ini-manha" style="width:100%; padding:6px; border:1px solid #CBD5E1; border-radius:4px; background:#FFF;">
              ${gerarOpcoesHoras(iniM_val)}
            </select>
          </div>

          <div style="margin-bottom: 8px;">
            <label style="font-size: 0.78rem; font-weight: bold; color: #0D9488; display: block; margin-bottom: 2px;">Final Manhã (Intervalo):</label>
            <select class="dia-fim-manha" style="width:100%; padding:6px; border:1px solid #CBD5E1; border-radius:4px; background:#FFF;">
              ${gerarOpcoesHoras(fimM_val)}
            </select>
          </div>

          <div style="margin-bottom: 8px;">
            <label style="font-size: 0.78rem; font-weight: bold; color: #1D4ED8; display: block; margin-bottom: 2px;">Início Tarde (Retorno):</label>
            <select class="dia-ini-tarde" style="width:100%; padding:6px; border:1px solid #CBD5E1; border-radius:4px; background:#FFF;">
              ${gerarOpcoesHoras(iniT_val)}
            </select>
          </div>

          <div>
            <label style="font-size: 0.78rem; font-weight: bold; color: #1D4ED8; display: block; margin-bottom: 2px;">Final Tarde (Encerramento):</label>
            <select class="dia-fim-tarde" style="width:100%; padding:6px; border:1px solid #CBD5E1; border-radius:4px; background:#FFF;">
              ${gerarOpcoesHoras(fimT_val)}
            </select>
          </div>
        </div>

        <div id="box_direto_${i}" style="display: ${tipoVal === 'direto' ? 'block' : 'none'};">
          <div style="margin-bottom: 8px;">
            <label style="font-size: 0.78rem; font-weight: bold; color: #475569; display: block; margin-bottom: 2px;">Início do Atendimento:</label>
            <select class="dia-hora-ini-direto" style="width:100%; padding:6px; border:1px solid #CBD5E1; border-radius:4px; background:#FFF;">
              ${gerarOpcoesHoras(iniDir_val)}
            </select>
          </div>

          <div>
            <label style="font-size: 0.78rem; font-weight: bold; color: #475569; display: block; margin-bottom: 2px;">Final do Atendimento:</label>
            <select class="dia-hora-fim-direto" style="width:100%; padding:6px; border:1px solid #CBD5E1; border-radius:4px; background:#FFF;">
              ${gerarOpcoesHoras(fimDir_val)}
            </select>
          </div>
        </div>

      </div>
    `;
  }
};

window.toggleEmpreitadaSelect = function() {
  const val = document.getElementById('selectEmpreitada').value;
  document.getElementById('boxEmpreitadaDetalhes').style.display = (val === 'sim') ? 'block' : 'none';
};

window.toggleHoraSelect = function() {
  const val = document.getElementById('selectHora').value;
  document.getElementById('boxHoraDetalhes').style.display = (val === 'sim') ? 'block' : 'none';
  if (val === 'sim' && document.getElementById('containerDiasHorarios').children.length === 0) {
    window.gerarCamposDias();
  }
};

window.toggleDeslocamentoSelect = function() {
  const val = document.getElementById('selectDeslocamento').value;
  document.getElementById('boxDeslocamentoDetalhes').style.display = (val === 'sim') ? 'block' : 'none';
  window.calcularTotalDeslocamento();
};

window.toggleHospedagemSelect = function() {
  const val = document.getElementById('selectHospedagem').value;
  document.getElementById('boxHospedagemDetalhes').style.display = (val === 'sim') ? 'block' : 'none';
};

window.toggleOutrasSelect = function() {
  const val = document.getElementById('selectOutras').value;
  document.getElementById('boxOutrasDetalhes').style.display = (val === 'sim') ? 'block' : 'none';
};

window.calcularTotalDeslocamento = function() {
  const valorHora = Number(document.getElementById('valorHoraDeslocamento').value) || 0;
  const horas = Number(document.getElementById('tempoDeslocamentoHoras').value) || 0;
  const total = valorHora * horas;
  document.getElementById('totalDeslocamentoCalculado').value = total.toFixed(2).replace('.', ',');
};

window.converterAnexo = function(event) {
  const file = event.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = function(e) {
    const img = new Image();
    img.onload = function() {
      const MAX_WIDTH = 800;
      const MAX_HEIGHT = 800;
      let width = img.width;
      let height = img.height;

      if (width > height) {
        if (width > MAX_WIDTH) {
          height = Math.round(height * (MAX_WIDTH / width));
          width = MAX_WIDTH;
        }
      } else {
        if (height > MAX_HEIGHT) {
          width = Math.round(width * (MAX_HEIGHT / height));
          height = MAX_HEIGHT;
        }
      }

      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');

      ctx.drawImage(img, 0, 0, width, height);
      tempAnexoBase64 = canvas.toDataURL('image/jpeg', 0.85);
    };
    img.src = e.target.result;
  };
  reader.readAsDataURL(file);
};

window.adicionarAnexo = function() {
  const titulo = document.getElementById('anexoTitulo').value;
  if (!tempAnexoBase64) { alert('Selecione uma imagem primeiro.'); return; }
  anexosList.push({ titulo: String(titulo || 'Foto do Equipamento'), imagem: String(tempAnexoBase64) });
  document.getElementById('anexoTitulo').value = '';
  document.getElementById('anexoFile').value = '';
  tempAnexoBase64 = '';
  renderizarAnexos();
};

window.removerAnexo = function(index) {
  anexosList.splice(index, 1);
  renderizarAnexos();
};

function renderizarAnexos() {
  const container = document.getElementById('listaAnexos');
  if (!container) return;
  container.innerHTML = '';
  anexosList.forEach((a, idx) => {
    container.innerHTML += `
      <div style="display: flex; justify-content: space-between; align-items: center; background: #F8FAFC; border: 1px solid #CBD5E1; padding: 6px 10px; border-radius: 4px;">
        <span><strong>${idx + 1}.</strong> ${escapeHTML(a.titulo)}</span>
        <button type="button" class="btn" style="background-color: #EF4444; padding: 2px 6px; font-size: 0.75rem;" onclick="removerAnexo(${idx})">Remover</button>
      </div>
    `;
  });
}

async function loadClients() {
  const select = document.getElementById('repClient');
  if (!select) return;
  try {
    const rawClients = await DataSync.load('rg_clients');
    const clients = normalizarLista(rawClients);
    select.innerHTML = '<option value="">Selecione um cliente...</option>';
    clients.forEach(c => { select.innerHTML += `<option value="${escapeHTML(c.name || c.nome)}">${escapeHTML(c.name || c.nome)}</option>`; });
  } catch (e) { console.error("Erro ao carregar clientes", e); }
}

async function carregarMaquinasDoCliente(clientName, selectedEquipment = '') {
  const eqSelect = document.getElementById('repEquipment');
  if (!eqSelect) return;
  eqSelect.innerHTML = '<option value="">Selecione a máquina...</option>';
  clientMachines = [];

  if (!clientName) return;
  try {
    const rawMachines = await DataSync.load('rg_machines');
    const machines = normalizarLista(rawMachines);
    clientMachines = machines.filter(m => m.client === clientName || m.cliente === clientName);

    clientMachines.forEach((m, idx) => {
      const eqName = m.name || m.equipment || m.nome || `Máquina ${idx+1}`;
      const isSelected = (eqName === selectedEquipment) ? 'selected' : '';
      eqSelect.innerHTML += `<option value="${escapeHTML(eqName)}" data-index="${idx}" ${isSelected}>${escapeHTML(eqName)}</option>`;
    });
  } catch (e) {
    console.error("Erro ao carregar máquinas do cliente", e);
  }
}

async function verificarPreenchimentoPlaneado() {
  const dadosPend = localStorage.getItem('rg_preencher_rs');
  if (dadosPend) {
    try {
      const dados = JSON.parse(dadosPend);
      const repClientSelect = document.getElementById('repClient');
      if (repClientSelect && dados.client) {
        repClientSelect.value = dados.client;
        await carregarMaquinasDoCliente(dados.client, dados.machine);
      }
      const repDescInput = document.getElementById('repDesc');
      if (repDescInput && dados.description) {
        repDescInput.value = dados.description;
      }
      localStorage.removeItem('rg_preencher_rs');
    } catch (e) {}
  }
}

const repClientEl = document.getElementById('repClient');
if (repClientEl) {
  repClientEl.addEventListener('change', async function() {
    const clientName = this.value;
    document.getElementById('repBrand').value = '';
    document.getElementById('repModel').value = '';
    document.getElementById('repSerialNumber').value = '';
    await carregarMaquinasDoCliente(clientName);
  });
}

const repEquipmentEl = document.getElementById('repEquipment');
if (repEquipmentEl) {
  repEquipmentEl.addEventListener('change', function() {
    const selectedOption = this.options[this.selectedIndex];
    const idx = selectedOption.getAttribute('data-index');
    if (idx !== null && clientMachines[idx]) {
      const m = clientMachines[idx];
      document.getElementById('repBrand').value = m.brand || m.marca || '';
      document.getElementById('repModel').value = m.model || m.modelo || '';
      document.getElementById('repSerialNumber').value = m.serialNumber || m.serial || m.tag || m.Tag || m.serie || m.matricula || '';
    } else {
      document.getElementById('repBrand').value = '';
      document.getElementById('repModel').value = '';
      document.getElementById('repSerialNumber').value = '';
    }
  });
}

async function verificarModoEdicao() {
  const repDateEl = document.getElementById('repDate');
  if (repDateEl && !repDateEl.value) {
    const agoraLocal = new Date();
    const ano = agoraLocal.getFullYear();
    const mes = String(agoraLocal.getMonth() + 1).padStart(2, '0');
    const dia = String(agoraLocal.getDate()).padStart(2, '0');
    repDateEl.value = `${ano}-${mes}-${dia}`;
  }
  
  const urlParams = new URLSearchParams(window.location.search);
  const editIndex = urlParams.get('edit');

  if (editIndex !== null) {
    try {
      let rawReports = await DataSync.load('rg_reports');
      let reports = normalizarLista(rawReports);
      const rep = reports[editIndex];
      if (rep) {
        document.getElementById('editIndex').value = editIndex;
        document.getElementById('formTitle').textContent = `Editar Relatório - ${rep.number || 'RS-1000'}`;
        document.getElementById('repNumber').value = rep.number || '';
        document.getElementById('repDate').value = rep.date || '';
        document.getElementById('repClient').value = rep.client || '';

        await carregarMaquinasDoCliente(rep.client, rep.equipment);

        document.getElementById('repBrand').value = rep.brand || '';
        document.getElementById('repModel').value = rep.model || '';
        document.getElementById('repSerialNumber').value = rep.serialNumber || '';
        document.getElementById('repServiceNature').value = rep.serviceNature || 'Corretiva';
        document.getElementById('repServiceArea').value = rep.serviceArea || 'Mecânica';
        document.getElementById('repDesc').value = rep.desc || '';

        if (rep.temEmpreitada === 'sim') {
          document.getElementById('selectEmpreitada').value = 'sim';
          toggleEmpreitadaSelect();
          document.getElementById('repValorEmpreitada').value = rep.valorEmpreitada || 0;
        } else {
          document.getElementById('selectEmpreitada').value = 'nao';
          toggleEmpreitadaSelect();
        }

        if (rep.temHora === 'sim') {
          document.getElementById('selectHora').value = 'sim';
          toggleHoraSelect();
          document.getElementById('repValorHora').value = rep.valorHora || 200.00;
          if (rep.diasTrabalho && Array.isArray(rep.diasTrabalho) && rep.diasTrabalho.length > 0) {
            document.getElementById('numDiasTrabalho').value = rep.diasTrabalho.length;
            gerarCamposDias(rep.diasTrabalho);
          }
        } else {
          document.getElementById('selectHora').value = 'nao';
          toggleHoraSelect();
        }

        if (rep.temDeslocamento === 'sim') {
          document.getElementById('selectDeslocamento').value = 'sim';
          toggleDeslocamentoSelect();
          document.getElementById('valorHoraDeslocamento').value = rep.valorHoraDeslocamento || 260.00;
          document.getElementById('tempoDeslocamentoHoras').value = rep.tempoDeslocamentoHoras || 0;
          calcularTotalDeslocamento();
        } else {
          document.getElementById('selectDeslocamento').value = 'nao';
          toggleDeslocamentoSelect();
        }

        if (rep.temHospedagem === 'sim') {
          document.getElementById('selectHospedagem').value = 'sim';
          toggleHospedagemSelect();
          document.getElementById('valorHospedagem').value = rep.valorHospedagem || 0;
        } else {
          document.getElementById('selectHospedagem').value = 'nao';
          toggleHospedagemSelect();
        }

        if (rep.temOutras === 'sim') {
          document.getElementById('selectOutras').value = 'sim';
          toggleOutrasSelect();
          document.getElementById('valorOutras').value = rep.valorOutras || 0;
        } else {
          document.getElementById('selectOutras').value = 'nao';
          toggleOutrasSelect();
        }

        if (rep.signature && clientCtx) {
          const img = new Image();
          img.onload = () => { 
            clientCtx.drawImage(img, 0, 0); 
            hasSignature = true; 
          };
          img.src = rep.signature;
        }
        if (rep.anexos && Array.isArray(rep.anexos)) {
          anexosList = rep.anexos;
          renderizarAnexos();
        }
      }
    } catch (e) {}
  } else {
    try {
      let rawReports = await DataSync.load('rg_reports');
      let reports = normalizarLista(rawReports);
      let config = await DataSync.load('rg_config') || {};
      let nextNum = 1000;

      let maxNum = 999;
      reports.forEach(r => {
        if (r && r.number) {
          const match = String(r.number).match(/\d+/);
          if (match) {
            const num = parseInt(match[0], 10);
            if (num > maxNum) maxNum = num;
          }
        }
      });

      if (config.nextRsNumber && Number(config.nextRsNumber) > maxNum) {
        nextNum = Number(config.nextRsNumber);
      } else {
        nextNum = maxNum + 1;
      }

      document.getElementById('repNumber').value = `RS-${nextNum}`;
    } catch (e) {
      document.getElementById('repNumber').value = 'RS-1000';
    }
  }
}

window.salvarRelatorioFinal = async function() {
  const editIndex = document.getElementById('editIndex').value;
  const clientSigData = clientCanvas ? clientCanvas.toDataURL() : '';
  const numRsStr = document.getElementById('repNumber').value;

  let diasTrabalhoArray = [];
  const cards = document.querySelectorAll('.dia-card-flutuante');

  cards.forEach((card, idx) => {
    let dIni = card.querySelector('.dia-data-ini') ? card.querySelector('.dia-data-ini').value : '';
    const selectTipo = document.getElementById(`tipo_registo_${idx}`);
    const tipo = selectTipo ? selectTipo.value : 'turnos';

    if (tipo === 'turnos') {
      let iniM = card.querySelector('.dia-ini-manha') ? card.querySelector('.dia-ini-manha').value : '08:00';
      let fimM = card.querySelector('.dia-fim-manha') ? card.querySelector('.dia-fim-manha').value : '12:00';
      let iniT = card.querySelector('.dia-ini-tarde') ? card.querySelector('.dia-ini-tarde').value : '13:00';
      let fimT = card.querySelector('.dia-fim-tarde') ? card.querySelector('.dia-fim-tarde').value : '17:00';

      diasTrabalhoArray.push({
        tipo: 'turnos',
        inicio: dIni ? `${dIni}T${iniM}` : '',
        fimManha: dIni ? `${dIni}T${fimM}` : '',
        inicioTarde: dIni ? `${dIni}T${iniT}` : '',
        fim: dIni ? `${dIni}T${fimT}` : ''
      });
    } else {
      let hIni = card.querySelector('.dia-hora-ini-direto') ? card.querySelector('.dia-hora-ini-direto').value : '08:00';
      let hFim = card.querySelector('.dia-hora-fim-direto') ? card.querySelector('.dia-hora-fim-direto').value : '17:00';

      diasTrabalhoArray.push({
        tipo: 'direto',
        inicio: dIni ? `${dIni}T${hIni}` : '',
        fim: dIni ? `${dIni}T${hFim}` : ''
      });
    }
  });

  let cleanAnexos = [];
  if (Array.isArray(anexosList)) {
    anexosList.forEach(a => {
      if (a && typeof a === 'object') {
        cleanAnexos.push({
          titulo: String(a.titulo || 'Foto'),
          imagem: String(a.imagem || '')
        });
      }
    });
  }

  const reportData = {
    number: String(numRsStr || ''),
    date: String(document.getElementById('repDate').value || ''),
    client: String(document.getElementById('repClient').value || ''),
    equipment: String(document.getElementById('repEquipment').value || ''),
    brand: String(document.getElementById('repBrand').value || ''),
    model: String(document.getElementById('repModel').value || ''),
    serialNumber: String(document.getElementById('repSerialNumber').value || ''),
    serviceNature: String(document.getElementById('repServiceNature').value || ''),
    serviceArea: String(document.getElementById('repServiceArea').value || ''),
    desc: String(document.getElementById('repDesc').value || ''),

    temEmpreitada: String(document.getElementById('selectEmpreitada').value || 'nao'),
    valorEmpreitada: String(document.getElementById('repValorEmpreitada').value || '0'),

    temHora: String(document.getElementById('selectHora').value || 'nao'),
    diasTrabalho: diasTrabalhoArray,
    valorHora: String(document.getElementById('repValorHora').value || '200'),

    temDeslocamento: String(document.getElementById('selectDeslocamento').value || 'nao'),
    valorHoraDeslocamento: String(document.getElementById('valorHoraDeslocamento').value || '260'),
    tempoDeslocamentoHoras: String(document.getElementById('tempoDeslocamentoHoras').value || '0'),

    temHospedagem: String(document.getElementById('selectHospedagem').value || 'nao'),
    valorHospedagem: String(document.getElementById('valorHospedagem').value || '0'),

    temOutras: String(document.getElementById('selectOutras').value || 'nao'),
    valorOutras: String(document.getElementById('repValorOutras') ? document.getElementById('repValorOutras').value : (document.getElementById('valorOutras')?.value || '0')),

    signature: String(clientSigData || ''),
    anexos: cleanAnexos
  };

  try {
    let rawReports = await DataSync.load('rg_reports');
    let reports = normalizarLista(rawReports); 

    if (editIndex !== '') {
      reports[editIndex] = reportData;
    } else {
      reports.push(reportData); 
      
      try {
        let config = await DataSync.load('rg_config') || {};
        let maxNum = 999;
        reports.forEach(r => {
          if (r && r.number) {
            const m = String(r.number).match(/\d+/);
            if (m) {
              const val = parseInt(m[0], 10);
              if (val > maxNum) maxNum = val;
            }
          }
        });
        config.nextRsNumber = String(maxNum + 1);
        await DataSync.save('rg_config', config);
      } catch (configErr) {
        console.warn('Erro ao guardar nº seguinte.', configErr);
      }
    }

    await DataSync.save('rg_reports', reports);
    
    alert('Relatório de serviço salvo e sincronizado com sucesso!');
    window.location.href = 'relatorios.html';

  } catch (err) {
    alert('Erro ao salvar relatório: ' + err.message);
  }
};

window.resetForm = function() {
  window.location.href = 'relatorios.html';
};

function escapeHTML(str) {
  if (!str) return '';
  return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#039;');
}
