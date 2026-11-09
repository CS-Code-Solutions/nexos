/**
 * NexOS - Módulo de Gestão de Clientes (clientes.js)
 */

firebase.auth().onAuthStateChanged((user) => {
  if (!user) {
    window.location.href = 'login.html';
  } else {
    renderClients();
    DataSync.listen('rg_clients', () => { renderClients(); });
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

const form = document.getElementById('clientForm');
const formSection = document.getElementById('clientFormSection');
const clientListContainer = document.getElementById('clientListContainer');
const formTitle = document.getElementById('formTitle');
const saveBtn = document.getElementById('saveBtn');
const editIndexInput = document.getElementById('editIndex');

let clients = [];

window.toggleClientForm = function(forceShow = false) {
  if (forceShow || formSection.style.display === 'none') {
    formSection.style.display = 'block';
    window.scrollTo({ top: formSection.offsetTop - 80, behavior: 'smooth' });
  } else {
    formSection.style.display = 'none';
    resetForm();
  }
}

async function renderClients() {
  try {
    clients = await DataSync.load('rg_clients') || [];
    if (!Array.isArray(clients)) clients = [];

    clientListContainer.innerHTML = '';
    if (clients.length === 0) {
      clientListContainer.innerHTML = '<div style="grid-column: 1 / -1; text-align: center; background: #FFF; padding: 30px; border-radius: 8px; border: 1px dashed #CBD5E1;"><p style="color: #64748B; margin-bottom: 10px;">Nenhum cliente cadastrado.</p><button class="btn" style="background-color: #0B132B; color: #FFF; padding: 8px 16px;" onclick="toggleClientForm(true)">+ Criar o primeiro cliente</button></div>';
      return;
    }

    clients.forEach((c, index) => {
      const safeName = escapeHTML(c.name);
      const safeDoc = escapeHTML(c.doc);
      const safeEmail = escapeHTML(c.email || 'Não informado');
      const safeAddress = escapeHTML(c.address || 'Não informado');

      clientListContainer.innerHTML += `
        <div style="background: #FFFFFF; border: 1px solid #E2E8F0; border-top: 4px solid var(--tech-blue, #2563EB); border-radius: 6px; padding: 12px; box-shadow: 0 2px 4px rgba(0,0,0,0.05); display: flex; flex-direction: column; justify-content: space-between; height: 100%; min-height: 160px; overflow: hidden;">
          <div style="overflow: hidden;">
            <h3 style="margin: 0 0 10px 0; color: #0B132B; font-size: 1.05rem; border-bottom: 1px solid #F1F5F9; padding-bottom: 6px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;" title="${safeName}">${safeName}</h3>
            <div style="display: flex; align-items: center; gap: 8px; margin: 5px 0; font-size: 0.85rem; color: #475569;">
              <i class="fa-solid fa-id-card" style="color: #94A3B8; width: 14px; text-align: center; flex-shrink: 0;"></i>
              <span style="white-space: nowrap; overflow: hidden; text-overflow: ellipsis;" title="${safeDoc}">${safeDoc}</span>
            </div>
            <div style="display: flex; align-items: center; gap: 8px; margin: 5px 0; font-size: 0.85rem; color: #475569;">
              <i class="fa-solid fa-envelope" style="color: #94A3B8; width: 14px; text-align: center; flex-shrink: 0;"></i>
              <span style="white-space: nowrap; overflow: hidden; text-overflow: ellipsis;" title="${safeEmail}">${safeEmail}</span>
            </div>
            <div style="display: flex; align-items: center; gap: 8px; margin: 5px 0; font-size: 0.85rem; color: #475569;">
              <i class="fa-solid fa-location-dot" style="color: #94A3B8; width: 14px; text-align: center; flex-shrink: 0;"></i>
              <span style="white-space: nowrap; overflow: hidden; text-overflow: ellipsis;" title="${safeAddress}">${safeAddress}</span>
            </div>
          </div>
          <div style="display: flex; gap: 8px; margin-top: 12px; padding-top: 10px; border-top: 1px solid #F1F5F9;">
            <button class="btn" style="flex: 1; padding: 6px 0; font-size: 0.8rem; background-color: #F59E0B; color: white; border: none; border-radius: 4px; font-weight: bold;" onclick="editClient(${index})">Editar</button>
            <button class="btn" style="flex: 1; padding: 6px 0; font-size: 0.8rem; background-color: #EF4444; color: white; border: none; border-radius: 4px; font-weight: bold;" onclick="deleteClient(${index})">Excluir</button>
          </div>
        </div>
      `;
    });
  } catch (err) {
    console.error(err);
    clientListContainer.innerHTML = `<p style="grid-column: 1 / -1; text-align: center; color: red; font-weight: bold;">Erro: ${err.message || 'Falha ao processar os dados.'}</p>`;
  }
}

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  const editIdx = editIndexInput.value;
  const clientData = {
    name: document.getElementById('clientName').value.trim(),
    email: document.getElementById('clientEmail').value.trim(),
    doc: document.getElementById('clientDoc').value.trim(),
    address: document.getElementById('clientAddress').value.trim()
  };

  try {
    clients = await DataSync.load('rg_clients') || [];
    if (!Array.isArray(clients)) clients = [];
    if (editIdx === "") {
      clients.push(clientData);
    } else {
      clients[editIdx] = clientData;
    }
    await DataSync.save('rg_clients', clients);
    resetForm();
    renderClients();
    alert('Cliente salvo e sincronizado com sucesso!');
  } catch (err) {
    alert('Erro ao salvar cliente: ' + err.message);
  }
});

window.editClient = function(index) {
  const c = clients[index];
  if (!c) return;
  document.getElementById('clientName').value = c.name || '';
  document.getElementById('clientEmail').value = c.email || '';
  document.getElementById('clientDoc').value = c.doc || '';
  document.getElementById('clientAddress').value = c.address || '';
  editIndexInput.value = index;
  formTitle.textContent = "Editar Cliente";
  saveBtn.textContent = "Atualizar Cliente";
  toggleClientForm(true);
};

window.resetForm = function() {
  form.reset();
  editIndexInput.value = "";
  formTitle.textContent = "Adicionar Cliente";
  saveBtn.textContent = "Salvar Cliente";
  formSection.style.display = 'none';
  window.scrollTo({ top: 0, behavior: 'smooth' });
};

window.deleteClient = async function(index) {
  if (confirm('Deseja realmente excluir este cliente?')) {
    try {
      clients = await DataSync.load('rg_clients') || [];
      clients.splice(index, 1);
      await DataSync.save('rg_clients', clients);
      renderClients();
    } catch (err) {
      alert('Erro ao excluir cliente.');
    }
  }
};
