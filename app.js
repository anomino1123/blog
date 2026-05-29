let currentUser = null;
let currentPage = 'feed';
let currentDMTarget = null;
let selectedPostType = 'pensamento';
let mediaRecorder = null;
let audioChunks = [];
let currentFilter = 'all';
let currentSearchTerm = '';
let currentPagePosts = 0;
let postsToShow = 10;
let editingPostId = null;
let selectedImage = null;

document.addEventListener('DOMContentLoaded', function() {
    currentUser = DB.getCurrentUser();
    if (!currentUser) { window.location.href = 'login.html'; return; }
    updateUserInterface();
    loadInitialData();
    setupEventListeners();
    startRealtimeUpdates();
    setupSearch();
    setupFilters();
});

function updateUserInterface() {
    const verifiedHtml = currentUser.isVerified ? '<i class="fas fa-check-circle verified-icon"></i>' : '';
    document.getElementById('userName').innerHTML = currentUser.name + ' ' + verifiedHtml;
    document.getElementById('userBio').textContent = currentUser.bio;
    if (currentUser.avatar) {
        document.getElementById('avatarImage').src = currentUser.avatar;
        document.getElementById('avatarImage').style.display = 'block';
        document.getElementById('avatarEmoji').style.display = 'none';
    } else {
        document.getElementById('avatarEmoji').textContent = currentUser.emoji || '🧠';
    }
}

function loadInitialData() {
    renderCurrentPage();
    renderSuggestions();
    renderDMList();
    if (typeof Notifications !== 'undefined') { Notifications.renderList(); Notifications.updateBadge(); }
}

function setupEventListeners() {
    document.querySelectorAll('.nav-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            const page = this.dataset.page;
            if (page === 'meu-perfil') { window.location.href = 'perfil.html'; }
            else if (page === 'salvos') { showSavedPosts(); }
            else if (page) { changePage(page); }
        });
    });
    document.getElementById('fabPostBtn')?.addEventListener('click', openPostModal);
    document.getElementById('refreshFeedBtn')?.addEventListener('click', () => { currentPagePosts = 0; renderCurrentPage(); showToast('Feed atualizado!'); });
    document.getElementById('logoutBtn')?.addEventListener('click', () => Auth.logout());
    document.querySelectorAll('.close-modal').forEach(btn => {
        btn.addEventListener('click', () => {
            document.getElementById('postModal')?.classList.remove('open');
            document.getElementById('dmModal')?.classList.remove('open');
        });
    });
    document.querySelectorAll('.type-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            document.querySelectorAll('.type-btn').forEach(b => b.classList.remove('active'));
            this.classList.add('active');
            selectedPostType = this.dataset.type;
            document.getElementById('audioRecordArea').style.display = selectedPostType === 'audio' ? 'block' : 'none';
        });
    });
    setupAudioRecording();
    document.getElementById('publishPostBtn')?.addEventListener('click', publishPost);
    document.getElementById('sendDmBtn')?.addEventListener('click', sendDirectMessage);
    document.getElementById('newChatBtn')?.addEventListener('click', openNewChatModal);
}

function changePage(page) {
    currentPage = page;
    currentPagePosts = 0;
    currentFilter = 'all';
    currentSearchTerm = '';
    const searchInput = document.getElementById('searchInput');
    if (searchInput) searchInput.value = '';
    document.querySelectorAll('.nav-btn').forEach(btn => {
        if (btn.dataset.page === page) btn.classList.add('active');
        else btn.classList.remove('active');
    });
    const titles = { 'feed': 'Início', 'teses': 'Teses', 'diario': 'Diário', 'jornal': 'Notícias', 'audio': 'Áudios', 'salvos': 'Posts Salvos' };
    document.getElementById('pageTitle').textContent = titles[page] || 'Repórter da Periferia';
    renderCurrentPage();
}

function showSavedPosts() {
    const savedPostIds = DB.getSavedPosts(currentUser.id);
    const savedPosts = DB.getPosts().filter(p => savedPostIds.includes(p.id));
    const container = document.getElementById('feedContainer');
    if (!container) return;
    if (savedPosts.length === 0) { container.innerHTML = `<div class="placeholder"><i class="fas fa-bookmark"></i><p>Você ainda não salvou nenhum post.</p></div>`; return; }
    container.innerHTML = savedPosts.map(post => renderPostCard(post)).join('');
}

function setupSearch() {
    const searchInput = document.getElementById('searchInput');
    if (!searchInput) return;
    searchInput.addEventListener('input', (e) => { currentSearchTerm = e.target.value.toLowerCase(); currentPagePosts = 0; renderCurrentPage(); });
}

function setupFilters() {
    document.querySelectorAll('.filter-chip').forEach(chip => {
        chip.addEventListener('click', () => {
            document.querySelectorAll('.filter-chip').forEach(c => c.classList.remove('active'));
            chip.classList.add('active');
            currentFilter = chip.dataset.filter;
            currentPagePosts = 0;
            renderCurrentPage();
        });
    });
}

function getFilteredPosts(posts) {
    let filtered = [...posts];
    if (currentFilter !== 'all') filtered = filtered.filter(p => p.tipo === currentFilter);
    if (currentSearchTerm) {
        const term = currentSearchTerm.toLowerCase();
        filtered = filtered.filter(p => p.titulo.toLowerCase().includes(term) || p.conteudo.toLowerCase().includes(term) || (p.hashtags && p.hashtags.some(tag => tag.toLowerCase().includes(term))));
    }
    filtered.sort((a, b) => new Date(b.data) - new Date(a.data));
    return filtered;
}

function renderCurrentPage() {
    let posts = DB.getPosts();
    posts.sort((a, b) => new Date(b.data) - new Date(a.data));
    switch(currentPage) {
        case 'feed': posts = posts; break;
        case 'teses': posts = posts.filter(p => p.tipo === 'tese'); break;
        case 'diario': posts = posts.filter(p => p.tipo === 'diario'); break;
        case 'jornal': posts = posts.filter(p => p.tipo === 'jornal'); break;
        case 'audio': posts = posts.filter(p => p.tipo === 'audio'); break;
        case 'salvos': const savedIds = DB.getSavedPosts(currentUser.id); posts = posts.filter(p => savedIds.includes(p.id)); break;
    }
    posts = getFilteredPosts(posts);
    renderFeedWithPagination(posts);
}

function renderFeedWithPagination(allPosts) {
    const container = document.getElementById('feedContainer');
    if (!container) return;
    const paginatedPosts = allPosts.slice(0, currentPagePosts + postsToShow);
    const hasMore = paginatedPosts.length < allPosts.length;
    if (paginatedPosts.length === 0 && currentPagePosts === 0) {
        container.innerHTML = `<div class="placeholder"><i class="fas fa-globe"></i><p>Nenhuma publicação ainda.</p><button onclick="document.getElementById('fabPostBtn')?.click()">Publicar agora</button></div>`;
        return;
    }
    container.innerHTML = paginatedPosts.map(post => renderPostCard(post)).join('');
    if (hasMore) {
        const loadMoreBtn = document.createElement('button');
        loadMoreBtn.className = 'load-more-btn';
        loadMoreBtn.innerHTML = '<i class="fas fa-arrow-down"></i> Carregar mais';
        loadMoreBtn.onclick = () => { currentPagePosts += postsToShow; renderCurrentPage(); };
        container.appendChild(loadMoreBtn);
    }
    currentPagePosts = paginatedPosts.length;
}

function renderPostCard(post) {
    const author = DB.getUserById(post.userId);
    if (!author) return '';
    const isLiked = post.curtidas && post.curtidas.includes(currentUser.id);
    const isSaved = DB.isPostSaved(currentUser.id, post.id);
    const isFollowing = currentUser.following.includes(post.userId);
    const isAdmin = Auth.isAdmin();
    const timeAgo = getTimeAgo(post.data);
    const badgeName = { 'pensamento': '💭 Pensamento', 'tese': '📚 Tese', 'diario': '📓 Diário', 'jornal': '📰 Notícia', 'audio': '🎙️ Áudio' }[post.tipo];
    let audioHtml = post.audioData ? `<div><button onclick="window.playAudio('${post.audioData}')" class="action-btn"><i class="fas fa-play"></i> Ouvir áudio</button></div>` : '';
    let imageHtml = post.imagem ? `<img src="${post.imagem}" class="post-image" onclick="viewFullImage('${post.imagem}')">` : '';
    let hashtagsHtml = post.hashtags?.length ? `<div class="post-hashtags">${post.hashtags.map(tag => `<span class="hashtag" onclick="searchHashtag('${tag}')">#${tag}</span>`).join('')}</div>` : '';
    const commentsHtml = (post.comentarios || []).map(c => `<div><strong>${c.username}</strong>: ${c.texto}<div class="post-time">${getTimeAgo(c.data)}</div></div>`).join('');
    return `
        <div class="post-card">
            <div class="post-header">
                <div class="post-avatar" onclick="viewProfile(${author.id})">${author.avatar ? `<img src="${author.avatar}">` : `<span>${author.emoji || '📝'}</span>`}</div>
                <div class="post-author-info" onclick="viewProfile(${author.id})"><div class="post-author">${author.name} ${author.isVerified ? '<i class="fas fa-check-circle verified-icon"></i>' : ''}</div><div class="post-time">${timeAgo} ${post.editado ? '(editado)' : ''}</div></div>
                <div style="display: flex; gap: 8px;">${!isFollowing && post.userId !== currentUser.id ? `<button class="follow-small-btn" onclick="followUser(${author.id})">Seguir</button>` : ''}${(isAdmin || post.userId === currentUser.id) ? `<button class="edit-btn" onclick="editPost(${post.id})"><i class="fas fa-edit"></i></button><button class="delete-btn" onclick="deletePost(${post.id})"><i class="fas fa-trash"></i></button>` : ''}</div>
            </div>
            <div class="post-badge badge-${post.tipo}">${badgeName}</div>
            <h3 class="post-title">${post.emoji || '📝'} ${post.titulo}</h3>
            <div class="post-content">${post.conteudo.replace(/\n/g, '<br>')}</div>
            ${imageHtml}${hashtagsHtml}${audioHtml}
            <div class="post-stats"><span><i class="fas fa-heart"></i> ${post.curtidas?.length || 0} curtidas</span><span><i class="fas fa-comment"></i> ${post.comentarios?.length || 0} comentários</span></div>
            <div class="post-actions">
                <button class="action-btn ${isLiked ? 'liked' : ''}" onclick="toggleLike(${post.id})"><i class="fa-${isLiked ? 'solid' : 'regular'} fa-heart"></i> Curtir</button>
                <button class="action-btn" onclick="toggleComments(${post.id})"><i class="far fa-comment"></i> Comentar</button>
                <button class="action-btn ${isSaved ? 'saved' : ''}" onclick="toggleSavePost(${post.id})"><i class="fa-${isSaved ? 'solid' : 'regular'} fa-bookmark"></i> Salvar</button>
                <button class="action-btn" onclick="window.sharePost('${post.titulo}', '${post.conteudo.substring(0, 100)}', window.location.href)"><i class="far fa-share-square"></i> Compartilhar</button>
            </div>
            <div id="comments-${post.id}" style="display: none;"><div class="comment-list">${commentsHtml || '<p>Seja o primeiro a comentar</p>'}</div><div class="comment-input"><input type="text" id="commentInput-${post.id}" placeholder="Comentário..."><button onclick="addComment(${post.id})">Enviar</button></div></div>
        </div>
    `;
}

function renderSuggestions() {
    const suggestions = DB.getUsers().filter(u => u.id !== currentUser.id && !currentUser.following.includes(u.id)).slice(0, 5);
    const container = document.getElementById('suggestionsList');
    if (!container) return;
    if (suggestions.length === 0) { container.innerHTML = '<p class="placeholder">Nenhuma sugestão</p>'; return; }
    container.innerHTML = suggestions.map(user => `<div class="suggestion-item"><div class="suggestion-avatar" onclick="viewProfile(${user.id})">${user.avatar ? `<img src="${user.avatar}">` : user.emoji || '📝'}</div><div class="suggestion-info" onclick="viewProfile(${user.id})"><div class="suggestion-name">${user.name} ${user.isVerified ? '<i class="fas fa-check-circle"></i>' : ''}</div><div class="suggestion-bio">${user.bio.substring(0, 30)}</div></div><button class="follow-btn" onclick="followUser(${user.id})">Seguir</button></div>`).join('');
}

function renderDMList() {
    const dms = DB.getDMs();
    const chats = [];
    for (let key in dms) {
        const ids = key.split('-').map(Number);
        const otherId = ids.find(id => id !== currentUser.id);
        if (otherId) { const messages = dms[key]; chats.push({ userId: otherId, lastMessage: messages[messages.length - 1].message, lastTime: messages[messages.length - 1].time }); }
    }
    chats.sort((a, b) => new Date(b.lastTime) - new Date(a.lastTime));
    const container = document.getElementById('dmList');
    if (!container) return;
    if (chats.length === 0) { container.innerHTML = '<p class="placeholder">Nenhuma conversa</p>'; return; }
    container.innerHTML = chats.map(chat => { const user = DB.getUserById(chat.userId); return `<div class="dm-item" onclick="openDM(${chat.userId})"><div class="dm-avatar">${user?.avatar ? `<img src="${user.avatar}">` : user?.emoji || '📝'}</div><div class="dm-info"><div class="dm-name">${user?.name}</div><div class="dm-preview">${chat.lastMessage.substring(0, 40)}</div></div></div>`; }).join('');
}

window.toggleLike = function(postId) {
    const posts = DB.getPosts();
    const post = posts.find(p => p.id === postId);
    if (post) {
        if (!post.curtidas) post.curtidas = [];
        if (post.curtidas.includes(currentUser.id)) { post.curtidas = post.curtidas.filter(id => id !== currentUser.id); showToast('💔 Curtida removida'); }
        else { post.curtidas.push(currentUser.id); if (post.userId !== currentUser.id && typeof Notifications !== 'undefined') Notifications.create(post.userId, 'like', `${currentUser.name} curtiu seu post`, postId); showToast('❤️ Curtiu!'); }
        DB.savePosts(posts);
        renderCurrentPage();
    }
};

window.toggleSavePost = function(postId) {
    if (DB.isPostSaved(currentUser.id, postId)) { DB.unsavePost(currentUser.id, postId); showToast('❌ Removido dos salvos'); }
    else { DB.savePost(currentUser.id, postId); showToast('✅ Salvo nos favoritos'); }
    renderCurrentPage();
};

window.followUser = function(userId) {
    const targetUser = DB.getUserById(userId);
    if (!targetUser) return;
    if (currentUser.following.includes(userId)) { DB.unfollowUser(currentUser.id, userId); showToast(`🔴 Deixou de seguir ${targetUser.name}`); }
    else { DB.followUser(currentUser.id, userId); if (typeof Notifications !== 'undefined') Notifications.create(userId, 'follow', `${currentUser.name} começou a seguir você`, currentUser.id); showToast(`✅ Seguindo ${targetUser.name}`); }
    renderSuggestions();
    renderCurrentPage();
};

window.toggleComments = function(postId) { const div = document.getElementById(`comments-${postId}`); if (div) div.style.display = div.style.display === 'none' ? 'block' : 'none'; };
window.addComment = function(postId) { const input = document.getElementById(`commentInput-${postId}`); const text = input?.value.trim(); if (!text) return; const posts = DB.getPosts(); const post = posts.find(p => p.id === postId); if (post) { if (!post.comentarios) post.comentarios = []; post.comentarios.push({ userId: currentUser.id, username: currentUser.name, texto: text, data: new Date().toISOString() }); DB.savePosts(posts); if (post.userId !== currentUser.id && typeof Notifications !== 'undefined') Notifications.create(post.userId, 'comment', `${currentUser.name} comentou no seu post`, postId); input.value = ''; renderCurrentPage(); showToast('💬 Comentário adicionado'); } };
window.viewProfile = function(userId) { const user = DB.getUserById(userId); if (!user) return; const isFollowing = currentUser.following.includes(userId); const modalHtml = `<div id="profileModal" class="modal open" style="z-index:3000;"><div class="modal-content small"><div class="modal-header"><h3>Perfil</h3><button class="close-modal" onclick="closeProfileModal()">&times;</button></div><div><div class="profile-avatar-large">${user.avatar ? `<img src="${user.avatar}">` : user.emoji || '📝'}</div><h2>${user.name} ${user.isVerified ? '<i class="fas fa-check-circle"></i>' : ''}</h2><p>@${user.username}</p><p>${user.bio}</p><div><strong>${user.followers.length}</strong> seguidores<br><strong>${user.following.length}</strong> seguindo</div>${user.id !== currentUser.id ? `<button onclick="followUser(${user.id}); closeProfileModal();">${isFollowing ? 'Deixar de seguir' : 'Seguir'}</button>` : ''}</div></div></div>`;
    document.getElementById('profileModal')?.remove();
    document.body.insertAdjacentHTML('beforeend', modalHtml);
};
window.closeProfileModal = function() { document.getElementById('profileModal')?.remove(); };
window.deletePost = function(postId) { if (confirm('Tem certeza?')) { DB.deletePost(postId); renderCurrentPage(); showToast('🗑️ Excluído'); } };
window.editPost = function(postId) { const post = DB.getPosts().find(p => p.id === postId); if (post) { editingPostId = postId; document.getElementById('postTitleInput').value = post.titulo; document.getElementById('postContentInput').value = post.conteudo; document.getElementById('postEmojiInput').value = post.emoji || ''; document.getElementById('hashtagsInput').value = post.hashtags?.join(', ') || ''; if (post.imagem) { document.getElementById('postImagePreview').src = post.imagem; document.getElementById('postImagePreview').style.display = 'block'; document.getElementById('removeImageBtn').style.display = 'inline-block'; selectedImage = post.imagem; } openPostModal(); document.getElementById('publishPostBtn').textContent = '✏️ Atualizar'; } };
window.searchHashtag = function(hashtag) { currentSearchTerm = '#' + hashtag; document.getElementById('searchInput').value = '#' + hashtag; currentPage = 'feed'; renderCurrentPage(); showToast(`🔍 Buscando #${hashtag}`); };
window.viewFullImage = function(imageUrl) { const modal = document.getElementById('fullImageModal'); if (modal) { document.getElementById('fullImage').src = imageUrl; modal.style.display = 'flex'; } };
window.playAudio = function(audioData) { new Audio(audioData).play(); showToast('🎤 Reproduzindo áudio...'); };
window.sharePost = function(title, text, url) { if (navigator.share) { navigator.share({ title: title, text: text, url: url }); } else { navigator.clipboard.writeText(url); showToast('Link copiado!'); } };
window.copyToClipboard = function(text) { navigator.clipboard.writeText(text); showToast('✅ Link copiado!'); };
window.openDM = function(userId) { currentDMTarget = userId; const user = DB.getUserById(userId); document.getElementById('dmTargetName').textContent = user?.name || 'Conversa'; renderDMMessages(userId); document.getElementById('dmModal').classList.add('open'); };
function renderDMMessages(userId) { const messages = DB.getConversation(currentUser.id, userId); const container = document.getElementById('dmMessagesArea'); if (!container) return; container.innerHTML = messages.map(msg => `<div style="text-align: ${msg.from === currentUser.id ? 'right' : 'left'}"><div style="background: ${msg.from === currentUser.id ? 'var(--accent)' : 'var(--bg-hover)'}">${msg.message}</div><div>${new Date(msg.time).toLocaleTimeString()}</div></div>`).join(''); container.scrollTop = container.scrollHeight; }
function sendDirectMessage() { const input = document.getElementById('dmMessageInput'); const msg = input?.value.trim(); if (!msg || !currentDMTarget) return; DB.sendMessage(currentUser.id, currentDMTarget, msg); input.value = ''; renderDMMessages(currentDMTarget); renderDMList(); showToast('📨 Mensagem enviada'); }
function openNewChatModal() { const users = DB.getUsers().filter(u => u.id !== currentUser.id); const username = prompt('Digite o nome de usuário:\n' + users.map(u => `@${u.username} - ${u.name}`).join('\n')); if (username) { const user = DB.getUserByUsername(username); if (user) openDM(user.id); else showToast('❌ Usuário não encontrado'); } }
function openPostModal() { document.getElementById('postModal').classList.add('open'); if (!editingPostId) { document.getElementById('postTitleInput').value = ''; document.getElementById('postContentInput').value = ''; document.getElementById('postEmojiInput').value = ''; document.getElementById('hashtagsInput').value = ''; document.getElementById('postImagePreview').style.display = 'none'; document.getElementById('removeImageBtn').style.display = 'none'; document.getElementById('audioPreviewArea').innerHTML = ''; document.getElementById('audioDataField').value = ''; selectedImage = null; document.getElementById('publishPostBtn').textContent = 'Publicar'; document.getElementById('charCounter').textContent = '0/2000'; } }
function setupAudioRecording() { const startBtn = document.getElementById('startRecordingBtn'); const stopBtn = document.getElementById('stopRecordingBtn'); if (!startBtn) return; startBtn.addEventListener('click', async () => { try { const stream = await navigator.mediaDevices.getUserMedia({ audio: true }); mediaRecorder = new MediaRecorder(stream); audioChunks = []; mediaRecorder.ondataavailable = e => audioChunks.push(e.data); mediaRecorder.onstop = () => { const blob = new Blob(audioChunks, { type: 'audio/webm' }); const url = URL.createObjectURL(blob); document.getElementById('audioPreviewArea').innerHTML = `<audio controls src="${url}"></audio>`; const reader = new FileReader(); reader.onloadend = () => document.getElementById('audioDataField').value = reader.result; reader.readAsDataURL(blob); }; mediaRecorder.start(); startBtn.style.display = 'none'; stopBtn.style.display = 'block'; showToast('🎙️ Gravando...'); } catch(err) { showToast('❌ Permita acesso ao microfone'); } }); stopBtn?.addEventListener('click', () => { if (mediaRecorder) { mediaRecorder.stop(); startBtn.style.display = 'block'; stopBtn.style.display = 'none'; showToast('⏹️ Gravação finalizada'); } }); }
function publishPost() { const titulo = document.getElementById('postTitleInput')?.value.trim(); const conteudo = document.getElementById('postContentInput')?.value.trim(); const emoji = document.getElementById('postEmojiInput')?.value.trim(); const audioData = document.getElementById('audioDataField')?.value; const hashtags = (document.getElementById('hashtagsInput')?.value || '').split(',').map(t => t.trim().replace('#', '')).filter(t => t); if (!titulo || !conteudo) { showToast('❌ Preencha título e conteúdo'); return; } if (editingPostId) { const updates = { titulo, conteudo, emoji: emoji || null, hashtags, editado: true }; if (selectedImage) updates.imagem = selectedImage; if (selectedPostType === 'audio' && audioData) updates.audioData = audioData; DB.updatePost(editingPostId, updates); showToast('✏️ Atualizado!'); editingPostId = null; } else { const newPost = { id: Date.now(), userId: currentUser.id, tipo: selectedPostType, titulo, conteudo, emoji: emoji || null, imagem: selectedImage || null, hashtags, audioData: selectedPostType === 'audio' ? audioData : null, data: new Date().toISOString(), curtidas: [], comentarios: [], editado: false }; DB.addPost(newPost); showToast('✅ Publicado!'); } document.getElementById('postModal').classList.remove('open'); document.getElementById('postTitleInput').value = ''; document.getElementById('postContentInput').value = ''; document.getElementById('postEmojiInput').value = ''; document.getElementById('hashtagsInput').value = ''; document.getElementById('audioPreviewArea').innerHTML = ''; document.getElementById('audioDataField').value = ''; document.getElementById('postImagePreview').style.display = 'none'; document.getElementById('removeImageBtn').style.display = 'none'; selectedImage = null; document.getElementById('publishPostBtn').textContent = 'Publicar'; currentPagePosts = 0; renderCurrentPage(); }
function getTimeAgo(dateString) { const date = new Date(dateString); const now = new Date(); const seconds = Math.floor((now - date) / 1000); if (seconds < 60) return 'agora mesmo'; const minutes = Math.floor(seconds / 60); if (minutes < 60) return `${minutes} min atrás`; const hours = Math.floor(minutes / 60); if (hours < 24) return `${hours} h atrás`; const days = Math.floor(hours / 24); if (days < 7) return `${days} d atrás`; return date.toLocaleDateString('pt-BR'); }
function startRealtimeUpdates() { setInterval(() => { if (document.visibilityState === 'visible') { renderCurrentPage(); renderDMList(); if (typeof Notifications !== 'undefined') { Notifications.renderList(); Notifications.updateBadge(); } } }, 10000); }
function showToast(message) { const existingToast = document.querySelector('.toast'); if (existingToast) existingToast.remove(); const toast = document.createElement('div'); toast.className = 'toast'; toast.textContent = message; document.body.appendChild(toast); setTimeout(() => toast.remove(), 3000); }