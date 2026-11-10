/**
 * NexOS - Script da Central Unificada de Relatórios e Orçamentos (historico.js)
 */

let listaRelatoriosRS = [];
let listaOrcamentos = [];
let tipoFiltroAtual = 'todos';
let activeDocumentData = {};
let activeDocumentType = 'RS';

firebase.auth().onAuthStateChanged(async (user) => {
  if (!user) {
    window.location.href = 'login.html';
  } else {
    await carregarOpcoesClientes();
    await renderizarTudo();

    DataSync.listen('rg_reports', () => renderizarTudo());
    DataSync.listen('rg_orcamentos', () => renderizarTudo());
    DataSync.listen('rg_clients', () => carregarOpcoesClientes());
  }
});

async function carregarOpcoesClientes() {
  const selectFiltro = document.getElementById('selectClienteFiltro');
  if (!selectFiltro) return;
  
  try {
    const clients = await DataSync.load('rg_clients') || [];
    if (!Array.isArray(clients)) return;

    const valFiltroAtual = selectFiltro.value;
    selectFiltro.innerHTML = '<option value="">Todos os Clientes</option>';
    clients.forEach(c => selectFiltro.innerHTML += `<option value="${escapeHTML(c.name)}">${escapeHTML(c.name)}</option>`);
    selectFiltro.value = valFiltroAtual;
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

window.filtrarPorTipo = function(tipo) {
  tipoFiltroAtual = tipo;
  
  document.getElementById('btnFiltroTodos')?.classList.toggle('active', tipo === 'todos');
  document.getElementById('btnFiltroRS')?.classList.toggle('active', tipo === 'rs');
  document.getElementById('btnFiltroORC')?.classList.toggle('active', tipo === 'orc');

  filtrarDocumentos();
};

window.filtrarDocumentos = function() {
  const container = document.getElementById('reportCardsContainer');
  if (!container) return;

  const busca = (document.getElementById('inputPesquisaRelatorios')?.value || '').toLowerCase().trim();
  const clienteFiltro = document.getElementById('selectClienteFiltro')?.value || '';
  const dataIni = document.getElementById('dataInicio')?.value || '';
  const dataFim = document.getElementById('dataFim')?.value || '';

  let unificados = [];

  if (tipoFiltroAtual === 'todos' || tipoFiltroAtual === 'rs') {
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

  if (tipoFiltroAtual === 'todos' || tipoFiltroAtual === 'orc') {
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

  unificados.sort((a, b) => new Date(b.data || 0) - new Date(a.data || 0));

  const filtrados = unificados.filter(item => {
    if (clienteFiltro && item.cliente !== clienteFiltro) return false;
    if (dataIni && item.data < dataIni) return false;
    if (dataFim && item.data > dataFim) return false;

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
        <p style="color: #64748B; margin: 0;">Nenhum documento encontrado com os filtros selecionados.</p>
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
          <button class="btn" style="flex: 1.5; padding: 6px 0; font-size: 0.78rem; background-color: #1D4ED8; color: white; border: none; border-radius: 4px; font-weight: bold; cursor: pointer;" onclick="${isRS ? `openReportPreview(${item.origemIndex})` : `openBudgetPreview(${item.origemIndex})`}">
            Gerar PDF
          </button>
          <button class="btn" style="flex: 1; padding: 6px 0; font-size: 0.78rem; background-color: #F59E0B; color: white; border: none; border-radius: 4px; font-weight: bold; cursor: pointer;" onclick="${isRS ? `editReport(${item.origemIndex})` : `editBudget(${item.origemIndex})`}">
            Editar
          </button>
          <button class="btn" style="flex: 1; padding: 6px 0; font-size: 0.78rem; background-color: #EF4444; color: white; border: none; border-radius: 4px; font-weight: bold; cursor: pointer;" onclick="${isRS ? `deleteReport(${item.origemIndex})` : `deleteBudget(${item.origemIndex})`}">
            Excluir
          </button>
        </div>
      </div>
    `;
  });

  container.innerHTML = htmlCards;
};

window.editReport = function(index) {
  window.location.href = `novo-relatorio.html?edit=${index}`;
};

window.editBudget = function(index) {
  window.location.href = `novo-orcamento.html?edit=${index}`;
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

window.deleteBudget = async function(index) {
  if (confirm('Deseja realmente excluir este orçamento?')) {
    try {
      let budgets = await DataSync.load('rg_orcamentos') || [];
      budgets.splice(index, 1);
      await DataSync.save('rg_orcamentos', budgets);
      await renderizarTudo();
    } catch (e) { alert('Erro ao excluir orçamento.'); }
  }
};

window.openReportPreview = async function(index) {
  const rep = listaRelatoriosRS[index];
  if (!rep) return;
  activeDocumentData = { number: rep.number || 'RS-1000', client: rep.client || 'Cliente' };
  activeDocumentType = 'RS';

  const tenantId = localStorage.getItem('rg_tenant_id') || DataSync.getUid();
  let config = {};
  try {
    const savedCfg = await db.collection('rg_config').doc(tenantId).get();
    if (savedCfg.exists) config = savedCfg.data();
  } catch (e) {}

  const logoSrc = (config.logoBase64 && config.logoBase64.startsWith('data:image')) ? config.logoBase64 : 'marca.png';

  document.getElementById('reportRenderArea').innerHTML = `
    <div class="print-body">
      <div class="watermark">${escapeHTML(config.nomeEmpresa || config.name || 'NexOS')}</div>
      <div class="print-header">
        <img src="${logoSrc}" alt="Logo">
        <div style="text-align: center; flex-grow: 1;"><h1 style="font-size: 11px; margin: 0;">RELATÓRIO DE SERVIÇO (RS)</h1></div>
        <div class="print-header-info"><h1>Nº: ${escapeHTML(rep.number || '-')}</h1><p>Data: ${escapeHTML(rep.date || '-')}</p></div>
      </div>
      <div class="section-box">
        <div class="section-title">DADOS DO CLIENTE & EQUIPAMENTO</div>
        <p><strong>Cliente:</strong> ${escapeHTML(rep.client || '-')}</p>
        <p><strong>Equipamento:</strong> ${escapeHTML(rep.equipment || '-')}</p>
      </div>
      <div class="section-box">
        <div class="section-title">SERVIÇO EXECUTADO</div>
        <p style="white-space: pre-wrap;">${escapeHTML(rep.desc || '-')}</p>
      </div>
    </div>
  `;

  document.getElementById('modalTitleRs').textContent = `RS - ${rep.number || '1000'}`;
  document.getElementById('reportPreviewModal').style.display = 'flex';
};

window.openBudgetPreview = async function(index) {
  const b = listaOrcamentos[index];
  if (!b) return;
  activeDocumentData = { number: b.number || 'ORC-0001', client: b.client || 'Cliente' };
  activeDocumentType = 'ORC';

  const tenantId = localStorage.getItem('rg_tenant_id') || DataSync.getUid();
  let config = {};
  try {
    const savedCfg = await db.collection('rg_config').doc(tenantId).get();
    if (savedCfg.exists) config = savedCfg.data();
  } catch (e) {}

  const logoSrc = (config.logoBase64 && config.logoBase64.startsWith('data:image')) ? config.logoBase64 : 'marca.png';

  document.getElementById('reportRenderArea').innerHTML = `
    <div class="print-body">
      <div class="watermark">${escapeHTML(config.nomeEmpresa || config.name || 'NexOS')}</div>
      <div class="print-header">
        <img src="${logoSrc}" alt="Logo">
        <div style="text-align: center; flex-grow: 1;"><h1 style="font-size: 11px; margin: 0;">ORÇAMENTO DE SERVIÇO</h1></div>
        <div class="print-header-info"><h1>Nº: ${escapeHTML(b.number || '-')}</h1><p>Data: ${escapeHTML(b.date || '-')}</p></div>
      </div>
      <div class="section-box">
        <div class="section-title">DADOS DO CLIENTE & EQUIPAMENTO</div>
        <p><strong>Cliente:</strong> ${escapeHTML(b.client || '-')}</p>
        <p><strong>Equipamento:</strong> ${escapeHTML(b.equipment || '-')}</p>
      </div>
      <div class="section-box">
        <div class="section-title">ESCOPO E CONDIÇÕES</div>
        <p style="white-space: pre-wrap;">${escapeHTML(b.desc || '-')}</p>
        <p><strong>Termos:</strong></p>
        <p style="white-space: pre-wrap;">${escapeHTML(b.terms || '-')}</p>
      </div>
      <div class="section-box" style="text-align: right; background: #F1F5F9;">
        <p style="font-size: 11px; font-weight: bold;">VALOR TOTAL: R$ ${Number(b.total || 0).toFixed(2)}</p>
      </div>
    </div>
  `;

  document.getElementById('modalTitleRs').textContent = `Orçamento - ${b.number || 'ORC-0001'}`;
  document.getElementById('reportPreviewModal').style.display = 'flex';
};

window.closeModal = function() {
  document.getElementById('reportPreviewModal').style.display = 'none';
};

window.descarregarPDFDocumento = function() {
  const element = document.getElementById('reportRenderArea');
  const filename = `${activeDocumentType}_${activeDocumentData.number || '0001'}.pdf`;
  const opt = { margin: [6, 6, 6, 6], filename: filename, image: { type: 'jpeg', quality: 0.98 }, html2canvas: { scale: 2 }, jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' } };
  html2pdf().from(element).set(opt).save();
};

window.compartilharPDFDocumento = async function() {
  const element = document.getElementById('reportRenderArea');
  const filename = `${activeDocumentType}_${activeDocumentData.number || '0001'}.pdf`;
  const opt = { margin: [6, 6, 6, 6], filename: filename, image: { type: 'jpeg', quality: 0.98 }, html2canvas: { scale: 2 }, jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' } };

  try {
    const pdfBlob = await html2pdf().from(element).set(opt).outputPdf('blob');
    const file = new File([pdfBlob], filename, { type: 'application/pdf' });
    if (navigator.canShare && navigator.canShare({ files: [file] })) {
      await navigator.share({ files: [file], title: activeDocumentData.number, text: `Segue documento para ${activeDocumentData.client}.` });
    } else {
      html2pdf().from(element).set(opt).save();
    }
  } catch (e) { html2pdf().from(element).set(opt).save(); }
};

function escapeHTML(str) {
  if (!str) return '';
  return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#039;');
}
