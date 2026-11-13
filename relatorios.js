/**
 * NexOS - Módulo Unificado e Blindado de Relatórios e Orçamentos (relatorios.js)
 * 🛡️ BLINDADO: Padrão CS Code Solutions (Zero Trust Output & DOMPurify)
 */

let listaRelatoriosRS = [];
let listaOrcamentos = [];
let activeReportData = {};
let activeBudgetData = {};

// Variáveis para controlar a exclusão segura
let indexParaExcluir = null;
let tipoDocumentoExcluir = null;

// TRAVA DE SEGURANÇA: Impede múltiplos loops de renderização simultâneos
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

// FUNÇÃO BLINDADA: Se a nuvem demorar mais de 4 segundos, retorna vazio para nunca travar a tela
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
    if (opt1) opt1.textContent =
