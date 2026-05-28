// ============================================
// REPÓRTER DA PERIFERIA - FUNÇÕES MOBILE
// Menu hamburguer e otimizações para celular
// ============================================

function initMobileMenu() {
    // Verificar se já existe o botão
    if (document.querySelector('.menu-toggle')) return;
    
    // Criar botão do menu
    const menuBtn = document.createElement('button');
    menuBtn.className = 'menu-toggle';
    menuBtn.innerHTML = '<i class="fas fa-bars"></i>';
    menuBtn.setAttribute('aria-label', 'Menu');
    document.body.appendChild(menuBtn);
    
    // Criar overlay
    const overlay = document.createElement('div');
    overlay.className = 'menu-overlay';
    document.body.appendChild(overlay);
    
    const sidebar = document.querySelector('.sidebar');
    
    function openMenu() {
        sidebar.classList.add('open');
        overlay.classList.add('active');
        document.body.style.overflow = 'hidden';
    }
    
    function closeMenu() {
        sidebar.classList.remove('open');
        overlay.classList.remove('active');
        document.body.style.overflow = '';
    }
    
    menuBtn.addEventListener('click', openMenu);
    overlay.addEventListener('click', closeMenu);
    
    // Fechar menu ao clicar em qualquer link
    document.querySelectorAll('.nav-btn, .user-info').forEach(btn => {
        btn.addEventListener('click', () => {
            if (window.innerWidth <= 767) {
                setTimeout(closeMenu, 150);
            }
        });
    });
}

// Ajustar altura do modal quando teclado abre
function fixModalHeight() {
    const modal = document.querySelector('.modal');
    if (!modal) return;
    
    window.addEventListener('resize', () => {
        if (modal.classList.contains('open')) {
            const windowHeight = window.innerHeight;
            const modalContent = modal.querySelector('.modal-content');
            if (modalContent) {
                modalContent.style.maxHeight = (windowHeight - 40) + 'px';
            }
        }
    });
}

// Inicializar
document.addEventListener('DOMContentLoaded', () => {
    initMobileMenu();
    fixModalHeight();
});