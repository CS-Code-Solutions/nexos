/**
 * NexOS - Módulo Integrado de Cadastros (index.js)
 */

firebase.auth().onAuthStateChanged(async (user) => {
  if (!user) {
    window.location.href = 'login.html';
  } else {
    await inicializarCadastros();
    DataSync.listen('rg_clients', () => renderizarTudo());
    DataSync.listen('rg_machines', () => renderizarTudo());
  }
});

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('sw.js').catch(err => console.log('Falha ao registar SW:', err));
  });
}

let listaClientes = [];
let listaMaquinas = [];
let clienteEmEdicaoId = null;
let maquinaEmEdicaoId = null;

async function inicializarCadastros() {
  await carregarDados();
  renderizarTudo();
}

async function carregarDados() {
  try {
    listaClientes = await DataSync.load('rg_clients') || [];
    listaMaquinas = await DataSync.load('rg_machines') || [];
    if (!Array.isArray(listaClientes)) listaClientes = [];
    if (!Array.isArray(listaMaquinas)) listaMaquinas = [];
  } catch (err) {
    console.error("Erro ao carregar dados de cadastros:", err);
  }
}

function renderizarTudo() {
  atualizarSelectClientes();
  renderizarListaAcordeao();
}

/* --- PREENCHIMENTO DO SELECT DE CLIENTES NO FORM DE MÁQUINA --- */
function atualizarSelectClientes() {
  const select = document.getElementById('m-cliente-select');
  if (!select) return;

  const valorAtual = select.value;
  select.innerHTML = '<option value="">Selecione o cliente...</option>';

  listaClientes.sort((a, b) => (a.name || '').localeCompare(b.name || '')).forEach(c => {
    const opt = document.createElement('option');
    opt.value = c.name;
    opt.textContent = c.name;
    select.appendChild(opt);
  });

  if (valorAtual) select.value = valorAtual;
}

/* --- RENDERIZAÇÃO DA ESTRUTURA HIERÁRQUICA (CLIENTES -> MÁQUINAS) --- */
function renderizarListaAcordeao() {
  const container = document.getElementById('cadastrosContainer');
  if (!container) return;

  const termoBusca = (document.getElementById('inputPesquisa')?.value || '').toLowerCase().trim();

  if (listaClientes.length === 0) {
    container.innerHTML = `
      <div style="text-align: center; background: #FFF; padding: 35px 20px; border-radius: 8px; border: 1px dashed #CBD5E1;" class="card">
        <i class="fa-solid fa-users-slash" style="font-size: 2rem; color: #94A3B8; margin-bottom: 10px;"></i>
        <p style="color: #64748B; margin-bottom: 15px;">Nenhum cliente cadastrado no sistema.</p>
        <button type="button" class="btn" onclick="abrirFormCliente()" style="background-color: var(--tech-blue); color: white; padding: 8px 16px;">
          + Cadastrar Primeiro Cliente
        </button>
      </div>
    `;
    return;
  }

  let html = '';

  listaClientes.forEach((cliente, index) => {
    const nomeCliente = cliente.name || 'Sem Nome';
    const docCliente = cliente.doc || 'Não informado';
    const emailCliente = cliente.email || 'Não informado';
    const enderecoCliente = cliente.address || cliente.endereco || '';
    const contatoCliente = cliente.contact || cliente.contato || '';
    const telefoneCliente = cliente.phone || cliente.telefone || '';

    const idCliente = cliente.id || `c_${index}_${Math.random().toString(36).substring(2, 6)}`;
    cliente.id = idCliente;

    // Vinculação de máquinas por nome do cliente
    const maquinasDoCliente = listaMaquinas.filter(m => (m.client || m.cliente) === nomeCliente);

    // Filtro de Busca abrangendo todos os campos novos e antigos
    const atendeFiltroCliente = 
      nomeCliente.toLowerCase().includes(termoBusca) || 
      docCliente.toLowerCase().includes(termoBusca) || 
      emailCliente.toLowerCase().includes(termoBusca) || 
      enderecoCliente.toLowerCase().includes(termoBusca) || 
      contatoCliente.toLowerCase().includes(termoBusca);

    const maquinasFiltradas = maquinasDoCliente.filter(m => {
      const nomeM = (m.name || m.nome || '').toLowerCase();
      const marcaM = (m.brand || m.marca || '').toLowerCase();
      const modM = (m.model || m.modelo || '').toLowerCase();
      const serialM = (m.serial || m.serialNumber || m.numserie || '').toLowerCase();
      return nomeM.includes(termoBusca) || marcaM.includes(termoBusca) || modM.includes(termoBusca) || serialM.includes(termoBusca);
    });

    if (termoBusca !== '' && !atendeFiltroCliente && maquinasFiltradas.length === 0) {
      return;
    }

    const qtdMaquinas = maquinasDoCliente.length;
    const badgeQtd = `<span style="background: ${qtdMaquinas > 0 ? '#E0F2FE' : '#F1F5F9'}; color: ${qtdMaquinas > 0 ? '#0369A1' : '#64748B'}; padding: 3px 8px; border-radius: 12px; font-size: 0.78rem; font-weight: bold;"><i class="fa-solid fa-gears"></i> ${qtdMaquinas} ${qtdMaquinas === 1 ? 'máquina' : 'máquinas'}</span>`;

    html += `
      <div class="client-card" id="card_client_${idCliente}">
        <div class="client-header" onclick="toggleAcordeaoCliente('${idCliente}')">
          <div style="flex: 1; padding-right: 10px;">
            <div style="display: flex; align-items: center; gap: 10px; flex-wrap: wrap;">
              <strong style="font-size: 1.05rem; color: #0B132B;">${escapeHTML(nomeCliente)}</strong>
              ${badgeQtd}
            </div>
            <div style="font-size: 0.82rem; color: #475569; margin-top: 4px; display: flex; flex-wrap: wrap; gap: 12px;">
              <span><i class="fa-solid fa-id-card" style="color: #94A3B8;"></i> ${escapeHTML(docCliente)}</span>
              ${emailCliente !== 'Não informado' ? `<span><i class="fa-solid fa-envelope" style="color: #94A3B8;"></i> ${escapeHTML(emailCliente)}</span>` : ''}
              ${telefoneCliente ? `<span><i class="fa-solid fa-phone" style="color: #94A3B8;"></i> ${escapeHTML(telefoneCliente)}</span>` : ''}
            </div>
            ${enderecoCliente ? `<small style="color: #64748B; display: block; margin-top: 2px;"><i class="fa-solid fa-location-dot" style="color: #94A3B8;"></i> ${escapeHTML(enderecoCliente)}</small>` : ''}
          </div>
          <div style="display: flex; align-items: center; gap: 10px;">
            <i class="fa-solid fa-chevron-down" id="icon_chevron_${idCliente}" style="color: #94A3B8; transition: transform 0.3s;"></i>
          </div>
        </div>

        <div class="client-machines-drawer" id="drawer_${idCliente}">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px; border-bottom: 1px solid #E2E8F0; padding-bottom: 8px;">
            <span style="font-size: 0.85rem; font-weight: bold; color: #475569;">Equipamentos Cadastrados</span>
            <div style="display: flex; gap: 6px;">
              <button type="button" class="btn" style="background-color: var(--electric-cyan); color: var(--deep-navy); padding: 4px 10px; font-size: 0.75rem; font-weight: bold;" onclick="event.stopPropagation(); abrirFormMaquina('${escapeHTML(nomeCliente)}')">
                <i class="fa-solid fa-plus"></i> Add Máquina
              </button>
              <button type="button" class="btn" style="background-color: #F59E0B; color: white; padding: 4px 8px; font-size: 0.75rem; font-weight: bold;" onclick="event.stopPropagation(); editarCliente('${idCliente}')">
                <i class="fa-solid fa-pen"></i> Editar
              </button>
              <button type="button" class="btn" style="background-color: #EF4444; color: white; padding: 4px 8px; font-size: 0.75rem; font-weight: bold;" onclick="event.stopPropagation(); excluirCliente('${idCliente}', '${escapeHTML(nomeCliente)}')">
                <i class="fa-solid fa-trash"></i>
              </button>
            </div>
          </div>

          <div class="machines-list-inner">
            ${gerarHtmlMaquinasInternas(maquinasDoCliente, idCliente)}
          </div>
        </div>
      </div>
    `;
  });

  container.innerHTML = html || `<p style="text-align: center; color: #64748B; padding: 20px;">Nenhum registro encontrado para "${escapeHTML(termoBusca)}".</p>`;
}

function gerarHtmlMaquinasInternas(maquinas, idCliente) {
  if (!maquinas || maquinas.length === 0) {
    return `<p style="font-size: 0.85rem; color: #94A3B8; margin: 5px 0; text-align: center; font-style: italic;">Nenhuma máquina vinculada a este cliente.</p>`;
  }

  return maquinas.map((m, idx) => {
    const mId = m.id || `m_${idx}_${Math.random().toString(36).substring(2, 6)}`;
    m.id = mId;
    const nomeMaq = m.name || m.nome || 'Máquina sem nome';
    const marcaMaq = m.brand || m.marca || '';
    const modMaq = m.model || m.modelo || '';
    const serieMaq = m.serial || m.serialNumber || m.numserie || '';

    return `
      <div class="machine-item">
        <div>
          <strong style="font-size: 0.95rem; color: #0B132B;"><i class="fa-solid fa-gear" style="color: var(--tech-blue);"></i> ${escapeHTML(nomeMaq)}</strong>
          ${(marcaMaq || modMaq) ? `<span style="font-size: 0.8rem; color: #475569; margin-left: 8px;">(${escapeHTML(marcaMaq)} ${modMaq ? '/ ' + escapeHTML(modMaq) : ''})</span>` : ''}
          ${serieMaq ? `<br><small style="font-size: 0.78rem; color: #64748B;"><i class="fa-solid fa-barcode"></i> Série/Tag: ${escapeHTML(serieMaq)}</small>` : ''}
        </div>
        <div style="display: flex; gap: 6px; flex-wrap: wrap;">
          <button type="button" class="btn" style="background-color: #10B981; color: white; padding: 4px 8px; font-size: 0.75rem; font-weight: bold;" onclick="novaRSComMaquina('${escapeHTML(m.client || m.cliente)}', '${escapeHTML(nomeMaq)}')">
            <i class="fa-solid fa-file-circle-plus"></i> Gerar RS
          </button>
          <button type="button" class="btn" style="background-color: #F59E0B; color: white; padding: 4px 8px; font-size: 0.75rem; font-weight: bold;" onclick="editarMaquina('${mId}')">
            <i class="fa-solid fa-pen"></i>
          </button>
          <button type="button" class="btn" style="background-color: #EF4444; color: white; padding: 4px 8px; font-size: 0.75rem; font-weight: bold;" onclick="excluirMaquina('${mId}', '${escapeHTML(nomeMaq)}')">
            <i class="fa-solid fa-trash"></i>
          </button>
        </div>
      </div>
    `;
  }).join('');
}

/* --- TOGGLE DE EXPANSÃO DO ACORDEÃO --- */
window.toggleAcordeaoCliente = function(idCliente) {
  const card = document.getElementById(`card_client_${idCliente}`);
  const icon = document.getElementById(`icon_chevron_${idCliente}`);
  if (!card) return;

  const isOpen = card.classList.contains('open');
  if (isOpen) {
    card.classList.remove('open');
    if (icon) icon.style.transform = 'rotate(0deg)';
  } else {
    card.classList.add('open');
    if (icon) icon.style.transform = 'rotate(180deg)';
  }
};

window.filtrarCadastros = function() {
  renderizarListaAcordeao();
};

/* --- GESTÃO DO FORMULÁRIO DE CLIENTE --- */
window.abrirFormCliente = function() {
  clienteEmEdicaoId = null;
  document.getElementById('cliente-form').reset();
  document.getElementById('cliente-form-title').textContent = "Cadastrar Novo Cliente";
  document.getElementById('btn-submit-c').textContent = "Guardar Cliente";
  document.getElementById('clienteFormSection').style.display = 'block';
  document.getElementById('maquinaFormSection').style.display = 'none';
  window.scrollTo({ top: document.getElementById('clienteFormSection').offsetTop - 70, behavior: 'smooth' });
};

window.fecharFormCliente = function() {
  clienteEmEdicaoId = null;
  document.getElementById('cliente-form').reset();
  document.getElementById('clienteFormSection').style.display = 'none';
};

window.editarCliente = function(id) {
  const cliente = listaClientes.find(c => c.id === id);
  if (!cliente) return;

  clienteEmEdicaoId = id;
  document.getElementById('c-nome').value = cliente.name || '';
  document.getElementById('c-doc').value = cliente.doc || '';
  document.getElementById('c-email').value = cliente.email || '';
  document.getElementById('c-contato').value = cliente.contact || cliente.contato || '';
  document.getElementById('c-telefone').value = cliente.phone || cliente.telefone || '';
  document.getElementById('c-endereco').value = cliente.address || cliente.endereco || '';

  document.getElementById('cliente-form-title').textContent = "Editar Cliente";
  document.getElementById('btn-submit-c').textContent = "Atualizar Cliente";
  document.getElementById('clienteFormSection').style.display = 'block';
  document.getElementById('maquinaFormSection').style.display = 'none';
  window.scrollTo({ top: document.getElementById('clienteFormSection').offsetTop - 70, behavior: 'smooth' });
};

document.getElementById('cliente-form')?.addEventListener('submit', async (e) => {
  e.preventDefault();
  const name = document.getElementById('c-nome').value.trim();
  const doc = document.getElementById('c-doc').value.trim();
  const email = document.getElementById('c-email').value.trim();
  const contact = document.getElementById('c-contato').value.trim();
  const phone = document.getElementById('c-telefone').value.trim();
  const address = document.getElementById('c-endereco').value.trim();

  if (!name || !doc) {
    alert("Informe o Nome e o CPF/CNPJ do cliente.");
    return;
  }

  try {
    let list = await DataSync.load('rg_clients') || [];
    if (!Array.isArray(list)) list = [];

    const clienteObj = { name, doc, email, contact, phone, address };

    if (clienteEmEdicaoId) {
      const idx = list.findIndex(c => c.id === clienteEmEdicaoId);
      if (idx !== -1) {
        const antigoNome = list[idx].name;
        list[idx] = { ...list[idx], ...clienteObj };
        
        // Se o nome do cliente mudou, atualiza automaticamente as máquinas vinculadas
        if (antigoNome && antigoNome !== name) {
          let maqs = await DataSync.load('rg_machines') || [];
          maqs.forEach(m => {
            if (m.client === antigoNome || m.cliente === antigoNome) {
              m.client = name;
              m.cliente = name;
            }
          });
          await DataSync.save('rg_machines', maqs);
        }
      }
    } else {
      clienteObj.id = 'c_' + Date.now();
      list.push(clienteObj);
    }

    await DataSync.save('rg_clients', list);
    alert("Cliente salvo com sucesso!");
    fecharFormCliente();
    await carregarDados();
    renderizarTudo();
  } catch (err) {
    alert("Erro ao guardar cliente: " + err.message);
  }
});

window.excluirCliente = async function(id, nomeCliente) {
  if (confirm(`Tem a certeza que deseja eliminar o cliente "${nomeCliente}"?\nAs máquinas vinculadas permanecerão salvas.`)) {
    try {
      let list = await DataSync.load('rg_clients') || [];
      list = list.filter(c => c.id !== id);
      await DataSync.save('rg_clients', list);
      await carregarDados();
      renderizarTudo();
    } catch (err) {
      alert("Erro ao eliminar cliente: " + err.message);
    }
  }
};

/* --- GESTÃO DO FORMULÁRIO DE MÁQUINA --- */
window.abrirFormMaquina = function(nomeClientePreSelecionado = '') {
  maquinaEmEdicaoId = null;
  document.getElementById('maquina-form').reset();
  atualizarSelectClientes();

  if (nomeClientePreSelecionado) {
    document.getElementById('m-cliente-select').value = nomeClientePreSelecionado;
  }

  document.getElementById('maquina-form-title').textContent = "Cadastrar Nova Máquina";
  document.getElementById('btn-submit-m').textContent = "Guardar Máquina";
  document.getElementById('maquinaFormSection').style.display = 'block';
  document.getElementById('clienteFormSection').style.display = 'none';
  window.scrollTo({ top: document.getElementById('maquinaFormSection').offsetTop - 70, behavior: 'smooth' });
};

window.fecharFormMaquina = function() {
  maquinaEmEdicaoId = null;
  document.getElementById('maquina-form').reset();
  document.getElementById('maquinaFormSection').style.display = 'none';
};

window.editarMaquina = function(id) {
  const maquina = listaMaquinas.find(m => m.id === id);
  if (!maquina) return;

  maquinaEmEdicaoId = id;
  atualizarSelectClientes();

  document.getElementById('m-cliente-select').value = maquina.client || maquina.cliente || '';
  document.getElementById('m-nome').value = maquina.name || maquina.nome || '';
  document.getElementById('m-marca').value = maquina.brand || maquina.marca || '';
  document.getElementById('m-modelo').value = maquina.model || maquina.modelo || '';
  document.getElementById('m-numserie').value = maquina.serial || maquina.serialNumber || maquina.numserie || '';

  document.getElementById('maquina-form-title').textContent = "Editar Máquina";
  document.getElementById('btn-submit-m').textContent = "Atualizar Máquina";
  document.getElementById('maquinaFormSection').style.display = 'block';
  document.getElementById('clienteFormSection').style.display = 'none';
  window.scrollTo({ top: document.getElementById('maquinaFormSection').offsetTop - 70, behavior: 'smooth' });
};

document.getElementById('maquina-form')?.addEventListener('submit', async (e) => {
  e.preventDefault();
  const client = document.getElementById('m-cliente-select').value;
  const name = document.getElementById('m-nome').value.trim();
  const brand = document.getElementById('m-marca').value.trim();
  const model = document.getElementById('m-modelo').value.trim();
  const serial = document.getElementById('m-numserie').value.trim();

  if (!client || !name) {
    alert("Selecione o cliente e informe o nome do equipamento.");
    return;
  }

  try {
    let list = await DataSync.load('rg_machines') || [];
    if (!Array.isArray(list)) list = [];

    const maquinaObj = { client, name, brand, model, serial };

    if (maquinaEmEdicaoId) {
      const idx = list.findIndex(m => m.id === maquinaEmEdicaoId);
      if (idx !== -1) {
        list[idx] = { ...list[idx], ...maquinaObj };
      }
    } else {
      maquinaObj.id = 'm_' + Date.now();
      list.push(maquinaObj);
    }

    await DataSync.save('rg_machines', list);
    alert("Máquina salva com sucesso!");
    fecharFormMaquina();
    await carregarDados();
    renderizarTudo();

    // Mantém o cartão do cliente expandido para mostrar a nova máquina inserida
    const clienteObj = listaClientes.find(c => c.name === client);
    if (clienteObj) {
      setTimeout(() => toggleAcordeaoCliente(clienteObj.id), 100);
    }

  } catch (err) {
    alert("Erro ao guardar máquina: " + err.message);
  }
});

window.excluirMaquina = async function(id, nomeMaquina) {
  if (confirm(`Tem a certeza que deseja eliminar a máquina "${nomeMaquina}"?`)) {
    try {
      let list = await DataSync.load('rg_machines') || [];
      list = list.filter(m => m.id !== id);
      await DataSync.save('rg_machines', list);
      await carregarDados();
      renderizarTudo();
    } catch (err) {
      alert("Erro ao eliminar máquina: " + err.message);
    }
  }
};

/* --- AÇÃO RÁPIDA DE NOVO RELATÓRIO A PARTIR DA MÁQUINA --- */
window.novaRSComMaquina = function(cliente, maquina) {
  const dadosPreenchimento = {
    client: cliente,
    machine: maquina,
    description: ''
  };
  localStorage.setItem('rg_preencher_rs', JSON.stringify(dadosPreenchimento));
  window.location.href = 'novo-relatorio.html';
};

function escapeHTML(str) {
  if (!str) return '';
  return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#039;');
}
