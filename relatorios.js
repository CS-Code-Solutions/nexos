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

async function carregarOpcoesClientes() {
  const selectFiltro = document.getElementById('selectClienteFiltro');
  
  try {
    const clients = await DataSync.load('rg_clients') || [];
    if (!Array.isArray(clients)) return;

    if (selectFiltro) {
      const valFiltroAtual = selectFiltro.value;
      selectFiltro.innerHTML = '<option value="">Todos os Clientes</option>';
      clients.forEach(c => selectFiltro.innerHTML += `<option value="${escapeHTML(c.name)}">${escapeHTML(c.name)}</option>`);
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
    listaRelatoriosRS = await DataSync.load('rg_reports') || [];
    listaOrcamentos = await DataSync.load('rg_orcamentos') || [];
    if (!Array.isArray(listaRelatoriosRS)) listaRelatoriosRS = [];
    if (!Array.isArray(listaOrcamentos)) listaOrcamentos = [];

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
      if (!r) return;
      unificados.push({
        tipoDoc: 'RS',
        origemIndex: idx,
        numero: r.number || `RS-${1000 + idx}`,
        data: r.date || '',
        cliente: r.client || '-',
        equipamento: r.equipment || '-',
        detalheExtra: r.serviceNature || r.type || 'Corretiva',
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
        if (!o) return;
        unificados.push({
          tipoDoc: 'ORC',
          origemIndex: idx,
          numero: o.number || `ORC-${String(idx + 1).padStart(4, '0')}`,
          data: o.date || '',
          cliente: o.client || '-',
          equipamento: o.equipment || '-',
          detalheExtra: `R$ ${Number(o.total || 0).toFixed(2)}`,
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
      const numClean = item.numero.toLowerCase();
      const cliClean = item.cliente.toLowerCase();
      const eqClean = item.equipamento.toLowerCase();
      const detClean = item.detalheExtra.toLowerCase();
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
    const safeNum = escapeHTML(item.numero);

    let dataForm = item.data || '-';
    if (dataForm.includes('-')) {
      const p = dataForm.split('-');
      if (p.length === 3) dataForm = `${p[2]}/${p[1]}/${p[0]}`;
    }

    const safeClient = escapeHTML(item.cliente);
    const safeEquipment = escapeHTML(item.equipamento);
    const safeDetalhe = escapeHTML(item.detalheExtra);

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

/* --- AÇÕES DE EDICÃO E EXCLUSÃO DE RS --- */
window.editReport = function(index) {
  window.location.href = `novo-relatorio.html?edit=${index}`;
};

window.deleteReport = async function(index) {
  if (confirm('Deseja realmente excluir este relatório de serviço?')) {
    try {
      let reports = await DataSync.load('rg_reports') || [];
      reports.splice(index, 1);
      await DataSync.save('rg_reports', reports);
      await renderizarTudo();
    } catch (e) { alert('Erro ao excluir relatório.'); }
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

    let clients = await DataSync.load('rg_clients') || [];
    const clientObj = clients.find(c => c.name === rep.client) || {};

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

    activeReportData = { number: rep.number, client: rep.client };

    let dataFormatada = rep.date || '-';
    if (rep.date && rep.date.includes('-')) {
      const p = rep.date.split('-');
      if (p.length === 3) dataFormatada = `${p[2]}/${p[1]}/${p[0]}`;
    }

    const numeroLimpo = escapeHTML(String(rep.number || 'RS-1000')).replace(/^RS-?/i, '');
    const clientSignature = rep.signature || rep.assinatura || rep.clientSignature || '';
    const techSignature = config.techSignature || '';
    const nomeTecnico = config.tech || 'Técnico Responsável';

    const logoSrc = (config.logoBase64 && config.logoBase64.startsWith('data:image')) ? config.logoBase64 : 'marca.png';

    let anexosHtml = '';
    if (rep.anexos && rep.anexos.length > 0) {
      let itemsHtml = '';
      rep.anexos.forEach(anexo => {
        itemsHtml += `
          <div class="section-box" style="text-align: center; page-break-inside: avoid; margin-top: 6px;">
            <div class="watermark">${escapeHTML(config.name)}</div>
            <div class="section-title" style="text-align: left;">${escapeHTML(anexo.titulo || 'Foto do Equipamento')}</div>
            <img src="${anexo.imagem}" alt="${escapeHTML(anexo.titulo || '')}" style="max-width: 100%; max-height: 220px; height: auto; object-fit: contain; border-radius: 4px; border: 1px solid #CBD5E1; display: block; margin: 0 auto;">
          </div>
        `;
      });
      anexosHtml = `
        <div class="page-break"></div>
        <div class="print-header">
          <img src="${logoSrc}" alt="Logo" style="height: 30px; width: auto; max-width: 120px; object-fit: contain;">
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
          <img src="${logoSrc}" alt="Logo" style="height: 30px; width: auto; max-width: 120px; object-fit: contain;">
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
          <div class="grid-2">
            <p><strong>Razão Social:</strong> ${escapeHTML(config.name)}</p>
            <p><strong>CNPJ:</strong> ${escapeHTML(config.doc)}</p>
            <p><strong>E-mail:</strong> ${escapeHTML(config.email)}</p>
            <p><strong>Telefone / WhatsApp:</strong> ${escapeHTML(config.contact)}</p>
            <p style="grid-column: span 2;"><strong>Endereço:</strong> ${escapeHTML(config.location)}</p>
          </div>
        </div>

        <div class="section-box">
          <div class="section-title">Dados do Cliente</div>
          <div class="grid-2">
            <p><strong>Nome / Razão Social:</strong> ${escapeHTML(rep.client)}</p>
            <p><strong>CPF / CNPJ:</strong> ${escapeHTML(clientObj.doc || clientObj.cnpj || '-')}</p>
            <p><strong>E-mail:</strong> ${escapeHTML(clientObj.email || '-')}</p>
            <p><strong>Endereço:</strong> ${escapeHTML(clientObj.address || '-')}</p>
          </div>
        </div>

        <div class="section-box">
          <div class="section-title">Dados do Equipamento / Máquina</div>
          <div class="grid-2">
            <p><strong>Equipamento:</strong> ${escapeHTML(rep.equipment || '-')}</p>
            <p><strong>Marca:</strong> ${escapeHTML(rep.brand || '-')}</p>
            <p><strong>Modelo:</strong> ${escapeHTML(rep.model || '-')}</p>
            <p><strong>Matrícula / N° de Série:</strong> ${escapeHTML(rep.serialNumber || '-')}</p>
          </div>
        </div>

        <div class="section-box">
          <div class="section-title">Registro do Serviço Realizado</div>
          <div class="grid-2" style="margin-bottom: 2px;">
            <p><strong>Tipo de Manutenção:</strong> ${escapeHTML(rep.serviceNature || '-')}</p>
            <p><strong>Área de Serviço:</strong> ${escapeHTML(rep.serviceArea || '-')}</p>
          </div>
          <p><strong>Descrição Detalhada:</strong></p>
          <p style="white-space: pre-wrap; margin-top: 1px; background: #FFF; padding: 3px; border: 1px solid #E2E8F0; border-radius: 4px; font-size: 9px;">${escapeHTML(rep.desc || '-')}</p>
        </div>

        <div class="section-box">
          <div class="section-title">Critérios de Cobrança e Valor Total</div>
          <div style="font-size: 9px; margin-bottom: 2px;">
            ${rep.temHora === 'sim' ? `<p>• <strong>Serviço / Horas:</strong> ${textoHoras}</p>${detalhesDiasHtml}` : ''}
            ${rep.temDeslocamento === 'sim' ? `<p>• <strong>Hora de Deslocamento:</strong> ${rep.tempoDeslocamentoHoras || 0}h a R$ ${Number(rep.valorHoraDeslocamento || 0).toFixed(2)}/h</p>` : ''}
            ${rep.temHospedagem === 'sim' ? `<p>• <strong>Hospedagem:</strong> R$ ${Number(rep.valorHospedagem || 0).toFixed(2)}</p>` : ''}
            ${rep.temOutras === 'sim' ? `<p>• <strong>Outras Despesas:</strong> R$ ${Number(rep.valorOutras || 0).toFixed(2)}</p>` : ''}
            ${rep.temEmpreitada === 'sim' ? `<p>• <strong>Regime de Empreitada:</strong> ${textoHoras}</p>` : ''}
          </div>
          <p style="font-size: 9.5px; font-weight: bold; color: #0D9488; border-top: 1px solid #CBD5E1; padding-top: 2px; margin-top: 2px;">Valor Total Estimado: R$ ${valorTotal.toFixed(2)}</p>
        </div>

        <div class="signature-area">
          <div class="signature-box">
            ${techSignature ? `<img src="${techSignature}" alt="Assinatura Técnico">` : '<p style="height: 30px;"></p>'}
            <p>________________________________________</p>
            <p><strong>Assinatura Técnico:</strong> ${escapeHTML(nomeTecnico)}</p>
          </div>
          <div class="signature-box">
            ${clientSignature ? `<img src="${clientSignature}" alt="Assinatura Cliente">` : '<p style="height: 30px;"></p>'}
            <p>________________________________________</p>
            <p><strong>Assinatura do Cliente</strong></p>
          </div>
        </div>

        ${anexosHtml}
      </div>
    `;

    document.getElementById('reportRenderArea').innerHTML = fullReportHtml;
    document.getElementById('modalTitleRs').textContent = `RS-${numeroLimpo} (${rep.client})`;
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
  const opt = { margin: [6, 6, 6, 6], filename: filename, image: { type: 'jpeg', quality: 0.98 }, html2canvas: { scale: 2, useCORS: true }, jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' } };

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
  const opt = { margin: [6, 6, 6, 6], filename: filename, image: { type: 'jpeg', quality: 0.98 }, html2canvas: { scale: 2, useCORS: true }, jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' } };
  
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

  let clients = await DataSync.load('rg_clients') || [];
  const clientObj = clients.find(c => c.name === b.client) || {};

  activeBudgetData = b;
  document.getElementById('modalTitleOrc').textContent = `Orçamento - ${b.number || 'ORC-0001'}`;
  document.getElementById('loadingStatusOrc').textContent = 'Pronto';

  let bancoInfoHtml = '';
  const opt = b.paymentOption || 'banco1';
  let nomeConta1 = config.nomeConta1 || 'Conta Bancária 1';
  let nomeConta2 = config.nomeConta2 || 'Conta Bancária 2';

  if (opt === 'banco1') {
    bancoInfoHtml = `<p><strong>Forma de Recebimento:</strong> Transferência Bancária (${escapeHTML(nomeConta1)})</p><p><strong>Banco:</strong> ${escapeHTML(config.bank1 || '-')}</p><p><strong>Agência:</strong> ${escapeHTML(config.agency1 || '-')} | <strong>Conta:</strong> ${escapeHTML(config.account1 || '-')}</p>`;
  } else if (opt === 'banco2') {
    bancoInfoHtml = `<p><strong>Forma de Recebimento:</strong> Transferência Bancária (${escapeHTML(nomeConta2)})</p><p><strong>Banco:</strong> ${escapeHTML(config.bank2 || '-')}</p><p><strong>Agência:</strong> ${escapeHTML(config.agency2 || '-')} | <strong>Conta:</strong> ${escapeHTML(config.account2 || '-')}</p>`;
  } else {
    bancoInfoHtml = `<p><strong>Forma de Recebimento:</strong> Boleto Bancário</p><p><em>Instruções: O boleto será emitido e enviado conforme prazo comercial acordado.</em></p>`;
  }

  const termsList = (b.terms || '').split('\n').map(t => `<p>• ${escapeHTML(t)}</p>`).join('');
  const techSignature = config.techSignature || '';
  const logoSrc = (config.logoBase64 && config.logoBase64.startsWith('data:image')) ? config.logoBase64 : 'marca.png';

  document.getElementById('budgetRenderArea').innerHTML = `
    <div class="print-body">
      <div class="watermark">${escapeHTML(config.name)}</div>
      <div class="print-header">
        <img src="${logoSrc}" alt="Logo" style="max-height: 30px; width: auto; max-width: 120px; object-fit: contain;">
        <div style="text-align: center; flex-grow: 1;"><h1 style="font-size: 11px; margin: 0;">ORÇAMENTO DE SERVIÇO</h1></div>
        <div class="print-header-info"><h2>Nº: ${escapeHTML(b.number || 'ORC-0001')}</h2><p>Data: ${escapeHTML(b.date || '-')}</p></div>
      </div>
      <div class="section-box">
        <div class="section-title">DADOS DA EMPRESA</div>
        <p><strong>Razão Social:</strong> ${escapeHTML(config.name)}</p>
        <p><strong>CNPJ:</strong> ${escapeHTML(config.doc)}</p>
        <p><strong>Contato:</strong> ${escapeHTML(config.contact)} | <strong>E-mail:</strong> ${escapeHTML(config.email)}</p>
        <p><strong>Endereço:</strong> ${escapeHTML(config.location)}</p>
      </div>
      <div class="section-box">
        <div class="section-title">CLIENTE & EQUIPAMENTO</div>
        <div class="grid-2">
          <div>
            <p><strong>Cliente:</strong> ${escapeHTML(b.client || '-')}</p>
            <p><strong>CNPJ/CPF:</strong> ${escapeHTML(clientObj.doc || clientObj.cnpj || '-')}</p>
            <p><strong>E-mail:</strong> ${escapeHTML(clientObj.email || '-')}</p>
          </div>
          <div>
            <p><strong>Equipamento:</strong> ${escapeHTML(b.equipment || '-')}</p>
            <p><strong>Endereço:</strong> ${escapeHTML(clientObj.address || '-')}</p>
            <p><strong>Contacto:</strong> ${escapeHTML(clientObj.phone || '-')}</p>
          </div>
        </div>
      </div>
      <div class="section-box">
        <div class="section-title">ESCOPO DOS SERVIÇOS</div>
        <p style="white-space: pre-wrap; margin-top: 1px;">${escapeHTML(b.desc || '-')}</p>
      </div>
      <div class="section-box">
        <div class="section-title">CONDIÇÕES COMERCIAIS & PAGAMENTO</div>
        ${termsList}
        <hr style="border: 0; border-top: 1px solid #CBD5E1; margin: 2px 0;">
        ${bancoInfoHtml}
      </div>
      <div class="section-box" style="text-align: right; background: #F1F5F9; border-color: #00F5D4;">
        <p style="font-size: 11px; font-weight: bold; color: #0B132B;">VALOR TOTAL DO ORÇAMENTO: R$ ${Number(b.total || 0).toFixed(2)}</p>
      </div>
      <div style="margin-top: 6px; display: flex; justify-content: center; page-break-inside: avoid;">
        <div style="text-align: center; width: 60%;">
          ${techSignature ? `<img src="${techSignature}" alt="Assinatura" style="max-width: 110px; height: 30px; object-fit: contain; display: block; margin: 0 auto;">` : '<div style="height: 30px;"></div>'}
          <p style="margin: 1px 0;">________________________________________</p>
          <p style="margin: 1px 0; font-size: 8.5px;"><strong>Assinatura do Técnico Responsável:</strong> ${escapeHTML(config.tech || 'Técnico Responsável')}</p>
        </div>
      </div>
    </div>
  `;

  document.getElementById('budgetPreviewModal').style.display = 'flex';
};

window.fecharModalOrc = function() { document.getElementById('budgetPreviewModal').style.display = 'none'; };

window.compartilharPDFOrcamento = async function() {
  const element = document.getElementById('budgetRenderArea');
  const filename = `Orcamento_${activeBudgetData.number || 'ORC-0001'}.pdf`;
  const opt = { margin: [6, 6, 6, 6], filename: filename, image: { type: 'jpeg', quality: 0.98 }, html2canvas: { scale: 2, useCORS: true }, jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' } };

  document.getElementById('loadingStatusOrc').textContent = 'A gerar PDF...';
  try {
    const pdfBlob = await html2pdf().from(element).set(opt).outputPdf('blob');
    const file = new File([pdfBlob], filename, { type: 'application/pdf' });

    if (navigator.canShare && navigator.canShare({ files: [file] })) {
      await navigator.share({ files: [file], title: `Orçamento ${activeBudgetData.number}`, text: `Segue orçamento para ${activeBudgetData.client}.` });
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
  const filename = `Orcamento_${activeBudgetData.number || 'ORC-0001'}.pdf`;
  const opt = { margin: [6, 6, 6, 6], filename: filename, image: { type: 'jpeg', quality: 0.98 }, html2canvas: { scale: 2, useCORS: true }, jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' } };

  document.getElementById('loadingStatusOrc').textContent = 'A descarregar...';
  html2pdf().from(element).set(opt).save().then(() => {
    document.getElementById('loadingStatusOrc').textContent = 'Descarregado!';
  });
};

function escapeHTML(str) {
  if (!str) return '';
  return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#039;');
}
