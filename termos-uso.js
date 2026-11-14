/**
 * NexOS - Módulo de Aceite Jurídico (Clickwrap Agreement)
 * Regista prova de aceite no Firestore e bloqueia uso sem consentimento.
 */

const VERSAO_TERMOS = "v1.0_2026_11";

firebase.auth().onAuthStateChanged(async (user) => {
  if (user) {
    await verificarAceiteTermos(user);
  }
});

async function verificarAceiteTermos(user) {
  const chaveLocal = `nexos_termos_aceitos_${VERSAO_TERMOS}_${user.uid}`;
  
  // 1. Verificação rápida local
  if (localStorage.getItem(chaveLocal) === 'true') return;

  // 2. Verificação oficial na nuvem (Firestore)
  try {
    const docRef = db.collection('rg_termos_aceites').doc(`${user.uid}_${VERSAO_TERMOS}`);
    const docSnap = await docRef.get();

    if (docSnap.exists) {
      localStorage.setItem(chaveLocal, 'true');
      return;
    }

    // Se não existe registo na nuvem, exibe o modal bloqueante
    exibirModalTermosDeUso(user);
  } catch (e) {
    console.warn("Aviso ao verificar termos:", e);
    exibirModalTermosDeUso(user);
  }
}

function exibirModalTermosDeUso(user) {
  if (document.getElementById('modalJuridicoTermos')) return;

  const modalHtml = `
    <div id="modalJuridicoTermos" style="position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(11, 19, 43, 0.92); z-index: 99999; display: flex; justify-content: center; align-items: center; padding: 15px; box-sizing: border-box; backdrop-filter: blur(4px);">
      <div style="background: #FFFFFF; width: 100%; max-width: 600px; border-radius: 10px; box-shadow: 0 20px 40px rgba(0,0,0,0.4); overflow: hidden; display: flex; flex-direction: column; max-height: 90vh; border: 1px solid #CBD5E1;">
        
        <!-- Cabeçalho -->
        <div style="background: #0B132B; color: #FFFFFF; padding: 16px 20px; border-bottom: 3px solid #00F5D4; display: flex; align-items: center; gap: 10px;">
          <i class="fa-solid fa-scale-balanced" style="color: #00F5D4; font-size: 1.3rem;"></i>
          <div>
            <h3 style="margin: 0; font-size: 1.05rem; font-weight: bold;">Termos de Uso e Política de Privacidade</h3>
            <span style="font-size: 0.75rem; color: #94A3B8;">Leitura e aceite obrigatórios para continuar (${VERSAO_TERMOS})</span>
          </div>
        </div>

        <!-- Corpo do Contrato (Scroll) -->
        <div style="padding: 20px; overflow-y: auto; color: #334155; font-size: 0.85rem; line-height: 1.55; background: #F8FAFC; flex-grow: 1; text-align: justify;">
          <p style="margin-top: 0;">Bem-vindo ao <strong>NexOS</strong>, uma plataforma de gestão operacional e manutenção desenvolvida e mantida pela <strong>CS Code Solutions</strong> ("Licenciante"). Ao aceder e utilizar este sistema, você ("Licenciado" ou "Utilizador") concorda integralmente com os termos abaixo:</p>
          
          <p><strong>1. OBJETO E LICENÇA DE USO</strong><br>
          O NexOS é licenciado no modelo <em>Software as a Service</em> (SaaS), de forma não exclusiva e intransferível, destinando-se exclusivamente ao suporte na gestão de relatórios de serviço, orçamentos, cadastros e planeamento de manutenção.</p>

          <p><strong>2. LIMITAÇÃO DE RESPONSABILIDADE (ISENÇÃO DE DANOS)</strong><br>
          <strong>2.1. Ferramenta de Apoio:</strong> O NexOS é uma ferramenta de registo e organização. A <strong>CS Code Solutions</strong> não se responsabiliza por decisões técnicas, falhas mecânicas/elétricas em equipamentos, acidentes de trabalho, prejuízos financeiros ou lucros cessantes decorrentes da execução dos serviços prestados pelo Licenciado aos seus clientes finais.<br>
          <strong>2.2. Dados Inseridos:</strong> Todo o conteúdo, valores, laudos técnicos, assinaturas digitais e imagens anexadas são de inteira responsabilidade do Utilizador que os insere.<br>
          <strong>2.3. Disponibilidade e Infraestrutura:</strong> O sistema opera sobre infraestrutura de nuvem de terceiros (Google Firebase / Vercel). Embora adotemos as melhores práticas de segurança, a Licenciante não garante disponibilidade ininterrupta (100% de <em>uptime</em>) e não responde por falhas de conexão de internet do Utilizador ou indisponibilidade temporária dos servidores de nuvem.</p>

          <p><strong>3. PROTEÇÃO DE DADOS E LGPD (LEI Nº 13.709/2018)</strong><br>
          <strong>3.1. Papéis:</strong> O Licenciado atua como <strong>Controlador</strong> dos dados dos seus próprios clientes e funcionários inseridos no sistema, cabendo-lhe obter as devidas autorizações legais. A CS Code Solutions atua estritamente como <strong>Operadora</strong>, armazenando os dados de forma isolada (<em>Multi-tenant</em>) e segura.<br>
          <strong>3.2. Sigilo:</strong> A CS Code Solutions não vende, aluga ou partilha os dados comerciais ou financeiros inseridos na conta do Licenciado com terceiros.</p>

          <p><strong>4. SEGURANÇA DA CONTA E PROPRIEDADE INTELECTUAL</strong><br>
          O Utilizador é responsável pela guarda do seu login e senha. Todo o código-fonte, design, marca e arquitetura do NexOS pertencem exclusivamente à CS Code Solutions, sendo proibida a engenharia reversa, cópia ou distribuição não autorizada.</p>

          <p style="margin-bottom: 0;"><strong>5. VIGÊNCIA E CANCELAMENTO</strong><br>
          O não pagamento da assinatura ou a violação destes termos poderá resultar na suspensão imediata do acesso, ficando os dados disponíveis para exportação pelo prazo de 30 dias após o encerramento.</p>
        </div>

        <!-- Rodapé com Checkbox Obrigatório -->
        <div style="background: #FFFFFF; padding: 15px 20px; border-top: 1px solid #CBD5E1; display: flex; flex-direction: column; gap: 12px;">
          <label style="display: flex; align-items: flex-start; gap: 10px; cursor: pointer; font-size: 0.85rem; color: #0B132B; font-weight: 500;">
            <input type="checkbox" id="checkAceiteTermos" style="margin-top: 3px; width: 16px; height: 16px; cursor: pointer;">
            <span>Li, compreendi e aceito integralmente os Termos de Uso e a Política de Privacidade do NexOS.</span>
          </label>

          <button type="button" id="btnConfirmarTermos" disabled style="background: #94A3B8; color: #FFFFFF; border: none; padding: 11px; border-radius: 6px; font-weight: bold; font-size: 0.9rem; cursor: not-allowed; transition: all 0.2s;">
            Confirmar e Acessar o Sistema
          </button>
        </div>

      </div>
    </div>
  `;

  document.body.insertAdjacentHTML('beforeend', modalHtml);

  const checkbox = document.getElementById('checkAceiteTermos');
  const btn = document.getElementById('btnConfirmarTermos');

  checkbox.addEventListener('change', () => {
    if (checkbox.checked) {
      btn.disabled = false;
      btn.style.background = '#10B981';
      btn.style.cursor = 'pointer';
    } else {
      btn.disabled = true;
      btn.style.background = '#94A3B8';
      btn.style.cursor = 'not-allowed';
    }
  });

  btn.addEventListener('click', async () => {
    if (!checkbox.checked) return;
    btn.disabled = true;
    btn.innerHTML = '<i class="fa-solid fa-circle-notch fa-spin"></i> Registando aceite...';

    const tenantId = localStorage.getItem('rg_tenant_id') || user.uid;
    const registroJuridico = {
      uid: user.uid,
      email: user.email || 'sem-email',
      tenant_id: tenantId,
      versao_termos: VERSAO_TERMOS,
      aceito_em: new Date().toISOString(),
      user_agent: navigator.userAgent
    };

    try {
      await db.collection('rg_termos_aceites').doc(`${user.uid}_${VERSAO_TERMOS}`).set(registroJuridico);
    } catch (err) {
      console.error("Erro ao salvar log de aceite na nuvem:", err);
    }

    localStorage.setItem(`nexos_termos_aceitos_${VERSAO_TERMOS}_${user.uid}`, 'true');
    const modal = document.getElementById('modalJuridicoTermos');
    if (modal) modal.remove();
  });
}
