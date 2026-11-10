/**
 * NexOS - Módulo de Manutenções Planeadas (manutencoes.js)
 */

firebase.auth().onAuthStateChanged(async (user) => {
  if (!user) {
    window.location.href = 'login.html';
  } else {
    await carregarClientesSelect();
    await carregarManutencoes();
    DataSync.listen('rg_manutencoes', () => carregarManutencoes());
  }
});

let todasManutencoes = [];
let editingId = null;

const formSection = document.getElementById('manutencaoFormSection');
const manutencaoForm = document.getElementById('manutencao-form');

window.toggleManutencaoForm = function(forceShow = false) {
  if (forceShow || formSection.style.display === 'none') {
    formSection.style.display = 'block';
    window.scrollTo({ top: formSection.offsetTop - 80, behavior: 'smooth' });
  } else {
    formSection.style.display = 'none';
    resetManutencaoForm();
  }
};

async function carregarClientesSelect() {
  const select = document.getElementById('m-cliente');
  if (!select) return;
  try {
    const clientes = await DataSync.load('rg_clients') || [];
    select.innerHTML = '<option value="">Selecione o cliente...</option>';
    clientes.forEach(c => {
      const opt = document.createElement('option');
      opt.value = c.name;
      opt.textContent = c.name;
      select.appendChild(opt);
    });
  } catch (err) {
    console.error("Erro ao carregar clientes para o select:", err);
  }
}

function formatDateBR(dateStr) {
  if (!dateStr) return 'N/A';
  const parts = dateStr.split('-');
  return parts.length === 3 ? `${parts[2]}/${parts[1]}/${parts[0]}` : dateStr;
}

async function carregarManutencoes() {
  const listDiv = document.getElementById('manutencao-list');
  if (!listDiv) return;

  try {
    todasManutencoes = await DataSync.load('rg_manutencoes') || [];
    todasManutencoes.sort((a, b) => new Date(a.data) - new Date(b.data));

    listDiv.innerHTML = "";
    if (todasManutencoes.length === 0) {
      listDiv.innerHTML = "<div style='grid-column: 1 / -1; text-align: center; background: #FFF; padding: 30px; border-radius: 8px; border: 1px dashed #CBD5E1;'><p style='color: #64748B; margin-bottom: 10px;'>Nenhuma manutenção planeada registada.</p><button class='btn' style='background-color: #0B132B; color: #FFF; padding: 8px 16px;' onclick='toggleManutencaoForm(true)'>+ Agendar primeira manutenção</button></div>";
      return;
    }

    let html = "";
    todasManutencoes.forEach((item) => {
      // Garante que o item tem um ID único string
      if (!item.id) {
        item.id = 'm_' + Date.now() + '_' + Math.random().toString(36).substring(2, 5);
      }

      html += `
        <div style="background: #FFFFFF; border: 1px solid #E2E8F0; border-top: 4px solid var(--electric-cyan); border-radius: 6px; padding: 12px; box-shadow: 0 2px 4px rgba(0,0,0,0.05); display: flex; flex-direction: column; justify-content: space-between;">
          <div>
            <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 8px; border-bottom: 1px solid #F1F5F9; padding-bottom: 6px;">
              <strong style="font-size: 1rem; color: #0B132B;"><i class="fa-solid fa-calendar"></i> ${formatDateBR(item.data)}</strong>
              <span style="background: #E0F2FE; color: #0369A1; padding: 2px 6px; border-radius: 4px; font-size: 0.75rem; font-weight: bold;">${escapeHTML(item.tipo || 'Preventiva')}</span>
            </div>
            <p style="margin: 3px 0; font-size: 0.9rem; color: #0F172A;"><strong>Cliente:</strong> ${escapeHTML(item.cliente)}</p>
            <p style="margin: 3px 0; font-size: 0.85rem; color: #475569;"><strong>Máquina:</strong> ${escapeHTML(item.maquina || 'Não especificada')}</p>
            <p style="margin: 6px 0 0 0; font-size: 0.85rem; color: #64748B; background: #F8FAFC; padding: 6px; border-radius: 4px;"><strong>Obs:</strong> ${escapeHTML(item.obs || 'Nenhuma')}</p>
          </div>
          
          <div style="display: flex; flex-direction: column; gap: 6px; margin-top: 12px; padding-top: 10px; border-top: 1px solid #F1F5F9;">
            <button type="button" class="btn" style="background-color: #10B981; color: white; padding: 8px 0; font-size: 0.85rem; font-weight: bold; border-radius: 4px;" onclick="gerarRelatorioDeManutencao('${item.id}')">
              <i class="fa-solid fa-file-arrow-up"></i> Gerar Relatório de Serviço (RS)
            </button>
            <div style="display: flex; gap: 6px;">
              <button type="button" class="btn" style="flex: 1; padding: 6px 0; font-size: 0.8rem; background-color: #F59E0B; color: white; border-radius: 4px; font-weight: bold;" onclick="editarManutencao('${item.id}')">Editar</button>
              <button type="button" class="btn" style="flex: 1; padding: 6px 0; font-size: 0.8rem; background-color: #EF4444; color: white; border-radius: 4px; font-weight: bold;" onclick="excluirManutencao('${item.id}')">Excluir</button>
            </div>
          </div>
        </div>
      `;
    });
    listDiv.innerHTML = html;
  } catch (err) {
    console.error("Erro ao carregar manutenções:", err);
    listDiv.innerHTML = "<p style='color: red; text-align: center; grid-column: 1 / -1;'>Erro ao carregar dados do cronograma.</p>";
  }
}

// Prepara o formulário para edição
window.editarManutencao = function(id) {
  const item = todasManutencoes.find(m => m.id === id);
  if (!item) return;

  editingId = item.id;
  document.getElementById('m-data').value = item.data || '';
  document.getElementById('m-cliente').value = item.cliente || '';
  document.getElementById('m-maquina').value = item.maquina || '';
  document.getElementById('m-tipo').value = item.tipo || 'Preventiva';
  document.getElementById('m-obs').value = item.obs || '';

  const formTitle = document.getElementById('form-title');
  if (formTitle) formTitle.textContent = "Editar Manutenção Planeada";
  const btnSubmit = document.getElementById('btn-submit-m');
  if (btnSubmit) btnSubmit.textContent = "Atualizar Agendamento";

  toggleManutencaoForm(true);
};

// Gera os dados para preencher na index.html e redireciona
window.gerarRelatorioDeManutencao = function(id) {
  const item = todasManutencoes.find(m => m.id === id);
  if (!item) return;

  const dadosPreenchimento = {
    client: item.cliente,
    machine: item.maquina,
    description: `Manutenção Planeada (${item.tipo}): ${item.obs || ''}`
  };
  localStorage.setItem('rg_preencher_rs', JSON.stringify(dadosPreenchimento));
  window.location.href = 'index.html';
};

window.excluirManutencao = async function(id) {
  if (confirm("Tem a certeza de que pretende eliminar este agendamento?")) {
    try {
      let list = await DataSync.load('rg_manutencoes') || [];
      list = list.filter(item => item.id !== id);
      await DataSync.save('rg_manutencoes', list);
      carregarManutencoes();
    } catch (err) {
      alert("Erro ao excluir: " + err.message);
    }
  }
};

window.resetManutencaoForm = function() {
  editingId = null;
  if (manutencaoForm) manutencaoForm.reset();
  const formTitle = document.getElementById('form-title');
  if (formTitle) formTitle.textContent = "Novo Agendamento";
  const btnSubmit = document.getElementById('btn-submit-m');
  if (btnSubmit) btnSubmit.textContent = "Guardar Agendamento";
  if (formSection) formSection.style.display = 'none';
};

if (manutencaoForm) {
  manutencaoForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const data = document.getElementById('m-data').value;
    const cliente = document.getElementById('m-cliente').value;
    const maquina = document.getElementById('m-maquina').value;
    const tipo = document.getElementById('m-tipo').value;
    const obs = document.getElementById('m-obs').value;

    try {
      let list = await DataSync.load('rg_manutencoes') || [];

      if (editingId !== null) {
        const idx = list.findIndex(item => item.id === editingId);
        if (idx !== -1) {
          list[idx] = { ...list[idx], data, cliente, maquina, tipo, obs };
        } else {
          list.push({ id: editingId, data, cliente, maquina, tipo, obs });
        }
      } else {
        const novoId = 'm_' + Date.now();
        list.push({ id: novoId, data, cliente, maquina, tipo, obs });
      }

      await DataSync.save('rg_manutencoes', list);
      alert("Manutenção planeada guardada com sucesso!");
      resetManutencaoForm();
      carregarManutencoes();
    } catch (err) {
      alert("Erro ao guardar agendamento: " + err.message);
    }
  });
}

function escapeHTML(str) {
  if (!str) return '';
  return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#039;');
}
