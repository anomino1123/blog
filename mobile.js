// ============================================
// REPÓRTER DA PERIFERIA - FUNÇÕES MOBILE
// Menu hamburguer, toast, utils
// ============================================

// Toast de notificação
function showToast(message, duration = 3000) {
    const existingToast = document.querySelector('.toast');
    if (existingToast) existingToast.remove();
    
    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.textContent = message;
    document.body.appendChild(toast);
    
    setTimeout(() => {
        toast.remove();
    }, duration);
}

// Copiar texto para clipboard
async function copyToClipboard(text) {
    try {
        await navigator.clipboard.writeText(text);
        showToast('✅ Link copiado!');
    } catch (err) {
        showToast('❌ Erro ao copiar');
    }
}

// Compartilhar post
async function sharePost(title, text, url) {
    if (navigator.share) {
        try {
            await navigator.share({
                title: title,
                text: text,
                url: url
            });
        } catch (err) {
            console.log('Compartilhamento cancelado');
        }
    } else {
        copyToClipboard(url);
    }
}

// Menu hamburguer
function initMobileMenu() {
    if (document.querySelector('.menu-toggle')) return;
    
    const menuBtn = document.createElement('button');
    menuBtn.className = 'menu-toggle';
    menuBtn.innerHTML = '<i class="fas fa-bars"></i>';
    menuBtn.setAttribute('aria-label', 'Menu');
    document.body.appendChild(menuBtn);
    
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
    
    document.querySelectorAll('.nav-btn, .user-info').forEach(btn => {
        btn.addEventListener('click', () => {
            if (window.innerWidth <= 767) {
                setTimeout(closeMenu, 150);
            }
        });
    });
}

// Contador de caracteres
function initCharCounter(textareaId, counterId, maxLength = 2000) {
    const textarea = document.getElementById(textareaId);
    const counter = document.getElementById(counterId);
    
    if (!textarea || !counter) return;
    
    function updateCounter() {
        const length = textarea.value.length;
        counter.textContent = `${length}/${maxLength}`;
        
        if (length > maxLength * 0.9) {
            counter.classList.add('warning');
        } else {
            counter.classList.remove('warning');
        }
        
        if (length > maxLength) {
            counter.classList.add('danger');
            textarea.style.borderColor = '#ef4444';
        } else {
            counter.classList.remove('danger');
            textarea.style.borderColor = '';
        }
    }
    
    textarea.addEventListener('input', updateCounter);
    updateCounter();
}

// Upload de imagem
function setupImageUpload(inputId, previewId, onImageSelected) {
    const input = document.getElementById(inputId);
    const preview = document.getElementById(previewId);
    
    if (!input) return;
    
    input.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (file && file.type.startsWith('image/')) {
            const reader = new FileReader();
            reader.onload = (ev) => {
                if (preview) {
                    preview.src = ev.target.result;
                    preview.style.display = 'block';
                }
                if (onImageSelected) onImageSelected(ev.target.result);
            };
            reader.readAsDataURL(file);
        }
    });
}

// Salvar preferência de tema
function initTheme() {
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme === 'light') {
        document.body.classList.add('light-mode');
    }
}

function toggleTheme() {
    document.body.classList.toggle('light-mode');
    localStorage.setItem('theme', document.body.classList.contains('light-mode') ? 'light' : 'dark');
}

// Inicializar
document.addEventListener('DOMContentLoaded', () => {
    initMobileMenu();
    initTheme();
    
    // Botão de tema
    const themeBtn = document.getElementById('darkModeBtn');
    if (themeBtn) {
        themeBtn.addEventListener('click', toggleTheme);
    }
});

// Exportar funções
window.showToast = showToast;
window.copyToClipboard = copyToClipboard;
window.sharePost = sharePost;
window.initCharCounter = initCharCounter;
window.setupImageUpload = setupImageUpload;
window.toggleTheme = toggleTheme;