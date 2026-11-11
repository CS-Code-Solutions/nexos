/**
 * NexOS - Script da Central Unificada de Relatórios e Orçamentos (historico.js)
 */

let listaRelatoriosRS = [];
let listaOrcamentos = [];
let activeDocumentData = {};
let activeDocumentType = 'RS';

// Variáveis para controle seguro de exclusão
let indexParaExcluir = null;
let tipoDocumentoExcluir = null;

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

async function carregarOpcoesClientes() {
  const selectFiltro = document.getElementById('selectClienteFiltro');
  if (!selectFiltro) return;
  
  try {
    const rawClients = await DataSync.load('rg_clients');
    const clients = normalizarLista(rawClients);
    if (!clients.length) return;

    const valFiltroAtual = selectFiltro.value;
    selectFiltro.innerHTML = '<option value="">Todos os Clientes</option>';
    clients.forEach(c => {
      const nome = c.name || c.nome || c.razacaosocial || '';
      if (nome) {
        selectFiltro.innerHTML += `<option value="${escapeHTML(nome)}">${escapeHTML(nome)}</option>`;
      }
    });
    selectFiltro.value = valFiltroAtual;
  } catch (e) {}
}

async function renderizarTudo() {
  const container = document.getElementById('reportCardsContainer') || document.getElementById('unifiedCardsContainer');
  if (container) {
    container.innerHTML = `<p style="text-align: center; color: #64748B; grid-column: 1 / -1;">A carregar histórico da nuvem...</p>`;
  }

  try {
    const loadWithTimeout = (key) => Promise.race([
      DataSync.load(key),
      new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), 6000))
    ]);

    let rawRS = [];
    let rawORC = [];

    try { rawRS = await loadWithTimeout('rg_reports'); } catch (e) { console.warn("Aviso ao carregar rg_reports:", e); }
    try { rawORC = await loadWithTimeout('rg_orcamentos'); } catch (e) { console.warn("Aviso ao carregar rg_orcamentos:", e); }

    listaRelatoriosRS = normalizarLista(rawRS);
    listaOrcamentos = normalizarLista(rawORC);

    filtrarDocumentos();
  } catch (err) {
    console.error("Erro ao carregar lista unificada:", err);
  }
}

window.filtrarDocumentos = function() {
  const container = document.getElementById('reportCardsContainer') || document.getElementById('unifiedCardsContainer');
  if (!container) return;

  const busca = (document.getElementById('inputPesquisaRelatorios')?.value || document.getElementById('inputPesquisa')?.value || '').toLowerCase().trim();
  const selectTipo = document.getElementById('selectTipoFiltro');
  const clienteFiltro = document.getElementById('selectClienteFiltro')?.value || '';

  const showRelatorios = localStorage.getItem('rg_page_relatorios') !== 'false';
  const showOrcamentos = localStorage.getItem('rg_page_orcamentos') !== 'false';

  const btnNovoRelatório = document.querySelector('a[href="novo-relatorio.html"]');
  const btnNovoOrcamento = document.querySelector('a[href="novo-orcamento.html"]');

  if (btnNovoRelatório) btnNovoRelatório.style.display = showRelatorios ? 'inline-flex' : 'none';
  if (btnNovoOrcamento) btnNovoOrcamento.style.display = showOrcamentos ? 'inline-flex' : 'none';

  let tipoFiltro = selectTipo ? selectTipo.value : 'todos';
  let grupoTipoFiltroContainer = selectTipo ? selectTipo.closest('div') : null;

  if (!showRelatorios && showOrcamentos) {
    tipoFiltro = 'orc';
    if (selectTipo) selectTipo.value = 'orc';
    if (grupoTipoFiltroContainer) grupoTipoFiltroContainer.style.display = 'none';
  } else if (showRelatorios && !showOrcamentos) {
    tipoFiltro = 'rs';
    if (selectTipo) selectTipo.value = 'rs';
    if (grupoTipoFiltroContainer) grupoTipoFiltroContainer.style.display = 'none';
  } else if (!showRelatorios && !showOrcamentos) {
    tipoFiltro = 'none';
    if (grupoTipoFiltroContainer) grupoTipoFiltroContainer.style.display = 'none';
  } else {
    if (grupoTipoFiltroContainer) grupoTipoFiltroContainer.style.display = 'block';
  }

  let unificados = [];

  if (showRelatorios && (tipoFiltro === 'todos' || tipoFiltro === 'rs')) {
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

  if (showOrcamentos && (tipoFiltro === 'todos' || tipoFiltro === 'orc')) {
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

  unificados.sort((a, b) => new Date(b.data || 0) - new Date(a.data || 0));

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
    if (typeof dataForm === 'string' && dataForm.includes('-')) {
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

// Exclusão Segura
window.deleteReport = function(index) {
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

window.deleteBudget = function(index) {
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
  if (modalExclusao) modalExclusao.style.display = 'none';
};

window.openReportPreview = async function(index) {
  const rep = listaRelatoriosRS[index];
  if (!rep) return;
  activeDocumentData = { number: rep.number || rep.numero || 'RS-1000', client: rep.client || rep.cliente || 'Cliente' };
  activeDocumentType = 'RS';

  const tenantId = localStorage.getItem('rg_tenant_id') || DataSync.getUid();
  let config = {};
  try {
    const savedCfg = await db.collection('rg_config').doc(tenantId).get();
    if (savedCfg.exists) config = savedCfg.data();
  } catch (e) {}

  const logoSrc = (config.logoBase64 && config.logoBase64.startsWith('data:image')) ? config.logoBase64 : 'marca.png';
  const targetArea = document.getElementById('reportRenderArea') || document.getElementById('renderArea');

  if (targetArea) {
    targetArea.innerHTML = `
      <div class="print-body">
        <div class="watermark">${escapeHTML(config.nomeEmpresa || config.name || 'NexOS')}</div>
        <div class="print-header">
          <img src="${logoSrc}" alt="Logo">
          <div style="text-align: center; flex-grow: 1;"><h1 style="font-size: 11px; margin: 0;">RELATÓRIO DE SERVIÇO (RS)</h1></div>
          <div class="print-header-info"><h1>Nº: ${escapeHTML(rep.number || rep.numero || '-')}</h1><p>Data: ${escapeHTML(rep.date || rep.data || '-')}</p></div>
        </div>
        <div class="section-box">
          <div class="section-title">DADOS DO CLIENTE & EQUIPAMENTO</div>
          <p><strong>Cliente:</strong> ${escapeHTML(rep.client || rep.cliente || '-')}</p>
          <p><strong>Equipamento:</strong> ${escapeHTML(rep.equipment || rep.equipamento || '-')}</p>
        </div>
        <div class="section-box">
          <div class="section-title">SERVIÇO EXECUTADO</div>
          <p style="white-space: pre-wrap;">${escapeHTML(rep.desc || '-')}</p>
        </div>
      </div>
    `;
  }

  const modalTitle = document.getElementById('modalTitleRs') || document.getElementById('modalTitle');
  if (modalTitle) modalTitle.textContent = `RS - ${rep.number || rep.numero || '1000'}`;
  
  const modal = document.getElementById('reportPreviewModal') || document.getElementById('previewModal');
  if (modal) modal.style.display = 'flex';
};

window.openBudgetPreview = async function(index) {
  const b = listaOrcamentos[index];
  if (!b) return;
  activeDocumentData = { number: b.number || b.numero || 'ORC-0001', client: b.client || b.cliente || 'Cliente' };
  activeDocumentType = 'ORC';

  const tenantId = localStorage.getItem('rg_tenant_id') || DataSync.getUid();
  let config = {};
  try {
    const savedCfg = await db.collection('rg_config').doc(tenantId).get();
    if (savedCfg.exists) config = savedCfg.data();
  } catch (e) {}

  const logoSrc = (config.logoBase64 && config.logoBase64.startsWith('data:image')) ? config.logoBase64 : 'marca.png';
  const targetArea = document.getElementById('budgetRenderArea') || document.getElementById('reportRenderArea');

  if (targetArea) {
    targetArea.innerHTML = `
      <div class="print-body">
        <div class="watermark">${escapeHTML(config.nomeEmpresa || config.name || 'NexOS')}</div>
        <div class="print-header">
          <img src="${logoSrc}" alt="Logo">
          <div style="text-align: center; flex-grow: 1;"><h1 style="font-size: 11px; margin: 0;">ORÇAMENTO DE SERVIÇO</h1></div>
          <div class="print-header-info"><h1>Nº: ${escapeHTML(b.number || b.numero || '-')}</h1><p>Data: ${escapeHTML(b.date || b.data || '-')}</p></div>
        </div>
        <div class="section-box">
          <div class="section-title">DADOS DO CLIENTE & EQUIPAMENTO</div>
          <p><strong>Cliente:</strong> ${escapeHTML(b.client || b.cliente || '-')}</p>
          <p><strong>Equipamento:</strong> ${escapeHTML(b.equipment || b.equipamento || '-')}</p>
        </div>
        <div class="section-box">
          <div class="section-title">ESCOPO E CONDIÇÕES</div>
          <p style="white-space: pre-wrap;">${escapeHTML(b.desc || '-')}</p>
          <p><strong>Termos:</strong></p>
          <p style="white-space: pre-wrap;">${escapeHTML(b.terms || '-')}</p>
        </div>
        <div class="section-box" style="text-align: right; background: #F1F5F9;">
          <p style="font-size: 11px; font-weight: bold;">VALOR TOTAL: R$ ${Number(b.total || b.valorTotal || 0).toFixed(2)}</p>
        </div>
      </div>
    `;
  }

  const modalTitle = document.getElementById('modalTitleOrc') || document.getElementById('modalTitleRs');
  if (modalTitle) modalTitle.textContent = `Orçamento - ${b.number || b.numero || 'ORC-0001'}`;
  
  const modal = document.getElementById('budgetPreviewModal') || document.getElementById('reportPreviewModal');
  if (modal) modal.style.display = 'flex';
};

window.closeModal = function() {
  const m1 = document.getElementById('reportPreviewModal');
  const m2 = document.getElementById('budgetPreviewModal');
  if (m1) m1.style.display = 'none';
  if (m2) m2.style.display = 'none';
};

// Helper com etapas animadas no status do modal
async function executarComProgresso(statusEl, btn, callback) {
  const textoOriginal = btn ? btn.textContent : '';
  if (btn) {
    btn.disabled = true;
    btn.textContent = 'Salvando...';
  }

  try {
    if (statusEl) statusEl.textContent = `⏳ 1/4 - Salvando informações...`;
    await new Promise(r => setTimeout(r, 250));

    if (statusEl) statusEl.textContent = `⏳ 2/4 - Otimizando imagens...`;
    await callback.etapaImagens();

    if (statusEl) statusEl.textContent = `⏳ 3/4 - Gerando documento PDF...`;
    await callback.etapaPdf();

    if (statusEl) statusEl.textContent = `✅ 4/4 - Finalizando relatório...`;
    await new Promise(r => setTimeout(r, 200));

    if (statusEl) statusEl.textContent = 'Pronto';
  } catch (erro) {
    console.error('Erro no processo:', erro);
    if (statusEl) statusEl.textContent = 'Erro ao gerar documento';
  } finally {
    if (btn) {
      btn.disabled = false;
      btn.textContent = textoOriginal;
    }
  }
}

window.descarregarPDFDocumento = async function() {
  const element = document.getElementById('reportRenderArea') || document.getElementById('budgetRenderArea');
  const statusEl = document.getElementById('loadingStatusRs') || document.getElementById('loadingStatusOrc');
  const btn = event && event.target ? event.target : null;
  const filename = `${activeDocumentType}_${activeDocumentData.number || '0001'}.pdf`;

  await executarComProgresso(statusEl, btn, {
    etapaImagens: async () => {},
    etapaPdf: async () => {
      const opt = { margin: [6, 6, 6, 6], filename: filename, image: { type: 'jpeg', quality: 0.98 }, html2canvas: { scale: 2 }, jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' } };
      await html2pdf().from(element).set(opt).save();
    }
  });
};

window.compartilharPDFDocumento = async function() {
  const element = document.getElementById('reportRenderArea') || document.getElementById('budgetRenderArea');
  const statusEl = document.getElementById('loadingStatusRs') || document.getElementById('loadingStatusOrc');
  const btn = event && event.target ? event.target : null;
  const filename = `${activeDocumentType}_${activeDocumentData.number || '0001'}.pdf`;

  await executarComProgresso(statusEl, btn, {
    etapaImagens: async () => {},
    etapaPdf: async () => {
      const opt = { margin: [6, 6, 6, 6], filename: filename, image: { type: 'jpeg', quality: 0.98 }, html2canvas: { scale: 2 }, jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' } };
      const pdfBlob = await html2pdf().from(element).set(opt).outputPdf('blob');
      const file = new File([pdfBlob], filename, { type: 'application/pdf' });
      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({ files: [file], title: activeDocumentData.number, text: `Segue documento para ${activeDocumentData.client}.` });
      } else {
        await html2pdf().from(element).set(opt).save();
      }
    }
  });
};

function escapeHTML(str) {
  if (!str) return '';
  return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#039;');
}
