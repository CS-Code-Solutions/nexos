/**
 * NexOS - Lógica de Criação e Edição de Relatório de Serviço (RS)
 */

// Função de higienização para evitar quebras na geração de PDF (jsPDF)
function higienizarTexto(str) {
  if (!str) return '';
  return String(str)
    .replace(/[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{1F900}-\u{1F9FF}\u{1FA70}-\u{1FAFF}]/gu, '')
    .replace(/[^\x09\x0A\x0D\x20-\x7E\xA0-\xFF]/g, '')
    .trim();
}

// Aplica regras de exibição de critérios de cobrança e horários conforme plano do cliente
function aplicarCriteriosRelatorio() {
  const userRole = localStorage.getItem('rg_user_role');
  const isSuperAdmin = (userRole === 'super_admin');

  const critEmpreitada = isSuperAdmin || localStorage.getItem('rg_crit_empreitada') !== 'false';
  const critHoraTrab = isSuperAdmin || localStorage.getItem('rg_crit_hora_trabalhada') !== 'false';
  const critDesloc = isSuperAdmin || localStorage.getItem('rg_crit_hora_deslocamento') !== 'false';
  const critHosp = isSuperAdmin || localStorage.getItem('rg_crit_hospedagem') !== 'false';
  const critOutras = isSuperAdmin || localStorage.getItem('rg_crit_outras_despesas') !== 'false';

  const horIntervalo = isSuperAdmin || localStorage.getItem('rg_crit_horario_intervalo') !== 'false';
  const horDireto = isSuperAdmin || localStorage.getItem('rg_crit_horario_direto') !== 'false';

  const cardIntervalo = document.getElementById('cardModoIntervalo');
  const cardDireto = document.getElementById('cardModoDireto');
  const boxModoHorario = document.getElementById('boxModoHorario');

  if (cardIntervalo) cardIntervalo.style.display = horIntervalo ? 'block' : 'none';
  if (cardDireto) cardDireto.style.display = horDireto ? 'block' : 'none';

  if (!horIntervalo && horDireto) {
    window.selecionarModoHorario('direto');
    if (boxModoHorario) boxModoHorario.style.display = 'none';
  } else if (horIntervalo && !horDireto) {
    window.selecionarModoHorario('intervalo');
    if (boxModoHorario) boxModoHorario.style.display = 'none';
  } else if (!horIntervalo && !horDireto) {
    if (boxModoHorario) boxModoHorario.style.display = 'none';
  }

  const boxEmp = document.getElementById('boxEmpreitada');
  const boxHT = document.getElementById('boxHoraTrabalhada');
  const boxHD = document.getElementById('boxHoraDeslocamento');
  const boxHosp = document.getElementById('boxHospedagem');
  const boxOut = document.getElementById('boxOutrasDespesas');

  if (boxEmp) boxEmp.style.display = critEmpreitada ? 'block' : 'none';
  if (boxHT) boxHT.style.display = critHoraTrab ? 'block' : 'none';
  if (boxHD) boxHD.style.display = critDesloc ? 'block' : 'none';
  if (boxHosp) boxHosp.style.display = critHosp ? 'block' : 'none';
  if (boxOut) boxOut.style.display = critOutras ? 'block' : 'none';

  const nenhumCriterio = !critEmpreitada && !critHoraTrab && !critDesloc && !critHosp && !critOutras;
  const secCrit = document.getElementById('sectionCriterios');
  if (secCrit && nenhumCriterio) {
    secCrit.style.display = 'none';
  }
}

window.selecionarModoHorario = function (modo) {
  document.getElementById('modoHorario').value = modo;

  const cardInt = document.getElementById('cardModoIntervalo');
  const cardDir = document.getElementById('cardModoDireto');
  const blocoInt = document.getElementById('blocoIntervalo');
  const blocoDir = document.getElementById('blocoDireto');

  if (modo === 'intervalo') {
    if (cardInt) {
      cardInt.style.borderColor = '#0284C7';
      cardInt.style.background = '#F0F9FF';
    }
    if (cardDir) {
      cardDir.style.borderColor = '#CBD5E1';
      cardDir.style.background = '#FFFFFF';
    }
    if (blocoInt) blocoInt.style.display = 'block';
    if (blocoDir) blocoDir.style.display = 'none';
  } else {
    if (cardDir) {
      cardDir.style.borderColor = '#0284C7';
      cardDir.style.background = '#F0F9FF';
    }
    if (cardInt) {
      cardInt.style.borderColor = '#CBD5E1';
      cardInt.style.background = '#FFFFFF';
    }
    if (blocoDir) blocoDir.style.display = 'block';
    if (blocoInt) blocoInt.style.display = 'none';
  }
};

window.toggleEmpreitada = function (isEmpreitada) {
  const boxHT = document.getElementById('boxHoraTrabalhada');
  const boxHD = document.getElementById('boxHoraDeslocamento');
  const boxHosp = document.getElementById('boxHospedagem');
  const boxOut = document.getElementById('boxOutrasDespesas');
  const boxValEmp = document.getElementById('boxValorEmpreitada');

  const userRole = localStorage.getItem('rg_user_role');
  const isSuperAdmin = (userRole === 'super_admin');

  if (boxValEmp) boxValEmp.style.display = isEmpreitada ? 'block' : 'none';

  if (isEmpreitada) {
    if (boxHT) boxHT.style.display = 'none';
    if (boxHD) boxHD.style.display = 'none';
    if (boxHosp) boxHosp.style.display = 'none';
    if (boxOut) boxOut.style.display = 'none';
    document.getElementById('chkHoraTrabalhada').checked = false;
    document.getElementById('chkHoraDeslocamento').checked = false;
    document.getElementById('chkHospedagem').checked = false;
    document.getElementById('chkOutrasDespesas').checked = false;
    window.toggleInputCriterio('inputHoraTrabalhada', false);
    window.toggleInputCriterio('inputHoraDeslocamento', false);
    window.toggleInputCriterio('inputHospedagem', false);
    window.toggleInputCriterio('inputOutrasDespesas', false);
  } else {
    const critHoraTrab = isSuperAdmin || localStorage.getItem('rg_crit_hora_trabalhada') !== 'false';
    const critDesloc = isSuperAdmin || localStorage.getItem('rg_crit_hora_deslocamento') !== 'false';
    const critHosp = isSuperAdmin || localStorage.getItem('rg_crit_hospedagem') !== 'false';
    const critOutras = isSuperAdmin || localStorage.getItem('rg_crit_outras_despesas') !== 'false';

    if (boxHT) boxHT.style.display = critHoraTrab ? 'block' : 'none';
    if (boxHD) boxHD.style.display = critDesloc ? 'block' : 'none';
    if (boxHosp) boxHosp.style.display = critHosp ? 'block' : 'none';
    if (boxOut) boxOut.style.display = critOutras ? 'block' : 'none';
  }
};

window.toggleInputCriterio = function (containerId, isChecked) {
  const el = document.getElementById(containerId);
  if (el) el.style.display = isChecked ? 'block' : 'none';
};

// Assinatura do cliente e fotos anexadas
let canvas, ctx;
let isDrawing = false;
let hasSignature = false;
let fotosAnexadas = [];

function initSignatureCanvas() {
  canvas = document.getElementById('signatureCanvas');
  if (!canvas) return;
  ctx = canvas.getContext('2d');
  ctx.lineWidth = 2.5;
  ctx.lineCap = 'round';
  ctx.strokeStyle = '#0F172A';

  function getPos(e) {
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    return {
      x: (clientX - rect.left) * scaleX,
      y: (clientY - rect.top) * scaleY
    };
  }

  function startDraw(e) {
    if (e.cancelable) e.preventDefault();
    isDrawing = true;
    hasSignature = true;
    const pos = getPos(e);
    ctx.beginPath();
    ctx.moveTo(pos.x, pos.y);
  }

  function moveDraw(e) {
    if (e.cancelable) e.preventDefault();
    if (!isDrawing) return;
    const pos = getPos(e);
    ctx.lineTo(pos.x, pos.y);
    ctx.stroke();
  }

  function endDraw() {
    isDrawing = false;
  }

  canvas.addEventListener('mousedown', startDraw);
  canvas.addEventListener('mousemove', moveDraw);
  canvas.addEventListener('mouseup', endDraw);
  canvas.addEventListener('mouseout', endDraw);

  canvas.addEventListener('touchstart', startDraw, { passive: false });
  canvas.addEventListener('touchmove', moveDraw, { passive: false });
  canvas.addEventListener('touchend', endDraw);
}

window.limparAssinatura = function () {
  if (!canvas || !ctx) return;
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  hasSignature = false;
};

// Carrega listas de clientes e máquinas do localStorage
function carregarListasClientesMaquinas() {
  const clients = JSON.parse(localStorage.getItem('rg_clients') || '[]');
  const machines = JSON.parse(localStorage.getItem('rg_machines') || '[]');

  const selClient = document.getElementById('repClient');
  const selMachine = document.getElementById('repMachine');

  if (selClient) {
    selClient.innerHTML = '<option value="">-- Selecione o Cliente --</option>';
    clients.forEach(c => {
      const opt = document.createElement('option');
      opt.value = c.nome || c.name || '';
      opt.textContent = c.nome || c.name || '';
      selClient.appendChild(opt);
    });
  }

  if (selMachine) {
    selMachine.innerHTML = '<option value="">-- Selecione a Máquina --</option>';
    machines.forEach(m => {
      const opt = document.createElement('option');
      const label = m.nome || m.name || '';
      const sub = [m.marca, m.modelo].filter(Boolean).join(' ');
      opt.value = sub ? `${label} (${sub})` : label;
      opt.textContent = opt.value;
      selMachine.appendChild(opt);
    });
  }
}

// Gera o próximo número de RS sequencial
function preencherNumeroRS() {
  const repNumber = document.getElementById('repNumber');
  if (!repNumber) return;

  const config = JSON.parse(localStorage.getItem('rg_config') || '{}');
  const reports = JSON.parse(localStorage.getItem('rg_reports') || '[]');

  let nextNum = parseInt(config.nextRs || '1000', 10);
  reports.forEach(r => {
    const match = String(r.number || '').match(/(\d+)/);
    if (match) {
      const n = parseInt(match[1], 10);
      if (n >= nextNum) nextNum = n + 1;
    }
  });

  repNumber.value = `RS-${nextNum}`;
}

// Processa upload e compressão leve de imagens anexadas
function setupPhotoUpload() {
  const input = document.getElementById('repPhotos');
  if (!input) return;

  input.addEventListener('change', (e) => {
    const files = Array.from(e.target.files || []);
    files.forEach(file => {
      const reader = new FileReader();
      reader.onload = function (ev) {
        const img = new Image();
        img.onload = function () {
          const maxDim = 900;
          let w = img.width;
          let h = img.height;
          if (w > maxDim || h > maxDim) {
            if (w > h) {
              h = Math.round((h * maxDim) / w);
              w = maxDim;
            } else {
              w = Math.round((w * maxDim) / h);
              h = maxDim;
            }
          }
          const c = document.createElement('canvas');
          c.width = w;
          c.height = h;
          c.getContext('2d').drawImage(img, 0, 0, w, h);
          const compressed = c.toDataURL('image/jpeg', 0.72);
          fotosAnexadas.push(compressed);
          renderPhotoPreview();
        };
        img.src = ev.target.result;
      };
      reader.readAsDataURL(file);
    });
    input.value = '';
  });
}

function renderPhotoPreview() {
  const grid = document.getElementById('photoPreviewGrid');
  if (!grid) return;
  grid.innerHTML = '';

  fotosAnexadas.forEach((src, idx) => {
    const wrap = document.createElement('div');
    wrap.style.cssText = 'position: relative; border-radius: 6px; overflow: hidden; border: 1px solid #CBD5E1; aspect-ratio: 1;';
    wrap.innerHTML = `
      <img src="${src}" style="width: 100%; height: 100%; object-fit: cover; display: block;">
      <button type="button" onclick="removerFoto(${idx})" style="position: absolute; top: 4px; right: 4px; background: rgba(239,68,68,0.9); color: white; border: none; border-radius: 50%; width: 22px; height: 22px; font-size: 0.75rem; cursor: pointer; font-weight: bold;">&times;</button>
    `;
    grid.appendChild(wrap);
  });
}

window.removerFoto = function (idx) {
  fotosAnexadas.splice(idx, 1);
  renderPhotoPreview();
};

// Carrega dados de um relatório existente quando ?edit=<index> está na URL
function carregarEdicaoSeExistir() {
  const params = new URLSearchParams(window.location.search);
  const editIdx = params.get('edit');
  const paramCliente = params.get('cliente');
  const paramMaquina = params.get('maquina');

  if (paramCliente) {
    const selC = document.getElementById('repClient');
    if (selC) selC.value = decodeURIComponent(paramCliente);
  }
  if (paramMaquina) {
    const selM = document.getElementById('repMachine');
    if (selM) selM.value = decodeURIComponent(paramMaquina);
  }

  if (editIdx === null || editIdx === '') return;

  const reports = JSON.parse(localStorage.getItem('rg_reports') || '[]');
  const rep = reports[parseInt(editIdx, 10)];
  if (!rep) return;

  document.getElementById('editIndex').value = editIdx;
  const pageTitle = document.getElementById('pageTitle');
  if (pageTitle) pageTitle.textContent = `Editar Relatório (${rep.number || ''})`;

  document.getElementById('repNumber').value = rep.number || '';
  document.getElementById('repDate').value = rep.date || '';
  document.getElementById('repStatus').value = rep.status || 'Concluído';
  document.getElementById('repTech').value = rep.tech || '';
  document.getElementById('repClient').value = rep.client || '';
  document.getElementById('repMachine').value = rep.machine || '';

  const modo = rep.modoHorario || 'intervalo';
  window.selecionarModoHorario(modo);

  if (modo === 'direto') {
    document.getElementById('repStartDirect').value = rep.startDirect || rep.startMorning || '';
    document.getElementById('repEndDirect').value = rep.endDirect || rep.endAfternoon || '';
  } else {
    document.getElementById('repStartMorning').value = rep.startMorning || '';
    document.getElementById('repEndMorning').value = rep.endMorning || '';
    document.getElementById('repStartAfternoon').value = rep.startAfternoon || '';
    document.getElementById('repEndAfternoon').value = rep.endAfternoon || '';
  }

  document.getElementById('repProblem').value = rep.problem || '';
  document.getElementById('repAction').value = rep.action || '';
  document.getElementById('repParts').value = rep.parts || '';
  document.getElementById('repObs').value = rep.obs || '';
  document.getElementById('repSignerName').value = rep.signerName || '';

  if (rep.isEmpreitada) {
    document.getElementById('chkEmpreitada').checked = true;
    window.toggleEmpreitada(true);
    document.getElementById('valorEmpreitada').value = rep.valorEmpreitada || '';
  } else {
    if (rep.hasHoraTrabalhada) {
      document.getElementById('chkHoraTrabalhada').checked = true;
      window.toggleInputCriterio('inputHoraTrabalhada', true);
      document.getElementById('valorHoraTrabalhada').value = rep.valorHoraTrabalhada || '';
    }
    if (rep.hasHoraDeslocamento) {
      document.getElementById('chkHoraDeslocamento').checked = true;
      window.toggleInputCriterio('inputHoraDeslocamento', true);
      document.getElementById('qtdHoraDeslocamento').value = rep.qtdHoraDeslocamento || '';
      document.getElementById('valorHoraDeslocamento').value = rep.valorHoraDeslocamento || '';
    }
    if (rep.hasHospedagem) {
      document.getElementById('chkHospedagem').checked = true;
      window.toggleInputCriterio('inputHospedagem', true);
      document.getElementById('valorHospedagem').value = rep.valorHospedagem || '';
    }
    if (rep.hasOutrasDespesas) {
      document.getElementById('chkOutrasDespesas').checked = true;
      window.toggleInputCriterio('inputOutrasDespesas', true);
      document.getElementById('descOutrasDespesas').value = rep.descOutrasDespesas || '';
      document.getElementById('valorOutras').value = rep.valorOutrasDespesas || '';
    }
  }

  if (Array.isArray(rep.photos)) {
    fotosAnexadas = [...rep.photos];
    renderPhotoPreview();
  }

  if (rep.signature && rep.signature.startsWith('data:image') && canvas && ctx) {
    const imgSig = new Image();
    imgSig.onload = function () {
      ctx.drawImage(imgSig, 0, 0, canvas.width, canvas.height);
      hasSignature = true;
    };
    imgSig.src = rep.signature;
  }
}

// Modais flutuantes de salvamento na nuvem
function mostrarModalSalvando() {
  const m = document.getElementById('modalSalvando');
  if (m) m.style.display = 'flex';
}

function esconderModalSalvando() {
  const m = document.getElementById('modalSalvando');
  if (m) m.style.display = 'none';
}

function mostrarModalSucesso() {
  esconderModalSalvando();
  const m = document.getElementById('modalSucesso');
  if (m) m.style.display = 'flex';
}

document.addEventListener('DOMContentLoaded', () => {
  initSignatureCanvas();
  aplicarCriteriosRelatorio();
  carregarListasClientesMaquinas();
  setupPhotoUpload();

  // Preenche data de hoje e técnico padrão das configurações
  const repDate = document.getElementById('repDate');
  if (repDate && !repDate.value) {
    repDate.value = new Date().toISOString().split('T')[0];
  }

  const config = JSON.parse(localStorage.getItem('rg_config') || '{}');
  const repTech = document.getElementById('repTech');
  if (repTech && !repTech.value && config.tech) {
    repTech.value = config.tech;
  }

  preencherNumeroRS();
  carregarEdicaoSeExistir();

  // Reatualiza listas quando firebase-sync terminar de baixar os dados da nuvem
  window.addEventListener('nexosDadosSincronizados', () => {
    const clientAtual = document.getElementById('repClient')?.value;
    const machineAtual = document.getElementById('repMachine')?.value;
    carregarListasClientesMaquinas();
    if (clientAtual) document.getElementById('repClient').value = clientAtual;
    if (machineAtual) document.getElementById('repMachine').value = machineAtual;

    const editVal = document.getElementById('editIndex')?.value;
    if (!editVal) {
      preencherNumeroRS();
    }
  });

  // Submissão do formulário de Relatório
  const form = document.getElementById('reportForm');
  if (form) {
    form.addEventListener('submit', async (e) => {
      e.preventDefault();

      const btnSubmit = document.getElementById('btnSubmitReport');
      if (btnSubmit) btnSubmit.disabled = true;
      mostrarModalSalvando();

      try {
        const editIdxStr = document.getElementById('editIndex').value;
        const reports = JSON.parse(localStorage.getItem('rg_reports') || '[]');
        const modoHorario = document.getElementById('modoHorario').value || 'intervalo';

        const isEmpreitada = document.getElementById('chkEmpreitada').checked;
        const hasHoraTrabalhada = document.getElementById('chkHoraTrabalhada').checked;
        const hasHoraDeslocamento = document.getElementById('chkHoraDeslocamento').checked;
        const hasHospedagem = document.getElementById('chkHospedagem').checked;
        const hasOutrasDespesas = document.getElementById('chkOutrasDespesas').checked;

        const signatureData = hasSignature && canvas ? canvas.toDataURL('image/png') : '';

        const novoRelatorio = {
          number: higienizarTexto(document.getElementById('repNumber').value),
          date: document.getElementById('repDate').value,
          status: document.getElementById('repStatus').value,
          tech: higienizarTexto(document.getElementById('repTech').value),
          client: higienizarTexto(document.getElementById('repClient').value),
          machine: higienizarTexto(document.getElementById('repMachine').value),
          modoHorario: modoHorario,
          startMorning: modoHorario === 'intervalo' ? document.getElementById('repStartMorning').value : document.getElementById('repStartDirect').value,
          endMorning: modoHorario === 'intervalo' ? document.getElementById('repEndMorning').value : '',
          startAfternoon: modoHorario === 'intervalo' ? document.getElementById('repStartAfternoon').value : '',
          endAfternoon: modoHorario === 'intervalo' ? document.getElementById('repEndAfternoon').value : document.getElementById('repEndDirect').value,
          startDirect: modoHorario === 'direto' ? document.getElementById('repStartDirect').value : '',
          endDirect: modoHorario === 'direto' ? document.getElementById('repEndDirect').value : '',
          problem: higienizarTexto(document.getElementById('repProblem').value),
          action: higienizarTexto(document.getElementById('repAction').value),
          parts: higienizarTexto(document.getElementById('repParts').value),
          obs: higienizarTexto(document.getElementById('repObs').value),
          signerName: higienizarTexto(document.getElementById('repSignerName').value),
          signature: signatureData,
          photos: fotosAnexadas,
          isEmpreitada: isEmpreitada,
          valorEmpreitada: isEmpreitada ? document.getElementById('valorEmpreitada').value : '',
          hasHoraTrabalhada: hasHoraTrabalhada,
          valorHoraTrabalhada: hasHoraTrabalhada ? document.getElementById('valorHoraTrabalhada').value : '',
          hasHoraDeslocamento: hasHoraDeslocamento,
          qtdHoraDeslocamento: hasHoraDeslocamento ? document.getElementById('qtdHoraDeslocamento').value : '',
          valorHoraDeslocamento: hasHoraDeslocamento ? document.getElementById('valorHoraDeslocamento').value : '',
          hasHospedagem: hasHospedagem,
          valorHospedagem: hasHospedagem ? document.getElementById('valorHospedagem').value : '',
          hasOutrasDespesas: hasOutrasDespesas,
          descOutrasDespesas: hasOutrasDespesas ? higienizarTexto(document.getElementById('descOutrasDespesas').value) : '',
          valorOutrasDespesas: hasOutrasDespesas ? document.getElementById('valorOutras').value : '',
          updatedAt: new Date().toISOString()
        };

        if (editIdxStr !== '') {
          const idx = parseInt(editIdxStr, 10);
          novoRelatorio.createdAt = reports[idx]?.createdAt || new Date().toISOString();
          reports[idx] = novoRelatorio;
        } else {
          novoRelatorio.createdAt = new Date().toISOString();
          reports.unshift(novoRelatorio);
        }

        localStorage.setItem('rg_reports', JSON.stringify(reports));

        if (typeof window.syncReportsToCloud === 'function') {
          await window.syncReportsToCloud(reports);
        } else if (typeof window.salvarDadosNuvem === 'function') {
          await window.salvarDadosNuvem();
        }

        mostrarModalSucesso();
      } catch (err) {
        esconderModalSalvando();
        if (btnSubmit) btnSubmit.disabled = false;
        alert('Erro ao guardar o relatório: ' + err.message);
      }
    });
  }
});
