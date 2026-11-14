/**
 * NexOS - Módulo de Cadastro de Orçamento (novo-orcamento.js)
 * BLINDADO: Padrão CS Code Solutions (Zero Trust Input + Proteção Duplo Clique)
 */

function higienizarTexto(texto) {
  if (typeof texto !== 'string') return texto;
  return texto
    .replace(/<[^>]*>?/gm, '')
    .replace(/[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{1F900}-\u{1F9FF}\u{1FA70}-\u{1FAFF}]/gu, '')
    .trim();
}

document.addEventListener('DOMContentLoaded', () => {
  const dateEl = document.getElementById('orcDate');
  if (dateEl) {
    const agoraLocal = new Date();
    const ano = agoraLocal.getFullYear();
    const mes = String(agoraLocal.getMonth() + 1).padStart(2, '0');
    const dia = String(agoraLocal.getDate()).padStart(2, '0');
    dateEl.value = `${ano}-${mes}-${dia}`;
  }
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
    clients.forEach(c => {
      const nome = c.name || c.nome || '';
      if (nome) select.innerHTML += `<option value="${escapeHTML(nome)}">${escapeHTML(nome)}</option>`;
    });
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

  let rawBudgets = await DataSync.load('rg_orcamentos');
  let budgets = Array.isArray(rawBudgets)
    ? rawBudgets
    : (rawBudgets && typeof rawBudgets === 'object' ? Object.values(rawBudgets).filter(i => i !== null) : []);

  if (editIndex !== null && editIndex !== undefined && budgets[editIndex]) {
    const b = budgets[editIndex];
    document.getElementById('editIndex').value = editIndex;
    document.getElementById('formTitle').textContent = `Editar Orçamento - ${b.number}`;
    document.getElementById('orcNumber').value = b.number || '';
    document.getElementById('orcDate').value = b.date || '';
    document.getElementById('orcClient').value = b.client || '';
    document.getElementById('orcEquipment').value = b.equipment || '';
    document.getElementById('orcDesc').value = b.desc || '';
    document.getElementById('orcPaymentOption').value = b.paymentOption || 'banco1';
    document.getElementById('orcTotal').value = b.total || '';
    document.getElementById('orcTerms').value = b.terms || '';
  } else {
    document.getElementById('orcNumber').value = `ORC-${String(budgets.length + 1).padStart(4, '0')}`;
    atualizarTermosCompletos();
  }
}

const budgetFormEl = document.getElementById('budgetForm');
if (budgetFormEl) {
  budgetFormEl.addEventListener('submit', async (e) => {
    e.preventDefault();
    const submitBtn = budgetFormEl.querySelector('button[type="submit"]');
    const textoOriginalBtn = submitBtn ? submitBtn.textContent : 'Guardar Orçamento';
    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.textContent = 'A guardar...';
    }

    const editIndex = document.getElementById('editIndex').value;

    const newBudget = {
      number: higienizarTexto(document.getElementById('orcNumber').value),
      date: higienizarTexto(document.getElementById('orcDate').value),
      client: higienizarTexto(document.getElementById('orcClient').value),
      equipment: higienizarTexto(document.getElementById('orcEquipment').value),
      desc: higienizarTexto(document.getElementById('orcDesc').value),
      paymentOption: higienizarTexto(document.getElementById('orcPaymentOption').value),
      total: String(parseFloat(document.getElementById('orcTotal').value) || 0),
      terms: higienizarTexto(document.getElementById('orcTerms').value)
    };

    try {
      let rawBudgets = await DataSync.load('rg_orcamentos');
      let budgets = [];
      if (Array.isArray(rawBudgets)) budgets = rawBudgets;
      else if (rawBudgets && typeof rawBudgets === 'object') budgets = Object.values(rawBudgets).filter(i => i !== null);

      if (editIndex !== '') {
        budgets[editIndex] = newBudget;
      } else {
        budgets.push(newBudget);
      }

      await DataSync.save('rg_orcamentos', budgets);

      alert('Orçamento salvo com sucesso!');
      window.location.href = 'relatorios.html';
    } catch (err) {
      alert('Erro Crítico ao salvar orçamento: ' + err.message);
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.textContent = textoOriginalBtn;
      }
    }
  });
}

function escapeHTML(str) {
  if (!str) return '';
  return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#039;');
}
