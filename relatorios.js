/**
 * NexOS - Módulo Unificado de Relatórios e Orçamentos (relatorios.js)
 */

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

let listaRelatoriosRS = [];
let listaOrcamentos = [];
let activeReportData = {};
let activeBudgetData = {};

/**
 * Normaliza os dados carregados do Firestore/DataSync garantindo que retornem sempre como Array,
 * mesmo se estiverem encapsulados em .items, .reports, .orcamentos ou chaves de objeto.
 */
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
    console.error("Erro ao carregar lista unificada:", err);
  }
}

/* --- FILTRAGEM E RENDERIZAÇÃO DOS CARTÕES UNIFICADOS --- */
window.filtrarDocumentos = function() {
  const container = document.getElementById('unifiedCardsContainer');
  if (!container) return;

  const busca = (document.getElementById('inputPesquisa')?.value || '').toLowerCase().trim();
  const tipoFiltro = document.getElementById('selectTipoFiltro')?.value || 'todos';
  const clienteFiltro = document.getElementById('selectClienteFiltro')?.value || '';

  let unificados = [];

  // Mapeia Relatórios RS
  if (tipoFiltro === 'todos' || tipoFiltro === 'rs') {
    listaRelatoriosRS.forEach((r, idx) => {
      if (!r || typeof r !== 'object') return;
      const numDoc = r.number || r.numero || `RS-${1000 + idx}`;
      const cliDoc = r.client || r.cliente || '-';
      const eqDoc = r.equipment || r.equipamento || '-';
      const dtDoc = r.date || r.data || '';
      const detDoc = r.serviceNature || r.naturezaServico || r.type || 'Corretiva';

      unificados.push({
        tipoDoc: 'RS',
        origemIndex: idx,
        numero: numDoc,
        data: dtDoc,
        cliente: cliDoc,
        equipamento: eqDoc,
        detalheExtra: detDoc,
        objetoOriginal: r
      });
    });
  }

  // Mapeia Orçamentos (Apenas se o módulo estiver ativo)
  const showOrcamentos = localStorage.getItem('rg_page_orcamentos') !== 'false';
  const userRole = localStorage.getItem('rg_user_role');
  const isSuperAdmin = (userRole === 'super_admin');

  if (isSuperAdmin || showOrcamentos) {
    if (tipoFiltro === 'todos' || tipoFiltro === 'orc') {
      listaOrcamentos.forEach((o, idx) => {
        if (!o || typeof o !== 'object') return;
        const numDoc = o.number || o.numero || `ORC-${String(idx + 1).padStart(4, '0')}`;
        const cliDoc = o.client || o.cliente || '-';
        const eqDoc = o.equipment || o.equipamento || '-';
        const dtDoc = o.date || o.data || '';
        const valorDoc = o.total || o.valorTotal || 0;

        unificados.push({
          tipoDoc: 'ORC',
          origemIndex: idx,
          numero: numDoc,
          data: dtDoc,
          cliente: cliDoc,
          equipamento: eqDoc,
          detalheExtra: `R$ ${Number(valorDoc).toFixed(2)}`,
          objetoOriginal: o
        });
      });
    }
  }

  // Ordena por data (mais recente primeiro)
  unificados.sort((a, b) => new Date(b.data || 0) - new Date(a.data || 0));

  // Aplicação dos Filtros
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
    const safeNum = escapeHTML(String(item.numero));

    let dataForm = item.data || '-';
    if (typeof dataForm === 'string' && dataForm.includes('-')) {
      const p = dataForm.split('-');
      if (p.length === 3) dataForm = `${p[2]}/${p[1]}/${p[0]}`;
    }

    const safeClient = escapeHTML(String(item.cliente));
    const safeEquipment = escapeHTML(String(item.equipamento));
    const safeDetalhe = escapeHTML(String(item.detalheExtra));

    htmlCards += `
      <div style="background: #FFFFFF; border: 1px solid #E2E8F0; border-top: 4px solid ${badgeCor}; border-radius: 6px; padding: 12px; box-shadow: 0 2px 4px rgba(0,0,0,0.05); display: flex; flex-direction: column; justify-content: space-between; height: 100%; min-height: 165px; overflow: hidden;">
        <div>
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px; border-bottom: 1px solid #F1F5F9; padding-bottom: 6px;">
            <strong style="color: #0B132B; font-size: 1.05rem;">${safeNum}</strong>
            <span style="background: ${isRS ? '#DBEAFE' : '#D1FAE5'}; color: ${isRS ? '#1E40AF' : '#065F46'}; padding: 2px 8px; border-radius: 12px; font-size: 0.72rem; font-weight: bold;">
              ${badgeTexto}
            </span>
          </div>

          <div style="display: flex; align-items: center; gap: 8px; margin: 4px 0; font-size: 0.83rem; color: #475569;">
            <i class="fa-solid fa-calendar-day" style="color: #94A3B8; width: 14px; text-align: center;"></i>
            <span>Data: ${escapeHTML(dataForm)}</span>
          </div>
          <div style="display: flex; align-items: center; gap: 8px; margin: 4px 0; font-size: 0.83rem; color: #475569;">
            <i class="fa-solid fa-building" style="color: #94A3B8; width: 14px; text-align: center;"></i>
            <span style="white-space: nowrap; overflow: hidden; text-overflow: ellipsis;" title="${safeClient}">${safeClient}</span>
          </div>
          <div style="display: flex; align-items: center; gap: 8px; margin: 4px 0; font-size: 0.83rem; color: #475569;">
            <i class="fa-solid fa-gear" style="color: #94A3B8; width: 14px; text-align: center;"></i>
            <span style="white-space: nowrap; overflow: hidden; text-overflow: ellipsis;" title="${safeEquipment}">${safeEquipment}</span>
          </div>
          <div style="display: flex; align-items: center; gap: 8px; margin: 4px 0; font-size: 0.83rem; color: ${isRS ? '#475569' : '#0D9488'}; font-weight: ${isRS ? 'normal' : 'bold'};">
            <i class="fa-solid ${isRS ? 'fa-wrench' : 'fa-tag'}" style="color: #94A3B8; width: 14px; text-align: center;"></i>
            <span>${safeDetalhe}</span>
          </div>
        </div>

        <div class="no-print" style="display: flex; gap: 6px; margin-top: 12px; padding-top: 10px; border-top: 1px solid #F1F5F9;">
          <button class="btn" style="flex: 1.5; padding: 6px 0; font-size: 0.78rem; background-color: #1D4ED8; color: white; border: none; border-radius: 4px; font-weight: bold;" onclick="${isRS ? `openReportPreview(${item.origemIndex})` : `openBudgetPreview(${item.origemIndex})`}">
            Gerar PDF
          </button>
          <button class="btn" style="flex: 1; padding: 6px 0; font-size: 0.78rem; background-color: #F59E0B; color: white; border: none; border-radius: 4px; font-weight: bold;" onclick="${isRS ? `editReport(${item.origemIndex})` : `editBudget(${item.origemIndex})`}">
            Editar
          </button>
          <button class="btn" style="flex: 1; padding: 6px 0; font-size: 0.78rem; background-color: #EF4444; color: white; border: none; border-radius: 4px; font-weight: bold;" onclick="${isRS ? `deleteReport(${item.origemIndex})` : `deleteBudget(${item.origemIndex})`}">
            Excluir
          </button>
        </div>
      </div>
    `;
  });

  container.innerHTML = htmlCards;
};

/* --- AÇÕES DE EDICÃO E EXCLUSÃO DE RS E ORÇAMENTO --- */
window.editReport = function(index) {
  window.location.href = `novo-relatorio.html?edit=${index}`;
};

window.editBudget = function(index) {
  window.location.href = `novo-orcamento.html?edit=${index}`;
};

window.deleteReport = async function(index) {
  if (confirm('Deseja realmente excluir este relatório de serviço?')) {
    try {
      let rawData = await DataSync.load('rg_reports');
      let reports = normalizarLista(rawData);
      reports.splice(index, 1);
      await DataSync.save('rg_reports', reports);
      await renderizarTudo();
    } catch (e) { alert('Erro ao excluir relatório.'); }
  }
};

window.deleteBudget = async function(index) {
  if (confirm('Deseja realmente excluir este orçamento?')) {
    try {
      let rawData = await DataSync.load('rg_orcamentos');
      let budgets = normalizarLista(rawData);
      budgets.splice(index, 1);
      await DataSync.save('rg_orcamentos', budgets);
      await renderizarTudo();
    } catch (e) { alert('Erro ao excluir orçamento.'); }
  }
};

/* --- CÁLCULOS E GERADOR DE PDF DO RS --- */
function calcularMinutosDiasTrabalho(diasArray, valorHoraFixo = 200.00) {
  let minutosTotais = 0;
  let detalhesDiasHtml = '';

  if (Array.isArray(diasArray)) {
    diasArray.forEach((d, idx) => {
      if (d.inicio && d.fim) {
        const diff = new Date(d.fim) - new Date(d.inicio);
        if (diff > 0) {
          const minDia = diff / (1000 * 60);
          minutosTotais += minDia;
          const hExata = Math.floor(minDia / 60);
          const mRest = Math.round(minDia % 60);
          detalhesDiasHtml += `<span style="display: block; margin-left: 6px; font-size: 9px;">• Dia ${idx + 1}: ${d.inicio.replace('T', ' ')} até ${d.fim.replace('T', ' ')} (${hExata}h ${mRest}m)</span>`;
        }
      }
    });
  }

  const horasDecimais = minutosTotais / 60;
  const valorHorasTotal = horasDecimais * Number(valorHoraFixo);
  const horasExatas = Math.floor(minutosTotais / 60);
  const minutosRestantes = Math.round(minutosTotais % 60);

  return {
    totalHoursText: `${horasExatas}h ${minutosRestantes}m`,
    valorHorasTotal: valorHorasTotal,
    detalhesDiasHtml: detalhesDiasHtml
  };
}

window.openReportPreview = async function(index) {
  try {
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
    let clients = normalizarLista(rawClients);
    const clientName = rep.client || rep.cliente;
    const clientObj = clients.find(c => (c.name || c.nome) === clientName) || {};

    let valorTotal = 0;
    let textoHoras = "Não cobrado";
    let valorHorasTotal = 0;
    let detalhesDiasHtml = "";

    if (rep.temEmpreitada === 'sim') {
      valorTotal = Number(rep.valorEmpreitada) || 0;
      textoHoras = `Empreitada (R$ ${valorTotal.toFixed(2)})`;
    } else {
      if (rep.temHora === 'sim') {
        const valorHora = Number(rep.valorHora) || 200.00;
        let diasArr = rep.diasTrabalho;
        if (!diasArr && rep.startManha) {
          diasArr = [{ inicio: rep.startManha, fim: rep.endManha || rep.endTarde }];
        }
        const calc = calcularMinutosDiasTrabalho(diasArr, valorHora);
        valorHorasTotal = calc.valorHorasTotal;
        textoHoras = `${calc.totalHoursText} (R$ ${valorHorasTotal.toFixed(2)})`;
        detalhesDiasHtml = calc.detalhesDiasHtml;
      }
      
      let valorDeslocamentoTotal = rep.temDeslocamento === 'sim' ? (Number(rep.valorHoraDeslocamento) || 260.00) * (Number(rep.tempoDeslocamentoHoras) || 0) : 0;
      let valorHospedagemTotal = rep.temHospedagem === 'sim' ? (Number(rep.valorHospedagem) || 0) : 0;
      let valorOutrasTotal = rep.temOutras === 'sim' ? (Number(rep.valorOutras) || 0) : 0;

      valorTotal = valorHorasTotal + valorDeslocamentoTotal + valorHospedagemTotal + valorOutrasTotal;
    }

    const numDoc = rep.number || rep.numero || 'RS-1000';
    activeReportData = { number: numDoc, client: clientName };

    let dataFormatada = rep.date || rep.data || '-';
    if (typeof dataFormatada === 'string' && dataFormatada.includes('-')) {
      const p = dataFormatada.split('-');
      if (p.length === 3) dataFormatada = `${p[2]}/${p[1]}/${p[0]}`;
    }

    const numeroLimpo = escapeHTML(String(numDoc)).replace(/^RS-?/i, '');
    const clientSignature = rep.signature || rep.assinatura || rep.clientSignature || '';
    const techSignature = config.techSignature || '';
    const nomeTecnico = config.tech || 'Técnico Responsável';

    const logoSrc = (config.logoBase64 && config.logoBase64.startsWith('data:image')) ? config.logoBase64 : 'marca.png';

    // MONTAGEM DOS ANEXOS NA SEGUNDA PÁGINA (PAGE-BREAK)
    let anexosHtml = '';
    if (rep.anexos && rep.anexos.length > 0) {
      let itemsHtml = '';
      rep.anexos.forEach(anexo => {
        itemsHtml += `
          <div class="section-box" style="text-align: center; page-break-inside: avoid; margin-top: 6px;">
            <div class="section-title" style="text-align: left;">${escapeHTML(anexo.titulo || 'Foto do Equipamento')}</div>
            <img src="${anexo.imagem}" alt="${escapeHTML(anexo.titulo || '')}" style="max-width: 100%; max-height: 240px; height: auto; border-radius: 4px; border: 1px solid #CBD5E1; display: block; margin: 4px auto 0 auto;">
          </div>
        `;
      });
      anexosHtml = `
        <div class="page-break" style="page-break-before: always; break-before: page; margin-top: 15px;"></div>
        <div class="print-header">
          <div style="display: flex; align-items: center; max-width: 140px; height: 35px;">
            <img src="${logoSrc}" alt="Logo" style="max-height: 32px; width: auto; max-width: 140px; display: block;">
          </div>
          <div style="text-align: center; flex-grow: 1;">
            <h1 style="font-size: 11px; color: #0B132B; margin: 0; font-weight: bold; text-transform: uppercase;">ANEXOS / FOTOGRAFIAS DO EQUIPAMENTO</h1>
          </div>
          <div class="print-header-info">
            <h1>Nº do RS: RS-${numeroLimpo}</h1>
            <p>Data: ${dataFormatada}</p>
          </div>
        </div>
        <div style="display: flex; flex-direction: column; gap: 6px; margin-top: 4px;">${itemsHtml}</div>
      `;
    }

    const fullReportHtml = `
      <div class="print-body" id="pdfContentToPrintRs">
        <div class="watermark">${escapeHTML(config.name)}</div>

        <div class="print-header">
          <div style="display: flex; align-items: center; max-width: 140px; height: 35px;">
            <img src="${logoSrc}" alt="Logo" style="max-height: 32px; width: auto; max-width: 140px; display: block;">
          </div>
          <div style="text-align: center; flex-grow: 1;">
            <h1 style="font-size: 11px; color: #0B132B; margin: 0; font-weight: bold; text-transform: uppercase;">RELATÓRIO DE SERVIÇO (RS)</h1>
          </div>
          <div class="print-header-info">
            <h1>Nº do RS: RS-${numeroLimpo}</h1>
            <p>Data: ${dataFormatada}</p>
          </div>
        </div>

        <div class="section-box">
          <div class="section-title">Dados da Empresa / Prestador de Serviço</div>
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 4px; font-size: 8.5px;">
            <p style="margin: 1px 0;"><strong>Razão Social:</strong> ${escapeHTML(config.name)}</p>
            <p style="margin: 1px 0;"><strong>CNPJ:</strong> ${escapeHTML(config.doc)}</p>
            <p style="margin: 1px 0;"><strong>E-mail:</strong> ${escapeHTML(config.email)}</p>
            <p style="margin: 1px 0;"><strong>Telefone / WhatsApp:</strong> ${escapeHTML(config.contact)}</p>
            <p style="grid-column: span 2; margin: 1px 0;"><strong>Endereço:</strong> ${escapeHTML(config.location)}</p>
          </div>
        </div>

        <div class="section-box">
          <div class="section-title">Dados do Cliente</div>
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 4px; font-size: 8.5px;">
            <p style="margin: 1px 0;"><strong>Nome / Razão Social:</strong> ${escapeHTML(clientName || '-')}</p>
            <p style="margin: 1px 0;"><strong>CPF / CNPJ:</strong> ${escapeHTML(clientObj.doc || clientObj.cnpj || '-')}</p>
            <p style="margin: 1px 0;"><strong>E-mail:</strong> ${escapeHTML(clientObj.email || '-')}</p>
            <p style="margin: 1px 0;"><strong>Endereço:</strong> ${escapeHTML(clientObj.address || clientObj.endereco || '-')}</p>
          </div>
        </div>

        <div class="section-box">
          <div class="section-title">Dados do Equipamento / Máquina</div>
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 4px; font-size: 8.5px;">
            <p style="margin: 1px 0;"><strong>Equipamento:</strong> ${escapeHTML(rep.equipment || rep.equipamento || '-')}</p>
            <p style="margin: 1px 0;"><strong>Marca:</strong> ${escapeHTML(rep.brand || rep.marca || '-')}</p>
            <p style="margin: 1px 0;"><strong>Modelo:</strong> ${escapeHTML(rep.model || rep.modelo || '-')}</p>
            <p style="margin: 1px 0;"><strong>Matrícula / N° de Série:</strong> ${escapeHTML(rep.serialNumber || rep.serie || '-')}</p>
          </div>
        </div>

        <div class="section-box">
          <div class="section-title">Registro do Serviço Realizado</div>
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 4px; font-size: 8.5px; margin-bottom: 2px;">
            <p style="margin: 1px 0;"><strong>Tipo de Manutenção:</strong> ${escapeHTML(rep.serviceNature || rep.naturezaServico || '-')}</p>
            <p style="margin: 1px 0;"><strong>Área de Serviço:</strong> ${escapeHTML(rep.serviceArea || rep.areaServico || '-')}</p>
          </div>
          <p style="margin: 2px 0 1px 0; font-size: 8.5px;"><strong>Descrição Detalhada:</strong></p>
          <p style="white-space: pre-wrap; margin-top: 1px; background: #FFF; padding: 3px; border: 1px solid #E2E8F0; border-radius: 4px; font-size: 8.5px;">${escapeHTML(rep.desc || rep.descricao || '-')}</p>
        </div>

        <div class="section-box">
          <div class="section-title">Critérios de Cobrança e Valor Total</div>
          <div style="font-size: 8.5px; margin-bottom: 2px;">
            ${rep.temHora === 'sim' ? `<p style="margin: 1px 0;">• <strong>Serviço / Horas:</strong> ${textoHoras}</p>${detalhesDiasHtml}` : ''}
            ${rep.temDeslocamento === 'sim' ? `<p style="margin: 1px 0;">• <strong>Hora de Deslocamento:</strong> ${rep.tempoDeslocamentoHoras || 0}h a R$ ${Number(rep.valorHoraDeslocamento || 0).toFixed(2)}/h</p>` : ''}
            ${rep.temHospedagem === 'sim' ? `<p style="margin: 1px 0;">• <strong>Hospedagem:</strong> R$ ${Number(rep.valorHospedagem || 0).toFixed(2)}</p>` : ''}
            ${rep.temOutras === 'sim' ? `<p style="margin: 1px 0;">• <strong>Outras Despesas:</strong> R$ ${Number(rep.valorOutras || 0).toFixed(2)}</p>` : ''}
            ${rep.temEmpreitada === 'sim' ? `<p style="margin: 1px 0;">• <strong>Regime de Empreitada:</strong> ${textoHoras}</p>` : ''}
          </div>
          <p style="font-size: 9.5px; font-weight: bold; color: #0D9488; border-top: 1px solid #CBD5E1; padding-top: 2px; margin-top: 2px;">Valor Total Estimado: R$ ${valorTotal.toFixed(2)}</p>
        </div>

        <!-- ESTRUTURA DAS ASSINATURAS LADO A LADO -->
        <div class="signature-area" style="display: flex; justify-content: space-between; align-items: flex-end; margin-top: 10px; page-break-inside: avoid; gap: 15px;">
          <div class="signature-box" style="flex: 1; text-align: center;">
            ${techSignature ? `<img src="${techSignature}" alt="Assinatura Técnico" style="max-height: 35px; width: auto; max-width: 140px; display: block; margin: 0 auto 2px auto;">` : '<div style="height: 35px;"></div>'}
            <p style="margin: 0; font-size: 8.5px;">________________________________________</p>
            <p style="margin: 2px 0 0 0; font-size: 8.5px;"><strong>Assinatura Técnico:</strong> ${escapeHTML(nomeTecnico)}</p>
          </div>
          <div class="signature-box" style="flex: 1; text-align: center;">
            ${clientSignature ? `<img src="${clientSignature}" alt="Assinatura Cliente" style="max-height: 35px; width: auto; max-width: 140px; display: block; margin: 0 auto 2px auto;">` : '<div style="height: 35px;"></div>'}
            <p style="margin: 0; font-size: 8.5px;">________________________________________</p>
            <p style="margin: 2px 0 0 0; font-size: 8.5px;"><strong>Assinatura do Cliente</strong></p>
          </div>
        </div>

        ${anexosHtml}
      </div>
    `;

    document.getElementById('reportRenderArea').innerHTML = fullReportHtml;
    document.getElementById('modalTitleRs').textContent = `RS-${numeroLimpo} (${clientName})`;
    document.getElementById('loadingStatusRs').textContent = 'Pronto';
    document.getElementById('reportPreviewModal').style.display = 'flex';
  } catch (err) {
    console.error(err);
    alert("Erro ao abrir pré-visualização do relatório.");
  }
};

window.fecharModalRs = function() { document.getElementById('reportPreviewModal').style.display = 'none'; };

window.compartilharPDFRs = async function() {
  const element = document.getElementById('reportRenderArea');
  const filename = `Relatorio_RS_${activeReportData.number || 'RS-1000'}.pdf`;
  const opt = { 
    margin: [6, 6, 6, 6], 
    filename: filename, 
    image: { type: 'jpeg', quality: 0.98 }, 
    html2canvas: { scale: 2, useCORS: true }, 
    jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
    pagebreak: { mode: ['css', 'legacy'] }
  };

  document.getElementById('loadingStatusRs').textContent = 'A gerar PDF...';
  try {
    const pdfBlob = await html2pdf().from(element).set(opt).outputPdf('blob');
    const file = new File([pdfBlob], filename, { type: 'application/pdf' });

    if (navigator.canShare && navigator.canShare({ files: [file] })) {
      await navigator.share({ files: [file], title: `Relatório ${activeReportData.number}`, text: `Segue relatório do cliente ${activeReportData.client}.` });
      document.getElementById('loadingStatusRs').textContent = 'Partilhado!';
    } else {
      html2pdf().from(element).set(opt).save();
      document.getElementById('loadingStatusRs').textContent = 'Descarregado!';
    }
  } catch (err) {
    html2pdf().from(element).set(opt).save();
  }
};

window.descarregarPDFRs = function() {
  const element = document.getElementById('reportRenderArea');
  const filename = `Relatorio_RS_${activeReportData.number || 'RS-1000'}.pdf`;
  const opt = { 
    margin: [6, 6, 6, 6], 
    filename: filename, 
    image: { type: 'jpeg', quality: 0.98 }, 
    html2canvas: { scale: 2, useCORS: true }, 
    jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
    pagebreak: { mode: ['css', 'legacy'] }
  };
  
  document.getElementById('loadingStatusRs').textContent = 'A descarregar...';
  html2pdf().from(element).set(opt).save().then(() => {
    document.getElementById('loadingStatusRs').textContent = 'Descarregado!';
  });
};

/* --- CÁLCULOS E GERADOR DE PDF DO ORÇAMENTO --- */
window.openBudgetPreview = async function(index) {
  const b = listaOrcamentos[index];
  if (!b) { alert("Orçamento não encontrado."); return; }

  const defaultConfig = { 
    name: 'NexOS', tech: 'Técnico Responsável', doc: '00.000.000/0000-00', email: '-', contact: '-', location: '-',
    nomeConta1: 'Conta Principal', bank1: '', agency1: '', account1: '',
    nomeConta2: 'Conta Secundária', bank2: '', agency2: '', account2: '', techSignature: ''
  };

  let config = { ...defaultConfig };
  try {
    const tenantId = localStorage.getItem('rg_tenant_id') || DataSync.getUid();
    const configDoc = await db.collection('rg_config').doc(tenantId).get();
    if (configDoc.exists) config = { ...defaultConfig, ...configDoc.data() };
  } catch (e) {}

  const rawClients = await DataSync.load('rg_clients');
  let clients = normalizarLista(rawClients);
  const clientName = b.client || b.cliente;
  const clientObj = clients.find(c => (c.name || c.nome) === clientName) || {};

  activeBudgetData = b;
  const numDoc = b.number || b.numero || 'ORC-0001';
  document.getElementById('modalTitleOrc').textContent = `Orçamento - ${numDoc}`;
  document.getElementById('loadingStatusOrc').textContent = 'Pronto';

  let bancoInfoHtml = '';
  const opt = b.paymentOption || b.opcaoPagamento || 'banco1';
  let nomeConta1 = config.nomeConta1 || 'Conta Bancária 1';
  let nomeConta2 = config.nomeConta2 || 'Conta Bancária 2';

  if (opt === 'banco1') {
    bancoInfoHtml = `<p style="margin: 1px 0;"><strong>Forma de Recebimento:</strong> Transferência Bancária (${escapeHTML(nomeConta1)})</p><p style="margin: 1px 0;"><strong>Banco:</strong> ${escapeHTML(config.bank1 || '-')} | <strong>Agência:</strong> ${escapeHTML(config.agency1 || '-')} | <strong>Conta:</strong> ${escapeHTML(config.account1 || '-')}</p>`;
  } else if (opt === 'banco2') {
    bancoInfoHtml = `<p style="margin: 1px 0;"><strong>Forma de Recebimento:</strong> Transferência Bancária (${escapeHTML(nomeConta2)})</p><p style="margin: 1px 0;"><strong>Banco:</strong> ${escapeHTML(config.bank2 || '-')} | <strong>Agência:</strong> ${escapeHTML(config.agency2 || '-')} | <strong>Conta:</strong> ${escapeHTML(config.account2 || '-')}</p>`;
  } else {
    bancoInfoHtml = `<p style="margin: 1px 0;"><strong>Forma de Recebimento:</strong> Boleto Bancário</p><p style="margin: 1px 0;"><em>Instruções: O boleto será emitido e enviado conforme prazo comercial acordado.</em></p>`;
  }

  const termsList = (b.terms || b.termos || '').split('\n').filter(t => t.trim() !== '').map(t => `<p style="margin: 1px 0;">• ${escapeHTML(t)}</p>`).join('');
  const techSignature = config.techSignature || '';
  const logoSrc = (config.logoBase64 && config.logoBase64.startsWith('data:image')) ? config.logoBase64 : 'marca.png';
  const valorTotalOrc = b.total || b.valorTotal || 0;

  document.getElementById('budgetRenderArea').innerHTML = `
    <div class="print-body" id="pdfContentToPrintOrc">
      <div class="watermark">${escapeHTML(config.name)}</div>

      <div class="print-header">
        <div style="display: flex; align-items: center; max-width: 140px; height: 35px;">
          <img src="${logoSrc}" alt="Logo" style="max-height: 32px; width: auto; max-width: 140px; display: block;">
        </div>
        <div style="text-align: center; flex-grow: 1;">
          <h1 style="font-size: 11px; color: #0B132B; margin: 0; font-weight: bold; text-transform: uppercase;">ORÇAMENTO DE SERVIÇO</h1>
        </div>
        <div class="print-header-info">
          <h1>Nº: ${escapeHTML(numDoc)}</h1>
          <p>Data: ${escapeHTML(b.date || b.data || '-')}</p>
        </div>
      </div>

      <div class="section-box">
        <div class="section-title">Dados da Empresa / Prestador de Serviço</div>
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 4px; font-size: 8.5px;">
          <p style="margin: 1px 0;"><strong>Razão Social:</strong> ${escapeHTML(config.name)}</p>
          <p style="margin: 1px 0;"><strong>CNPJ:</strong> ${escapeHTML(config.doc)}</p>
          <p style="margin: 1px 0;"><strong>E-mail:</strong> ${escapeHTML(config.email)}</p>
          <p style="margin: 1px 0;"><strong>Contato:</strong> ${escapeHTML(config.contact)}</p>
          <p style="grid-column: span 2; margin: 1px 0;"><strong>Endereço:</strong> ${escapeHTML(config.location)}</p>
        </div>
      </div>

      <div class="section-box">
        <div class="section-title">Dados do Cliente & Equipamento</div>
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 4px; font-size: 8.5px;">
          <p style="margin: 1px 0;"><strong>Cliente:</strong> ${escapeHTML(clientName || '-')}</p>
          <p style="margin: 1px 0;"><strong>Equipamento:</strong> ${escapeHTML(b.equipment || b.equipamento || '-')}</p>
          <p style="margin: 1px 0;"><strong>CNPJ/CPF:</strong> ${escapeHTML(clientObj.doc || clientObj.cnpj || '-')}</p>
          <p style="margin: 1px 0;"><strong>Contacto:</strong> ${escapeHTML(clientObj.phone || clientObj.telefone || '-')}</p>
          <p style="margin: 1px 0;"><strong>E-mail:</strong> ${escapeHTML(clientObj.email || '-')}</p>
          <p style="margin: 1px 0;"><strong>Endereço:</strong> ${escapeHTML(clientObj.address || clientObj.endereco || '-')}</p>
        </div>
      </div>

      <div class="section-box">
        <div class="section-title">Escopo dos Serviços</div>
        <p style="white-space: pre-wrap; margin-top: 1px; background: #FFF; padding: 3px; border: 1px solid #E2E8F0; border-radius: 4px; font-size: 8.5px;">${escapeHTML(b.desc || b.descricao || '-')}</p>
      </div>

      <div class="section-box">
        <div class="section-title">Condições Comerciais & Pagamento</div>
        <div style="font-size: 8.5px;">
          ${termsList}
          <hr style="border: 0; border-top: 1px solid #CBD5E1; margin: 3px 0;">
          ${bancoInfoHtml}
        </div>
      </div>

      <div class="section-box" style="text-align: right; background: #F1F5F9 !important; border-color: #00F5D4; padding: 6px 8px;">
        <p style="font-size: 10px; font-weight: bold; color: #0B132B; margin: 0;">VALOR TOTAL DO ORÇAMENTO: R$ ${Number(valorTotalOrc).toFixed(2)}</p>
      </div>

      <div class="signature-area" style="display: flex; justify-content: center; align-items: flex-end; margin-top: 10px; page-break-inside: avoid;">
        <div class="signature-box" style="text-align: center; width: 50%;">
          ${techSignature ? `<img src="${techSignature}" alt="Assinatura" style="max-height: 35px; width: auto; max-width: 140px; display: block; margin: 0 auto 2px auto;">` : '<div style="height: 35px;"></div>'}
          <p style="margin: 0; font-size: 8.5px;">________________________________________</p>
          <p style="margin: 2px 0 0 0; font-size: 8.5px;"><strong>Assinatura do Técnico Responsável:</strong> ${escapeHTML(config.tech || 'Técnico Responsável')}</p>
        </div>
      </div>
    </div>
  `;

  document.getElementById('budgetPreviewModal').style.display = 'flex';
};

window.fecharModalOrc = function() { document.getElementById('budgetPreviewModal').style.display = 'none'; };

window.compartilharPDFOrcamento = async function() {
  const element = document.getElementById('budgetRenderArea');
  const filename = `Orcamento_${activeBudgetData.number || activeBudgetData.numero || 'ORC-0001'}.pdf`;
  const opt = { 
    margin: [6, 6, 6, 6], 
    filename: filename, 
    image: { type: 'jpeg', quality: 0.98 }, 
    html2canvas: { scale: 2, useCORS: true }, 
    jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
    pagebreak: { mode: ['css', 'legacy'] }
  };

  document.getElementById('loadingStatusOrc').textContent = 'A gerar PDF...';
  try {
    const pdfBlob = await html2pdf().from(element).set(opt).outputPdf('blob');
    const file = new File([pdfBlob], filename, { type: 'application/pdf' });

    if (navigator.canShare && navigator.canShare({ files: [file] })) {
      await navigator.share({ files: [file], title: `Orçamento ${activeBudgetData.number || activeBudgetData.numero}`, text: `Segue orçamento para ${activeBudgetData.client || activeBudgetData.cliente}.` });
      document.getElementById('loadingStatusOrc').textContent = 'Partilhado!';
    } else {
      html2pdf().from(element).set(opt).save();
      document.getElementById('loadingStatusOrc').textContent = 'Descarregado!';
    }
  } catch (err) {
    html2pdf().from(element).set(opt).save();
  }
};

window.descarregarPDFOrcamento = function() {
  const element = document.getElementById('budgetRenderArea');
  const filename = `Orcamento_${activeBudgetData.number || activeBudgetData.numero || 'ORC-0001'}.pdf`;
  const opt = { 
    margin: [6, 6, 6, 6], 
    filename: filename, 
    image: { type: 'jpeg', quality: 0.98 }, 
    html2canvas: { scale: 2, useCORS: true }, 
    jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
    pagebreak: { mode: ['css', 'legacy'] }
  };

  document.getElementById('loadingStatusOrc').textContent = 'A descarregar...';
  html2pdf().from(element).set(opt).save().then(() => {
    document.getElementById('loadingStatusOrc').textContent = 'Descarregado!';
  });
};

function escapeHTML(str) {
  if (!str) return '';
  return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#039;');
}
