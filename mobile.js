function showToast(message, duration = 3000) {
    const existingToast = document.querySelector('.toast');
    if (existingToast) existingToast.remove();
    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.textContent = message;
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), duration);
}

function copyToClipboard(text) { navigator.clipboard.writeText(text); showToast('✅ Link copiado!'); }

function sharePost(title, text, url) {
    if (navigator.share) { navigator.share({ title: title, text: text, url: url }); }
    else { copyToClipboard(url); }
}

function initMobileMenu() {
    if (document.querySelector('.menu-toggle')) return;
    const menuBtn = document.createElement('button');
    menuBtn.className = 'menu-toggle';
    menuBtn.innerHTML = '<i class="fas fa-bars"></i>';
    document.body.appendChild(menuBtn);
    const overlay = document.createElement('div');
    overlay.className = 'menu-overlay';
    document.body.appendChild(overlay);
    const sidebar = document.querySelector('.sidebar');
    if (!sidebar) return;
    function openMenu() { sidebar.classList.add('open'); overlay.classList.add('active'); document.body.style.overflow = 'hidden'; }
    function closeMenu() { sidebar.classList.remove('open'); overlay.classList.remove('active'); document.body.style.overflow = ''; }
    menuBtn.addEventListener('click', openMenu);
    overlay.addEventListener('click', closeMenu);
    document.querySelectorAll('.nav-btn, .user-info').forEach(btn => {
        btn.addEventListener('click', () => { if (window.innerWidth <= 767) setTimeout(closeMenu, 150); });
    });
}

function initTheme() { if (localStorage.getItem('theme') === 'light') document.body.classList.add('light-mode'); }
function toggleTheme() { document.body.classList.toggle('light-mode'); localStorage.setItem('theme', document.body.classList.contains('light-mode') ? 'light' : 'dark'); }

document.addEventListener('DOMContentLoaded', () => {
    initMobileMenu();
    initTheme();
    const themeBtn = document.getElementById('darkModeBtn');
    if (themeBtn) themeBtn.addEventListener('click', toggleTheme);
});

window.showToast = showToast;
window.copyToClipboard = copyToClipboard;
window.sharePost = sharePost;
window.toggleTheme = toggleTheme;