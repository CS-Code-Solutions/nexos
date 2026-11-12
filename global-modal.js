// Substituição global de Alertas e Confirmações por Modais Elegantes
(function() {
    document.addEventListener("DOMContentLoaded", () => {
        if (document.getElementById('globalModalOverlay')) return;

        const modalHTML = `
        <div id="globalModalOverlay" style="display: none; position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.8); z-index: 10000; justify-content: center; align-items: center; font-family: inherit;">
          <div style="background: #121824; border: 1px solid #1e293b; padding: 24px; border-radius: 12px; width: 90%; max-width: 400px; color: #fff; box-shadow: 0 10px 25px rgba(0,0,0,0.5); text-align: center;">
            <h3 id="globalModalTitle" style="margin-top: 0; color: #38bdf8; font-size: 1.2rem; margin-bottom: 12px;">Mensagem</h3>
            <p id="globalModalMessage" style="font-size: 0.95rem; color: #cbd5e1; line-height: 1.5; margin-bottom: 20px; word-break: break-word;"></p>
            <div id="globalModalButtons" style="display: flex; gap: 10px; justify-content: center;">
            </div>
          </div>
        </div>`;
        document.body.insertAdjacentHTML('beforeend', modalHTML);
    });

    window.alert = function(message) {
        return new Promise((resolve) => {
            const overlay = document.getElementById('globalModalOverlay');
            const msgEl = document.getElementById('globalModalMessage');
            const btnContainer = document.getElementById('globalModalButtons');
            const titleEl = document.getElementById('globalModalTitle');

            if (!overlay) {
                window.location.reload();
                return;
            }

            titleEl.textContent = "Aviso do Sistema";
            msgEl.textContent = message;
            btnContainer.innerHTML = `
                <button id="globalModalOkBtn" style="background: #38bdf8; color: #0b132b; border: none; padding: 10px 24px; border-radius: 6px; cursor: pointer; font-weight: bold; font-size: 0.95rem;">OK</button>
            `;

            overlay.style.display = 'flex';

            document.getElementById('globalModalOkBtn').onclick = () => {
                overlay.style.display = 'none';
                resolve(true);
            };
        });
    };

    window.confirm = function(message) {
        return new Promise((resolve) => {
            const overlay = document.getElementById('globalModalOverlay');
            const msgEl = document.getElementById('globalModalMessage');
            const btnContainer = document.getElementById('globalModalButtons');
            const titleEl = document.getElementById('globalModalTitle');

            if (!overlay) {
                resolve(true);
                return;
            }

            titleEl.textContent = "Confirmação necessária";
            msgEl.textContent = message;
            btnContainer.innerHTML = `
                <button id="globalModalCancelBtn" style="background: #64748B; color: white; border: none; padding: 10px 16px; border-radius: 6px; cursor: pointer; font-weight: bold; font-size: 0.95rem;">Cancelar</button>
                <button id="globalModalConfirmBtn" style="background: #ef4444; color: white; border: none; padding: 10px 16px; border-radius: 6px; cursor: pointer; font-weight: bold; font-size: 0.95rem;">Confirmar</button>
            `;

            overlay.style.display = 'flex';

            document.getElementById('globalModalCancelBtn').onclick = () => {
                overlay.style.display = 'none';
                resolve(false);
            };

            document.getElementById('globalModalConfirmBtn').onclick = () => {
                overlay.style.display = 'none';
                resolve(true);
            };
        });
    };
})();
document.addEventListener("DOMContentLoaded", () => {
  const bottomNav = document.getElementById("mainBottomNav");
  if (!bottomNav) return;

  // Cria os indicadores visuais nas extremidades
  const hintLeft = document.createElement("div");
  hintLeft.className = "nav-scroll-hint left";
  hintLeft.innerHTML = '<i class="fa-solid fa-chevron-left"></i>';

  const hintRight = document.createElement("div");
  hintRight.className = "nav-scroll-hint right";
  hintRight.innerHTML = '<i class="fa-solid fa-chevron-right"></i>';

  document.body.appendChild(hintLeft);
  document.body.appendChild(hintRight);

  function atualizarIndicadoresNav() {
    // Se a barra estiver oculta (desktop), esconde ambos
    if (bottomNav.offsetParent === null) {
      hintLeft.classList.remove("visible");
      hintRight.classList.remove("visible");
      return;
    }

    const temOverflow = bottomNav.scrollWidth > bottomNav.clientWidth + 2;
    if (!temOverflow) {
      hintLeft.classList.remove("visible");
      hintRight.classList.remove("visible");
      return;
    }

    // Mostra seta esquerda se já rolou para a direita
    if (bottomNav.scrollLeft > 8) {
      hintLeft.classList.add("visible");
    } else {
      hintLeft.classList.remove("visible");
    }

    // Mostra seta direita se ainda há conteúdo oculto à direita
    const maxScroll = bottomNav.scrollWidth - bottomNav.clientWidth;
    if (bottomNav.scrollLeft < maxScroll - 8) {
      hintRight.classList.add("visible");
    } else {
      hintRight.classList.remove("visible");
    }
  }

  bottomNav.addEventListener("scroll", atualizarIndicadoresNav, { passive: true });
  window.addEventListener("resize", atualizarIndicadoresNav);

  // Executa na carga inicial e após o scroll automático do item ativo
  atualizarIndicadoresNav();
  setTimeout(atualizarIndicadoresNav, 350);
});
