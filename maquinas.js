/**
 * NexOS - Módulo de Gestão de Máquinas (maquinas.js)
 */

firebase.auth().onAuthStateChanged(async (user) => {
  if (!user) {
    window.location.href = 'login.html';
  } else {
    await loadDropdownClients();
    renderMachines();
    DataSync.listen('rg_machines', () => { renderMachines(); });
    DataSync.listen('rg_clients', () => { loadDropdownClients(); });
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

const clientSelect = document.getElementById('machineClient');
const machineForm = document.getElementById('machineForm');
const formSection = document.getElementById('machineFormSection');
const machineCardsContainer = document.getElementById('machineCardsContainer');

let machines = [];
let clients = [];

window.toggleMachineForm = function(forceShow = false) {
  if (forceShow || formSection.style.display === 'none') {
    formSection.style.display = 'block';
    window.scrollTo({ top: formSection.offsetTop - 80, behavior: 'smooth' });
  } else {
    formSection.style.display = 'none';
    resetForm();
  }
}

async function loadDropdownClients() {
  try {
    clients = await DataSync.load('rg_clients') || [];
    clientSelect.innerHTML = '<option value="">Selecione o cliente...</option>';
    clients.forEach(c => {
      const option = document.createElement('option');
      option.value = c.name;
      option.textContent = c.name;
      clientSelect.appendChild(option);
    });
  } catch (e) {
    console.error("Erro ao carregar clientes para o select", e);
  }
}

async function renderMachines() {
  try {
    machines = await DataSync.load('rg_machines') || [];
    if (!Array.isArray(machines)) machines = [];

    machineCardsContainer.innerHTML = '';
    if (machines.length === 0) {
      machineCardsContainer.innerHTML = '<div style="grid-column: 1 / -1; text-align: center; background: #FFF; padding: 30px; border-radius: 8px; border: 1px dashed #CBD5E1;"><p style="color: #64748B; margin-bottom: 10px;">Nenhuma máquina cadastrada.</p><button class="btn" style="background-color: #0B132B; color: #FFF; padding: 8px 16px;" onclick="toggleMachineForm(true)">+ Cadastrar primeira máquina</button></div>';
      return;
    }

    let htmlCards = '';
    machines.forEach((m, index) => {
      const safeClient = escapeHTML(m.client || 'Sem cliente vinculado');
      const safeName = escapeHTML(m.name);
      const safeBrand = escapeHTML(m.brand || '-');
      const safeModel = escapeHTML(m.model || '-');
      const safeSerial = escapeHTML(m.serial || '-');

      htmlCards += `
        <div style="background: #FFFFFF; border: 1px solid #E2E8F0; border-top: 4px solid var(--tech-blue, #2563EB); border-radius: 6px; padding: 12px; box-shadow: 0 2px 4px rgba(0,0,0,0.05); display: flex; flex-direction: column; justify-content: space-between; height: 100%; min-height: 160px; overflow: hidden;">
          <div style="overflow: hidden;">
            <h3 style="margin: 0 0 10px 0; color: #0B132B; font-size: 1.05rem; border-bottom: 1px solid #F1F5F9; padding-bottom: 6px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;" title="${safeName}">${safeName}</h3>
            <div style="display: flex; align-items: center; gap: 8px; margin: 5px 0; font-size: 0.85rem; color: #475569;">
              <i class="fa-solid fa-building" style="color: #94A3B8; width: 14px; text-align: center; flex-shrink: 0;"></i>
              <span style="white-space: nowrap; overflow: hidden; text-overflow: ellipsis;" title="${safeClient}">${safeClient}</span>
            </div>
            <div style="display: flex; align-items: center; gap: 8px; margin: 5px 0; font-size: 0.85rem; color: #475569;">
              <i class="fa-solid fa-tag" style="color: #94A3B8; width: 14px; text-align: center; flex-shrink: 0;"></i>
              <span style="white-space: nowrap; overflow: hidden; text-overflow: ellipsis;" title="${safeBrand} / ${safeModel}">${safeBrand} / ${safeModel}</span>
            </div>
            <div style="display: flex; align-items: center; gap: 8px; margin: 5px 0; font-size: 0.85rem; color: #475569;">
              <i class="fa-solid fa-barcode" style="color: #94A3B8; width: 14px; text-align: center; flex-shrink: 0;"></i>
              <span style="white-space: nowrap; overflow: hidden; text-overflow: ellipsis;" title="${safeSerial}">${safeSerial}</span>
            </div>
          </div>
          <div style="display: flex; gap: 8px; margin-top: 12px; padding-top: 10px; border-top: 1px solid #F1F5F9;">
            <button class="btn" style="flex: 1; padding: 6px 0; font-size: 0.8rem; background-color: #F59E0B; color: white; border: none; border-radius: 4px; font-weight: bold;" onclick="editMachine(${index})">Editar</button>
            <button class="btn" style="flex: 1; padding: 6px 0; font-size: 0.8rem; background-color: #EF4444; color: white; border: none; border-radius: 4px; font-weight: bold;" onclick="deleteMachine(${index})">Excluir</button>
          </div>
        </div>
      `;
    });
    machineCardsContainer.innerHTML = htmlCards;
  } catch (err) {
    console.error(err);
    machineCardsContainer.innerHTML = `<p style="grid-column: 1 / -1; text-align: center; color: red; font-weight: bold;">Erro: ${err.message || 'Falha ao processar os dados.'}</p>`;
  }
}

machineForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  const editIndex = document.getElementById('editIndex').value;
  const machineData = {
    client: clientSelect.value,
    name: document.getElementById('machineName').value.trim(),
    brand: document.getElementById('machineBrand').value.trim(),
    model: document.getElementById('machineModel').value.trim(),
    serial: document.getElementById('machineSerial').value.trim()
  };

  try {
    machines = await DataSync.load('rg_machines') || [];
    if (!Array.isArray(machines)) machines = [];
    if (editIndex !== '') {
      machines[editIndex] = machineData;
    } else {
      machines.push(machineData);
    }
    await DataSync.save('rg_machines', machines);
    resetForm();
    renderMachines();
    alert('Máquina salva e sincronizada com sucesso!');
  } catch (err) {
    alert('Erro ao salvar máquina: ' + err.message);
  }
});

window.editMachine = async function(index) {
  try {
    machines = await DataSync.load('rg_machines') || [];
    const m = machines[index];
    if (!m) return;
    document.getElementById('editIndex').value = index;
    document.getElementById('formTitle').textContent = 'Editar Máquina';
    document.getElementById('submitBtn').textContent = 'Atualizar Máquina';
    document.getElementById('machineClient').value = m.client || '';
    document.getElementById('machineName').value = m.name || '';
    document.getElementById('machineBrand').value = m.brand || '';
    document.getElementById('machineModel').value = m.model || '';
    document.getElementById('machineSerial').value = m.serial || '';
    toggleMachineForm(true);
  } catch (err) {
    alert('Erro ao carregar máquina para edição.');
  }
};

window.resetForm = function() {
  machineForm.reset();
  document.getElementById('editIndex').value = '';
  document.getElementById('formTitle').textContent = 'Adicionar Máquina';
  document.getElementById('submitBtn').textContent = 'Salvar Máquina';
  formSection.style.display = 'none';
  window.scrollTo({ top: 0, behavior: 'smooth' });
};

window.deleteMachine = async function(index) {
  if (confirm('Deseja realmente excluir esta máquina?')) {
    try {
      machines = await DataSync.load('rg_machines') || [];
      machines.splice(index, 1);
      await DataSync.save('rg_machines', machines);
      renderMachines();
    } catch (err) {
      alert('Erro ao excluir máquina.');
    }
  }
};
