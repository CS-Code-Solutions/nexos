/**
 * NexOS - Módulo de Cadastro de Orçamento (novo-orcamento.js)
 */

document.addEventListener('DOMContentLoaded', () => {
  const dateEl = document.getElementById('orcDate');
  if (dateEl) dateEl.valueAsDate = new Date();
});

firebase.auth().onAuthStateChanged(async (user) => {
  if (!user) {
    window.location.href = 'login.html';
  } else {
    await carregarClientes();
    await carregarApelidosContas();
    await verificarEdicao();
  }
});

async function carregarClientes() {
  const select = document.getElementById('orcClient');
  if (!select) return;
  try {
    const clients = await DataSync.load('rg_clients') || [];
    select.innerHTML = '<option value="">Selecione um cliente...</option>';
    clients.forEach(c => select.innerHTML += `<option value="${escapeHTML(c.name)}">${escapeHTML(c.name)}</option>`);
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
  document.getElementById('orcTerms').value = selecionados.join('\n');
};

async function verificarEdicao() {
  const urlParams = new URLSearchParams(window.location.search);
  const editIndex = urlParams.get('edit');

  let budgets = await DataSync.load('rg_orcamentos') || [];
  if (!Array.isArray(budgets)) budgets = [];

  if (editIndex !== null && editIndex !== undefined && budgets[editIndex]) {
    const b = budgets[editIndex];
    document.getElementById('editIndex').value = editIndex;
    document.getElementById('formTitle').textContent = `Editar Orçamento - ${b.number}`;
    document.getElementById('orcNumber').value = b.number;
    document.getElementById('orcDate').value = b.date;
    document.getElementById('orcClient').value = b.client;
    document.getElementById('orcEquipment').value = b.equipment;
    document.getElementById('orcDesc').value = b.desc;
    document.getElementById('orcPaymentOption').value = b.paymentOption || 'banco1';
    document.getElementById('orcTotal').value = b.total;
    document.getElementById('orcTerms').value = b.terms;
  } else {
    document.getElementById('orcNumber').value = `ORC-${String(budgets.length + 1).padStart(4, '0')}`;
    atualizarTermosCompletos();
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
      alert('Orçamento salvo com sucesso!');
      window.location.href = 'relatorios.html';
    } catch (err) {
      alert('Erro ao salvar orçamento: ' + err.message);
    }
  });
}

function escapeHTML(str) {
  if (!str) return '';
  return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#039;');
}
