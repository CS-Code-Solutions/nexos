// layout-injector.js - Injeção Automática de Cabeçalho e Rodapé
(function() {
    // 1. Configuração do HTML do Cabeçalho (Header Limpo)
    const headerHTML = `
        <div class="nav-container" style="display: flex; justify-content: space-between; align-items: center; padding: 10px 20px;">
            <a href="index.html" class="logo">
                <img src="marca.png" alt="Logo" style="height: 35px;">
            </a>
            <span style="color: #00F5D4; font-size: 0.85rem; font-weight: bold;">Laser Expert</span>
        </div>
    `;

    // 2. Configuração do HTML do Rodapé (Bottom Nav Fixa)
    const footerHTML = `
        <nav class="bottom-nav no-print">
            <a href="index.html" id="nav-clientes">
                <i class="fa-solid fa-users"></i>
                <span>Clientes</span>
            </a>
            <a href="maquinas.html" id="nav-maquinas">
                <i class="fa-solid fa-gears"></i>
                <span>Máquinas</span>
            </a>
            <a href="novo-relatorio.html" id="nav-relatorios">
                <i class="fa-solid fa-file-lines"></i>
                <span>Relatórios</span>
            </a>
            <a href="orcamentos.html" id="nav-orcamentos">
                <i class="fa-solid fa-calculator"></i>
                <span>Orçamentos</span>
            </a>
            <a href="configuracao.html" id="nav-config">
                <i class="fa-solid fa-gear"></i>
                <span>Config</span>
            </a>
        </nav>
    `;

    // 3. Função para Injetar e Ativar o Layout
    document.addEventListener("DOMContentLoaded", () => {
        // Injetar Cabeçalho (substituindo o conteúdo do header existente)
        const existingHeader = document.querySelector('header.no-print');
        if (existingHeader) {
            existingHeader.innerHTML = headerHTML;
        } else {
            // Se não existir header (improvável pelo seu HTML), cria um
            const newHeader = document.createElement('header');
            newHeader.className = 'no-print';
            newHeader.innerHTML = headerHTML;
            document.body.prepend(newHeader);
        }

        // Injetar Rodapé (antes do body fechar)
        document.body.insertAdjacentHTML('beforeend', footerHTML);

        // 4. Identificar a página atual e marcar o link como ativo
        const currentPage = window.location.pathname.split("/").pop();
        let activeNavLinkId = '';

        switch (currentPage) {
            case 'index.html': activeNavLinkId = 'nav-clientes'; break;
            case 'maquinas.html': activeNavLinkId = 'nav-maquinas'; break;
            case 'novo-relatorio.html': activeNavLinkId = 'nav-relatorios'; break;
            case 'orcamentos.html': activeNavLinkId = 'nav-orcamentos'; break;
            case 'configuracao.html': activeNavLinkId = 'nav-config'; break;
            // Adicione casos extra se necessário, ex: 'detalhes-maquina.html' -> 'nav-maquinas'
            default: activeNavLinkId = 'nav-clientes'; // Página padrão
        }

        const activeLink = document.getElementById(activeNavLinkId);
        if (activeLink) {
            activeLink.classList.add('active');
        }
    });
})();
