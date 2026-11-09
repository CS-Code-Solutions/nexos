/**
 * NexOS - Módulo de Histórico de Relatórios (historico.js)
 */

firebase.auth().onAuthStateChanged(async (user) => {
  if (!user) {
    window.location.href = 'login.html';
  } else {
    renderHistory();
    DataSync.listen('rg_reports', () => renderHistory());
  }
});

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('sw.js').catch(err => console.log(err));
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

let activeReportData = {};

async function renderHistory() {
  const container = document.getElementById('reportCardsContainer');
  if (!container) return;

  try {
    let reports = await DataSync.load('rg_reports') || [];
    if (!Array.isArray(reports)) reports = [];

    container.innerHTML = '';
    if (reports.length === 0) {
      container.innerHTML = '<div style="grid-column: 1 / -1; text-align: center; background: #FFF; padding: 30px; border-radius: 8px; border: 1px dashed #CBD5E1;"><p style="color: #64748B; margin-bottom: 10px;">Nenhum relatório de serviço registado.</p><a href="novo-relatorio.html" class="btn" style="background-color: #0B132B; color: #FFF; padding: 8px 16px; text-decoration: none; display: inline-block;">+ Criar o primeiro RS</a></div>';
      return;
    }

    let htmlCards = '';
    for (let i = reports.length - 1; i >= 0; i--) {
      const rep = reports[i];
      if (!rep) continue;

      const rawNum = rep.number || 'RS-1000';
      const numeroLimpoCard = String(rawNum).replace(/^RS-?/i, '');
      const safeNumber = `RS-${numeroLimpoCard}`;

      let dataCardFormatada = rep.date || '-';
      if (rep.date && rep.date.includes('-')) {
        const partesD = rep.date.split('-');
        if (partesD.length === 3) {
          dataCardFormatada = `${partesD[2]}/${partesD[1]}/${partesD[0]}`;
        }
      }

      const safeDate = escapeHTML(dataCardFormatada);
      const safeClient = escapeHTML(rep.client || '-');
      const safeEquipment = escapeHTML(rep.equipment || '-');
      const safeNature = escapeHTML(rep.serviceNature || rep.type || '-');

      htmlCards += `
        <div style="background: #FFFFFF; border: 1px solid #E2E8F0; border-top: 4px solid var(--tech-blue, #2563EB); border-radius: 6px; padding: 12px; box-shadow: 0 2px 4px rgba(0,0,0,0.05); display: flex; flex-direction: column; justify-content: space-between; height: 100%; min-height: 160px; overflow: hidden;">
          <div style="overflow: hidden;">
            <h3 style="margin: 0 0 10px 0; color: #0B132B; font-size: 1.1rem; border-bottom: 1px solid #F1F5F9; padding-bottom: 6px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;" title="${safeNumber} - ${safeDate}">
              ${safeNumber} <span style="font-size: 0.85rem; color: #64748B; font-weight: normal;">| ${safeDate}</span>
            </h3>
            <div style="display: flex; align-items: center; gap: 8px; margin: 5px 0; font-size: 0.85rem; color: #475569;">
              <i class="fa-solid fa-building" style="color: #94A3B8; width: 14px; text-align: center; flex-shrink: 0;"></i>
              <span style="white-space: nowrap; overflow: hidden; text-overflow: ellipsis;" title="${safeClient}">${safeClient}</span>
            </div>
            <div style="display: flex; align-items: center; gap: 8px; margin: 5px 0; font-size: 0.85rem; color: #475569;">
              <i class="fa-solid fa-gear" style="color: #94A3B8; width: 14px; text-align: center; flex-shrink: 0;"></i>
              <span style="white-space: nowrap; overflow: hidden; text-overflow: ellipsis;" title="${safeEquipment}">${safeEquipment}</span>
            </div>
            <div style="display: flex; align-items: center; gap: 8px; margin: 5px 0; font-size: 0.85rem; color: #475569;">
              <i class="fa-solid fa-wrench" style="color: #94A3B8; width: 14px; text-align: center; flex-shrink: 0;"></i>
              <span style="white-space: nowrap; overflow: hidden; text-overflow: ellipsis;" title="${safeNature}">${safeNature}</span>
            </div>
          </div>
          <div class="no-print" style="display: flex; gap: 6px; margin-top: 12px; padding-top: 10px; border-top: 1px solid #F1F5F9;">
            <button class="btn" style="flex: 1.5; padding: 6px 0; font-size: 0.8rem; background-color: #1D4ED8; color: white; border: none; border-radius: 4px; font-weight: bold;" onclick="openReportPreview(${i})">Gerar PDF</button>
            <button class="btn" style="flex: 1; padding: 6px 0; font-size: 0.8rem; background-color: #F59E0B; color: white; border: none; border-radius: 4px; font-weight: bold;" onclick="editReport(${i})">Editar</button>
            <button class="btn" style="flex: 1; padding: 6px 0; font-size: 0.8rem; background-color: #EF4444; color: white; border: none; border-radius: 4px; font-weight: bold;" onclick="deleteReport(${i})">Excluir</button>
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

window.deleteReport = async function(index) {
  if(confirm('Deseja realmente excluir este relatório?')) {
    try {
      let reports = await DataSync.load('rg_reports') || [];
      reports.splice(index, 1);
      await DataSync.save('rg_reports', reports);
      renderHistory();
    } catch (e) { alert('Erro ao excluir relatório.'); }
  }
};

window.editReport = function(index) {
  window.location.href = `novo-relatorio.html?edit=${index}`;
};

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
    let reports = await DataSync.load('rg_reports') || [];
    const rep = reports[index];
    if (!rep) { alert("Relatório não encontrado."); return; }
    
    const defaultConfig = { 
      name: 'NexOS', tech: 'Técnico Responsável', doc: '00.000.000/0000-00', email: '-', contact: '-', location: '-', techSignature: ''
    };

    let config = { ...defaultConfig };
    try {
      const tenantId = localStorage.getItem('rg_tenant_id') || DataSync.getUid();
      const savedCfg = await db.collection('rg_config').doc(tenantId).get();
      if (savedCfg.exists) {
        config = { ...defaultConfig, ...savedCfg.data() };
      }
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
        
        let valorDeslocamentoTotal = 0;
        if (rep.temDeslocamento === 'sim') {
            valorDeslocamentoTotal = (Number(rep.valorHoraDeslocamento) || 260.00) * (Number(rep.tempoDeslocamentoHoras) || 0);
        }

        let valorHospedagemTotal = rep.temHospedagem === 'sim' ? (Number(rep.valorHospedagem) || 0) : 0;
        let valorOutrasTotal = rep.temOutras === 'sim' ? (Number(rep.valorOutras) || 0) : 0;

        valorTotal = valorHorasTotal + valorDeslocamentoTotal + valorHospedagemTotal + valorOutrasTotal;
    }

    const valorTotalStr = valorTotal.toFixed(2);
    activeReportData = { number: rep.number, client: rep.client };

    let dataFormatada = rep.date || '-';
    if (rep.date && rep.date.includes('-')) {
      const partes = rep.date.split('-');
      if (partes.length === 3) {
        dataFormatada = `${partes[2]}/${partes[1]}/${partes[0]}`;
      }
    }

    const numeroLimpo = escapeHTML(String(rep.number || 'RS-1000')).replace(/^RS-?/i, '');

    const deslocamentoHtml = rep.temDeslocamento === 'sim' ? `<p>• <strong>Hora de Deslocamento:</strong> ${rep.tempoDeslocamentoHoras || 0}h a R$ ${Number(rep.valorHoraDeslocamento || 0).toFixed(2)}/h (Total: R$ ${(Number(rep.valorHoraDeslocamento || 0) * Number(rep.tempoDeslocamentoHoras || 0)).toFixed(2)})</p>` : '';
    const hospedagemHtml = rep.temHospedagem === 'sim' ? `<p>• <strong>Hospedagem:</strong> R$ ${Number(rep.valorHospedagem || 0).toFixed(2)}</p>` : '';
    const outrasHtml = rep.temOutras === 'sim' ? `<p>• <strong>Outras Despesas / Alimentação:</strong> R$ ${Number(rep.valorOutras || 0).toFixed(2)}</p>` : '';

    const clientSignature = rep.signature || rep.assinatura || rep.clientSignature || '';
    const techSignature = config.techSignature || '';
    const nomeTecnico = config.tech || 'Técnico Responsável';

    const signatureAreaHtml = `
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
    `;

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
        <div style="display: flex; flex-direction: column; gap: 6px; margin-top: 4px;">
          ${itemsHtml}
        </div>
      `;
    }

    const fullReportHtml = `
      <div class="print-body" id="pdfContentToPrint">
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
            ${deslocamentoHtml}
            ${hospedagemHtml}
            ${outrasHtml}
            ${rep.temEmpreitada === 'sim' ? `<p>• <strong>Regime de Empreitada:</strong> ${textoHoras}</p>` : ''}
          </div>
          <p style="font-size: 9.5px; font-weight: bold; color: #0D9488; border-top: 1px solid #CBD5E1; padding-top: 2px; margin-top: 2px;">Valor Total Estimado: R$ ${valorTotalStr}</p>
        </div>

        ${signatureAreaHtml}
        ${anexosHtml}
      </div>
    `;

    document.getElementById('reportRenderArea').innerHTML = fullReportHtml;
    document.getElementById('modalTitleRs').textContent = `Relatório de Serviço - RS-${numeroLimpo} (${rep.client})`;
    document.getElementById('loadingStatusRs').textContent = 'Pronto';
    document.getElementById('reportPreviewModal').style.display = 'flex';
  } catch (err) {
    console.error(err);
    alert("Erro ao abrir pré-visualização do relatório.");
  }
};

window.closeModal = function() {
  document.getElementById('reportPreviewModal').style.display = 'none';
};

window.compartilharPDF = async function() {
  const element = document.getElementById('reportRenderArea');
  const filename = `Relatorio_RS_${activeReportData.number || 'RS-1000'}.pdf`;
  const opt = {
    margin: [6, 6, 6, 6], filename: filename,
    image: { type: 'jpeg', quality: 0.98 },
    html2canvas: { scale: 2, useCORS: true, allowTaint: true },
    jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
  };

  document.getElementById('loadingStatusRs').textContent = 'A gerar PDF...';

  try {
    const worker = html2pdf().from(element).set(opt);
    const pdfBlob = await worker.outputPdf('blob');
    const file = new File([pdfBlob], filename, { type: 'application/pdf' });

    if (navigator.canShare && navigator.canShare({ files: [file] })) {
      await navigator.share({
        files: [file],
        title: `Relatório de Serviço ${activeReportData.number || ''}`,
        text: `Segue em anexo o Relatório de Serviço ${activeReportData.number || ''} para o cliente ${activeReportData.client || ''}.`
      });
      document.getElementById('loadingStatusRs').textContent = 'Partilhado!';
    } else {
      worker.save();
      document.getElementById('loadingStatusRs').textContent = 'Guardado (Download)!';
    }
  } catch (err) {
    if (err.name !== 'AbortError') {
      html2pdf().from(element).set(opt).save();
      document.getElementById('loadingStatusRs').textContent = 'Guardado (Download)!';
    } else {
      document.getElementById('loadingStatusRs').textContent = 'Partilha cancelada.';
    }
  }
};

window.descarregarPDF = function() {
  const element = document.getElementById('reportRenderArea');
  const filename = `Relatorio_RS_${activeReportData.number || 'RS-1000'}.pdf`;
  const opt = {
    margin: [6, 6, 6, 6], filename: filename,
    image: { type: 'jpeg', quality: 0.98 },
    html2canvas: { scale: 2, useCORS: true, allowTaint: true },
    jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
  };
  document.getElementById('loadingStatusRs').textContent = 'A descarregar...';
  html2pdf().from(element).set(opt).save().then(() => {
    document.getElementById('loadingStatusRs').textContent = 'Descarregado!';
  });
};
