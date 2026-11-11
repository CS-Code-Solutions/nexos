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
  try {
    const rawRS = await DataSync.load('rg_reports');
    const rawORC = await DataSync.load('rg_orcamentos');

    listaRelatoriosRS = normalizarLista(rawRS);
    listaOrcamentos = normalizarLista(rawORC);
    filtrarDocumentos();
  } catch (err) {
    console.error("Erro ao carregar lista:", err);
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
        detalhesDiasHtml += `<span style="display: block; margin-left: 6px;">• Dia ${idx + 1}: ${Math.floor(minDia / 60)}h ${Math.round(minDia % 60)}m</span>`;
      }
    });
  }
  return { totalHoursText: `${Math.floor(minutosTotais / 60)}h ${Math.round(minutosTotais % 60)}m`, valorHorasTotal: (minutosTotais / 60) * Number(valorHoraFixo), detalhesDiasHtml };
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
      valorHorasTotal = calc.valorHorasTotal; textoHoras = `${calc.totalHoursText} (R$ ${valorHorasTotal.toFixed(2)})`; detalhesDiasHtml = calc.detalhesDiasHtml;
    }
    valorTotal = valorHorasTotal + (rep.temDeslocamento === 'sim' ? (Number(rep.valorHoraDeslocamento) || 260) * (Number(rep.tempoDeslocamentoHoras) || 0) : 0) + (rep.temHospedagem === 'sim' ? Number(rep.valorHospedagem) || 0 : 0) + (rep.temOutras === 'sim' ? Number(rep.valorOutras) || 0 : 0);
  }

  const numDoc = rep.number || rep.numero || 'RS-1000';
  let dataFormatada = rep.date || rep.data || '-';
  if (typeof dataFormatada === 'string' && dataFormatada.includes('-')) { const p = dataFormatada.split('-'); if (p.length === 3) dataFormatada = `${p[2]}/${p[1]}/${p[0]}`; }
  activeReportData = { number: numDoc, client: clientName };

  const logoSrc = (config.logoBase64 && config.logoBase64.startsWith('data:image')) ? config.logoBase64 : 'marca.png';
  let anexosHtml = '';
  if (rep.anexos && rep.anexos.length > 0) {
    let itemsHtml = rep.anexos.map(anexo => `
      <div style="text-align: center; page-break-inside: avoid; margin-top: 15px; border: 1px solid #CBD5E1; padding: 10px; background: #FFF;">
        <div style="text-align: left; font-weight: bold; margin-bottom: 5px;">${escapeHTML(anexo.titulo)}</div>
        <img src="${anexo.imagem}" style="max-width: 100%; max-height: 160px; width: auto; height: auto; object-fit: contain; display: block; margin: 0 auto;">
      </div>
    `).join('');
    anexosHtml = `
      <div style="page-break-before: always; height: 1px; margin-top: 15px;"></div>
      <div style="display: flex; justify-content: space-between; border-bottom: 2px solid #00F5D4; padding-bottom: 8px; align-items: center;">
        <img src="${logoSrc}" style="height: 35px; width: auto; max-width: 120px; object-fit: contain;">
        <h1 style="font-size: 12px; text-transform: uppercase; margin: 0;">Anexos / Fotos do Equipamento</h1>
      </div>
      ${itemsHtml}
    `;
  }

  document.getElementById('reportRenderArea').innerHTML = `
    <div style="font-family: Arial, sans-serif; color: #0B132B; line-height: 1.35; font-size: 11px; width: 700px; margin: 0 auto; box-sizing: border-box; background: #FFFFFF; padding: 10px;">
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
        ${anexosHtml}
      </div>
    </div>
  `;

  document.getElementById('modalTitleRs').textContent = `RS-${escapeHTML(numDoc).replace(/^RS-?/i, '')} (${clientName})`;
  document.getElementById('loadingStatusRs').textContent = 'Pronto';
  document.getElementById('reportPreviewModal').style.display = 'flex';
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
    <div style="font-family: Arial, sans-serif; color: #0B132B; line-height: 1.35; font-size: 11px; width: 700px; margin: 0 auto; box-sizing: border-box; background: #FFFFFF; padding: 10px;">
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
    margin: [5, 5, 5, 5],
    filename,
    image: { type: 'jpeg', quality: 0.95 },
    html2canvas: { 
      scale: 2, 
      useCORS: true, 
      letterRendering: true, 
      windowWidth: 720
    },
    jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
    pagebreak: { mode: ['css', 'legacy'] }
  };
}

window.descarregarPDFRs = () => {
  document.getElementById('loadingStatusRs').textContent = 'A descarregar...';
  html2pdf().from(document.getElementById('reportRenderArea')).set(getPdfOptions(`RS_${activeReportData.number}.pdf`)).save().then(() => document.getElementById('loadingStatusRs').textContent = 'Pronto');
};
window.compartilharPDFRs = async () => {
  document.getElementById('loadingStatusRs').textContent = 'A gerar PDF...';
  try {
    const blob = await html2pdf().from(document.getElementById('reportRenderArea')).set(getPdfOptions(`RS_${activeReportData.number}.pdf`)).outputPdf('blob');
    if (navigator.canShare) await navigator.share({ files: [new File([blob], `RS_${activeReportData.number}.pdf`, { type: 'application/pdf' })], title: `RS ${activeReportData.number}` });
    else html2pdf().from(document.getElementById('reportRenderArea')).set(getPdfOptions(`RS_${activeReportData.number}.pdf`)).save();
    document.getElementById('loadingStatusRs').textContent = 'Pronto';
  } catch (e) { html2pdf().from(document.getElementById('reportRenderArea')).set(getPdfOptions(`RS_${activeReportData.number}.pdf`)).save(); }
};

window.descarregarPDFOrcamento = () => {
  document.getElementById('loadingStatusOrc').textContent = 'A descarregar...';
  html2pdf().from(document.getElementById('budgetRenderArea')).set(getPdfOptions(`Orcamento_${activeBudgetData.number}.pdf`)).save().then(() => document.getElementById('loadingStatusOrc').textContent = 'Pronto');
};
window.compartilharPDFOrcamento = async () => {
  document.getElementById('loadingStatusOrc').textContent = 'A gerar PDF...';
  try {
    const blob = await html2pdf().from(document.getElementById('budgetRenderArea')).set(getPdfOptions(`Orcamento_${activeBudgetData.number}.pdf`)).outputPdf('blob');
    if (navigator.canShare) await navigator.share({ files: [new File([blob], `Orcamento_${activeBudgetData.number}.pdf`, { type: 'application/pdf' })], title: `Orçamento ${activeBudgetData.number}` });
    else html2pdf().from(document.getElementById('budgetRenderArea')).set(getPdfOptions(`Orcamento_${activeBudgetData.number}.pdf`)).save();
    document.getElementById('loadingStatusOrc').textContent = 'Pronto';
  } catch (e) { html2pdf().from(document.getElementById('budgetRenderArea')).set(getPdfOptions(`Orcamento_${activeBudgetData.number}.pdf`)).save(); }
};

function escapeHTML(str) {
  if (!str) return '';
  return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#039;');
}
