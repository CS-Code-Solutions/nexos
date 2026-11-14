/**
 * NexOS - Módulo Integrado de Cadastros (Clientes & Máquinas)
 * Arquivo: cadastros.js
 * BLINDADO: Padrão CS Code Solutions (Zero Trust Input/Output + Proteção Duplo Clique)
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
    await inicializarCadastros();
    DataSync.listen('rg_clients', async () => { await carregarDados(); renderizarTudo(); });
    DataSync.listen('rg_machines', async () => { await carregarDados(); renderizarTudo(); });
  }
});

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
    const rawClients = await DataSync.load('rg_clients') || [];
    const rawMachines = await DataSync.load('rg_machines') || [];
    listaClientes = Array.isArray(rawClients) ? rawClients : [];
    listaMaquinas = Array.isArray(rawMachines) ? rawMachines : [];
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

  [...listaClientes]
    .sort((a, b) => (a.name || a.nome || '').localeCompare(b.name || b.nome || ''))
    .forEach(c => {
      const nome = c.name || c.nome || '';
      if (!nome) return;
      const opt = document.createElement('option');
      opt.value = nome;
      opt.textContent = nome;
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
        <p style="color: #64748B; margin-bottom: 15px;">Nenhum cliente registado no sistema.</p>
        <button type="button" class="btn" onclick="abrirFormCliente()" style="background-color: #1D4ED8; color: white; padding: 8px 16px; border: none; border-radius: 4px; cursor: pointer;">
          + Cadastrar Primeiro Cliente
        </button>
      </div>
    `;
    return;
  }

  let html = '';

  listaClientes.forEach((cliente, cIdx) => {
    const nomeCliente = cliente.name || cliente.nome || 'Sem Nome';
    const idCliente = cliente.id || ('c_idx_' + cIdx);
    cliente.id = idCliente;
    const idSafe = escapeHTML(String(idCliente));

    const contato = cliente.contact || cliente.contato || '';
    const telefone = cliente.phone || cliente.telefone || '';
    const email = cliente.email || '';
    const documento = cliente.document || cliente.cpf_cnpj || cliente.cnpj || cliente.cpf || '';
    const endereco = cliente.address || cliente.endereco || cliente.morada || '';

    const maquinasDoCliente = listaMaquinas.filter(m => (m.client || m.cliente) === nomeCliente);

    const atendeFiltroCliente = nomeCliente.toLowerCase().includes(termoBusca) ||
      contato.toLowerCase().includes(termoBusca) ||
      email.toLowerCase().includes(termoBusca) ||
      documento.toLowerCase().includes(termoBusca) ||
      endereco.toLowerCase().includes(termoBusca);

    const maquinasFiltradas = maquinasDoCliente.filter(m =>
      (m.name || m.nome || '').toLowerCase().includes(termoBusca) ||
      (m.brand || m.marca || '').toLowerCase().includes(termoBusca) ||
      (m.model || m.modelo || '').toLowerCase().includes(termoBusca) ||
      (m.serialNumber || m.numserie || m.tag || '').toLowerCase().includes(termoBusca)
    );

    if (termoBusca !== '' && !atendeFiltroCliente && maquinasFiltradas.length === 0) {
      return;
    }

    const qtdMaquinas = maquinasDoCliente.length;
    const badgeQtd = `<span style="background: ${qtdMaquinas > 0 ? '#E0F2FE' : '#F1F5F9'}; color: ${qtdMaquinas > 0 ? '#0369A1' : '#64748B'}; padding: 3px 8px; border-radius: 12px; font-size: 0.78rem; font-weight: bold;"><i class="fa-solid fa-gears"></i> ${qtdMaquinas} ${qtdMaquinas === 1 ? 'máquina' : 'máquinas'}</span>`;

    let detalhesClienteArr = [];
    if (contato) detalhesClienteArr.push(`<i class="fa-solid fa-user"></i> ${escapeHTML(contato)}`);
    if (telefone) detalhesClienteArr.push(`<i class="fa-solid fa-phone"></i> ${escapeHTML(telefone)}`);
    if (email) detalhesClienteArr.push(`<i class="fa-solid fa-envelope"></i> ${escapeHTML(email)}`);
    if (documento) detalhesClienteArr.push(`<i class="fa-solid fa-id-card"></i> ${escapeHTML(documento)}`);

    let detalhesClienteHTML = detalhesClienteArr.join(' | ');

    html += `
      <div class="client-card" id="card_client_${idSafe}">
        <div class="client-header" onclick="toggleAcordeaoCliente('${idSafe}')">
          <div style="flex: 1; padding-right: 10px;">
            <div style="display: flex; align-items: center; gap: 10px; flex-wrap: wrap;">
              <strong style="font-size: 1.05rem; color: #0B132B;">${escapeHTML(nomeCliente)}</strong>
              ${badgeQtd}
            </div>
            ${detalhesClienteHTML ? `<small style="color: #64748B; display: block; margin-top: 4px;">${detalhesClienteHTML}</small>` : ''}
            ${endereco ? `<small style="color: #64748B; display: block; margin-top: 2px;"><i class="fa-solid fa-location-dot"></i> ${escapeHTML(endereco)}</small>` : ''}
          </div>
          <div style="display: flex; align-items: center; gap: 10px;">
            <i class="fa-solid fa-chevron-down" id="icon_chevron_${idSafe}" style="color: #94A3B8; transition: transform 0.3s;"></i>
          </div>
        </div>

        <div class="client-machines-drawer" id="drawer_${idSafe}">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px; border-bottom: 1px solid #E2E8F0; padding-bottom: 8px;">
            <span style="font-size: 0.85rem; font-weight: bold; color: #475569;">Equipamentos Registados</span>
            <div style="display: flex; gap: 6px;">
              <button type="button" class="btn" style="background-color: #00F5D4; color: #0B132B; padding: 4px 10px; font-size: 0.75rem; font-weight: bold; border: none; border-radius: 4px; cursor: pointer;" onclick="event.stopPropagation(); abrirFormMaquinaPorClienteId('${idSafe}')">
                <i class="fa-solid fa-plus"></i> Add Máquina
              </button>
              <button type="button" class="btn" style="background-color: #F59E0B; color: white; padding: 4px 8px; font-size: 0.75rem; font-weight: bold; border: none; border-radius: 4px; cursor: pointer;" onclick="event.stopPropagation(); editarCliente('${idSafe}')">
                <i class="fa-solid fa-pen"></i> Editar
              </button>
              <button type="button" class="btn" style="background-color: #EF4444; color: white; padding: 4px 8px; font-size: 0.75rem; font-weight: bold; border: none; border-radius: 4px; cursor: pointer;" onclick="event.stopPropagation(); excluirCliente('${idSafe}')">
                <i class="fa-solid fa-trash"></i>
              </button>
            </div>
          </div>

          <div class="machines-list-inner">
            ${gerarHtmlMaquinasInternas(maquinasDoCliente)}
          </div>
        </div>
      </div>
    `;
  });

  container.innerHTML = html || `<p style="text-align: center; color: #64748B; padding: 20px;">Nenhum registo encontrado para "${escapeHTML(termoBusca)}".</p>`;
}

function gerarHtmlMaquinasInternas(maquinas) {
  if (!maquinas || maquinas.length === 0) {
    return `<p style="font-size: 0.85rem; color: #94A3B8; margin: 5px 0; text-align: center; font-style: italic;">Nenhuma máquina associada a este cliente.</p>`;
  }

  return maquinas.map((m, mIdx) => {
    const mId = m.id || ('m_idx_' + mIdx);
    m.id = mId;
    const mIdSafe = escapeHTML(String(mId));
    const nomeMaq = m.name || m.nome || 'Máquina sem nome';
    const marcaMaq = m.brand || m.marca || '';
    const modMaq = m.model || m.modelo || '';
    const serieMaq = m.serialNumber || m.numserie || m.tag || '';

    let infoComplementar = [];
    if (marcaMaq) infoComplementar.push(`Marca: ${escapeHTML(marcaMaq)}`);
    if (modMaq) infoComplementar.push(`Modelo: ${escapeHTML(modMaq)}`);
    let stringComplementar = infoComplementar.join(' | ');

    return `
      <div class="machine-item">
        <div>
          <strong style="font-size: 0.95rem; color: #0B132B;"><i class="fa-solid fa-gear" style="color: #1D4ED8;"></i> ${escapeHTML(nomeMaq)}</strong>
          ${stringComplementar ? `<span style="font-size: 0.8rem; color: #475569; margin-left: 8px;">(${stringComplementar})</span>` : ''}
          ${serieMaq ? `<br><small style="font-size: 0.78rem; color: #64748B;">Nº Série / Tag: ${escapeHTML(serieMaq)}</small>` : ''}
        </div>
        <div style="display: flex; gap: 6px; flex-wrap: wrap;">
          <button type="button" class="btn" style="background-color: #10B981; color: white; padding: 4px 8px; font-size: 0.75rem; font-weight: bold; border: none; border-radius: 4px; cursor: pointer;" onclick="novaRSComMaquinaId('${mIdSafe}')">
            <i class="fa-solid fa-file-circle-plus"></i> Gerar RS
          </button>
          <button type="button" class="btn" style="background-color: #F59E0B; color: white; padding: 4px 8px; font-size: 0.75rem; font-weight: bold; border: none; border-radius: 4px; cursor: pointer;" onclick="editarMaquina('${mIdSafe}')">
            <i class="fa-solid fa-pen"></i>
          </button>
          <button type="button" class="btn" style="background-color: #EF4444; color: white; padding: 4px 8px; font-size: 0.75rem; font-weight: bold; border: none; border-radius: 4px; cursor: pointer;" onclick="excluirMaquina('${mIdSafe}')">
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
  const btn = document.getElementById('btn-submit-c');
  btn.disabled = false;
  btn.textContent = "Guardar Cliente";
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
  const cliente = listaClientes.find(c => String(c.id) === String(id));
  if (!cliente) return;

  clienteEmEdicaoId = id;
  document.getElementById('c-nome').value = cliente.name || cliente.nome || '';
  document.getElementById('c-contato').value = cliente.contact || cliente.contato || '';
  document.getElementById('c-telefone').value = cliente.phone || cliente.telefone || '';
  document.getElementById('c-email').value = cliente.email || '';
  document.getElementById('c-documento').value = cliente.document || cliente.cpf_cnpj || cliente.cnpj || cliente.cpf || '';
  document.getElementById('c-endereco').value = cliente.address || cliente.endereco || cliente.morada || '';

  document.getElementById('cliente-form-title').textContent = "Editar Cliente";
  const btn = document.getElementById('btn-submit-c');
  btn.disabled = false;
  btn.textContent = "Atualizar Cliente";
  document.getElementById('clienteFormSection').style.display = 'block';
  document.getElementById('maquinaFormSection').style.display = 'none';
  window.scrollTo({ top: document.getElementById('clienteFormSection').offsetTop - 70, behavior: 'smooth' });
};

document.getElementById('cliente-form')?.addEventListener('submit', async (e) => {
  e.preventDefault();
  const btn = document.getElementById('btn-submit-c');
  const txtOriginal = btn ? btn.textContent : 'Guardar Cliente';

  const name = higienizarTexto(document.getElementById('c-nome').value);
  const contact = higienizarTexto(document.getElementById('c-contato').value);
  const phone = higienizarTexto(document.getElementById('c-telefone').value);
  const email = higienizarTexto(document.getElementById('c-email').value);
  const documentVal = higienizarTexto(document.getElementById('c-documento').value);
  const address = higienizarTexto(document.getElementById('c-endereco').value);

  if (!name) return;

  if (btn) {
    btn.disabled = true;
    btn.textContent = 'A guardar...';
  }

  try {
    let list = await DataSync.load('rg_clients') || [];
    if (!Array.isArray(list)) list = [];

    const objetoCliente = {
      name,
      nome: name,
      contact,
      contato: contact,
      phone,
      telefone: phone,
      email,
      document: documentVal,
      cpf_cnpj: documentVal,
      address,
      endereco: address
    };

    if (clienteEmEdicaoId) {
      const idx = list.findIndex(c => String(c.id) === String(clienteEmEdicaoId));
      if (idx !== -1) {
        const antigoNome = list[idx].name || list[idx].nome;
        list[idx] = { ...list[idx], ...objetoCliente };

        if (antigoNome && antigoNome !== name) {
          let maqs = await DataSync.load('rg_machines') || [];
          if (Array.isArray(maqs)) {
            maqs.forEach(m => {
              if (m.client === antigoNome || m.cliente === antigoNome) {
                m.client = name;
                m.cliente = name;
              }
            });
            await DataSync.save('rg_machines', maqs);
          }
        }
      }
    } else {
      const novoId = 'c_' + Date.now();
      list.push({ id: novoId, ...objetoCliente });
    }

    await DataSync.save('rg_clients', list);
    alert("Cliente guardado com sucesso!");
    fecharFormCliente();
    await carregarDados();
    renderizarTudo();
  } catch (err) {
    alert("Erro ao guardar cliente: " + err.message);
  } finally {
    if (btn) {
      btn.disabled = false;
      btn.textContent = txtOriginal;
    }
  }
});

window.excluirCliente = async function(id) {
  const cliente = listaClientes.find(c => String(c.id) === String(id));
  const nomeCliente = cliente ? (cliente.name || cliente.nome || 'este cliente') : 'este cliente';

  if (confirm(`Tem a certeza que deseja eliminar o cliente "${nomeCliente}"?\nAs máquinas vinculadas permanecerão sem cliente atribuído.`)) {
    try {
      let list = await DataSync.load('rg_clients') || [];
      list = list.filter(c => String(c.id) !== String(id));
      await DataSync.save('rg_clients', list);
      await carregarDados();
      renderizarTudo();
    } catch (err) {
      alert("Erro ao eliminar cliente: " + err.message);
    }
  }
};

/* --- GESTÃO DO FORMULÁRIO DE MÁQUINA --- */
window.abrirFormMaquinaPorClienteId = function(idCliente) {
  const cliente = listaClientes.find(c => String(c.id) === String(idCliente));
  const nome = cliente ? (cliente.name || cliente.nome || '') : '';
  abrirFormMaquina(nome);
};

window.abrirFormMaquina = function(nomeClientePreSelecionado = '') {
  maquinaEmEdicaoId = null;
  document.getElementById('maquina-form').reset();
  atualizarSelectClientes();

  if (nomeClientePreSelecionado) {
    document.getElementById('m-cliente-select').value = nomeClientePreSelecionado;
  }

  document.getElementById('maquina-form-title').textContent = "Cadastrar Nova Máquina";
  const btn = document.getElementById('btn-submit-m');
  btn.disabled = false;
  btn.textContent = "Guardar Máquina";
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
  const maquina = listaMaquinas.find(m => String(m.id) === String(id));
  if (!maquina) return;

  maquinaEmEdicaoId = id;
  atualizarSelectClientes();

  document.getElementById('m-cliente-select').value = maquina.client || maquina.cliente || '';
  document.getElementById('m-nome').value = maquina.name || maquina.nome || '';
  document.getElementById('m-marca').value = maquina.brand || maquina.marca || '';
  document.getElementById('m-modelo').value = maquina.model || maquina.modelo || '';
  document.getElementById('m-numserie').value = maquina.serialNumber || maquina.numserie || maquina.tag || '';

  document.getElementById('maquina-form-title').textContent = "Editar Máquina";
  const btn = document.getElementById('btn-submit-m');
  btn.disabled = false;
  btn.textContent = "Atualizar Máquina";
  document.getElementById('maquinaFormSection').style.display = 'block';
  document.getElementById('clienteFormSection').style.display = 'none';
  window.scrollTo({ top: document.getElementById('maquinaFormSection').offsetTop - 70, behavior: 'smooth' });
};

document.getElementById('maquina-form')?.addEventListener('submit', async (e) => {
  e.preventDefault();
  const btn = document.getElementById('btn-submit-m');
  const txtOriginal = btn ? btn.textContent : 'Guardar Máquina';

  const client = higienizarTexto(document.getElementById('m-cliente-select').value);
  const name = higienizarTexto(document.getElementById('m-nome').value);
  const brand = higienizarTexto(document.getElementById('m-marca').value);
  const model = higienizarTexto(document.getElementById('m-modelo').value);
  const serialNumber = higienizarTexto(document.getElementById('m-numserie').value);

  if (!client || !name) {
    alert("Selecione o cliente e informe o nome da máquina.");
    return;
  }

  if (btn) {
    btn.disabled = true;
    btn.textContent = 'A guardar...';
  }

  try {
    let list = await DataSync.load('rg_machines') || [];
    if (!Array.isArray(list)) list = [];

    const objetoMaquina = {
      client,
      cliente: client,
      name,
      nome: name,
      brand,
      marca: brand,
      model,
      modelo: model,
      serialNumber,
      numserie: serialNumber,
      tag: serialNumber
    };

    if (maquinaEmEdicaoId) {
      const idx = list.findIndex(m => String(m.id) === String(maquinaEmEdicaoId));
      if (idx !== -1) {
        list[idx] = { ...list[idx], ...objetoMaquina };
      }
    } else {
      const novoId = 'm_' + Date.now();
      list.push({ id: novoId, ...objetoMaquina });
    }

    await DataSync.save('rg_machines', list);
    alert("Máquina guardada com sucesso!");
    fecharFormMaquina();
    await carregarDados();
    renderizarTudo();

    const clienteObj = listaClientes.find(c => (c.name || c.nome) === client);
    if (clienteObj) {
      setTimeout(() => toggleAcordeaoCliente(clienteObj.id), 100);
    }

  } catch (err) {
    alert("Erro ao guardar máquina: " + err.message);
  } finally {
    if (btn) {
      btn.disabled = false;
      btn.textContent = txtOriginal;
    }
  }
});

window.excluirMaquina = async function(id) {
  const maquina = listaMaquinas.find(m => String(m.id) === String(id));
  const nomeMaquina = maquina ? (maquina.name || maquina.nome || 'esta máquina') : 'esta máquina';

  if (confirm(`Tem a certeza que deseja eliminar a máquina "${nomeMaquina}"?`)) {
    try {
      let list = await DataSync.load('rg_machines') || [];
      list = list.filter(m => String(m.id) !== String(id));
      await DataSync.save('rg_machines', list);
      await carregarDados();
      renderizarTudo();
    } catch (err) {
      alert("Erro ao eliminar máquina: " + err.message);
    }
  }
};

/* --- AÇÃO RÁPIDA DE NOVO RELATÓRIO A PARTIR DA MÁQUINA --- */
window.novaRSComMaquinaId = function(mId) {
  const m = listaMaquinas.find(item => String(item.id) === String(mId));
  if (!m) return;
  novaRSComMaquina(m.client || m.cliente || '', m.name || m.nome || '');
};

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
