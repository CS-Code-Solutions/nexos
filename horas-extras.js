/**
 * NexOS - Módulo de Registo de Horas Extras (horas-extras.js)
 * BLINDADO: Padrão CS Code Solutions (Zero Trust Input + Proteção Duplo Clique)
 */

function higienizarTexto(texto) {
  if (typeof texto !== 'string') return texto;
  return texto
    .replace(/<[^>]*>?/gm, '')
    .replace(/[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{1F900}-\u{1F9FF}\u{1FA70}-\u{1FAFF}]/gu, '')
    .trim();
}

firebase.auth().onAuthStateChanged(async (user) => {
  if (!user) {
    window.location.href = 'login.html';
  } else {
    await loadHorasExtras();
    DataSync.listen('rg_horas_extras', () => loadHorasExtras());
  }
});

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('sw.js').catch(err => console.log(err));
  });
}

const hoje = new Date();
const heDateElem = document.getElementById('he-date');
if (heDateElem) heDateElem.valueAsDate = hoje;
const anoAtual = hoje.getFullYear();
const mesAtual = String(hoje.getMonth() + 1).padStart(2, '0');
const relMesAnoElem = document.getElementById('rel-mes-ano');
if (relMesAnoElem) relMesAnoElem.value = `${anoAtual}-${mesAtual}`;

let allHE = [];
let editingHEId = null;

const heFormSection = document.getElementById('heFormSection');
const heForm = document.getElementById('he-form');
const formTitle = document.getElementById('form-title');
const btnSubmitHE = document.getElementById('btn-submit-he');
const btnCancelEdit = document.getElementById('btn-cancel-edit');

window.toggleHEForm = function(forceShow = false) {
  if (forceShow || heFormSection.style.display === 'none') {
    heFormSection.style.display = 'block';
    window.scrollTo({ top: heFormSection.offsetTop - 80, behavior: 'smooth' });
  } else {
    heFormSection.style.display = 'none';
    resetForm();
  }
};

function formatDateBR(dateStr) {
  if (!dateStr) return 'N/A';
  const parts = dateStr.split('-');
  if (parts.length === 3) {
    return `${parts[2]}/${parts[1]}/${parts[0]}`;
  }
  return dateStr;
}

function formatDateTimeBR(isoString) {
  if (!isoString) return 'N/A';
  const [datePart, timePart] = isoString.split('T');
  if (!datePart || !timePart) return isoString;
  const [ano, mes, dia] = datePart.split('-');
  return `${dia}/${mes}/${ano} ${timePart}`;
}

function calcularMinutosHE(startM, endM, startT, endT, valorHora = 38.63) {
  let minutosTotais = 0;

  if (startM && endM) {
    const diffM = new Date(endM) - new Date(startM);
    if (diffM > 0) minutosTotais += diffM / (1000 * 60);
  }

  if (startT && endT) {
    const diffT = new Date(endT) - new Date(startT);
    if (diffT > 0) minutosTotais += diffT / (1000 * 60);
  }

  if (minutosTotais < 0) minutosTotais = 0;

  const horasDecimais = minutosTotais / 60;
  const valorTotal = horasDecimais * Number(valorHora);

  const horasExatas = Math.floor(minutosTotais / 60);
  const minutosRestantes = Math.round(minutosTotais % 60);

  return {
    horasDecimais: horasDecimais.toFixed(2),
    totalHoursText: `${horasExatas}h ${minutosRestantes}m`,
    valorTotal: valorTotal.toFixed(2)
  };
}

async function loadHorasExtras() {
  const listDiv = document.getElementById('he-list');
  if (!listDiv) return;

  try {
    allHE = await DataSync.load('rg_horas_extras') || [];
    if (!Array.isArray(allHE)) allHE = [];
    allHE.sort((a, b) => new Date(b.date) - new Date(a.date));

    listDiv.innerHTML = "";

    if (allHE.length === 0) {
      listDiv.innerHTML = "<div style='grid-column: 1 / -1; text-align: center; background: #FFF; padding: 30px; border-radius: 8px; border: 1px dashed #CBD5E1;'><p style='color: #64748B; margin-bottom: 10px;'>Nenhum registo de hora extra encontrado.</p><button class='btn' style='background-color: #0B132B; color: #FFF; padding: 8px 16px;' onclick='toggleHEForm(true)'>+ Criar o primeiro registo</button></div>";
      return;
    }

    let html = "";
    allHE.forEach((item, index) => {
      const dataFormatada = formatDateBR(item.date);
      const itemKey = escapeHTML(String(item.id || index));

      const inicioM = item.timeStartManha || item.start;
      const fimM = item.timeEndManha;
      const inicioT = item.timeStartTarde;
      const fimT = item.timeEndTarde || (item.end !== item.start ? item.end : null);

      let turnosHtml = '';
      if (inicioM && fimM) {
        turnosHtml += `<p style="margin: 3px 0; font-size: 0.85rem; color: #475569;"><strong>Manhã:</strong> ${escapeHTML(formatDateTimeBR(inicioM))} às ${escapeHTML(formatDateTimeBR(fimM))}</p>`;
      }
      if (inicioT && fimT) {
        turnosHtml += `<p style="margin: 3px 0; font-size: 0.85rem; color: #475569;"><strong>Tarde:</strong> ${escapeHTML(formatDateTimeBR(inicioT))} às ${escapeHTML(formatDateTimeBR(fimT))}</p>`;
      }
      if (!turnosHtml && inicioM) {
        turnosHtml = `<p style="margin: 3px 0; font-size: 0.85rem; color: #475569;"><strong>Período:</strong> ${escapeHTML(formatDateTimeBR(inicioM))} ${item.end ? 'às ' + escapeHTML(formatDateTimeBR(item.end)) : ''}</p>`;
      }

      html += `
        <div class="nexos-fade-in" style="background: #FFFFFF; border: 1px solid #E2E8F0; border-top: 4px solid var(--tech-blue); border-radius: 6px; padding: 12px; box-shadow: 0 2px 4px rgba(0,0,0,0.05); display: flex; flex-direction: column; justify-content: space-between;">
          <div>
            <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 8px; border-bottom: 1px solid #F1F5F9; padding-bottom: 6px;">
              <strong style="font-size: 1rem; color: #0B132B;">Data: ${escapeHTML(dataFormatada)}</strong>
              <span style="background: #10B981; color: white; padding: 2px 6px; border-radius: 4px; font-size: 0.8rem; font-weight: bold;">R$ ${escapeHTML(String(item.totalValue || '0.00'))}</span>
            </div>
            ${turnosHtml}
            <p style="margin: 4px 0; font-size: 0.85rem; color: #0D9488; font-weight: bold;"><strong>Duração:</strong> ${escapeHTML(item.totalHoursText || '0h')}</p>
            <p style="margin: 4px 0; font-size: 0.85rem; color: #475569;"><strong>Motivo:</strong> ${escapeHTML(item.reason || 'Sem motivo')}</p>
          </div>
          <div style="display: flex; gap: 6px; margin-top: 12px; padding-top: 10px; border-top: 1px solid #F1F5F9;">
            <button type="button" class="btn" style="flex: 1; padding: 6px 0; font-size: 0.8rem; background-color: #F59E0B; color: white; border: none; border-radius: 4px; font-weight: bold;" onclick="prepararEdicaoHE('${itemKey}')">Editar</button>
            <button type="button" class="btn" style="flex: 1; padding: 6px 0; font-size: 0.8rem; background-color: #EF4444; color: white; border: none; border-radius: 4px; font-weight: bold;" onclick="excluirHE('${itemKey}')">Excluir</button>
          </div>
        </div>
      `;
    });
    listDiv.innerHTML = html;
  } catch (error) {
    console.error("Erro ao carregar:", error);
    listDiv.innerHTML = `<p style='color: red; grid-column: 1 / -1; text-align: center;'>Erro ao carregar dados: ${escapeHTML(error.message)}</p>`;
  }
}

window.prepararEdicaoHE = function(idOrIndex) {
  const item = allHE.find(h => (h.id && String(h.id) === String(idOrIndex)) || allHE.indexOf(h) == idOrIndex);
  if (!item) return;

  editingHEId = item.id || idOrIndex;
  document.getElementById('he-date').value = item.date || '';
  document.getElementById('he-valor-hora').value = item.valorHora || 38.63;

  document.getElementById('he-start-manha').value = item.timeStartManha || item.start || '';
  document.getElementById('he-end-manha').value = item.timeEndManha || '';
  document.getElementById('he-start-tarde').value = item.timeStartTarde || '';
  document.getElementById('he-end-tarde').value = item.timeEndTarde || (item.end !== item.start ? item.end : '');

  document.getElementById('he-reason').value = item.reason || '';

  if (formTitle) formTitle.textContent = "Editar Registo de Hora Extra";
  if (btnSubmitHE) btnSubmitHE.textContent = "Atualizar Registo";
  if (btnCancelEdit) btnCancelEdit.style.display = "inline-block";

  toggleHEForm(true);
};

window.resetForm = function() {
  editingHEId = null;
  if (heForm) heForm.reset();
  const heDateElem2 = document.getElementById('he-date');
  if (heDateElem2) heDateElem2.valueAsDate = new Date();
  const heValHora = document.getElementById('he-valor-hora');
  if (heValHora) heValHora.value = 38.63;
  if (formTitle) formTitle.textContent = "Adicionar Registo Manual";
  if (btnSubmitHE) {
    btnSubmitHE.disabled = false;
    btnSubmitHE.textContent = "Guardar Hora Extra";
  }
  if (btnCancelEdit) btnCancelEdit.style.display = "none";
  if (heFormSection) heFormSection.style.display = 'none';
};

const btnGerarExcel = document.getElementById('btn-gerar-excel');
if (btnGerarExcel) {
  btnGerarExcel.addEventListener('click', () => {
    const mesAnoValor = document.getElementById('rel-mes-ano').value;
    if (!mesAnoValor) {
      alert("Por favor, selecione o mês e o ano!");
      return;
    }

    const [anoSel, mesSel] = mesAnoValor.split('-');
    const itensDoMes = allHE.filter(item => {
      if (!item.date) return false;
      return item.date.startsWith(`${anoSel}-${mesSel}`);
    });

    if (itensDoMes.length === 0) {
      alert(`Não existem registos para o mês ${mesSel}/${anoSel}!`);
      return;
    }

    itensDoMes.sort((a, b) => new Date(a.date) - new Date(b.date));

    let dadosExcel = [];
    let somaValorTotal = 0;

    itensDoMes.forEach(item => {
      let periodoStr = "";
      const inicioM = item.timeStartManha || item.start;
      const fimM = item.timeEndManha;
      const inicioT = item.timeStartTarde;
      const fimT = item.timeEndTarde || item.end;

      if (inicioM && fimM) periodoStr += `Manhã: ${formatDateTimeBR(inicioM)} às ${formatDateTimeBR(fimM)} `;
      if (inicioT && fimT) periodoStr += `Tarde: ${formatDateTimeBR(inicioT)} às ${formatDateTimeBR(fimT)}`;
      if (!periodoStr && inicioM) periodoStr = `${formatDateTimeBR(inicioM)} às ${formatDateTimeBR(fimT || inicioM)}`;

      const valorNum = parseFloat(item.totalValue) || 0;
      somaValorTotal += valorNum;

      dadosExcel.push({
        "Dia / Data": formatDateBR(item.date),
        "Período / Horário": periodoStr.trim(),
        "Descrição / Motivo": item.reason || '',
        "Carga Horária": item.totalHoursText || `${item.totalHours}h`,
        "Valor Total (R$)": valorNum
      });
    });

    dadosExcel.push({
      "Dia / Data": "TOTAL GERAL",
      "Período / Horário": "",
      "Descrição / Motivo": "",
      "Carga Horária": "",
      "Valor Total (R$)": somaValorTotal
    });

    const worksheet = XLSX.utils.json_to_sheet(dadosExcel);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Horas Extras");

    worksheet['!cols'] = [{ wch: 15 }, { wch: 45 }, { wch: 35 }, { wch: 15 }, { wch: 18 }];
    XLSX.writeFile(workbook, `Relatorio_Horas_Extras_${mesSel}_${anoSel}.xlsx`);
  });
}

window.excluirHE = async function(idOrIndex) {
  if (confirm("Tem a certeza de que pretende eliminar este registo?")) {
    try {
      let list = await DataSync.load('rg_horas_extras') || [];
      if (String(idOrIndex).length > 5) {
        list = list.filter(item => String(item.id) !== String(idOrIndex));
      } else {
        list.splice(Number(idOrIndex), 1);
      }
      await DataSync.save('rg_horas_extras', list);
      loadHorasExtras();
    } catch (error) {
      alert("Erro ao eliminar: " + error.message);
    }
  }
};

if (heForm) {
  heForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const date = higienizarTexto(document.getElementById('he-date').value);
    const valorHora = parseFloat(document.getElementById('he-valor-hora').value) || 38.63;

    const timeStartManha = higienizarTexto(document.getElementById('he-start-manha').value);
    const timeEndManha = higienizarTexto(document.getElementById('he-end-manha').value);
    const timeStartTarde = higienizarTexto(document.getElementById('he-start-tarde').value);
    const timeEndTarde = higienizarTexto(document.getElementById('he-end-tarde').value);

    const reason = higienizarTexto(document.getElementById('he-reason').value);

    if (!timeStartManha && !timeStartTarde) {
      alert("Por favor, preencha pelo menos um horário de início (Manhã ou Tarde)!");
      return;
    }

    if (btnSubmitHE) {
      btnSubmitHE.disabled = true;
      btnSubmitHE.textContent = "A guardar...";
    }

    const calc = calcularMinutosHE(timeStartManha, timeEndManha, timeStartTarde, timeEndTarde, valorHora);
    const startOficial = timeStartManha || timeStartTarde;
    const endOficial = timeEndTarde || timeEndManha || startOficial;

    const payload = {
      date,
      valorHora,
      timeStartManha,
      timeEndManha,
      timeStartTarde,
      timeEndTarde,
      start: startOficial,
      end: endOficial,
      reason,
      totalHours: calc.horasDecimais,
      totalHoursText: calc.totalHoursText,
      totalValue: calc.valorTotal
    };

    try {
      let list = await DataSync.load('rg_horas_extras') || [];
      if (!Array.isArray(list)) list = [];

      if (editingHEId !== null && editingHEId !== '') {
        const idx = list.findIndex(item => String(item.id) === String(editingHEId) || list.indexOf(item) == editingHEId);
        if (idx !== -1) {
          list[idx] = { ...list[idx], ...payload };
        } else {
          list.push({ id: 'he_' + Date.now(), ...payload });
        }
      } else {
        list.push({ id: 'he_' + Date.now(), ...payload });
      }

      await DataSync.save('rg_horas_extras', list);
      alert("Registo guardado e sincronizado com sucesso na nuvem!");
      resetForm();
      loadHorasExtras();
    } catch (error) {
      console.error("Erro ao guardar:", error);
      alert("Erro ao guardar: " + error.message);
      if (btnSubmitHE) {
        btnSubmitHE.disabled = false;
        btnSubmitHE.textContent = editingHEId ? "Atualizar Registo" : "Guardar Hora Extra";
      }
    }
  });
}

function escapeHTML(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
