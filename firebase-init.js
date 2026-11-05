// Configuração unificada do Firebase para o projeto Laser Expert
const firebaseConfig = {
  apiKey: "AIzaSyA_Br3Hp3Dz5ur7lKjUJ-pSCBQCZQNqPK0",
  authDomain: "sistema-ee7d0.firebaseapp.com",
  projectId: "sistema-ee7d0",
  storageBucket: "sistema-ee7d0.firebasestorage.app",
  messagingSenderId: "879155372243",
  appId: "1:879155372243:web:360e87c48e91c45b353426"
};

// Inicializar o Firebase (versão Compat para HTML estático sem conflitos)
if (!firebase.apps.length) {
  firebase.initializeApp(firebaseConfig);
}

// Instâncias globais partilhadas em todo o sistema
const db = firebase.firestore();
const auth = firebase.auth();


// --- INJEÇÃO AUTOMÁTICA DE LAYOUT (Cabeçalho Limpo e Rodapé Fixo) ---
(function() {
    const headerHTML = `
        <div class="nav-container" style="display: flex; justify-content: space-between; align-items: center; padding: 10px 20px;">
            <a href="index.html" class="logo">
                <img src="marca.png" alt="Logo" style="height: 35px;">
            </a>
            <span style="color: #00F5D4; font-size: 0.85rem; font-weight: bold;">Laser Expert</span>
        </div>
    `;

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

    document.addEventListener("DOMContentLoaded", () => {
        // Injetar Cabeçalho
        const existingHeader = document.querySelector('header.no-print');
        if (existingHeader) {
            existingHeader.innerHTML = headerHTML;
        } else {
            const newHeader = document.createElement('header');
            newHeader.className = 'no-print';
            newHeader.innerHTML = headerHTML;
            document.body.prepend(newHeader);
        }

        // Injetar Rodapé fixo se ainda não existir
        if (!document.querySelector('.bottom-nav')) {
            document.body.insertAdjacentHTML('beforeend', footerHTML);
        }

        // Identificar página ativa com base no URL atual
        const currentPage = window.location.pathname.split("/").pop();
        let activeNavLinkId = '';

        switch (currentPage) {
            case 'index.html': activeNavLinkId = 'nav-clientes'; break;
            case 'maquinas.html': activeNavLinkId = 'nav-maquinas'; break;
            case 'novo-relatorio.html': activeNavLinkId = 'nav-relatorios'; break;
            case 'orcamentos.html': activeNavLinkId = 'nav-orcamentos'; break;
            case 'configuracao.html': activeNavLinkId = 'nav-config'; break;
            default: activeNavLinkId = 'nav-clientes';
        }

        const activeLink = document.getElementById(activeNavLinkId);
        if (activeLink) {
            activeLink.classList.add('active');
        }
    });
})();
