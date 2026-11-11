/**
 * NexOS - Módulo Unificado de Relatórios e Orçamentos (relatorios.js)
 */

let listaRelatoriosRS = [];
let listaOrcamentos = [];
let activeReportData = {};
let activeBudgetData = {};

firebase.auth().onAuthStateChanged(async (user) => {
  if (!user) {
    window.location.href = 'login.html';
  } else {
    await carregarOpcoesClientes();
    await carregarApelidosContas();
    await renderizarTudo();

    DataSync.listen('rg_reports', () => renderizarTudo());
    DataSync.listen('rg_orcamentos', () => renderizarTudo());
    DataSync.listen('rg_clients', () => carregarOpcoesClientes());
    DataSync.listen('rg_config', () => carregarApelidosContas());
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
    return Object.values(dados).filter(item => item && typeof item === 'object');
  }
  return [];
}

async function carregarOpcoesClientes() {
  const selectFiltro = document.getElementById('selectClienteFiltro');
  try {
    const rawClients = await DataSync.load('rg_clients');
    const clients = normalizarLista(rawClients);
    if (!clients.length) return;

    if (selectFiltro) {
      const valFiltroAtual = selectFiltro.value;
      selectFiltro.innerHTML = '<option value="">Todos os Clientes</option>';
      clients.forEach(c => {
        const nome = c.name || c.nome || c.razacaosocial || '';
        if (nome) {
          selectFiltro.innerHTML += `<option value="${escapeHTML(nome)}">${escapeHTML(nome)}</option>`;
        }
      });
      selectFiltro.value = valFiltroAtual;
    }
  } catch (e) {}
}

async function carregarApelidosContas() {
  try {
    const tenantId = localStorage.getItem('rg_tenant_id') || DataSync.getUid();
    const configDoc = await db.collection('rg_config').doc(tenantId).get();
    const config = configDoc.exists ? configDoc.data() : {};
    
    const opt1 = document.getElementById('optionBank1Label');
    const opt2 = document.getElementById('optionBank2Label');
    if (opt1) opt1.textContent = config.nomeConta1 ? `Conta Bancária: ${config.nomeConta1}` : 'Conta Bancária 1';
    if (opt2) opt2.textContent = config.nomeConta2 ? `Conta Bancária: ${config.nomeConta2}` : 'Conta Bancária 2';
  } catch (e) {}
}

async function renderizarTudo() {
  const container = document.getElementById('unifiedCardsContainer');
  try {
    const loadWithTimeout = (key) => Promise.race([
      DataSync.load(key),
      new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), 6000))
    ]);

    let rawRS = [];
    let rawORC = [];

    try { rawRS = await loadWithTimeout('rg_reports'); } catch (e) { console.warn("Erro ao carregar rg_reports:", e); }
    try { rawORC = await loadWithTimeout('rg_orcamentos'); } catch (e) { console.warn("Erro ao carregar rg_orcamentos:", e); }

    listaRelatoriosRS = normalizarLista(rawRS);
    listaOrcamentos = normalizarLista(rawORC);
    filtrarDocumentos();
  } catch (err) {
    console.error("Erro ao carregar lista:", err);
    if (container) {
      container.innerHTML = `
        <div style="grid-column: 1 / -1; text-align: center; background: #FFF; padding: 35px 20px; border-radius: 8px; border: 1px dashed #EF4444;">
          <i class="fa-solid fa-triangle-exclamation" style="font-size: 2rem; color: #EF4444; margin-bottom: 10px;"></i>
          <p style="color: #64748B; margin-bottom: 10px;">Erro ao carregar os dados da nuvem. Verifique a sua conexão.</p>
          <button class="btn" onclick="renderizarTudo()" style="background: #1D4ED8; color: white; padding: 6px 12px; border: none; border-radius: 4px; cursor: pointer; font-weight: bold;">Tentar Novamente</button>
        </div>
      `;
    }
  }
}

function getValidDateTimestamp(dateStr) {
  if (!dateStr) return 0;
  let cleanStr = String(dateStr).trim();
  if (cleanStr.includes('/')) {
    const p = cleanStr.split('/');
    if (p.length === 3) cleanStr = `${p[2]}-${p[1]}-${p[0]}`; } const d = new Date(`${cleanStr}T00:00:00`);
  return isNaN(d.getTime()) ? 0 : d.getTime();
}

window.filtrarDocumentos = function() {
  const container = document.getElementById('unifiedCardsContainer');
  if (!container) return;

  const busca = (document.getElementById('inputPesquisa')?.value || '').toLowerCase().trim();
  const tipoFiltro = document.getElementById('selectTipoFiltro')?.value || 'todos';
  const clienteFiltro = document.getElementById('selectClienteFiltro')?.value || '';

  let unificados = [];

  if (tipoFiltro === 'todos' || tipoFiltro === 'rs') {
    listaRelatoriosRS.forEach((r, idx) => {
      if (!r || typeof r !== 'object') return;
      unificados.push({
        tipoDoc: 'RS',
        origemIndex: idx,
        numero: r.number || r.numero || `RS-${1000 + idx}`, data: r.date \vert{}\vert{} r.data \vert{}\vert{} '', cliente: r.client \vert{}\vert{} r.cliente \vert{}\vert{} '-', equipamento: r.equipment \vert{}\vert{} r.equipamento \vert{}\vert{} '-', detalheExtra: r.serviceNature \vert{}\vert{} r.naturezaServico \vert{}\vert{} 'Corretiva' }); }); }  const showOrcamentos = localStorage.getItem('rg_page_orcamentos') !== 'false'; const isSuperAdmin = (localStorage.getItem('rg_user_role') === 'super_admin');  if (isSuperAdmin \vert{}\vert{} showOrcamentos) { if (tipoFiltro === 'todos' \vert{}\vert{} tipoFiltro === 'orc') { listaOrcamentos.forEach((o, idx) => { if (!o \vert{}\vert{} typeof o !== 'object') return; unificados.push({ tipoDoc: 'ORC', origemIndex: idx, numero: o.number \vert{}\vert{} o.numero \vert{}\vert{} `ORC-${String(idx + 1).padStart(4, '0')}`,
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

window.editReport = (index) => { window.location.href = `novo-relatorio.html?edit=${index}`; }; window.editBudget = (index) => { window.location.href = `novo-orcamento.html?edit=${index}`; };

window.deleteReport = async (index) => {
  if (confirm('Deseja realmente excluir este relatório de serviço?')) {
    listaRelatoriosRS.splice(index, 1);
    await DataSync.save('rg_reports', listaRelatoriosRS);
    renderizarTudo();
  }
};
window.deleteBudget = async (index) => {
  if (confirm('Deseja realmente excluir este orçamento?')) {
    listaOrcamentos.splice(index, 1);
    await DataSync.save('rg_orcamentos', listaOrcamentos);
    renderizarTudo();
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
        detalhesDiasHtml += `<span style="display: block; margin-left: 6px;">• Dia ${idx + 1}: ${Math.floor(minDia / 60)}h${Math.round(minDia % 60)}m</span>`;
      }
    });
  }
  return { totalHoursText: `${Math.floor(minutosTotais / 60)}h${Math.round(minutosTotais % 60)}m`, valorHorasTotal: (minutosTotais / 60) * Number(valorHoraFixo), detalhesDiasHtml };
}

window.openReportPreview = async function(index) {
  const rep = listaRelatoriosRS[index];
  if (!rep) { alert("Relatório não encontrado."); return; }

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
      valorHorasTotal = calc.valorHorasTotal; textoHoras = `${calc.totalHoursText} (R$ ${valorHorasTotal.toFixed(2)})`; detalhesDiasHtml = calc.detalhesDiasHtml; } valorTotal = valorHorasTotal + (rep.temDeslocamento === 'sim' ? (Number(rep.valorHoraDeslocamento) \vert{}\vert{} 260) * (Number(rep.tempoDeslocamentoHoras) \vert{}\vert{} 0) : 0) + (rep.temHospedagem === 'sim' ? Number(rep.valorHospedagem) \vert{}\vert{} 0 : 0) + (rep.temOutras === 'sim' ? Number(rep.valorOutras) \vert{}\vert{} 0 : 0); }  const numDoc = rep.number \vert{}\vert{} rep.numero \vert{}\vert{} 'RS-1000'; let dataFormatada = rep.date \vert{}\vert{} rep.data \vert{}\vert{} '-'; if (typeof dataFormatada === 'string' && dataFormatada.includes('-')) { const p = dataFormatada.split('-'); if (p.length === 3) dataFormatada = `${p[2]}/${p[1]}/${p[0]}`; }
  activeReportData = { number: numDoc, client: clientName };

  const logoSrc = (config.logoBase64 && config.logoBase64.startsWith('data:image')) ? config.logoBase64 : 'marca.png';
  
  let anexosHtml = '';
  if (rep.anexos && rep.anexos.length > 0) {
    // ATUALIZAÇÃO AQUI: Grid lado a lado flexbox
    let itemsHtml = `<div style="display: flex; flex-wrap: wrap; width: 100%;">`;
    itemsHtml += rep.anexos.map((anexo, i) => `
      <div style="width: 48%; margin-right: ${i % 2 === 0 ? '4%' : '0'}; box-sizing: border-box; text-align: center; page-break-inside: avoid; margin-bottom: 15px; border: 1px solid #CBD5E1; padding: 10px; background: #FFF; border-radius: 4px;">
        <div style="text-align: left; font-weight: bold; margin-bottom: 5px; font-size: 11px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${escapeHTML(an
