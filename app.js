// ============================================
// REPÓRTER DA PERIFERIA - APP PRINCIPAL
// Versão 4.0 - FEED PÚBLICO (todos veem todos os posts)
// ============================================

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
    if (!currentUser) {
        window.location.href = 'login.html';
        return;
    }
    
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
        const avatarImg = document.getElementById('avatarImage');
        avatarImg.src = currentUser.avatar;
        avatarImg.style.display = 'block';
        document.getElementById('avatarEmoji').style.display = 'none';
    } else {
        document.getElementById('avatarEmoji').textContent = currentUser.emoji || '🧠';
    }
}

function loadInitialData() {
    renderCurrentPage();
    renderSuggestions();
    renderDMList();
    Notifications.renderList();
    Notifications.updateBadge();
}

function setupEventListeners() {
    document.querySelectorAll('.nav-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            const page = this.dataset.page;
            if (page === 'meu-perfil') {
                window.location.href = 'perfil.html';
            } else if (page === 'salvos') {
                showSavedPosts();
            } else if (page) {
                changePage(page);
            }
        });
    });
    
    document.getElementById('fabPostBtn').addEventListener('click', openPostModal);
    document.getElementById('refreshFeedBtn').addEventListener('click', () => {
        currentPagePosts = 0;
        renderCurrentPage();
        showToast('Feed atualizado!');
    });
    document.getElementById('logoutBtn').addEventListener('click', () => Auth.logout());
    
    const modal = document.getElementById('postModal');
    document.querySelectorAll('.close-modal').forEach(btn => {
        btn.addEventListener('click', () => modal.classList.remove('open'));
    });
    
    document.querySelectorAll('.type-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            document.querySelectorAll('.type-btn').forEach(b => b.classList.remove('active'));
            this.classList.add('active');
            selectedPostType = this.dataset.type;
            const audioArea = document.getElementById('audioRecordArea');
            audioArea.style.display = selectedPostType === 'audio' ? 'block' : 'none';
        });
    });
    
    setupAudioRecording();
    document.getElementById('publishPostBtn').addEventListener('click', publishPost);
    document.getElementById('sendDmBtn').addEventListener('click', sendDirectMessage);
    document.getElementById('newChatBtn').addEventListener('click', openNewChatModal);
    
    setupImageUpload('postImageInput', 'postImagePreview', (imageData) => {
        selectedImage = imageData;
    });
    
    initCharCounter('postContentInput', 'charCounter');
}

function changePage(page) {
    currentPage = page;
    currentPagePosts = 0;
    currentFilter = 'all';
    currentSearchTerm = '';
    
    const searchInput = document.getElementById('searchInput');
    if (searchInput) searchInput.value = '';
    
    document.querySelectorAll('.nav-btn').forEach(btn => {
        if (btn.dataset.page === page) {
            btn.classList.add('active');
        } else {
            btn.classList.remove('active');
        }
    });
    
    const titles = { 
        'feed': 'Início', 
        'teses': 'Teses', 
        'diario': 'Diário', 
        'jornal': 'Notícias', 
        'audio': 'Áudios',
        'salvos': 'Posts Salvos'
    };
    document.getElementById('pageTitle').textContent = titles[page] || 'Repórter da Periferia';
    renderCurrentPage();
}

function showSavedPosts() {
    const savedPostIds = DB.getSavedPosts(currentUser.id);
    const allPosts = DB.getPosts();
    const savedPosts = allPosts.filter(p => savedPostIds.includes(p.id));
    
    const container = document.getElementById('feedContainer');
    if (savedPosts.length === 0) {
        container.innerHTML = `<div class="placeholder" style="padding: 60px; text-align: center;">
            <i class="fas fa-bookmark" style="font-size: 3rem; opacity: 0.3;"></i>
            <p>Você ainda não salvou nenhum post.</p>
        </div>`;
        return;
    }
    
    container.innerHTML = savedPosts.map(post => renderPostCard(post)).join('');
}

function setupSearch() {
    const searchInput = document.getElementById('searchInput');
    if (!searchInput) return;
    
    searchInput.addEventListener('input', (e) => {
        currentSearchTerm = e.target.value.toLowerCase();
        currentPagePosts = 0;
        renderCurrentPage();
    });
}

function setupFilters() {
    const filterChips = document.querySelectorAll('.filter-chip');
    filterChips.forEach(chip => {
        chip.addEventListener('click', () => {
            filterChips.forEach(c => c.classList.remove('active'));
            chip.classList.add('active');
            currentFilter = chip.dataset.filter;
            currentPagePosts = 0;
            renderCurrentPage();
        });
    });
}

function getFilteredPosts(posts) {
    let filtered = [...posts];
    
    if (currentFilter !== 'all') {
        filtered = filtered.filter(p => p.tipo === currentFilter);
    }
    
    if (currentSearchTerm) {
        const term = currentSearchTerm.toLowerCase();
        filtered = filtered.filter(p => 
            p.titulo.toLowerCase().includes(term) ||
            p.conteudo.toLowerCase().includes(term) ||
            (p.hashtags && p.hashtags.some(tag => tag.toLowerCase().includes(term)))
        );
    }
    
    filtered.sort((a, b) => new Date(b.data) - new Date(a.data));
    return filtered;
}

function renderCurrentPage() {
    let posts = DB.getPosts();
    posts.sort((a, b) => new Date(b.data) - new Date(a.data));
    
    switch(currentPage) {
        case 'feed':
            // FEED PÚBLICO: mostra TODOS os posts de TODOS os usuários
            posts = posts;
            break;
        case 'teses':
            posts = posts.filter(p => p.tipo === 'tese');
            break;
        case 'diario':
            posts = posts.filter(p => p.tipo === 'diario');
            break;
        case 'jornal':
            posts = posts.filter(p => p.tipo === 'jornal');
            break;
        case 'audio':
            posts = posts.filter(p => p.tipo === 'audio');
            break;
        case 'salvos':
            const savedIds = DB.getSavedPosts(currentUser.id);
            posts = posts.filter(p => savedIds.includes(p.id));
            break;
    }
    
    posts = getFilteredPosts(posts);
    renderFeedWithPagination(posts);
}

function renderFeedWithPagination(allPosts) {
    const container = document.getElementById('feedContainer');
    const paginatedPosts = allPosts.slice(0, currentPagePosts + postsToShow);
    const hasMore = paginatedPosts.length < allPosts.length;
    
    if (paginatedPosts.length === 0 && currentPagePosts === 0) {
        container.innerHTML = `<div class="placeholder" style="padding: 60px; text-align: center;">
            <i class="fas fa-globe" style="font-size: 3rem; opacity: 0.3;"></i>
            <p>Nenhuma publicação ainda.</p>
            <button onclick="document.getElementById('fabPostBtn').click()" style="background: var(--accent); border: none; padding: 10px 20px; border-radius: 40px; color: white; margin-top: 16px; cursor: pointer;">
                <i class="fas fa-plus"></i> Publicar agora
            </button>
        </div>`;
        return;
    }
    
    container.innerHTML = paginatedPosts.map(post => renderPostCard(post)).join('');
    
    if (hasMore) {
        const loadMoreBtn = document.createElement('button');
        loadMoreBtn.className = 'load-more-btn';
        loadMoreBtn.innerHTML = '<i class="fas fa-arrow-down"></i> Carregar mais';
        loadMoreBtn.onclick = () => {
            currentPagePosts += postsToShow;
            renderCurrentPage();
        };
        container.appendChild(loadMoreBtn);
    }
    
    currentPagePosts = paginatedPosts.length;
}

function renderPostCard(post) {
    const author = DB.getUserById(post.userId);
    if (!author) return '';
    
    const badgeClass = `badge-${post.tipo}`;
    const badgeName = { 
        'pensamento': '💭 Pensamento', 
        'tese': '📚 Tese', 
        'diario': '📓 Diário', 
        'jornal': '📰 Notícia', 
        'audio': '🎙️ Áudio' 
    }[post.tipo];
    
    const isLiked = post.curtidas && post.curtidas.includes(currentUser.id);
    const isSaved = DB.isPostSaved(currentUser.id, post.id);
    const isFollowing = currentUser.following.includes(post.userId);
    const timeAgo = getTimeAgo(post.data);
    const isAdmin = Auth.isAdmin();
    
    let audioHtml = '';
    if (post.audioData) {
        audioHtml = `<div style="margin: 12px 0;"><button onclick="playAudio('${post.audioData}')" class="action-btn"><i class="fas fa-play"></i> Ouvir áudio</button></div>`;
    }
    
    let imageHtml = '';
    if (post.imagem) {
        imageHtml = `<img src="${post.imagem}" class="post-image" onclick="viewFullImage('${post.imagem}')">`;
    }
    
    let hashtagsHtml = '';
    if (post.hashtags && post.hashtags.length > 0) {
        hashtagsHtml = `<div class="post-hashtags">${post.hashtags.map(tag => `<span class="hashtag" onclick="searchHashtag('${tag}')">#${tag}</span>`).join('')}</div>`;
    }
    
    const editHtml = (isAdmin || post.userId === currentUser.id) ? 
        `<button class="edit-btn" onclick="editPost(${post.id})"><i class="fas fa-edit"></i></button>` : '';
    
    const deleteHtml = (isAdmin || post.userId === currentUser.id) ? 
        `<button class="delete-btn" onclick="deletePost(${post.id})"><i class="fas fa-trash"></i></button>` : '';
    
    const commentsHtml = (post.comentarios || []).map(c => `
        <div style="padding: 8px 0; border-bottom: 1px solid var(--border);">
            <strong>${c.username}</strong>: ${escapeHtml(c.texto)}
            <div style="font-size: 0.6rem; color: var(--text-secondary);">${getTimeAgo(c.data)}</div>
        </div>
    `).join('');
    
    const verifiedBadge = author.isVerified ? '<i class="fas fa-check-circle verified-icon"></i>' : '';
    
    return `
        <div class="post-card">
            <div class="post-header">
                <div class="post-avatar" onclick="viewProfile(${author.id})">
                    ${author.avatar ? `<img src="${author.avatar}">` : `<span>${author.emoji || '📝'}</span>`}
                </div>
                <div class="post-author-info" onclick="viewProfile(${author.id})">
                    <div class="post-author">${author.name} ${verifiedBadge}</div>
                    <div class="post-time">${timeAgo} ${post.editado ? '(editado)' : ''}</div>
                </div>
                <div style="display: flex; gap: 8px; margin-left: auto;">
                    ${!isFollowing && post.userId !== currentUser.id ? 
                        `<button class="follow-small-btn" onclick="followUser(${author.id})">Seguir</button>` : ''}
                    ${editHtml}
                    ${deleteHtml}
                </div>
            </div>
            <div class="post-badge ${badgeClass}">${badgeName}</div>
            <h3 class="post-title">${post.emoji || '📝'} ${escapeHtml(post.titulo)}</h3>
            <div class="post-content">${escapeHtml(post.conteudo).replace(/\n/g, '<br>')}</div>
            ${imageHtml}
            ${hashtagsHtml}
            ${audioHtml}
            <div class="post-stats">
                <span><i class="fas fa-heart"></i> ${post.curtidas?.length || 0} curtidas</span>
                <span><i class="fas fa-comment"></i> ${post.comentarios?.length || 0} comentários</span>
            </div>
            <div class="post-actions">
                <button class="action-btn ${isLiked ? 'liked' : ''}" onclick="toggleLike(${post.id})">
                    <i class="fa-${isLiked ? 'solid' : 'regular'} fa-heart"></i> Curtir
                </button>
                <button class="action-btn" onclick="toggleComments(${post.id})">
                    <i class="far fa-comment"></i> Comentar
                </button>
                <button class="action-btn ${isSaved ? 'saved' : ''}" onclick="toggleSavePost(${post.id})">
                    <i class="fa-${isSaved ? 'solid' : 'regular'} fa-bookmark"></i> Salvar
                </button>
                <button class="action-btn" onclick="sharePost('${post.titulo}', '${post.conteudo.substring(0, 100).replace(/'/g, "\\'")}', window.location.href)">
                    <i class="far fa-share-square"></i> Compartilhar
                </button>
            </div>
            <div id="comments-${post.id}" style="display: none; margin-top: 16px;">
                <div class="comment-list">${commentsHtml || '<p>Seja o primeiro a comentar</p>'}</div>
                <div class="comment-input">
                    <input type="text" id="commentInput-${post.id}" placeholder="Escreva um comentário...">
                    <button onclick="addComment(${post.id})">Enviar</button>
                </div>
            </div>
        </div>
    `;
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function renderSuggestions() {
    const users = DB.getUsers();
    const suggestions = users.filter(u => 
        u.id !== currentUser.id && 
        !currentUser.following.includes(u.id)
    ).slice(0, 5);
    
    const container = document.getElementById('suggestionsList');
    
    if (suggestions.length === 0) {
        container.innerHTML = '<p class="placeholder">Nenhuma sugestão</p>';
        return;
    }
    
    container.innerHTML = suggestions.map(user => `
        <div class="suggestion-item">
            <div class="suggestion-avatar" onclick="viewProfile(${user.id})">
                ${user.avatar ? `<img src="${user.avatar}">` : user.emoji || '📝'}
            </div>
            <div class="suggestion-info" onclick="viewProfile(${user.id})">
                <div class="suggestion-name">${user.name} ${user.isVerified ? '<i class="fas fa-check-circle"></i>' : ''}</div>
                <div class="suggestion-bio">${user.bio.substring(0, 30)}</div>
            </div>
            <button class="follow-btn" onclick="followUser(${user.id})">Seguir</button>
        </div>
    `).join('');
}

function renderDMList() {
    const dms = DB.getDMs();
    const chats = [];
    
    for (let key in dms) {
        const ids = key.split('-').map(Number);
        const otherId = ids.find(id => id !== currentUser.id);
        if (otherId) {
            const messages = dms[key];
            const lastMsg = messages[messages.length - 1];
            chats.push({ userId: otherId, lastMessage: lastMsg.message, lastTime: lastMsg.time });
        }
    }
    
    chats.sort((a, b) => new Date(b.lastTime) - new Date(a.lastTime));
    const container = document.getElementById('dmList');
    
    if (chats.length === 0) {
        container.innerHTML = '<p class="placeholder">Nenhuma conversa</p>';
        return;
    }
    
    container.innerHTML = chats.map(chat => {
        const user = DB.getUserById(chat.userId);
        return `
            <div class="dm-item" onclick="openDM(${chat.userId})">
                <div class="dm-avatar">${user?.avatar ? `<img src="${user.avatar}">` : user?.emoji || '📝'}</div>
                <div class="dm-info">
                    <div class="dm-name">${user?.name}</div>
                    <div class="dm-preview">${escapeHtml(chat.lastMessage.substring(0, 40))}</div>
                </div>
            </div>
        `;
    }).join('');
}

window.toggleLike = function(postId) {
    const posts = DB.getPosts();
    const post = posts.find(p => p.id === postId);
    
    if (post) {
        if (!post.curtidas) post.curtidas = [];
        
        if (post.curtidas.includes(currentUser.id)) {
            post.curtidas = post.curtidas.filter(id => id !== currentUser.id);
            showToast('💔 Curtida removida');
        } else {
            post.curtidas.push(currentUser.id);
            if (post.userId !== currentUser.id) {
                Notifications.create(post.userId, 'like', `${currentUser.name} curtiu seu post`, postId);
            }
            showToast('❤️ Curtiu!');
        }
        DB.savePosts(posts);
        renderCurrentPage();
    }
};

window.toggleSavePost = function(postId) {
    if (DB.isPostSaved(currentUser.id, postId)) {
        DB.unsavePost(currentUser.id, postId);
        showToast('❌ Removido dos salvos');
    } else {
        DB.savePost(currentUser.id, postId);
        showToast('✅ Salvo nos favoritos');
    }
    renderCurrentPage();
};

window.followUser = function(userId) {
    const targetUser = DB.getUserById(userId);
    if (!targetUser) return;
    
    if (currentUser.following.includes(userId)) {
        DB.unfollowUser(currentUser.id, userId);
        showToast(`🔴 Você deixou de seguir ${targetUser.name}`);
    } else {
        DB.followUser(currentUser.id, userId);
        Notifications.create(userId, 'follow', `${currentUser.name} começou a seguir você`, currentUser.id);
        showToast(`✅ Seguindo ${targetUser.name}`);
    }
    
    renderSuggestions();
    renderCurrentPage();
};

window.toggleComments = function(postId) {
    const div = document.getElementById(`comments-${postId}`);
    if (div) div.style.display = div.style.display === 'none' ? 'block' : 'none';
};

window.addComment = function(postId) {
    const input = document.getElementById(`commentInput-${postId}`);
    const text = input.value.trim();
    if (!text) return;
    
    const posts = DB.getPosts();
    const post = posts.find(p => p.id === postId);
    
    if (post) {
        if (!post.comentarios) post.comentarios = [];
        post.comentarios.push({ 
            userId: currentUser.id, 
            username: currentUser.name, 
            texto: text, 
            data: new Date().toISOString() 
        });
        DB.savePosts(posts);
        
        if (post.userId !== currentUser.id) {
            Notifications.create(post.userId, 'comment', `${currentUser.name} comentou no seu post`, postId);
        }
        input.value = '';
        renderCurrentPage();
        showToast('💬 Comentário adicionado');
    }
};

window.viewProfile = function(userId) {
    const user = DB.getUserById(userId);
    if (!user) return;
    
    const isFollowing = currentUser.following.includes(userId);
    
    const modalHtml = `
        <div id="profileModal" class="modal open" style="display: flex;">
            <div class="modal-content small" style="text-align: center;">
                <div class="modal-header"><h3>Perfil</h3><button class="close-modal" onclick="closeProfileModal()">&times;</button></div>
                <div>
                    <div style="width: 80px; height: 80px; background: var(--accent); border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 2rem; margin: 0 auto 16px; overflow: hidden;">
                        ${user.avatar ? `<img src="${user.avatar}" style="width:100%;height:100%;object-fit:cover;">` : user.emoji || '📝'}
                    </div>
                    <h2>${user.name} ${user.isVerified ? '<i class="fas fa-check-circle" style="color:#3b82f6;"></i>' : ''}</h2>
                    <p style="color: var(--text-secondary);">@${user.username}</p>
                    <p style="margin: 16px 0;">${user.bio}</p>
                    <div style="display: flex; justify-content: center; gap: 24px; margin: 16px 0;">
                        <div><strong>${user.followers.length}</strong><br><span style="font-size: 0.7rem;">Seguidores</span></div>
                        <div><strong>${user.following.length}</strong><br><span style="font-size: 0.7rem;">Seguindo</span></div>
                    </div>
                    ${user.id !== currentUser.id ? `
                        <button onclick="followUser(${user.id}); closeProfileModal();" style="background: ${isFollowing ? '#ef4444' : 'var(--accent)'}; border: none; padding: 10px 30px; border-radius: 40px; color: white; cursor: pointer;">
                            ${isFollowing ? 'Deixar de seguir' : 'Seguir'}
                        </button>
                    ` : ''}
                </div>
            </div>
        </div>
    `;
    
    const existingModal = document.getElementById('profileModal');
    if (existingModal) existingModal.remove();
    document.body.insertAdjacentHTML('beforeend', modalHtml);
};

window.closeProfileModal = function() {
    const modal = document.getElementById('profileModal');
    if (modal) modal.remove();
};

window.deletePost = function(postId) {
    if (confirm('Tem certeza que deseja excluir esta publicação?')) {
        DB.deletePost(postId);
        renderCurrentPage();
        showToast('🗑️ Publicação excluída');
    }
};

window.editPost = function(postId) {
    const posts = DB.getPosts();
    const post = posts.find(p => p.id === postId);
    
    if (post) {
        editingPostId = postId;
        document.getElementById('postTitleInput').value = post.titulo;
        document.getElementById('postContentInput').value = post.conteudo;
        document.getElementById('postEmojiInput').value = post.emoji || '';
        document.getElementById('hashtagsInput').value = post.hashtags ? post.hashtags.join(', ') : '';
        
        if (post.imagem) {
            document.getElementById('postImagePreview').src = post.imagem;
            document.getElementById('postImagePreview').style.display = 'block';
            selectedImage = post.imagem;
        }
        
        openPostModal();
        document.getElementById('publishPostBtn').textContent = '✏️ Atualizar';
    }
};

window.searchHashtag = function(hashtag) {
    currentSearchTerm = '#' + hashtag;
    const searchInput = document.getElementById('searchInput');
    if (searchInput) searchInput.value = '#' + hashtag;
    currentPage = 'feed';
    renderCurrentPage();
    showToast(`🔍 Buscando por #${hashtag}`);
};

window.viewFullImage = function(imageUrl) {
    const modal = document.getElementById('fullImageModal');
    const fullImage = document.getElementById('fullImage');
    if (modal && fullImage) {
        fullImage.src = imageUrl;
        modal.style.display = 'flex';
    }
};

window.openDM = function(userId) {
    currentDMTarget = userId;
    const user = DB.getUserById(userId);
    document.getElementById('dmTargetName').textContent = user?.name || 'Conversa';
    renderDMMessages(userId);
    document.getElementById('dmModal').classList.add('open');
};

function renderDMMessages(userId) {
    const messages = DB.getConversation(currentUser.id, userId);
    const container = document.getElementById('dmMessagesArea');
    
    container.innerHTML = messages.map(msg => `
        <div style="text-align: ${msg.from === currentUser.id ? 'right' : 'left'}; margin-bottom: 12px;">
            <div style="background: ${msg.from === currentUser.id ? 'var(--accent)' : 'var(--bg-hover)'}; display: inline-block; padding: 10px 16px; border-radius: 20px; max-width: 80%;">
                ${escapeHtml(msg.message)}
            </div>
            <div style="font-size: 0.65rem; opacity: 0.6;">${new Date(msg.time).toLocaleTimeString()}</div>
        </div>
    `).join('');
    container.scrollTop = container.scrollHeight;
}

function sendDirectMessage() {
    const input = document.getElementById('dmMessageInput');
    const message = input.value.trim();
    if (!message || !currentDMTarget) return;
    DB.sendMessage(currentUser.id, currentDMTarget, message);
    input.value = '';
    renderDMMessages(currentDMTarget);
    renderDMList();
}

function openNewChatModal() {
    const users = DB.getUsers().filter(u => u.id !== currentUser.id);
    const username = prompt('Digite o nome de usuário:\n\n' + users.map(u => `@${u.username} - ${u.name}`).join('\n'));
    if (username) {
        const user = DB.getUserByUsername(username);
        if (user) openDM(user.id);
        else showToast('❌ Usuário não encontrado');
    }
}

function openPostModal() {
    document.getElementById('postModal').classList.add('open');
    if (!editingPostId) {
        document.getElementById('postTitleInput').value = '';
        document.getElementById('postContentInput').value = '';
        document.getElementById('postEmojiInput').value = '';
        document.getElementById('hashtagsInput').value = '';
        document.getElementById('postImagePreview').style.display = 'none';
        document.getElementById('audioPreviewArea').innerHTML = '';
        document.getElementById('audioDataField').value = '';
        selectedImage = null;
        document.getElementById('publishPostBtn').textContent = 'Publicar';
    }
}

function setupAudioRecording() {
    const startBtn = document.getElementById('startRecordingBtn');
    const stopBtn = document.getElementById('stopRecordingBtn');
    if (!startBtn) return;
    
    startBtn.addEventListener('click', async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            mediaRecorder = new MediaRecorder(stream);
            audioChunks = [];
            mediaRecorder.ondataavailable = e => audioChunks.push(e.data);
            mediaRecorder.onstop = () => {
                const blob = new Blob(audioChunks, { type: 'audio/webm' });
                const url = URL.createObjectURL(blob);
                document.getElementById('audioPreviewArea').innerHTML = `<audio controls src="${url}" style="width:100%; margin-top:10px;"></audio>`;
                const reader = new FileReader();
                reader.onloadend = () => document.getElementById('audioDataField').value = reader.result;
                reader.readAsDataURL(blob);
            };
            mediaRecorder.start();
            startBtn.style.display = 'none';
            stopBtn.style.display = 'block';
            showToast('🎙️ Gravando...');
        } catch(err) {
            showToast('❌ Permita acesso ao microfone');
        }
    });
    
    stopBtn.addEventListener('click', () => {
        if (mediaRecorder) {
            mediaRecorder.stop();
            startBtn.style.display = 'block';
            stopBtn.style.display = 'none';
            showToast('⏹️ Gravação finalizada');
        }
    });
}

function publishPost() {
    const titulo = document.getElementById('postTitleInput').value.trim();
    const conteudo = document.getElementById('postContentInput').value.trim();
    const emoji = document.getElementById('postEmojiInput').value.trim();
    const audioData = document.getElementById('audioDataField').value;
    const hashtagsInput = document.getElementById('hashtagsInput')?.value || '';
    const hashtags = hashtagsInput.split(',').map(tag => tag.trim().replace('#', '')).filter(tag => tag);
    
    if (!titulo || !conteudo) {
        showToast('❌ Preencha título e conteúdo');
        return;
    }
    
    if (editingPostId) {
        const updates = {
            titulo: titulo,
            conteudo: conteudo,
            emoji: emoji || null,
            hashtags: hashtags,
            editado: true
        };
        if (selectedImage) updates.imagem = selectedImage;
        if (selectedPostType === 'audio' && audioData) updates.audioData = audioData;
        
        DB.updatePost(editingPostId, updates);
        showToast('✏️ Publicação atualizada!');
        editingPostId = null;
    } else {
        const newPost = {
            id: Date.now(),
            userId: currentUser.id,
            tipo: selectedPostType,
            titulo: titulo,
            conteudo: conteudo,
            emoji: emoji || null,
            imagem: selectedImage || null,
            hashtags: hashtags,
            audioData: selectedPostType === 'audio' ? audioData : null,
            data: new Date().toISOString(),
            curtidas: [],
            comentarios: [],
            editado: false
        };
        DB.addPost(newPost);
        showToast('✅ Publicado! Todos podem ver agora!');
    }
    
    document.getElementById('postModal').classList.remove('open');
    document.getElementById('postTitleInput').value = '';
    document.getElementById('postContentInput').value = '';
    document.getElementById('postEmojiInput').value = '';
    document.getElementById('hashtagsInput').value = '';
    document.getElementById('audioPreviewArea').innerHTML = '';
    document.getElementById('audioDataField').value = '';
    document.getElementById('postImagePreview').style.display = 'none';
    selectedImage = null;
    document.getElementById('publishPostBtn').textContent = 'Publicar';
    
    currentPagePosts = 0;
    renderCurrentPage();
}

function getTimeAgo(dateString) {
    const date = new Date(dateString);
    const now = new Date();
    const seconds = Math.floor((now - date) / 1000);
    if (seconds < 60) return 'agora mesmo';
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes} min atrás`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours} h atrás`;
    const days = Math.floor(hours / 24);
    if (days < 7) return `${days} d atrás`;
    return date.toLocaleDateString('pt-BR');
}

function startRealtimeUpdates() {
    setInterval(() => {
        if (document.visibilityState === 'visible') {
            renderCurrentPage();
            renderDMList();
            Notifications.renderList();
            Notifications.updateBadge();
        }
    }, 10000);
}

function setupImageUpload(inputId, previewId, callback) {
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
                if (callback) callback(ev.target.result);
            };
            reader.readAsDataURL(file);
        }
    });
}

function initCharCounter(textareaId, counterId) {
    const textarea = document.getElementById(textareaId);
    const counter = document.getElementById(counterId);
    if (!textarea || !counter) return;
    
    textarea.addEventListener('input', () => {
        const length = textarea.value.length;
        counter.textContent = `${length}/2000`;
    });
}

window.playAudio = (audioData) => { new Audio(audioData).play(); };
window.showToast = showToast;
window.sharePost = sharePost;