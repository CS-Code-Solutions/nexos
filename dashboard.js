/**
 * NexOS - Módulo de Dashboard Analítico e Personalizável (dashboard.js)
 */

let relatoriosGlobais = [];
let manutencoesGlobais = [];
let horasExtrasGlobais = [];
let chartsInstancias = {};

// Configuração padrão com suporte a ordenação de seções e gráficos
const PREFS_DEFAULT = {
  secoes: [
    { id: 'block-quick-actions', label: 'Barra de Ações Rápidas', visible: true },
    { id: 'block-kpis', label: 'Cartões de Indicadores (KPIs)', visible: true },
    { id: 'charts-container', label: 'Painel de Gráficos', visible: true },
    { id: 'widget-preventivas-card', label: 'Radar de Preventivas', visible: true },
    { id: 'widget-ultimos-rs-card', label: 'Lista de Últimos Relatórios', visible: true }
  ],
  graficos: [
    { id: 'card-chart-tipos', label: 'Tipos de Atendimento', visible: true, type: 'doughnut', allowedTypes: ['doughnut', 'pie', 'bar'] },
    { id: 'card-chart-receita', label: 'Composição de Faturamento', visible: true, type: 'bar', allowedTypes: ['bar', 'doughnut', 'polarArea'], sensitive: true },
    { id: 'card-chart-evolucao', label: 'Evolução Mensal (6 Meses)', visible: true, type: 'line', allowedTypes: ['line', 'bar'] },
    { id: 'card-chart-clientes', label: 'Top 5 Clientes Atendidos', visible: true, type: 'bar', allowedTypes: ['bar', 'pie'] }
  ]
};

let prefsTempEdicao = null;

function getPreferenciasDash() {
  try {
    const salvo = localStorage.getItem('nexos_dash_prefs_v2');
    if (salvo) {
      const parsed = JSON.parse(salvo);
      if (Array.isArray(parsed.secoes) && Array.isArray(parsed.graficos)) {
        return parsed;
      }
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
    aplicarLayoutEOrdemDash();
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

  let totalFaturamento = 0;
  let totalMaoDeObra = 0;
  let totalEmpreitada = 0;
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

  const hojeStr = new Date().toISOString().split('T')[0];
  const preventivasAtivas = manutencoesGlobais
    .filter(m => (m.data || '') >= hojeStr)
    .sort((a, b) => new Date(a.data) - new Date(b.data));

  document.getElementById('kpi-preventivas').textContent = preventivasAtivas.length;

  // Renderiza cada gráfico configurado
  prefs.graficos.forEach(g => {
    if (!g.visible) return;
    if (g.id === 'card-chart-tipos') renderChartTipos(relatoriosFiltrados, g.type);
    if (g.id === 'card-chart-receita') renderChartReceita(totalMaoDeObra, totalEmpreitada, totalDespesas, g.type);
    if (g.id === 'card-chart-evolucao') renderChartEvolucao(relatoriosGlobais, g.type);
    if (g.id === 'card-chart-clientes') renderChartClientes(relatoriosFiltrados, g.type);
  });

  renderWidgetPreventivas(preventivasAtivas);
  renderWidgetUltimosRS(relatoriosGlobais);
};

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
// APLICAÇÃO DE VISIBILIDADE E ORDEM NO PAINEL
// =========================================================================

function aplicarLayoutEOrdemDash() {
  const prefs = getPreferenciasDash();

  // Aplica ordem e visibilidade das seções principais
  prefs.secoes.forEach((sec, index) => {
    const el = document.getElementById(sec.id);
    if (!el) return;
    el.style.order = index;
    el.style.display = sec.visible ? '' : 'none';
  });

  // Se apenas um dos widgets laterais (Preventivas ou Últimos RS) estiver visível, expande para largura total
  const prevVisivel = prefs.secoes.find(s => s.id === 'widget-preventivas-card')?.visible;
  const ultVisivel = prefs.secoes.find(s => s.id === 'widget-ultimos-rs-card')?.visible;
  const elPrev = document.getElementById('widget-preventivas-card');
  const elUlt = document.getElementById('widget-ultimos-rs-card');
  if (elPrev && elUlt) {
    elPrev.className = (prevVisivel && !ultVisivel) ? 'card span-12' : 'card span-6';
    elUlt.className = (ultVisivel && !prevVisivel) ? 'card span-12' : 'card span-6';
  }

  // Aplica ordem e visibilidade individual dos gráficos
  prefs.graficos.forEach((g, index) => {
    const el = document.getElementById(g.id);
    if (!el) return;
    el.style.order = index;
    el.style.display = g.visible ? '' : 'none';
  });
}

// =========================================================================
// CONTROLES DO MODAL DE PERSONALIZAÇÃO (VISIBILIDADE + FORMATO + ORDEM)
// =========================================================================

const LABELS_FORMATO = {
  doughnut: 'Rosca (Donut)',
  pie: 'Pizza',
  bar: 'Barras',
  line: 'Linha Suave',
  polarArea: 'Área Polar'
};

function renderizarListasModalConfig() {
  const containerSecoes = document.getElementById('lista-config-secoes');
  const containerGraficos = document.getElementById('lista-config-graficos');
  const isTecnico = localStorage.getItem('rg_user_role') === 'tecnico';

  if (containerSecoes && prefsTempEdicao) {
    containerSecoes.innerHTML = prefsTempEdicao.secoes.map((sec, idx) => `
      <div class="config-row">
        <label class="config-row-left">
          <input type="checkbox" ${sec.visible ? 'checked' : ''} onchange="alterarVisibilidadeItem('secoes', ${idx}, this.checked)">
          <span>${escapeHTML(sec.label)}</span>
        </label>
        <div class="order-btns">
          <button type="button" class="btn-order" title="Subir" ${idx === 0 ? 'disabled' : ''} onclick="moverItemLista('secoes', ${idx}, -1)">
            <i class="fa-solid fa-arrow-up"></i>
          </button>
          <button type="button" class="btn-order" title="Descer" ${idx === prefsTempEdicao.secoes.length - 1 ? 'disabled' : ''} onclick="moverItemLista('secoes', ${idx}, 1)">
            <i class="fa-solid fa-arrow-down"></i>
          </button>
        </div>
      </div>
    `).join('');
  }

  if (containerGraficos && prefsTempEdicao) {
    containerGraficos.innerHTML = prefsTempEdicao.graficos.map((g, idx) => {
      if (isTecnico && g.sensitive) return '';
      const optionsHtml = g.allowedTypes.map(t =>
        `<option value="${t}" ${g.type === t ? 'selected' : ''}>${LABELS_FORMATO[t] || t}</option>`
      ).join('');

      return `
        <div class="config-row">
          <label class="config-row-left">
            <input type="checkbox" ${g.visible ? 'checked' : ''} onchange="alterarVisibilidadeItem('graficos', ${idx}, this.checked)">
            <span>${escapeHTML(g.label)}</span>
          </label>
          <div class="config-row-select">
            <select onchange="alterarFormatoGrafico(${idx}, this.value)">
              ${optionsHtml}
            </select>
          </div>
          <div class="order-btns">
            <button type="button" class="btn-order" title="Subir" ${idx === 0 ? 'disabled' : ''} onclick="moverItemLista('graficos', ${idx}, -1)">
              <i class="fa-solid fa-arrow-up"></i>
            </button>
            <button type="button" class="btn-order" title="Descer" ${idx === prefsTempEdicao.graficos.length - 1 ? 'disabled' : ''} onclick="moverItemLista('graficos', ${idx}, 1)">
              <i class="fa-solid fa-arrow-down"></i>
            </button>
          </div>
        </div>
      `;
    }).join('');
  }
}

window.alterarVisibilidadeItem = function(grupo, index, checked) {
  if (!prefsTempEdicao || !prefsTempEdicao[grupo][index]) return;
  prefsTempEdicao[grupo][index].visible = checked;
};

window.alterarFormatoGrafico = function(index, novoTipo) {
  if (!prefsTempEdicao || !prefsTempEdicao.graficos[index]) return;
  prefsTempEdicao.graficos[index].type = novoTipo;
};

window.moverItemLista = function(grupo, index, direcao) {
  if (!prefsTempEdicao || !prefsTempEdicao[grupo]) return;
  const lista = prefsTempEdicao[grupo];
  const novoIndex = index + direcao;
  if (novoIndex < 0 || novoIndex >= lista.length) return;

  const temp = lista[index];
  lista[index] = lista[novoIndex];
  lista[novoIndex] = temp;

  renderizarListasModalConfig();
};

window.abrirModalEditarDash = function() {
  prefsTempEdicao = getPreferenciasDash();
  renderizarListasModalConfig();
  document.getElementById('modalEditDash').style.display = 'flex';
};

window.fecharModalEditarDash = function() {
  document.getElementById('modalEditDash').style.display = 'none';
};

window.salvarPreferenciasDash = function() {
  if (prefsTempEdicao) {
    localStorage.setItem('nexos_dash_prefs_v2', JSON.stringify(prefsTempEdicao));
  }
  aplicarLayoutEOrdemDash();
  atualizarDashboard();
  fecharModalEditarDash();
};

window.restaurarPadraoDash = function() {
  localStorage.removeItem('nexos_dash_prefs_v2');
  aplicarLayoutEOrdemDash();
  atualizarDashboard();
  fecharModalEditarDash();
};

function escapeHTML(str) {
  if (!str) return '';
  return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#039;');
}
