/**
 * NexOS - Módulo de Gestão de Orçamentos (orcamentos.js)
 */

firebase.auth().onAuthStateChanged(async (user) => {
  if (!user) {
    window.location.href = 'login.html';
  } else {
    await carregarApelidosContas();
    await loadClientsSelect();
    await renderBudgets();
    
    try {
      let budgets = await DataSync.load('rg_orcamentos') || [];
      if (Array.isArray(budgets) && budgets.length > 0) {
        document.getElementById('orcNumber').value = `ORC-${String(budgets.length + 1).padStart(4, '0')}`;
      }
    } catch (e) {}

    atualizarTermosCompletos();

    DataSync.listen('rg_orcamentos', () => renderBudgets());
    DataSync.listen('rg_clients', () => loadClientsSelect());
    DataSync.listen('rg_config', () => carregarApelidosContas());
  }
});

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('sw.js').catch(err => console.log(err));
  });
}

let activeBudgetData = {};
const orcDateEl = document.getElementById('orcDate');
if (orcDateEl) orcDateEl.valueAsDate = new Date();
const formSection = document.getElementById('budgetFormSection');

window.toggleBudgetForm = function(forceShow = false) {
  if (forceShow || formSection.style.display === 'none') {
    formSection.style.display = 'block';
    window.scrollTo({ top: formSection.offsetTop - 80, behavior: 'smooth' });
  } else {
    formSection.style.display = 'none';
    resetForm();
  }
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

window.atualizarTermosCompletos = function() {
  const checkboxes = document.querySelectorAll('.term-check');
  let selecionados = [];
  checkboxes.forEach(cb => { if (cb.checked) selecionados.push(cb.value); });

  const checkNotInc = document.getElementById('checkNotIncluded');
  const textNotInc = document.getElementById('orcNotIncludedText');
  if (checkNotInc && checkNotInc.checked && textNotInc) {
    const val = textNotInc.value.trim() !== '' ? textNotInc.value.trim() : textNotInc.placeholder;
    selecionados.push(`Não estão inclusos: ${val}`);
  }

  const orcTermsEl = document.getElementById('orcTerms');
  if (orcTermsEl) orcTermsEl.value = selecionados.join('\n');
};

async function loadClientsSelect() {
  const select = document.getElementById('orcClient');
  if (!select) return;
  try {
    const clients = await DataSync.load('rg_clients') || [];
    select.innerHTML = '<option value="">Selecione um cliente...</option>';
    clients.forEach(c => {
      select.innerHTML += `<option value="${escapeHTML(c.name)}">${escapeHTML(c.name)}</option>`;
    });
  } catch (e) {}
}

async function renderBudgets() {
  const container = document.getElementById('budgetCardsContainer');
  if (!container) return;

  try {
    let budgets = await DataSync.load('rg_orcamentos') || [];
    if (!Array.isArray(budgets)) budgets = [];

    container.innerHTML = '';
    if (budgets.length === 0) {
      container.innerHTML = '<div style="grid-column: 1 / -1; text-align: center; background: #FFF; padding: 30px; border-radius: 8px; border: 1px dashed #CBD5E1;"><p style="color: #64748B; margin-bottom: 10px;">Nenhum orçamento registado.</p><button class="btn" style="background-color: #0B132B; color: #FFF; padding: 8px 16px;" onclick="toggleBudgetForm(true)">+ Criar o primeiro orçamento</button></div>';
      return;
    }

    let htmlCards = '';
    for (let i = budgets.length - 1; i >= 0; i--) {
      const b = budgets[i];
      if (!b) continue;

      const safeNum = escapeHTML(b.number || 'ORC-0001');
      const safeDate = escapeHTML(b.date || '-');
      const safeClient = escapeHTML(b.client || '-');
      const safeEquipment = escapeHTML(b.equipment || '-');
      const safeTotal = Number(b.total || 0).toFixed(2);

      htmlCards += `
        <div style="background: #FFFFFF; border: 1px solid #E2E8F0; border-top: 4px solid var(--tech-blue, #2563EB); border-radius: 6px; padding: 12px; box-shadow: 0 2px 4px rgba(0,0,0,0.05); display: flex; flex-direction: column; justify-content: space-between; height: 100%; min-height: 160px; overflow: hidden;">
          <div style="overflow: hidden;">
            <h3 style="margin: 0 0 10px 0; color: #0B132B; font-size: 1.1rem; border-bottom: 1px solid #F1F5F9; padding-bottom: 6px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;" title="${safeNum} - ${safeDate}">
              ${safeNum} <span style="font-size: 0.85rem; color: #64748B; font-weight: normal;">| ${safeDate}</span>
            </h3>
            <div style="display: flex; align-items: center; gap: 8px; margin: 5px 0; font-size: 0.85rem; color: #475569;">
              <i class="fa-solid fa-building" style="color: #94A3B8; width: 14px; text-align: center; flex-shrink: 0;"></i>
              <span style="white-space: nowrap; overflow: hidden; text-overflow: ellipsis;" title="${safeClient}">${safeClient}</span>
            </div>
            <div style="display: flex; align-items: center; gap: 8px; margin: 5px 0; font-size: 0.85rem; color: #475569;">
              <i class="fa-solid fa-gear" style="color: #94A3B8; width: 14px; text-align: center; flex-shrink: 0;"></i>
              <span style="white-space: nowrap; overflow: hidden; text-overflow: ellipsis;" title="${safeEquipment}">${safeEquipment}</span>
            </div>
            <div style="display: flex; align-items: center; gap: 8px; margin: 5px 0; font-size: 0.85rem; color: #0D9488; font-weight: bold;">
              <i class="fa-solid fa-tag" style="color: #94A3B8; width: 14px; text-align: center; flex-shrink: 0;"></i>
              <span>R$ ${safeTotal}</span>
            </div>
          </div>
          <div class="no-print" style="display: flex; gap: 6px; margin-top: 12px; padding-top: 10px; border-top: 1px solid #F1F5F9;">
            <button class="btn" style="flex: 1.5; padding: 6px 0; font-size: 0.8rem; background-color: #1D4ED8; color: white; border: none; border-radius: 4px; font-weight: bold;" onclick="openBudgetPreview(${i})">Gerar PDF</button>
            <button class="btn" style="flex: 1; padding: 6px 0; font-size: 0.8rem; background-color: #F59E0B; color: white; border: none; border-radius: 4px; font-weight: bold;" onclick="editBudget(${i})">Editar</button>
            <button class="btn" style="flex: 1; padding: 6px 0; font-size: 0.8rem; background-color: #EF4444; color: white; border: none; border-radius: 4px; font-weight: bold;" onclick="deleteBudget(${i})">Excluir</button>
          </div>
        </div>
      `;
    }
    container.innerHTML = htmlCards;
  } catch (err) {
    console.error(err);
    container.innerHTML = `<p style="grid-column: 1 / -1; text-align: center; color: red; font-weight: bold;">Erro: ${err.message || 'Falha ao processar os dados.'}</p>`;
  }
}

const budgetFormEl = document.getElementById('budgetForm');
if (budgetFormEl) {
  budgetFormEl.addEventListener('submit', async (e) => {
    e.preventDefault();
    const editIndex = document.getElementById('editIndex').value;
    const newBudget = {
      number: document.getElementById('orcNumber').value,
      date: document.getElementById('orcDate').value,
      client: document.getElementById('orcClient').value,
      equipment: document.getElementById('orcEquipment').value,
      desc: document.getElementById('orcDesc').value,
      paymentOption: document.getElementById('orcPaymentOption').value,
      total: document.getElementById('orcTotal').value,
      terms: document.getElementById('orcTerms').value
    };

    try {
      let budgets = await DataSync.load('rg_orcamentos') || [];
      if (!Array.isArray(budgets)) budgets = [];
      if (editIndex !== '') {
        budgets[editIndex] = newBudget;
      } else {
        budgets.push(newBudget);
      }
      await DataSync.save('rg_orcamentos', budgets);
      resetForm();
      formSection.style.display = 'none';
      renderBudgets();
      alert('Orçamento salvo e sincronizado com sucesso!');
    } catch (err) {
      alert('Erro ao salvar orçamento: ' + err.message);
    }
  });
}

window.resetForm = async function() {
  document.getElementById('budgetForm').reset();
  document.getElementById('editIndex').value = '';
  document.getElementById('formTitle').textContent = 'Novo Orçamento';
  const orcDateElem = document.getElementById('orcDate');
  if (orcDateElem) orcDateElem.valueAsDate = new Date();
  document.querySelectorAll('.term-check').forEach(cb => cb.checked = true);
  document.getElementById('checkNotIncluded').checked = true;
  document.getElementById('orcNotIncludedText').value = "";
  atualizarTermosCompletos();

  try {
    let budgets = await DataSync.load('rg_orcamentos') || [];
    document.getElementById('orcNumber').value = `ORC-${String(budgets.length + 1).padStart(4, '0')}`;
  } catch (e) {}

  formSection.style.display = 'none';
  window.scrollTo({ top: 0, behavior: 'smooth' });
};

window.editBudget = async function(index) {
  try {
    let budgets = await DataSync.load('rg_orcamentos') || [];
    const b = budgets[index];
    if (!b) return;

    document.getElementById('editIndex').value = index;
    document.getElementById('formTitle').textContent = `Editar Orçamento - ${b.number}`;
    document.getElementById('orcNumber').value = b.number;
    document.getElementById('orcDate').value = b.date;
    document.getElementById('orcClient').value = b.client;
    document.getElementById('orcEquipment').value = b.equipment;
    document.getElementById('orcDesc').value = b.desc;
    document.getElementById('orcPaymentOption').value = b.paymentOption || 'banco1';
    document.getElementById('orcTotal').value = b.total;
    document.getElementById('orcTerms').value = b.terms;

    const currentTerms = b.terms || '';
    document.querySelectorAll('.term-check').forEach(cb => {
      cb.checked = currentTerms.includes(cb.value);
    });

    if (currentTerms.includes("Não estão inclusos:")) {
      document.getElementById('checkNotIncluded').checked = true;
      const parts = currentTerms.split("Não estão inclusos:");
      if (parts[1]) document.getElementById('orcNotIncludedText').value = parts[1].trim();
    } else {
      document.getElementById('checkNotIncluded').checked = false;
      document.getElementById('orcNotIncludedText').value = "";
    }
    toggleBudgetForm(true);
  } catch (e) {
    alert('Erro ao carregar orçamento para edição.');
  }
};

window.deleteBudget = async function(index) {
  if (confirm('Deseja realmente excluir este orçamento?')) {
    try {
      let budgets = await DataSync.load('rg_orcamentos') || [];
      budgets.splice(index, 1);
      await DataSync.save('rg_orcamentos', budgets);
      renderBudgets();
    } catch (e) {
      alert('Erro ao excluir orçamento.');
    }
  }
};

window.openBudgetPreview = async function(index) {
  let budgets = await DataSync.load('rg_orcamentos') || [];
  const b = budgets[index];
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
    if (configDoc.exists) {
      config = { ...defaultConfig, ...configDoc.data() };
    }
  } catch (e) {}

  let clients = await DataSync.load('rg_clients') || [];
  const clientObj = clients.find(c => c.name === b.client) || {};

  activeBudgetData = b;
  document.getElementById('modalTitleOrc').textContent = `Orçamento - ${b.number || 'ORC-0001'}`;
  document.getElementById('loadingStatusOrc').textContent = '⏳ A preparar visualização...';

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

  const renderArea = document.getElementById('budgetRenderArea');
  renderArea.innerHTML = `
    <div class="print-body">
      <div class="watermark">${escapeHTML(config.name)}</div>
      <div class="print-header">
        <img src="${logoSrc}" alt="Logo" style="max-height: 30px; width: auto; max-width: 120px; object-fit: contain;">

        <div class="print-header-center"><h1>ORÇAMENTO DE SERVIÇO</h1></div>
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
            <p><strong>Endereço:</strong> ${escapeHTML(clientObj.address || clientObj.morada || '-')}</p>
            <p><strong>Contacto:</strong> ${escapeHTML(clientObj.phone || clientObj.telefone || '-')}</p>
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
        <p style="font-size: 11px; font-weight: bold; color: var(--deep-navy, #0B132B);">VALOR TOTAL DO ORÇAMENTO: R$ ${Number(b.total || 0).toFixed(2)}</p>
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

  document.getElementById('loadingStatusOrc').textContent = '✅ Pronto';
  document.getElementById('budgetPreviewModal').style.display = 'flex';
};

window.compartilharPDFOrcamento = async function() {
  const element = document.getElementById('budgetRenderArea');
  const statusSpan = document.getElementById('loadingStatusOrc');
  statusSpan.textContent = '⏳ A gerar PDF...';

  const opt = {
    margin: [6, 6, 6, 6],
    filename: `Orcamento_${activeBudgetData.number || '0001'}_${activeBudgetData.client || 'Cliente'}.pdf`,
    image: { type: 'jpeg', quality: 0.98 },
    html2canvas: { scale: 2, useCORS: true, letterRendering: true, scrollY: 0 },
    jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
  };

  try {
    const pdfBlob = await html2pdf().from(element).set(opt).outputPdf('blob');
    const fileName = `Orcamento_${activeBudgetData.number || '0001'}.pdf`;
    const file = new File([pdfBlob], fileName, { type: 'application/pdf' });

    if (navigator.canShare && navigator.canShare({ files: [file] })) {
      statusSpan.textContent = '✅ Pronto a partilhar!';
      await navigator.share({
        files: [file],
        title: `Orçamento ${activeBudgetData.number}`,
        text: `Segue em anexo o orçamento ${activeBudgetData.number} para ${activeBudgetData.client}.`
      });
    } else {
      const blobUrl = URL.createObjectURL(pdfBlob);
      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = fileName;
      link.click();
      statusSpan.textContent = '✅ PDF descarregado';
    }
  } catch (err) {
    if (err.name !== 'AbortError') {
      statusSpan.textContent = '❌ Erro';
    } else {
      statusSpan.textContent = '✅ Cancelado';
    }
  }
};

window.descarregarPDFOrcamento = function() {
  const element = document.getElementById('budgetRenderArea');
  const filename = `Orcamento_${activeBudgetData.number || '0001'}_${activeBudgetData.client || 'Cliente'}.pdf`;
  const statusSpan = document.getElementById('loadingStatusOrc');
  statusSpan.textContent = '⏳ A descarregar...';

  const opt = {
    margin: [6, 6, 6, 6], filename: filename,
    image: { type: 'jpeg', quality: 0.98 },
    html2canvas: { scale: 2, useCORS: true, letterRendering: true, scrollY: 0 },
    jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
  };

  html2pdf().from(element).set(opt).save().then(() => {
    statusSpan.textContent = '✅ Descarregado!';
  });
};

window.closeModal = function() {
  document.getElementById('budgetPreviewModal').style.display = 'none';
};

function escapeHTML(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
