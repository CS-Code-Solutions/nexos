/**
 * NexOS - Módulo de Dashboard Analítico e Personalizável (dashboard.js)
 */

let relatoriosGlobais = [];
let manutencoesGlobais = [];
let horasExtrasGlobais = [];
let chartsInstancias = {};

const PREFS_DEFAULT = {
  showQuick: true,
  showKpis: true,
  showPreventivas: true,
  showUltimos: true,
  chartTipos: { visible: true, type: 'doughnut' },
  chartReceita: { visible: true, type: 'bar' },
  chartEvolucao: { visible: true, type: 'line' },
  chartClientes: { visible: true, type: 'bar' }
};

function getPreferenciasDash() {
  try {
    const salvo = localStorage.getItem('nexos_dash_prefs');
    if (salvo) {
      return { ...PREFS_DEFAULT, ...JSON.parse(salvo) };
    }
  } catch (e) {
    console.warn("Erro ao ler preferências do dashboard:", e);
  }
  return JSON.parse(JSON.stringify(PREFS_DEFAULT));
}

// Autenticação e Sincronização em Tempo Real
firebase.auth().onAuthStateChanged(async (user) => {
  if (!user) {
    window.location.href = 'login.html';
  } else {
    aplicarVisibilidadeBlocos();
    await carregarTodosDadosDashboard();

    DataSync.listen('rg_reports', () => carregarTodosDadosDashboard());
    DataSync.listen('rg_manutencoes', () => carregarTodosDadosDashboard());
    if (localStorage.getItem('rg_mod_horas_extras') === 'true') {
      DataSync.listen('rg_horas_extras', () => carregarTodosDadosDashboard());
    }
  }
});

async function carregarTodosDadosDashboard() {
  try {
    const [reps, manuts, horas] = await Promise.all([
      DataSync.load('rg_reports'),
      DataSync.load('rg_manutencoes'),
      localStorage.getItem('rg_mod_horas_extras') === 'true' ? DataSync.load('rg_horas_extras') : Promise.resolve([])
    ]);

    relatoriosGlobais = Array.isArray(reps) ? reps : [];
    manutencoesGlobais = Array.isArray(manuts) ? manuts : [];
    horasExtrasGlobais = Array.isArray(horas) ? horas : [];

    atualizarDashboard();
  } catch (err) {
    console.error("Erro ao carregar dados do Dashboard:", err);
  }
}

// Filtra relatórios de acordo com o seletor de período
function filtrarPorPeriodo(lista, campoData = 'date') {
  const filtro = document.getElementById('filtroPeriodo')?.value || 'mes_atual';
  if (filtro === 'todos') return lista;

  const hoje = new Date();
  const anoAtual = hoje.getFullYear();
  const mesAtual = hoje.getMonth();

  return lista.filter(item => {
    const dataStr = item[campoData] || item.data || item.createdAt;
    if (!dataStr) return false;
    const d = new Date(dataStr + (dataStr.length === 10 ? 'T12:00:00' : ''));
    if (isNaN(d.getTime())) return false;

    if (filtro === 'mes_atual') {
      return d.getFullYear() === anoAtual && d.getMonth() === mesAtual;
    }
    if (filtro === '30_dias') {
      const limite = new Date();
      limite.setDate(hoje.getDate() - 30);
      return d >= limite;
    }
    if (filtro === 'ano_atual') {
      return d.getFullYear() === anoAtual;
    }
    return true;
  });
}

function formatarMoeda(valor) {
  return (Number(valor) || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function formatarHorasDecimais(horasDec) {
  const totalMin = Math.round((Number(horasDec) || 0) * 60);
  const h = Math.floor(totalMin / 60);
  const m = totalMin % 60;
  return `${h}h ${String(m).padStart(2, '0')}m`;
}

function parseValorNumerico(val) {
  if (typeof val === 'number') return val;
  if (!val) return 0;
  const limpo = String(val).replace(/[R$\s.]/g, '').replace(',', '.');
  return parseFloat(limpo) || 0;
}

window.atualizarDashboard = function() {
  const prefs = getPreferenciasDash();
  const relatoriosFiltrados = filtrarPorPeriodo(relatoriosGlobais, 'date');
  const horasFiltradas = filtrarPorPeriodo(horasExtrasGlobais, 'data');

  // 1. CÁLCULO DOS INDICADORES (KPIs)
  let totalFaturamento = 0;
  let totalMaoDeObra = 0;
  let totalEmpreitada = 0;
  let totalDeslocamento = 0;
  let totalDespesas = 0;
  let totalHorasTrab = 0;

  relatoriosFiltrados.forEach(r => {
    const vTotal = parseValorNumerico(r.totalValue || r.valorTotal || r.total);
    const vEmpreitada = parseValorNumerico(r.valorEmpreitada);
    const vDesloc = parseValorNumerico(r.valorDeslocamento);
    const vHosp = parseValorNumerico(r.valorHospedagem);
    const vOutras = parseValorNumerico(r.valorOutrasDespesas || r.outrasDespesas);
    const vHoras = parseValorNumerico(r.valorHoras);

    const despesasItem = vDesloc + vHosp + vOutras;
    totalDespesas += despesasItem;
    totalDeslocamento += vDesloc;

    if (vTotal > 0) {
      totalFaturamento += vTotal;
      if (vEmpreitada > 0) {
        totalEmpreitada += vEmpreitada;
      } else {
        totalMaoDeObra += Math.max(0, vTotal - despesasItem);
      }
    } else {
      const somaCalculada = vHoras + vEmpreitada + despesasItem;
      totalFaturamento += somaCalculada;
      totalMaoDeObra += vHoras;
      totalEmpreitada += vEmpreitada;
    }

    // Soma horas trabalhadas apontadas no relatório
    const hApontadas = parseValorNumerico(r.totalHoras || r.horasTrabalhadas);
    totalHorasTrab += hApontadas;
  });

  let totalHorasExtras = 0;
  horasFiltradas.forEach(h => {
    totalHorasExtras += parseValorNumerico(h.totalHoras || h.quantidade || h.horas);
  });

  document.getElementById('kpi-faturamento').textContent = formatarMoeda(totalFaturamento);
  document.getElementById('kpi-reembolsos').textContent = `Reembolsos/Viagem: ${formatarMoeda(totalDespesas)}`;
  document.getElementById('kpi-total-rs').textContent = relatoriosFiltrados.length;
  document.getElementById('kpi-horas-totais').textContent = formatarHorasDecimais(totalHorasTrab);
  document.getElementById('kpi-horas-extras').textContent = formatarHorasDecimais(totalHorasExtras);

  // Preventivas futuras ou de hoje
  const hojeStr = new Date().toISOString().split('T')[0];
  const preventivasAtivas = manutencoesGlobais
    .filter(m => (m.data || '') >= hojeStr)
    .sort((a, b) => new Date(a.data) - new Date(b.data));

  document.getElementById('kpi-preventivas').textContent = preventivasAtivas.length;

  // 2. RENDERIZA OS GRÁFICOS CONFORME PREFERÊNCIAS
  if (prefs.chartTipos.visible) renderChartTipos(relatoriosFiltrados, prefs.chartTipos.type);
  if (prefs.chartReceita.visible) renderChartReceita(totalMaoDeObra, totalEmpreitada, totalDespesas, prefs.chartReceita.type);
  if (prefs.chartEvolucao.visible) renderChartEvolucao(relatoriosGlobais, prefs.chartEvolucao.type);
  if (prefs.chartClientes.visible) renderChartClientes(relatoriosFiltrados, prefs.chartClientes.type);

  // 3. RENDERIZA WIDGETS OPERACIONAIS
  renderWidgetPreventivas(preventivasAtivas);
  renderWidgetUltimosRS(relatoriosGlobais);
};

// Destrói gráfico anterior antes de desenhar o novo formato
function recriarCanvasChart(canvasId, config) {
  const ctx = document.getElementById(canvasId);
  if (!ctx) return;
  if (chartsInstancias[canvasId]) {
    chartsInstancias[canvasId].destroy();
  }
  chartsInstancias[canvasId] = new Chart(ctx, config);
}

function renderChartTipos(lista, tipoChart) {
  const contagem = {};
  lista.forEach(r => {
    const tipo = r.serviceType || r.tipoServico || r.tipo || 'Manutenção Geral';
    contagem[tipo] = (contagem[tipo] || 0) + 1;
  });

  const labels = Object.keys(contagem).length ? Object.keys(contagem) : ['Sem registros'];
  const valores = Object.keys(contagem).length ? Object.values(contagem) : [0];

  recriarCanvasChart('canvasChartTipos', {
    type: tipoChart,
    data: {
      labels,
      datasets: [{
        label: 'Atendimentos',
        data: valores,
        backgroundColor: ['#00B89E', '#3B82F6', '#F59E0B', '#8B5CF6', '#EF4444', '#10B981'],
        borderWidth: 1
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { position: 'bottom' } }
    }
  });
}

function renderChartReceita(maoDeObra, empreitada, despesas, tipoChart) {
  recriarCanvasChart('canvasChartReceita', {
    type: tipoChart,
    data: {
      labels: ['Horas Técnicas', 'Empreitada', 'Desloc./Despesas'],
      datasets: [{
        label: 'Valor (R$)',
        data: [maoDeObra, empreitada, despesas],
        backgroundColor: ['#10B981', '#0B132B', '#F59E0B'],
        borderRadius: 6
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { display: tipoChart !== 'bar' } }
    }
  });
}

function renderChartEvolucao(todosRelatorios, tipoChart) {
  const mesesLabels = [];
  const chavesMes = [];
  const hoje = new Date();

  for (let i = 5; i >= 0; i--) {
    const d = new Date(hoje.getFullYear(), hoje.getMonth() - i, 1);
    const chave = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    const nomeMes = d.toLocaleDateString('pt-BR', { month: 'short' }).replace('.', '');
    mesesLabels.push(nomeMes.toUpperCase());
    chavesMes.push(chave);
  }

  const contagemPorMes = chavesMes.map(chave => {
    return todosRelatorios.filter(r => (r.date || r.data || '').startsWith(chave)).length;
  });

  recriarCanvasChart('canvasChartEvolucao', {
    type: tipoChart,
    data: {
      labels: mesesLabels,
      datasets: [{
        label: 'Relatórios Emitidos',
        data: contagemPorMes,
        borderColor: '#8B5CF6',
        backgroundColor: 'rgba(139, 92, 246, 0.2)',
        fill: true,
        tension: 0.35,
        borderRadius: 6
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      scales: { y: { beginAtZero: true, ticks: { precision: 0 } } }
    }
  });
}

function renderChartClientes(lista, tipoChart) {
  const porCliente = {};
  lista.forEach(r => {
    const cli = r.client || r.cliente || 'Não informado';
    porCliente[cli] = (porCliente[cli] || 0) + 1;
  });

  const top5 = Object.entries(porCliente)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);

  const labels = top5.length ? top5.map(i => i[0]) : ['Sem dados'];
  const valores = top5.length ? top5.map(i => i[1]) : [0];

  recriarCanvasChart('canvasChartClientes', {
    type: tipoChart,
    data: {
      labels,
      datasets: [{
        label: 'Qtd. Relatórios',
        data: valores,
        backgroundColor: ['#0B132B', '#00B89E', '#3B82F6', '#F59E0B', '#64748B'],
        borderRadius: 6
      }]
    },
    options: {
      indexAxis: tipoChart === 'bar' ? 'y' : 'x',
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { display: tipoChart !== 'bar' } },
      scales: tipoChart === 'bar' ? { x: { beginAtZero: true, ticks: { precision: 0 } } } : {}
    }
  });
}

function renderWidgetPreventivas(lista) {
  const container = document.getElementById('lista-radar-preventivas');
  if (!container) return;

  if (!lista.length) {
    container.innerHTML = '<p style="color: #64748B; font-size: 0.85rem; text-align: center; padding: 15px 0;">Nenhuma preventiva próxima agendada.</p>';
    return;
  }

  container.innerHTML = lista.slice(0, 4).map(item => {
    const parts = (item.data || '').split('-');
    const dataBR = parts.length === 3 ? `${parts[2]}/${parts[1]}/${parts[0]}` : item.data;
    return `
      <div class="widget-item">
        <div>
          <strong style="color: #0B132B; font-size: 0.88rem; display: block;">${escapeHTML(item.cliente)}</strong>
          <span style="font-size: 0.78rem; color: #64748B;"><i class="fa-solid fa-calendar"></i> ${dataBR} • ${escapeHTML(item.maquina || item.tipo || 'Preventiva')}</span>
        </div>
        <button type="button" onclick="iniciarRSDoDashboard('${escapeHTML(item.cliente)}', '${escapeHTML(item.maquina || '')}', '${escapeHTML(item.tipo || 'Preventiva')}')" style="background: #10B981; color: #FFF; border: none; padding: 6px 10px; border-radius: 5px; font-size: 0.78rem; font-weight: bold; cursor: pointer; white-space: nowrap;">
          Gerar RS
        </button>
      </div>
    `;
  }).join('');
}

window.iniciarRSDoDashboard = function(cliente, maquina, tipo) {
  localStorage.setItem('rg_preencher_rs', JSON.stringify({
    client: cliente,
    machine: maquina,
    description: `Manutenção Planeada (${tipo})`
  }));
  window.location.href = 'novo-relatorio.html';
};

function renderWidgetUltimosRS(lista) {
  const container = document.getElementById('lista-ultimos-rs');
  if (!container) return;

  if (!lista.length) {
    container.innerHTML = '<p style="color: #64748B; font-size: 0.85rem; text-align: center; padding: 15px 0;">Nenhum relatório emitido ainda.</p>';
    return;
  }

  const ordenados = [...lista].sort((a, b) => new Date(b.date || b.data || 0) - new Date(a.date || a.data || 0)).slice(0, 4);

  container.innerHTML = ordenados.map(r => {
    const dataStr = r.date || r.data || '';
    const parts = dataStr.split('-');
    const dataBR = parts.length === 3 ? `${parts[2]}/${parts[1]}/${parts[0]}` : dataStr;
    return `
      <div class="widget-item">
        <div>
          <strong style="color: #0B132B; font-size: 0.88rem; display: block;">${escapeHTML(r.client || r.cliente || 'Cliente')}</strong>
          <span style="font-size: 0.78rem; color: #64748B;">${dataBR} • ${escapeHTML(r.machine || r.maquina || 'Equipamento')}</span>
        </div>
        <a href="relatorios.html" style="background: #E0F2FE; color: #0369A1; padding: 5px 10px; border-radius: 5px; font-size: 0.78rem; font-weight: bold; text-decoration: none;">
          Abrir
        </a>
      </div>
    `;
  }).join('');
}

// =========================================================================
// CONTROLES DO MODAL DE PERSONALIZAÇÃO DO DASHBOARD
// =========================================================================

function aplicarVisibilidadeBlocos() {
  const prefs = getPreferenciasDash();

  const toggleEl = (id, show) => {
    const el = document.getElementById(id);
    if (el) el.style.display = show ? '' : 'none';
  };

  toggleEl('block-quick-actions', prefs.showQuick);
  toggleEl('block-kpis', prefs.showKpis);
  toggleEl('widget-preventivas-card', prefs.showPreventivas);
  toggleEl('widget-ultimos-rs-card', prefs.showUltimos);

  toggleEl('card-chart-tipos', prefs.chartTipos.visible);
  toggleEl('card-chart-receita', prefs.chartReceita.visible);
  toggleEl('card-chart-evolucao', prefs.chartEvolucao.visible);
  toggleEl('card-chart-clientes', prefs.chartClientes.visible);
}

window.abrirModalEditarDash = function() {
  const prefs = getPreferenciasDash();

  document.getElementById('cfg-show-quick').checked = prefs.showQuick;
  document.getElementById('cfg-show-kpis').checked = prefs.showKpis;
  document.getElementById('cfg-show-preventivas').checked = prefs.showPreventivas;
  document.getElementById('cfg-show-ultimos').checked = prefs.showUltimos;

  document.getElementById('cfg-chart-tipos').checked = prefs.chartTipos.visible;
  document.getElementById('type-chart-tipos').value = prefs.chartTipos.type;

  document.getElementById('cfg-chart-receita').checked = prefs.chartReceita.visible;
  document.getElementById('type-chart-receita').value = prefs.chartReceita.type;

  document.getElementById('cfg-chart-evolucao').checked = prefs.chartEvolucao.visible;
  document.getElementById('type-chart-evolucao').value = prefs.chartEvolucao.type;

  document.getElementById('cfg-chart-clientes').checked = prefs.chartClientes.visible;
  document.getElementById('type-chart-clientes').value = prefs.chartClientes.type;

  document.getElementById('modalEditDash').style.display = 'flex';
};

window.fecharModalEditarDash = function() {
  document.getElementById('modalEditDash').style.display = 'none';
};

window.salvarPreferenciasDash = function() {
  const novasPrefs = {
    showQuick: document.getElementById('cfg-show-quick').checked,
    showKpis: document.getElementById('cfg-show-kpis').checked,
    showPreventivas: document.getElementById('cfg-show-preventivas').checked,
    showUltimos: document.getElementById('cfg-show-ultimos').checked,
    chartTipos: {
      visible: document.getElementById('cfg-chart-tipos').checked,
      type: document.getElementById('type-chart-tipos').value
    },
    chartReceita: {
      visible: document.getElementById('cfg-chart-receita').checked,
      type: document.getElementById('type-chart-receita').value
    },
    chartEvolucao: {
      visible: document.getElementById('cfg-chart-evolucao').checked,
      type: document.getElementById('type-chart-evolucao').value
    },
    chartClientes: {
      visible: document.getElementById('cfg-chart-clientes').checked,
      type: document.getElementById('type-chart-clientes').value
    }
  };

  localStorage.setItem('nexos_dash_prefs', JSON.stringify(novasPrefs));
  aplicarVisibilidadeBlocos();
  atualizarDashboard();
  fecharModalEditarDash();
};

window.restaurarPadraoDash = function() {
  localStorage.removeItem('nexos_dash_prefs');
  aplicarVisibilidadeBlocos();
  atualizarDashboard();
  fecharModalEditarDash();
};

function escapeHTML(str) {
  if (!str) return '';
  return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#039;');
}
