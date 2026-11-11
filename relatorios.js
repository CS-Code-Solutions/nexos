/**
 * NexOS - Módulo Unificado de Relatórios e Orçamentos (relatorios.js)
 */

let listaRelatoriosRS = [];
let listaOrcamentos = [];
let activeReportData = {};
let activeBudgetData = {};

// Variáveis para controlar a exclusão segura
let indexParaExcluir = null;
let tipoDocumentoExcluir = null;

// TRAVA DE SEGURANÇA: Impede múltiplos carregamentos simultâneos
let isRendering = false;

firebase.auth().onAuthStateChanged((user) => {
  if (!user) {
    window.location.href = 'login.html';
  } else {
    setTimeout(() => carregarOpcoesClientes(), 0);
    setTimeout(() => carregarApelidosContas(), 0);
    setTimeout(() => renderizarTudo(), 0);

    try {
      if (typeof DataSync !== 'undefined') {
        DataSync.listen('rg_reports', () => setTimeout(() => renderizarTudo(), 500));
        DataSync.listen('rg_orcamentos', () => setTimeout(() => renderizarTudo(), 500));
        DataSync.listen('rg_clients', () => setTimeout(() => carregarOpcoesClientes(), 500));
      }
    } catch(e) {
      console.warn("Aviso ao ativar sincronização:", e);
    }
  }
});

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('sw.js').catch(err => console.log(err));
  });
}

function normalizarLista(dados) {
  if (!dados) return [];
  if (Array.isArray(dados)) return dados;
  if (Array.isArray(dados.items)) return dados.items;
  if (Array.isArray(dados.reports)) return dados.reports;
  if (Array.isArray(dados.orcamentos)) return dados.orcamentos;
  if (typeof dados === 'object') {
    const valores = Object.values(dados).filter(item => item && typeof item === 'object');
    if (valores.length > 0) return valores;
  }
  return [];
}

// FUNÇÃO BLINDADA: Se a nuvem demorar mais de 4 segundos, destrava a tela automaticamente
async function safeLoad(key) {
  try {
    if (typeof DataSync === 'undefined' || !DataSync.load) return [];
    const result = await Promise.race([
      DataSync.load(key),
      new Promise(resolve => setTimeout(() => resolve([]), 4000))
    ]);
    return normalizarLista(result);
  } catch(e) {
    return [];
  }
}

async function carregarOpcoesClientes() {
  const selectFiltro = document.getElementById('selectClienteFiltro');
  if (!selectFiltro) return; 
  
  try {
    const clients = await safeLoad('rg_clients');
    if (!clients.length) return;

    const valFiltroAtual = selectFiltro.value;
    selectFiltro.innerHTML = '<option value="">Todos os Clientes</option>';
    clients.forEach(c => {
      const nome = c.name || c.nome || c.razacaosocial || '';
      if (nome) selectFiltro.innerHTML += `<option value="${escapeHTML(nome)}">${escapeHTML(nome)}</option>`;
    });
    selectFiltro.value = valFiltroAtual;
  } catch (e) {
    console.warn("Aviso Clientes:", e);
  }
}

async function carregarApelidosContas() {
  try {
    const tenantId = localStorage.getItem('rg_tenant_id') || (typeof DataSync !== 'undefined' ? DataSync.getUid() : null);
    if (!tenantId || typeof db === 'undefined') return;
    
    const configDoc = await Promise.race([
      db.collection('rg_config').doc(tenantId).get(),
      new Promise(resolve => setTimeout(() => resolve({ exists: false }), 4000))
    ]).catch(() => ({ exists: false }));
    
    const config = configDoc.exists ? configDoc.data() : {};
    const opt1 = document.getElementById('optionBank1Label');
    const opt2 = document.getElementById('optionBank2Label');
    if (opt1) opt1.textContent = config.nomeConta1 ? `Conta Bancária: ${config.nomeConta1}` : 'Conta Bancária 1';
    if (opt2) opt2.textContent = config.nomeConta2 ? `Conta Bancária: ${config.nomeConta2}` : 'Conta Bancária 2';
  } catch (e) {
    console.warn("Aviso Contas:", e);
  }
}

async function renderizarTudo() {
  if (isRendering) return;
  isRendering = true;

  // Procura de forma segura por qualquer um dos nomes de contêineres do HTML
  const container = document.getElementById('unifiedCardsContainer') || document.getElementById('reportCardsContainer');
  if (!container) {
    isRendering = false;
    return;
  }

  if (listaRelatoriosRS.length === 0 && listaOrcamentos.length === 0) {
    container.innerHTML = `<p style="text-align: center; color: #64748B; grid-column: 1 / -1; padding: 20px;"><i class="fa-solid fa-circle-notch fa-spin"></i> A carregar histórico da nuvem...</p>`;
  }

  try {
    const [rawRS, rawORC] = await Promise.all([
      safeLoad('rg_reports'),
      safeLoad('rg_orcamentos')
    ]);

    listaRelatoriosRS = rawRS;
    listaOrcamentos = rawORC;

    if (typeof window.filtrarDocumentos === 'function') {
      window.filtrarDocumentos();
    }
  } catch (err) {
    console.error("Erro crítico:", err);
    container.innerHTML = `
      <div style="grid-column: 1 / -1; text-align: center; background: #FFF; padding: 35px 20px; border-radius: 8px; border: 1px dashed #EF4444;">
        <i class="fa-solid fa-triangle-exclamation" style="font-size: 2rem; color: #EF4444; margin-bottom: 10px;"></i>
        <p style="color: #64748B; margin-bottom: 10px;">Não foi possível ligar à base de dados neste momento.</p>
        <button class="btn" onclick="renderizarTudo()" style="background: #1D4ED8; color: white; padding: 6px 12px; border: none; border-radius: 4px; cursor: pointer;">Tentar Novamente</button>
      </div>
    `;
  } finally {
    isRendering = false;
  }
}

function getValidDateTimestamp(dateStr) {
  if (!dateStr) return 0;
  let cleanStr = String(dateStr).trim();
  if (cleanStr.includes('/')) {
    const p = cleanStr.split('/');
    if (p.length === 3) cleanStr = `${p[2]}-${p[1]}-${p[0]}`;
  }
  const d = new Date(`${cleanStr}T00:00:00`);
  return isNaN(d.getTime()) ? 0 : d.getTime();
}

window.filtrarDocumentos = function() {
  const container = document.getElementById('unifiedCardsContainer') || document.getElementById('reportCardsContainer');
  if (!container) return;

  const busca = (document.getElementById('inputPesquisa')?.value || document.getElementById('inputPesquisaRelatorios')?.value || '').toLowerCase().trim();
  const tipoFiltro = document.getElementById('selectTipoFiltro')?.value || 'todos';
  const clienteFiltro = document.getElementById('selectClienteFiltro')?.value || '';

  let unificados = [];

  if (tipoFiltro === 'todos' || tipoFiltro === 'rs') {
    listaRelatoriosRS.forEach((r, idx) => {
      if (!r || typeof r !== 'object') return;
      unificados.push({
        tipoDoc: 'RS',
        origemIndex: idx,
        numero: r.number || r.numero || `RS-${1000 + idx}`,
        data: r.date || r.data || '',
        cliente: r.client || r.cliente || '-',
        equipamento: r.equipment || r.equipamento || '-',
        detalheExtra: r.serviceNature || r.naturezaServico || 'Corretiva'
      });
    });
  }

  const showOrcamentos = localStorage.getItem('rg_page_orcamentos') !== 'false';
  const isSuperAdmin = (localStorage.getItem('rg_user_role') === 'super_admin');

  if (isSuperAdmin || showOrcamentos) {
    if (tipoFiltro === 'todos' || tipoFiltro === 'orc') {
      listaOrcamentos.forEach((o, idx) => {
        if (!o || typeof o !== 'object') return;
        unificados.push({
          tipoDoc: 'ORC',
          origemIndex: idx,
          numero: o.number || o.numero || `ORC-${String(idx + 1).padStart(4, '0')}`,
          data: o.date || o.data || '',
          cliente: o.client || o.cliente || '-',
          equipamento: o.equipment || o.equipamento || '-',
          detalheExtra: `R$ ${Number(o.total || o.valorTotal || 0).toFixed(2)}`
        });
      });
    }
  }

  unificados.sort((a, b) => {
    const diffTime = getValidDateTimestamp(b.data) - getValidDateTimestamp(a.data);
    if (diffTime !== 0) return diffTime;
    const numA = parseInt(String(a.numero).replace(/\D/g, '')) || 0;
    const numB = parseInt(String(b.numero).replace(/\D/g, '')) || 0;
    return numB - numA;
  });

  const filtrados = unificados.filter(item => {
    if (clienteFiltro && item.cliente !== clienteFiltro) return false;
    if (busca) {
      const numClean = String(item.numero).toLowerCase();
      const cliClean = String(item.cliente).toLowerCase();
      const eqClean = String(item.equipamento).toLowerCase();
      const detClean = String(item.detalheExtra).toLowerCase();
      return numClean.includes(busca) || cliClean.includes(busca) || eqClean.includes(busca) || detClean.includes(busca);
    }
    return true;
  });

  if (filtrados.length === 0) {
    container.innerHTML = `
      <div style="grid-column: 1 / -1; text-align: center; background: #FFF; padding: 35px 20px; border-radius: 8px; border: 1px dashed #CBD5E1;">
        <i class="fa-solid fa-folder-open" style="font-size: 2rem; color: #94A3B8; margin-bottom: 10px;"></i>
        <p style="color: #64748B; margin-bottom: 10px;">Nenhum relatório ou orçamento encontrado com os filtros aplicados.</p>
      </div>
    `;
    return;
  }

  let htmlCards = '';
  filtrados.forEach(item => {
    const isRS = item.tipoDoc === 'RS';
    const badgeCor = isRS ? '#2563EB' : '#10B981';
    const badgeTexto = isRS ? 'RELATÓRIO RS' : 'ORÇAMENTO';
    
    let dataForm = item.data || '-';
    if (typeof dataForm === 'string' && dataForm.includes('-')) {
      const p = dataForm.split('-');
      if (p.length === 3) dataForm = `${p[2]}/${p[1]}/${p[0]}`;
    }

    htmlCards += `
      <div style="background: #FFFFFF; border: 1px solid #E2E8F0; border-top: 4px solid ${badgeCor}; border-radius: 6px; padding: 12px; box-shadow: 0 2px 4px rgba(0,0,0,0.05); display: flex; flex-direction: column; justify-content: space-between; height: 100%; min-height: 165px;">
        <div>
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px; border-bottom: 1px solid #F1F5F9; padding-bottom: 6px;">
            <strong style="color: #0B132B; font-size: 1.05rem;">${escapeHTML(item.numero)}</strong>
            <span style="background: ${isRS ? '#DBEAFE' : '#D1FAE5'}; color: ${isRS ? '#1E40AF' : '#065F46'}; padding: 2px 8px; border-radius: 12px; font-size: 0.72rem; font-weight: bold;">
              ${badgeTexto}
            </span>
          </div>
          <div style="display: flex; align-items: center; gap: 8px; margin: 4px 0; font-size: 0.83rem; color: #475569;">
            <i class="fa-solid fa-calendar-day" style="color: #94A3B8; width: 14px; text-align: center;"></i><span>Data: ${escapeHTML(dataForm)}</span>
          </div>
          <div style="display: flex; align-items: center; gap: 8px; margin: 4px 0; font-size: 0.83rem; color: #475569;">
            <i class="fa-solid fa-building" style="color: #94A3B8; width: 14px; text-align: center;"></i><span style="white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${escapeHTML(item.cliente)}</span>
          </div>
          <div style="display: flex; align-items: center; gap: 8px; margin: 4px 0; font-size: 0.83rem; color: #475569;">
            <i class="fa-solid fa-gear" style="color: #94A3B8; width: 14px; text-align: center;"></i><span style="white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${escapeHTML(item.equipamento)}</span>
          </div>
          <div style="display: flex; align-items: center; gap: 8px; margin: 4px 0; font-size: 0.83rem; color: ${isRS ? '#475569' : '#0D9488'}; font-weight: ${isRS ? 'normal' : 'bold'};">
            <i class="fa-solid ${isRS ? 'fa-wrench' : 'fa-tag'}" style="color: #94A3B8; width: 14px; text-align: center;"></i><span>${escapeHTML(item.detalheExtra)}</span>
          </div>
        </div>
        <div class="no-print" style="display: flex; gap: 6px; margin-top: 12px; padding-top: 10px; border-top: 1px solid #F1F5F9;">
          <button class="btn" style="flex: 1.5; padding: 6px 0; font-size: 0.78rem; background-color: #1D4ED8; color: white; border: none; border-radius: 4px; font-weight: bold;" onclick="${isRS ? `openReportPreview(${item.origemIndex})` : `openBudgetPreview(${item.origemIndex})`}">Gerar PDF</button>
          <button class="btn" style="flex: 1; padding: 6px 0; font-size: 0.78rem; background-color: #F59E0B; color: white; border: none; border-radius: 4px; font-weight: bold;" onclick="${isRS ? `editReport(${item.origemIndex})` : `editBudget(${item.origemIndex})`}">Editar</button>
          <button class="btn" style="flex: 1; padding: 6px 0; font-size: 0.78rem; background-color: #EF4444; color: white; border: none; border-radius: 4px; font-weight: bold;" onclick="${isRS ? `deleteReport(${item.origemIndex})` : `deleteBudget(${item.origemIndex})`}">Excluir</button>
        </div>
      </div>
    `;
  });
  container.innerHTML = htmlCards;
};

window.editReport = (index) => { window.location.href = `novo-relatorio.html?edit=${index}`; };
window.editBudget = (index) => { window.location.href = `novo-orcamento.html?edit=${index}`; };

// Sistema de Exclusão Blindada e Segura com Confirmação Real
window.deleteReport = (index) => {
  const modalExclusao = document.getElementById('modalConfirmarExclusao') || document.getElementById('deleteModal');
  if (modalExclusao) {
    indexParaExcluir = index;
    tipoDocumentoExcluir = 'RS';
    modalExclusao.style.display = 'flex';
  } else {
    if (confirm('Deseja realmente excluir este relatório de serviço?')) {
      indexParaExcluir = index;
      tipoDocumentoExcluir = 'RS';
      executarExclusaoConfirmada();
    }
  }
};

window.deleteBudget = (index) => {
  const modalExclusao = document.getElementById('modalConfirmarExclusao') || document.getElementById('deleteModal');
  if (modalExclusao) {
    indexParaExcluir = index;
    tipoDocumentoExcluir = 'ORC';
    modalExclusao.style.display = 'flex';
  } else {
    if (confirm('Deseja realmente excluir este orçamento?')) {
      indexParaExcluir = index;
      tipoDocumentoExcluir = 'ORC';
      executarExclusaoConfirmada();
    }
  }
};

window.executarExclusaoConfirmada = async function() {
  if (indexParaExcluir === null || indexParaExcluir === undefined) return;

  if (tipoDocumentoExcluir === 'RS') {
    listaRelatoriosRS.splice(indexParaExcluir, 1);
    await DataSync.save('rg_reports', listaRelatoriosRS);
  } else if (tipoDocumentoExcluir === 'ORC') {
    listaOrcamentos.splice(indexParaExcluir, 1);
    await DataSync.save('rg_orcamentos', listaOrcamentos);
  }

  fecharModalExclusao();
  await renderizarTudo();
};

window.fecharModalExclusao = function() {
  indexParaExcluir = null;
  tipoDocumentoExcluir = null;
  
  const modalExclusao = document.getElementById('modalConfirmarExclusao') || document.getElementById('deleteModal');
  if (modalExclusao) {
    modalExclusao.style.display = 'none';
  }
};

function calcularMinutosDiasTrabalho(diasArray, valorHoraFixo = 200.00) {
  let minutosTotais = 0; let detalhesDiasHtml = '';
  if (Array.isArray(diasArray)) {
    diasArray.forEach((d, idx) => {
      let minDia = 0;
      if (d.tipo === 'turnos' || d.inicioManha || d.fimManha) {
        if (d.inicioManha && d.fimManha) { const df = new Date(d.fimManha) - new Date(d.inicioManha); if (df > 0) minDia += df / 60000; }
        if (d.inicioTarde && d.fim) { const df = new Date(d.fim) - new Date(d.inicioTarde); if (df > 0) minDia += df / 60000; }
      } else if (d.inicio && d.fim) {
        const df = new Date(d.fim) - new Date(d.inicio); if (df > 0) minDia += df / 60000;
      }
      if (minDia > 0) {
        minutosTotais += minDia;
        detalhesDiasHtml += `<span style="display: block; margin-left: 6px;">• Dia ${idx + 1}: ${Math.floor(minDia / 60)}h ${Math.round(minDia % 60)}m</span>`;
      }
    });
  }
  return { totalHoursText: `${Math.floor(minutosTotais / 60)}h ${Math.round(minutosTotais % 60)}m`, valorHorasTotal: (minutosTotais / 60) * Number(valorHoraFixo), detalhesDiasHtml };
}

function otimizarImagemParaPDF(src, maxDimensao = 1200, qualidade = 0.75) {
  return new Promise((resolve) => {
    if (!src) { resolve(null); return; }
    const img = new Image();
    if (!src.startsWith('data:') && !src.startsWith('blob:')) {
      img.crossOrigin = 'anonymous';
    }

    const timer = setTimeout(() => resolve(src), 2500);

    img.onload = () => {
      clearTimeout(timer);
      try {
        const larguraOriginal = img.naturalWidth || img.width;
        const alturaOriginal = img.naturalHeight || img.height;
        if (!larguraOriginal || !alturaOriginal) { resolve(src); return; }

        const escala = Math.min(1, maxDimensao / Math.max(larguraOriginal, alturaOriginal));
        const novaLargura = Math.round(larguraOriginal * escala);
        const novaAltura = Math.round(alturaOriginal * escala);

        const canvas = document.createElement('canvas');
        canvas.width = novaLargura;
        canvas.height = novaAltura;
        const ctx = canvas.getContext('2d');
        if (!ctx) { resolve(src); return; }

        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(0, 0, novaLargura, novaAltura);
        ctx.drawImage(img, 0, 0, novaLargura, novaAltura);
        resolve(canvas.toDataURL('image/jpeg', qualidade));
      } catch (e) {
        resolve(src);
      }
    };
    img.onerror = () => { clearTimeout(timer); resolve(src); };
    img.src = src;
  });
}

async function aguardarImagensPDF(elemento) {
  if (!elemento) return;
  const imagens = Array.from(elemento.querySelectorAll('img'));
  await Promise.all(
    imagens.map(async (img) => {
      if (img.complete && img.naturalWidth > 0) return;
      await new Promise((resolve) => {
        img.onload = resolve;
        img.onerror = resolve;
        setTimeout(resolve, 1500);
      });
    })
  );
}

async function gerarAnexosPdfHtml(anexos, logoSrc) {
  if (!Array.isArray(anexos) || anexos.length === 0) return '';

  let htmlPaginas = '';
  for (let i = 0; i < anexos.length; i += 4) {
    const grupo = anexos.slice(i, i + 4);
    const numeroPagina = Math.floor(i / 4) + 1;

    let cardsHtml = '';
    for (const anexo of grupo) {
      if (!anexo || !anexo.imagem) continue;
      const imgOtimizada = await otimizarImagemParaPDF(anexo.imagem);
      
      cardsHtml += `
        <div style="width: 48%; height: 310px; box-sizing: border-box; border: 1px solid #CBD5E1; border-radius: 6px; padding: 8px; background: #FFFFFF; display: flex; flex-direction: column; page-break-inside: avoid; break-inside: avoid; margin-bottom: 10px;">
          <div style="font-weight: bold; font-size: 11px; color: #0B132B; text-align: left; margin-bottom: 6px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">
            ${escapeHTML(anexo.titulo || 'Anexo')}
          </div>
          <div style="height: 265px; width: 100%; background: #F1F5F9; border-radius: 4px; display: flex; align-items: center; justify-content: center; overflow: hidden;">
            <img src="${escapeHTML(imgOtimizada)}" style="max-width: 100%; max-height: 265px; width: auto; height: auto; object-fit: contain; display: block;">
          </div>
        </div>
      `;
    }

    if (cardsHtml) {
      htmlPaginas += `
        <div style="page-break-before: always; break-before: page; width: 100%; box-sizing: border-box; background: #FFFFFF; padding: 15px 0; font-family: Arial, sans-serif; color: #0B132B;">
          <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #00F5D4; padding-bottom: 8px; margin-bottom: 12px;">
            <img src="${escapeHTML(logoSrc)}" style="height: 35px; width: auto; max-width: 130px; object-fit: contain;">
            <div style="text-align: right;">
              <h1 style="font-size: 12px; text-transform: uppercase; margin: 0; font-weight: bold;">Anexos / Fotos do Equipamento</h1>
              <p style="margin: 3px 0 0; font-size: 9px; color: #64748B;">Registro fotográfico - Página ${numeroPagina}</p>
            </div>
          </div>
          <div style="display: flex; flex-wrap: wrap; justify-content: space-between; align-items: flex-start; width: 100%;">
            ${cardsHtml}
          </div>
        </div>
      `;
    }
  }

  return htmlPaginas;
}

window.openReportPreview = function(index) {
  const rep = listaRelatoriosRS[index];
  if (!rep) { alert("Relatório não encontrado."); return; }

  const modal = document.getElementById('reportPreviewModal');
  const renderArea = document.getElementById('reportRenderArea');
  const titleEl = document.getElementById('modalTitleRs');
  const statusEl = document.getElementById('loadingStatusRs');

  if (titleEl) titleEl.textContent = `RS-${escapeHTML(rep.number || rep.numero || '1000')}`;
  if (statusEl) statusEl.textContent = 'A carregar...';
  if (modal) modal.style.display = 'flex';

  (async () => {
    const defaultConfig = { name: 'NexOS', tech: 'Técnico Responsável', doc: '00.000.000/0000-00', email: '-', contact: '-', location: '-', techSignature: '' };
    let config = { ...defaultConfig };
    try {
      const tenantId = localStorage.getItem('rg_tenant_id') || DataSync.getUid();
      const savedCfg = await db.collection('rg_config').doc(tenantId).get();
      if (savedCfg.exists) config = { ...defaultConfig, ...savedCfg.data() };
    } catch (e) {}

    const rawClients = await DataSync.load('rg_clients');
    const clients = normalizarLista(rawClients);
    const clientName = rep.client || rep.cliente;
    const clientObj = clients.find(c => (c.name || c.nome) === clientName) || {};

    let valorTotal = 0, textoHoras = "Não cobrado", valorHorasTotal = 0, detalhesDiasHtml = "";
    if (rep.temEmpreitada === 'sim') {
      valorTotal = Number(rep.valorEmpreitada) || 0;
      textoHoras = `Empreitada (R$ ${valorTotal.toFixed(2)})`;
    } else {
      if (rep.temHora === 'sim') {
        const calc = calcularMinutosDiasTrabalho(rep.diasTrabalho || (rep.startManha ? [{ inicio: rep.startManha, fim: rep.endManha || rep.endTarde }] : []), Number(rep.valorHora) || 200);
        valorHorasTotal = calc.valorHorasTotal; textoHoras = `${calc.totalHoursText} (R$ ${valorHorasTotal.toFixed(2)})`; detalhesDiasHtml = calc.detalhesDiasHtml;
      }
      valorTotal = valorHorasTotal + (rep.temDeslocamento === 'sim' ? (Number(rep.valorHoraDeslocamento) || 260) * (Number(rep.tempoDeslocamentoHoras) || 0) : 0) + (rep.temHospedagem === 'sim' ? Number(rep.valorHospedagem) || 0 : 0) + (rep.temOutras === 'sim' ? Number(rep.valorOutras) || 0 : 0);
    }

    const numDoc = rep.number || rep.numero || 'RS-1000';
    let dataFormatada = rep.date || rep.data || '-';
    if (typeof dataFormatada === 'string' && dataFormatada.includes('-')) { const p = dataFormatada.split('-'); if (p.length === 3) dataFormatada = `${p[2]}/${p[1]}/${p[0]}`; }
    activeReportData = { number: numDoc, client: clientName };

    const logoSrc = (config.logoBase64 && config.logoBase64.startsWith('data:image')) ? config.logoBase64 : 'marca.png';
    const anexosHtml = await gerarAnexosPdfHtml(rep.anexos || [], logoSrc);

    if (renderArea) {
      renderArea.innerHTML = `
        <div class="print-body" style="font-family: Arial, sans-serif; color: #0B132B; line-height: 1.35; font-size: 11px; width: 794px; min-width: 794px; background: #FFFFFF; padding: 25px 35px; box-sizing: border-box; margin: 0 auto; text-align: left;">
          <div style="position: relative; width: 100%; box-sizing: border-box;">
            <div style="position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%) rotate(-30deg); font-size: 75px; font-weight: bold; color: rgba(0, 245, 212, 0.04); z-index: 0; pointer-events: none; text-align: center; white-space: nowrap; width: 100%;">${escapeHTML(config.name)}</div>
            
            <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #00F5D4; padding-bottom: 8px; margin-bottom: 12px; position: relative; z-index: 1;">
              <img src="${logoSrc}" style="height: 40px; width: auto; max-width: 140px; object-fit: contain;">
              <div style="text-align: right;">
                <h1 style="font-size: 13px; margin: 0; font-weight: bold;">RELATÓRIO DE SERVIÇO (RS)</h1>
                <p style="margin: 2px 0; font-size: 11px;"><strong>Nº:</strong> RS-${escapeHTML(numDoc).replace(/^RS-?/i, '')} | <strong>Data:</strong> ${dataFormatada}</p>
              </div>
            </div>

            <div style="border: 1px solid #CBD5E1; padding: 10px; margin-bottom: 10px; border-radius: 6px; background: #F8FAFC; position: relative; z-index: 1; page-break-inside: avoid;">
              <div style="font-weight: bold; font-size: 11px; margin-bottom: 4px; border-bottom: 1px solid #E2E8F0; padding-bottom: 3px;">Dados da Empresa</div>
              <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 6px;">
                <p style="margin: 0;"><strong>Razão Social:</strong> ${escapeHTML(config.name)}</p>
                <p style="margin: 0;"><strong>CNPJ:</strong> ${escapeHTML(config.doc)}</p>
                <p style="margin: 0;"><strong>E-mail:</strong> ${escapeHTML(config.email)}</p>
                <p style="margin: 0;"><strong>Telefone:</strong> ${escapeHTML(config.contact)}</p>
                <p style="margin: 0; grid-column: span 2;"><strong>Endereço:</strong> ${escapeHTML(config.location)}</p>
              </div>
            </div>

            <div style="border: 1px solid #CBD5E1; padding: 10px; margin-bottom: 10px; border-radius: 6px; background: #F8FAFC; position: relative; z-index: 1; page-break-inside: avoid;">
              <div style="font-weight: bold; font-size: 11px; margin-bottom: 4px; border-bottom: 1px solid #E2E8F0; padding-bottom: 3px;">Dados do Cliente & Equipamento</div>
              <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 6px;">
                <p style="margin: 0;"><strong>Cliente:</strong> ${escapeHTML(clientName || '-')}</p>
                <p style="margin: 0;"><strong>Equipamento:</strong> ${escapeHTML(rep.equipment || '-')}</p>
                <p style="margin: 0;"><strong>CNPJ/CPF:</strong> ${escapeHTML(clientObj.doc || clientObj.cnpj || '-')}</p>
                <p style="margin: 0;"><strong>Endereço:</strong> ${escapeHTML(clientObj.address || clientObj.endereco || '-')}</p>
                <p style="margin: 0;"><strong>Marca:</strong> ${escapeHTML(rep.brand || '-')}</p>
                <p style="margin: 0;"><strong>Modelo:</strong> ${escapeHTML(rep.model || '-')}</p>
                <p style="margin: 0; grid-column: span 2;"><strong>Nº de Série:</strong> ${escapeHTML(rep.serialNumber || '-')}</p>
              </div>
            </div>

            <div style="border: 1px solid #CBD5E1; padding: 10px; margin-bottom: 10px; border-radius: 6px; background: #F8FAFC; position: relative; z-index: 1; page-break-inside: avoid;">
              <div style="font-weight: bold; font-size: 11px; margin-bottom: 4px; border-bottom: 1px solid #E2E8F0; padding-bottom: 3px;">Serviço Realizado</div>
              <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 6px; margin-bottom: 6px;">
                <p style="margin: 0;"><strong>Tipo:</strong> ${escapeHTML(rep.serviceNature || '-')}</p>
                <p style="margin: 0;"><strong>Área:</strong> ${escapeHTML(rep.serviceArea || '-')}</p>
              </div>
              <p style="white-space: pre-wrap; margin: 0; background: #FFF; padding: 6px; border: 1px solid #E2E8F0; border-radius: 4px;">${escapeHTML(rep.desc || '-')}</p>
            </div>

            <div style="border: 1px solid #CBD5E1; padding: 10px; margin-bottom: 10px; border-radius: 6px; background: #F8FAFC; position: relative; z-index: 1; page-break-inside: avoid;">
              <div style="font-weight: bold; font-size: 11px; margin-bottom: 4px; border-bottom: 1px solid #E2E8F0; padding-bottom: 3px;">Critérios de Cobrança</div>
              <div style="margin-bottom: 4px; font-size: 10px;">
                ${rep.temHora === 'sim' ? `<p style="margin: 2px 0;">• <strong>Horas:</strong> ${textoHoras}</p>${detalhesDiasHtml}` : ''}
                ${rep.temDeslocamento === 'sim' ? `<p style="margin: 2px 0;">• <strong>Deslocamento:</strong> ${rep.tempoDeslocamentoHoras || 0}h a R$ ${Number(rep.valorHoraDeslocamento || 0).toFixed(2)}/h</p>` : ''}
                ${rep.temHospedagem === 'sim' ? `<p style="margin: 2px 0;">• <strong>Hospedagem:</strong> R$ ${Number(rep.valorHospedagem || 0).toFixed(2)}</p>` : ''}
                ${rep.temOutras === 'sim' ? `<p style="margin: 2px 0;">• <strong>Outras Despesas:</strong> R$ ${Number(rep.valorOutras || 0).toFixed(2)}</p>` : ''}
                ${rep.temEmpreitada === 'sim' ? `<p style="margin: 2px 0;">• <strong>Empreitada:</strong> ${textoHoras}</p>` : ''}
              </div>
              <p style="font-size: 11px; font-weight: bold; color: #0D9488; border-top: 1px solid #CBD5E1; padding-top: 4px; margin: 0;">Valor Total Estimado: R$ ${valorTotal.toFixed(2)}</p>
            </div>

            <div style="margin-top: 20px; display: flex; justify-content: space-between; align-items: flex-end; page-break-inside: avoid; width: 100%; position: relative; z-index: 1;">
              <div style="text-align: center; width: 45%;">
                ${config.techSignature ? `<img src="${config.techSignature}" style="max-height: 45px; width: auto; max-width: 150px; display: block; margin: 0 auto;">` : '<div style="height: 45px;"></div>'}
                <p style="margin: 2px 0;">________________________________________</p>
                <p style="margin: 0; font-size: 10px;"><strong>Técnico:</strong> ${escapeHTML(config.tech || 'Técnico')}</p>
              </div>
              <div style="text-align: center; width: 45%;">
                ${rep.signature ? `<img src="${rep.signature}" style="max-height: 45px; width: auto; max-width: 150px; display: block; margin: 0 auto;">` : '<div style="height: 45px;"></div>'}
                <p style="margin: 2px 0;">________________________________________</p>
                <p style="margin: 0; font-size: 10px;"><strong>Assinatura do Cliente</strong></p>
              </div>
            </div>
          </div>
          ${anexosHtml}
        </div>
      `;
    }
    if (statusEl) statusEl.textContent = 'Pronto';
  })();
};

window.openBudgetPreview = async function(index) {
  const b = listaOrcamentos[index];
  if (!b) return;

  const defaultConfig = { name: 'NexOS', tech: 'Técnico Responsável', doc: '00.000.000/0000-00', email: '-', contact: '-', location: '-', nomeConta1: 'Conta 1', bank1: '', agency1: '', account1: '', nomeConta2: 'Conta 2', bank2: '', agency2: '', account2: '', techSignature: '' };
  let config = { ...defaultConfig };
  try {
    const tenantId = localStorage.getItem('rg_tenant_id') || DataSync.getUid();
    const configDoc = await db.collection('rg_config').doc(tenantId).get();
    if (configDoc.exists) config = { ...defaultConfig, ...configDoc.data() };
  } catch (e) {}

  const rawClients = await DataSync.load('rg_clients');
  const clients = normalizarLista(rawClients);
  const clientObj = clients.find(c => (c.name || c.nome) === (b.client || b.cliente)) || {};

  activeBudgetData = b;
  const logoSrc = (config.logoBase64 && config.logoBase64.startsWith('data:image')) ? config.logoBase64 : 'marca.png';
  const opt = b.paymentOption || 'banco1';
  
  let bancoInfoHtml = '';
  if (opt === 'banco1') bancoInfoHtml = `<p style="margin: 2px 0;"><strong>Recebimento:</strong> Transferência (${escapeHTML(config.nomeConta1)})</p><p style="margin: 2px 0;"><strong>Banco:</strong> ${escapeHTML(config.bank1)} | <strong>Agência:</strong> ${escapeHTML(config.agency1)} | <strong>Conta:</strong> ${escapeHTML(config.account1)}</p>`;
  else if (opt === 'banco2') bancoInfoHtml = `<p style="margin: 2px 0;"><strong>Recebimento:</strong> Transferência (${escapeHTML(config.nomeConta2)})</p><p style="margin: 2px 0;"><strong>Banco:</strong> ${escapeHTML(config.bank2)} | <strong>Agência:</strong> ${escapeHTML(config.agency2)} | <strong>Conta:</strong> ${escapeHTML(config.account2)}</p>`;
  else bancoInfoHtml = `<p style="margin: 2px 0;"><strong>Recebimento:</strong> Boleto Bancário</p>`;

  const termsList = (b.terms || '').split('\n').filter(t => t.trim() !== '').map(t => `<p style="margin: 2px 0;">• ${escapeHTML(t)}</p>`).join('');

  document.getElementById('budgetRenderArea').innerHTML = `
    <div class="print-body" style="font-family: Arial, sans-serif; color: #0B132B; line-height: 1.35; font-size: 11px; width: 794px; min-width: 794px; background: #FFFFFF; padding: 25px 35px; box-sizing: border-box; margin: 0 auto; text-align: left;">
      <div style="position: relative; width: 100%; box-sizing: border-box;">
        <div style="position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%) rotate(-30deg); font-size: 75px; font-weight: bold; color: rgba(0, 245, 212, 0.04); z-index: 0; pointer-events: none; text-align: center; white-space: nowrap; width: 100%;">${escapeHTML(config.name)}</div>
        
        <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #00F5D4; padding-bottom: 8px; margin-bottom: 12px; position: relative; z-index: 1;">
          <img src="${logoSrc}" style="height: 40px; width: auto; max-width: 140px; object-fit: contain;">
          <div style="text-align: right;">
            <h1 style="font-size: 13px; margin: 0; font-weight: bold;">ORÇAMENTO DE SERVIÇO</h1>
            <p style="margin: 2px 0; font-size: 11px;"><strong>Nº:</strong> ${escapeHTML(b.number || '-')} | <strong>Data:</strong> ${escapeHTML(b.date || '-')}</p>
          </div>
        </div>

        <div style="border: 1px solid #CBD5E1; padding: 10px; margin-bottom: 10px; border-radius: 6px; background: #F8FAFC; position: relative; z-index: 1; page-break-inside: avoid;">
          <div style="font-weight: bold; font-size: 11px; margin-bottom: 4px; border-bottom: 1px solid #E2E8F0; padding-bottom: 3px;">Dados da Empresa</div>
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 6px;">
            <p style="margin: 0;"><strong>Razão Social:</strong> ${escapeHTML(config.name)}</p>
            <p style="margin: 0;"><strong>CNPJ:</strong> ${escapeHTML(config.doc)}</p>
            <p style="margin: 0;"><strong>E-mail:</strong> ${escapeHTML(config.email)}</p>
            <p style="margin: 0;"><strong>Telefone:</strong> ${escapeHTML(config.contact)}</p>
            <p style="margin: 0; grid-column: span 2;"><strong>Endereço:</strong> ${escapeHTML(config.location)}</p>
          </div>
        </div>

        <div style="border: 1px solid #CBD5E1; padding: 10px; margin-bottom: 10px; border-radius: 6px; background: #F8FAFC; position: relative; z-index: 1; page-break-inside: avoid;">
          <div style="font-weight: bold; font-size: 11px; margin-bottom: 4px; border-bottom: 1px solid #E2E8F0; padding-bottom: 3px;">Dados do Cliente</div>
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 6px;">
            <p style="margin: 0;"><strong>Cliente:</strong> ${escapeHTML(b.client || '-')}</p>
            <p style="margin: 0;"><strong>Equipamento:</strong> ${escapeHTML(b.equipment || '-')}</p>
            <p style="margin: 0;"><strong>CNPJ/CPF:</strong> ${escapeHTML(clientObj.doc || clientObj.cnpj || '-')}</p>
            <p style="margin: 0;"><strong>Telefone:</strong> ${escapeHTML(clientObj.phone || '-')}</p>
            <p style="margin: 0; grid-column: span 2;"><strong>Endereço:</strong> ${escapeHTML(clientObj.address || '-')}</p>
          </div>
        </div>

        <div style="border: 1px solid #CBD5E1; padding: 10px; margin-bottom: 10px; border-radius: 6px; background: #F8FAFC; position: relative; z-index: 1; page-break-inside: avoid;">
          <div style="font-weight: bold; font-size: 11px; margin-bottom: 4px; border-bottom: 1px solid #E2E8F0; padding-bottom: 3px;">Escopo do Serviço</div>
          <p style="white-space: pre-wrap; margin: 0; background: #FFF; padding: 6px; border: 1px solid #E2E8F0; border-radius: 4px;">${escapeHTML(b.desc || '-')}</p>
        </div>

        <div style="border: 1px solid #CBD5E1; padding: 10px; margin-bottom: 10px; border-radius: 6px; background: #F8FAFC; position: relative; z-index: 1; page-break-inside: avoid;">
          <div style="font-weight: bold; font-size: 11px; margin-bottom: 4px; border-bottom: 1px solid #E2E8F0; padding-bottom: 3px;">Condições Comerciais</div>
          <div style="font-size: 10px;">
            ${termsList}
            <hr style="border: 0; border-top: 1px solid #CBD5E1; margin: 6px 0;">
            ${bancoInfoHtml}
          </div>
        </div>

        <div style="text-align: right; background: #F1F5F9; border: 1px solid #00F5D4; padding: 8px; border-radius: 6px; margin-bottom: 12px;">
          <p style="font-size: 13px; font-weight: bold; color: #0B132B; margin: 0;">VALOR TOTAL: R$ ${Number(b.total || 0).toFixed(2)}</p>
        </div>

        <div style="margin-top: 20px; display: flex; justify-content: center; align-items: flex-end; page-break-inside: avoid; width: 100%; position: relative; z-index: 1;">
          <div style="text-align: center; width: 60%;">
            ${config.techSignature ? `<img src="${config.techSignature}" style="max-height: 45px; width: auto; max-width: 150px; display: block; margin: 0 auto;">` : '<div style="height: 45px;"></div>'}
            <p style="margin: 2px 0;">________________________________________</p>
            <p style="margin: 0; font-size: 10px;"><strong>Técnico Responsável:</strong> ${escapeHTML(config.tech || 'Técnico')}</p>
          </div>
        </div>
      </div>
    </div>
  `;
  document.getElementById('modalTitleOrc').textContent = `Orçamento - ${b.number}`;
  document.getElementById('loadingStatusOrc').textContent = 'Pronto';
  document.getElementById('budgetPreviewModal').style.display = 'flex';
};

window.fecharModalRs = () => { document.getElementById('reportPreviewModal').style.display = 'none'; };
window.fecharModalOrc = () => { document.getElementById('budgetPreviewModal').style.display = 'none'; };

function getPdfOptions(filename) {
  return {
    margin: [10, 0, 10, 0],
    filename,
    image: { type: 'jpeg', quality: 0.95 },
    html2canvas: { 
      scale: 1.5, 
      useCORS: true, 
      letterRendering: true, 
      scrollY: 0,
      windowWidth: 794
    },
    jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
    pagebreak: { mode: ['css', 'legacy'] }
  };
}

async function executarComProgresso(statusEl, btn, callback) {
  const textoOriginal = btn ? btn.textContent : '';
  if (btn) {
    btn.disabled = true;
    btn.innerHTML = '<i class="fa-solid fa-circle-notch fa-spin"></i> Aguarde...';
  }
  document.body.style.cursor = 'wait';

  try {
    if (statusEl) statusEl.textContent = `⏳ 1/4 - Salvando informações...`;
    await new Promise(r => setTimeout(r, 300));

    if (statusEl) statusEl.textContent = `⏳ 2/4 - Otimizando imagens...`;
    await callback.etapaImagens();
    await new Promise(r => setTimeout(r, 300)); 

    if (statusEl) statusEl.textContent = `⏳ 3/4 - Montando documento PDF...`;
    await new Promise(r => setTimeout(r, 500)); 

    await callback.etapaPdf();

    if (statusEl) statusEl.textContent = `✅ 4/4 - Finalizando relatório...`;
    await new Promise(r => setTimeout(r, 300));

    if (statusEl) statusEl.textContent = 'Pronto';
  } catch (erro) {
    console.error('Erro no processo:', erro);
    if (statusEl) statusEl.textContent = 'Erro ao gerar documento';
  } finally {
    if (btn) {
      btn.disabled = false;
      btn.textContent = textoOriginal;
    }
    document.body.style.cursor = 'default';
  }
}

window.descarregarPDFRs = async () => {
  const status = document.getElementById('loadingStatusRs');
  const area = document.getElementById('reportRenderArea');
  const btn = event && event.target ? event.target : document.querySelector('button[onclick*="descarregarPDFRs"]');

  await executarComProgresso(status, btn, {
    etapaImagens: async () => { await aguardarImagensPDF(area); },
    etapaPdf: async () => {
      await html2pdf()
        .from(area)
        .set(getPdfOptions(`RS_${activeReportData.number}.pdf`))
        .save();
    }
  });
};

window.compartilharPDFRs = async () => {
  const status = document.getElementById('loadingStatusRs');
  const area = document.getElementById('reportRenderArea');
  const nomeArquivo = `RS_${activeReportData.number}.pdf`;
  const btn = event && event.target ? event.target : document.querySelector('button[onclick*="compartilharPDFRs"]');

  await executarComProgresso(status, btn, {
    etapaImagens: async () => { await aguardarImagensPDF(area); },
    etapaPdf: async () => {
      const blob = await html2pdf()
        .from(area)
        .set(getPdfOptions(nomeArquivo))
        .outputPdf('blob');
      const arquivo = new File([blob], nomeArquivo, { type: 'application/pdf' });
      if (navigator.canShare && navigator.canShare({ files: [arquivo] })) {
        await navigator.share({ files: [arquivo], title: `RS ${activeReportData.number}` });
      } else {
        await html2pdf().from(area).set(getPdfOptions(nomeArquivo)).save();
      }
    }
  });
};

window.descarregarPDFOrcamento = async () => {
  const status = document.getElementById('loadingStatusOrc');
  const area = document.getElementById('budgetRenderArea');
  const btn = event && event.target ? event.target : document.querySelector('button[onclick*="descarregarPDFOrcamento"]');

  await executarComProgresso(status, btn, {
    etapaImagens: async () => { await aguardarImagensPDF(area); },
    etapaPdf: async () => {
      await html2pdf()
        .from(area)
        .set(getPdfOptions(`Orcamento_${activeBudgetData.number}.pdf`))
        .save();
    }
  });
};

window.compartilharPDFOrcamento = async () => {
  const status = document.getElementById('loadingStatusOrc');
  const area = document.getElementById('budgetRenderArea');
  const nomeArquivo = `Orcamento_${activeBudgetData.number}.pdf`;
  const btn = event && event.target ? event.target : document.querySelector('button[onclick*="compartilharPDFOrcamento"]');

  await executarComProgresso(status, btn, {
    etapaImagens: async () => { await aguardarImagensPDF(area); },
    etapaPdf: async () => {
      const blob = await html2pdf()
        .from(area)
        .set(getPdfOptions(nomeArquivo))
        .outputPdf('blob');
      const arquivo = new File([blob], nomeArquivo, { type: 'application/pdf' });
      if (navigator.canShare && navigator.canShare({ files: [arquivo] })) {
        await navigator.share({ files: [arquivo], title: `Orçamento ${activeBudgetData.number}` });
      } else {
        await html2pdf().from(area).set(getPdfOptions(nomeArquivo)).save();
      }
    }
  });
};

function escapeHTML(str) {
  if (!str) return '';
  return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#039;');
}
