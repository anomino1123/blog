// ============================================
// REPÓRTER DA PERIFERIA - APP PRINCIPAL
// Versão Instagram - Feed personalizado por seguidores
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
let isLoading = false;
let postsToShow = 10;
let editingPostId = null;
let selectedImage = null;
let viewingProfileId = null;

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
                showProfile(currentUser.id);
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
    viewingProfileId = null;
    currentPagePosts = 0;
    currentFilter = 'all';
    
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

function setupSearch() {
    const searchInput = document.getElementById('searchInput');
    if (!searchInput) return;
    
    searchInput.addEventListener('input', (e) => {
        currentSearchTerm = e.target.value.toLowerCase();
        currentPagePosts = 0;
        
        // Se tiver termo de busca, mostrar resultados de busca
        if (currentSearchTerm) {
            renderSearchResults();
        } else {
            renderCurrentPage();
        }
    });
}

function renderSearchResults() {
    const allPosts = DB.getPosts();
    const allUsers = DB.getUsers();
    
    // Buscar em posts
    const postsResults = allPosts.filter(post => 
        post.titulo.toLowerCase().includes(currentSearchTerm) ||
        post.conteudo.toLowerCase().includes(currentSearchTerm) ||
        (post.hashtags && post.hashtags.some(tag => tag.toLowerCase().includes(currentSearchTerm)))
    );
    
    // Buscar em usuários
    const usersResults = allUsers.filter(user => 
        user.id !== currentUser.id &&
        (user.name.toLowerCase().includes(currentSearchTerm) ||
         user.username.toLowerCase().includes(currentSearchTerm))
    );
    
    const container = document.getElementById('feedContainer');
    
    let html = '';
    
    if (usersResults.length > 0) {
        html += `<h3 style="margin: 20px 0 10px; font-size: 1rem;"><i class="fas fa-users"></i> Pessoas</h3>`;
        html += usersResults.map(user => `
            <div class="suggestion-item" style="background: var(--bg-card); margin-bottom: 10px;" onclick="showProfile(${user.id})">
                <div class="suggestion-avatar">${user.avatar ? `<img src="${user.avatar}">` : user.emoji || '📝'}</div>
                <div class="suggestion-info">
                    <div class="suggestion-name">${user.name} ${user.isVerified ? '<i class="fas fa-check-circle" style="color:#3b82f6; font-size:0.7rem;"></i>' : ''}</div>
                    <div class="suggestion-bio">@${user.username} • ${user.followers?.length || 0} seguidores</div>
                </div>
                <button class="follow-btn" onclick="event.stopPropagation(); followUser(${user.id})">
                    ${currentUser.following.includes(user.id) ? 'Seguindo' : 'Seguir'}
                </button>
            </div>
        `).join('');
    }
    
    if (postsResults.length > 0) {
        html += `<h3 style="margin: 20px 0 10px; font-size: 1rem;"><i class="fas fa-newspaper"></i> Publicações</h3>`;
        html += postsResults.map(post => renderPostCard(post)).join('');
    }
    
    if (usersResults.length === 0 && postsResults.length === 0) {
        html = `<div class="placeholder" style="padding: 60px; text-align: center;">
            <i class="fas fa-search" style="font-size: 3rem; opacity: 0.3;"></i>
            <p style="margin-top: 16px;">Nenhum resultado encontrado para "${currentSearchTerm}"</p>
        </div>`;
    }
    
    container.innerHTML = html;
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

// ============================================
// FUNÇÃO PRINCIPAL DO FEED (ESTILO INSTAGRAM)
// Mostra posts de quem o usuário SEGUE
// ============================================
function renderCurrentPage() {
    let posts = DB.getPosts();
    
    // Se estiver vendo perfil de outro usuário
    if (viewingProfileId) {
        posts = posts.filter(p => p.userId === viewingProfileId);
        const profileUser = DB.getUserById(viewingProfileId);
        document.getElementById('pageTitle').innerHTML = `
            <div style="display: flex; align-items: center; gap: 12px;">
                <button onclick="changePage('feed')" style="background: none; border: none; color: var(--accent); cursor: pointer;">
                    <i class="fas fa-arrow-left"></i>
                </button>
                ${profileUser?.name || 'Perfil'}
            </div>
        `;
    } 
    // Feed principal - mostra apenas posts de quem o usuário SEGUE + seus próprios posts
    else if (currentPage === 'feed') {
        posts = posts.filter(p => 
            currentUser.following.includes(p.userId) || p.userId === currentUser.id
        );
    }
    // Página de posts salvos
    else if (currentPage === 'salvos') {
        const savedIds = DB.getSavedPosts(currentUser.id);
        posts = posts.filter(p => savedIds.includes(p.id));
    }
    // Páginas de categorias
    else {
        switch(currentPage) {
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
        }
    }
    
    // Aplicar filtros de categoria (se não for perfil)
    if (!viewingProfileId && currentFilter !== 'all' && currentPage !== 'salvos') {
        posts = posts.filter(p => p.tipo === currentFilter);
    }
    
    // Ordenar por data (mais recentes primeiro)
    posts.sort((a, b) => new Date(b.data) - new Date(a.data));
    
    renderFeedWithPagination(posts);
}

function renderFeedWithPagination(allPosts) {
    const container = document.getElementById('feedContainer');
    const paginatedPosts = allPosts.slice(0, currentPagePosts + postsToShow);
    const hasMore = paginatedPosts.length < allPosts.length;
    
    if (paginatedPosts.length === 0 && currentPagePosts === 0) {
        let emptyMessage = '';
        if (viewingProfileId) {
            const profileUser = DB.getUserById(viewingProfileId);
            emptyMessage = `<div class="placeholder" style="padding: 60px; text-align: center;">
                <i class="fas fa-newspaper" style="font-size: 3rem; opacity: 0.3;"></i>
                <p style="margin-top: 16px;">${profileUser?.name || 'Usuário'} ainda não publicou nada.</p>
            </div>`;
        } else if (currentPage === 'feed') {
            emptyMessage = `<div class="placeholder" style="padding: 60px; text-align: center;">
                <i class="fas fa-rss" style="font-size: 3rem; opacity: 0.3;"></i>
                <p style="margin-top: 16px;">Seu feed está vazio!</p>
                <p style="font-size: 0.8rem;">Siga outras pessoas para ver publicações aqui.</p>
                <button onclick="document.getElementById('suggestionsList').scrollIntoView({behavior: 'smooth'})" style="margin-top: 16px; background: var(--accent); border: none; padding: 10px 24px; border-radius: 40px; color: white; cursor: pointer;">
                    <i class="fas fa-user-plus"></i> Descobrir pessoas
                </button>
            </div>`;
        } else if (currentPage === 'salvos') {
            emptyMessage = `<div class="placeholder" style="padding: 60px; text-align: center;">
                <i class="fas fa-bookmark" style="font-size: 3rem; opacity: 0.3;"></i>
                <p style="margin-top: 16px;">Você ainda não salvou nenhum post.</p>
                <p style="font-size: 0.8rem;">Clique no ícone de bookmark nos posts para salvá-los.</p>
            </div>`;
        } else {
            emptyMessage = `<div class="placeholder" style="padding: 60px; text-align: center;">
                <i class="fas fa-newspaper" style="font-size: 3rem; opacity: 0.3;"></i>
                <p style="margin-top: 16px;">Nenhuma publicação encontrada.</p>
                <p style="font-size: 0.8rem;">Clique no botão + para começar!</p>
            </div>`;
        }
        container.innerHTML = emptyMessage;
        return;
    }
    
    container.innerHTML = paginatedPosts.map(post => renderPostCard(post)).join('');
    
    if (hasMore) {
        const loadMoreBtn = document.createElement('button');
        loadMoreBtn.className = 'load-more-btn';
        loadMoreBtn.innerHTML = '<i class="fas fa-arrow-down"></i> Carregar mais publicações';
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
    const timeAgo = getTimeAgo(post.data);
    const isAdmin = Auth.isAdmin();
    const isFollowing = currentUser.following.includes(author.id);
    
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
        `<button class="edit-btn" onclick="editPost(${post.id})"><i class="fas fa-edit"></i> Editar</button>` : '';
    
    const deleteHtml = (isAdmin || post.userId === currentUser.id) ? 
        `<button class="delete-btn" onclick="deletePost(${post.id})"><i class="fas fa-trash"></i> Excluir</button>` : '';
    
    const commentsHtml = (post.comentarios || []).slice(0, 3).map(c => `
        <div style="padding: 8px 0; border-bottom: 1px solid var(--border);">
            <strong>${c.username}</strong>: ${escapeHtml(c.texto)}
            <div style="font-size: 0.6rem; color: var(--text-secondary);">${getTimeAgo(c.data)}</div>
        </div>
    `).join('');
    
    const hasMoreComments = (post.comentarios?.length || 0) > 3;
    
    const verifiedBadge = author.isVerified ? '<i class="fas fa-check-circle verified-icon"></i>' : '';
    
    return `
        <div class="post-card" data-post-id="${post.id}">
            <div class="post-header">
                <div class="post-avatar" onclick="showProfile(${author.id})" style="cursor: pointer;">
                    ${author.avatar ? `<img src="${author.avatar}">` : `<span>${author.emoji || '📝'}</span>`}
                </div>
                <div class="post-author-info">
                    <div class="post-author" onclick="showProfile(${author.id})" style="cursor: pointer;">
                        ${author.name} ${verifiedBadge}
                        ${!isFollowing && author.id !== currentUser.id ? `<span style="font-size: 0.7rem; color: var(--accent); margin-left: 5px;" onclick="event.stopPropagation(); followUser(${author.id})">• Seguir</span>` : ''}
                    </div>
                    <div class="post-time">${timeAgo} ${post.editado ? '(editado)' : ''}</div>
                </div>
                <div style="display: flex; gap: 8px;">
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
            <div class="post-actions">
                <button class="action-btn ${isLiked ? 'liked' : ''}" onclick="toggleLike(${post.id})">
                    <i class="fa-${isLiked ? 'solid' : 'regular'} fa-heart"></i> ${post.curtidas?.length || 0}
                </button>
                <button class="action-btn" onclick="toggleComments(${post.id})">
                    <i class="far fa-comment"></i> ${post.comentarios?.length || 0}
                </button>
                <button class="action-btn ${isSaved ? 'saved' : ''}" onclick="toggleSavePost(${post.id})">
                    <i class="fa-${isSaved ? 'solid' : 'regular'} fa-bookmark"></i>
                </button>
                <button class="action-btn" onclick="sharePost('${post.titulo.replace(/'/g, "\\'")}', window.location.href)">
                    <i class="far fa-share-square"></i>
                </button>
            </div>
            <div id="comments-${post.id}" style="display: none; margin-top: 16px;">
                <div class="comment-list">
                    ${commentsHtml}
                    ${hasMoreComments ? `<div style="padding: 8px 0; color: var(--accent); cursor: pointer; font-size: 0.8rem;" onclick="loadAllComments(${post.id})">Ver todos os ${post.comentarios?.length} comentários</div>` : ''}
                </div>
                <div style="display: flex; gap: 8px; margin-top: 12px;">
                    <input type="text" id="commentInput-${post.id}" placeholder="Adicione um comentário..." style="flex:1; padding: 10px; background: var(--bg-hover); border: 1px solid var(--border); border-radius: 40px; color: white;">
                    <button onclick="addComment(${post.id})" style="background: var(--accent); border: none; padding: 0 20px; border-radius: 40px; cursor: pointer;">Enviar</button>
                </div>
            </div>
        </div>
    `;
}

// Mostrar perfil de um usuário
function showProfile(userId) {
    viewingProfileId = userId;
    currentPage = 'profile';
    currentPagePosts = 0;
    
    const profileUser = DB.getUserById(userId);
    
    // Atualizar título
    document.getElementById('pageTitle').innerHTML = `
        <div style="display: flex; align-items: center; gap: 12px;">
            <button onclick="changePage('feed')" style="background: none; border: none; color: var(--accent); cursor: pointer;">
                <i class="fas fa-arrow-left"></i>
            </button>
            ${profileUser?.name || 'Perfil'}
        </div>
    `;
    
    // Destacar botão ativo
    document.querySelectorAll('.nav-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    
    renderProfilePage(userId);
}

function renderProfilePage(userId) {
    const profileUser = DB.getUserById(userId);
    if (!profileUser) return;
    
    const userPosts = DB.getPosts().filter(p => p.userId === userId);
    const isOwnProfile = userId === currentUser.id;
    const isFollowing = currentUser.following.includes(userId);
    
    const container = document.getElementById('feedContainer');
    
    container.innerHTML = `
        <div class="profile-header-card" style="background: var(--bg-card); border-radius: 24px; padding: 24px; margin-bottom: 24px; text-align: center;">
            <div class="profile-avatar-large" style="width: 100px; height: 100px; margin: 0 auto 16px; background: linear-gradient(135deg, var(--accent), var(--accent-hover)); border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 2.5rem; overflow: hidden;">
                ${profileUser.avatar ? `<img src="${profileUser.avatar}" style="width:100%;height:100%;object-fit:cover;">` : profileUser.emoji || '🧠'}
            </div>
            <h2>${profileUser.name} ${profileUser.isVerified ? '<i class="fas fa-check-circle" style="color:#3b82f6;"></i>' : ''}</h2>
            <p style="color: var(--text-secondary);">@${profileUser.username}</p>
            <p style="margin: 12px 0;">${profileUser.bio || 'Sem bio ainda'}</p>
            <div style="display: flex; justify-content: center; gap: 32px; margin: 20px 0;">
                <div><strong>${profileUser.followers?.length || 0}</strong><br><span style="font-size: 0.7rem;">Seguidores</span></div>
                <div><strong>${profileUser.following?.length || 0}</strong><br><span style="font-size: 0.7rem;">Seguindo</span></div>
                <div><strong>${userPosts.length}</strong><br><span style="font-size: 0.7rem;">Publicações</span></div>
            </div>
            ${!isOwnProfile ? `
                <button class="follow-profile-btn" onclick="followUser(${profileUser.id})" style="background: ${isFollowing ? 'transparent' : 'var(--accent)'}; border: ${isFollowing ? '1px solid var(--accent)' : 'none'}; color: ${isFollowing ? 'var(--accent)' : 'white'}; padding: 10px 24px; border-radius: 40px; cursor: pointer; margin-top: 8px;">
                    ${isFollowing ? '<i class="fas fa-check"></i> Seguindo' : '<i class="fas fa-user-plus"></i> Seguir'}
                </button>
            ` : `
                <button onclick="window.location.href='perfil.html'" style="background: transparent; border: 1px solid var(--accent); color: var(--accent); padding: 10px 24px; border-radius: 40px; cursor: pointer;">
                    <i class="fas fa-edit"></i> Editar perfil
                </button>
            `}
        </div>
        <h3 style="margin: 20px 0 16px;">Publicações</h3>
        <div id="profilePostsContainer"></div>
    `;
    
    // Renderizar posts do perfil
    const postsContainer = document.getElementById('profilePostsContainer');
    if (userPosts.length === 0) {
        postsContainer.innerHTML = '<div class="placeholder" style="text-align: center; padding: 40px;">Nenhuma publicação ainda</div>';
    } else {
        postsContainer.innerHTML = userPosts.sort((a,b) => new Date(b.data) - new Date(a.data)).map(post => renderPostCard(post)).join('');
    }
}

function showSavedPosts() {
    currentPage = 'salvos';
    viewingProfileId = null;
    currentPagePosts = 0;
    
    document.querySelectorAll('.nav-btn').forEach(btn => {
        if (btn.dataset.page === 'salvos') {
            btn.classList.add('active');
        } else {
            btn.classList.remove('active');
        }
    });
    
    document.getElementById('pageTitle').textContent = 'Posts Salvos';
    renderCurrentPage();
}

function loadAllComments(postId) {
    const post = DB.getPosts().find(p => p.id === postId);
    if (!post) return;
    
    const commentsDiv = document.getElementById(`comments-${postId}`);
    const commentList = commentsDiv?.querySelector('.comment-list');
    
    if (commentList && post.comentarios) {
        commentList.innerHTML = post.comentarios.map(c => `
            <div style="padding: 8px 0; border-bottom: 1px solid var(--border);">
                <strong>${c.username}</strong>: ${escapeHtml(c.texto)}
                <div style="font-size: 0.6rem; color: var(--text-secondary);">${getTimeAgo(c.data)}</div>
            </div>
        `).join('');
    }
}

function renderSuggestions() {
    const users = DB.getUsers();
    // Sugerir pessoas que o usuário NÃO segue e que não são ele mesmo
    const suggestions = users.filter(u => 
        u.id !== currentUser.id && !currentUser.following.includes(u.id)
    ).slice(0, 5);
    
    const container = document.getElementById('suggestionsList');
    
    if (suggestions.length === 0) {
        container.innerHTML = '<p class="placeholder">Nenhuma sugestão no momento</p>';
        return;
    }
    
    container.innerHTML = suggestions.map(user => `
        <div class="suggestion-item" onclick="showProfile(${user.id})">
            <div class="suggestion-avatar">${user.avatar ? `<img src="${user.avatar}">` : user.emoji || '📝'}</div>
            <div class="suggestion-info">
                <div class="suggestion-name">${user.name} ${user.isVerified ? '<i class="fas fa-check-circle" style="color:#3b82f6; font-size:0.7rem;"></i>' : ''}</div>
                <div class="suggestion-bio">@${user.username}</div>
            </div>
            <button class="follow-btn" onclick="event.stopPropagation(); followUser(${user.id})">Seguir</button>
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

// ============================================
// FUNÇÕES DE INTERAÇÃO (Curtir, Seguir, Comentar)
// ============================================

window.toggleLike = function(postId) {
    const posts = DB.getPosts();
    const post = posts.find(p => p.id === postId);
    
    if (post) {
        if (!post.curtidas) post.curtidas = [];
        
        if (post.curtidas.includes(currentUser.id)) {
            post.curtidas = post.curtidas.filter(id => id !== currentUser.id);
        } else {
            post.curtidas.push(currentUser.id);
            if (post.userId !== currentUser.id) {
                Notifications.create(post.userId, 'like', `${currentUser.name} curtiu seu post "${post.titulo.substring(0, 30)}"`, postId);
            }
        }
        DB.savePosts(posts);
        
        if (viewingProfileId) {
            renderProfilePage(viewingProfileId);
        } else {
            renderCurrentPage();
        }
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
    
    if (currentPage === 'salvos') {
        renderCurrentPage();
    } else if (viewingProfileId) {
        renderProfilePage(viewingProfileId);
    } else {
        renderCurrentPage();
    }
};

window.followUser = function(userId) {
    const isFollowing = currentUser.following.includes(userId);
    
    if (isFollowing) {
        DB.unfollowUser(currentUser.id, userId);
        showToast(`❌ Você deixou de seguir ${DB.getUserById(userId).name}`);
    } else {
        DB.followUser(currentUser.id, userId);
        showToast(`✅ Agora você segue ${DB.getUserById(userId).name}`);
    }
    
    // Atualizar tudo
    renderSuggestions();
    if (viewingProfileId) {
        renderProfilePage(viewingProfileId);
    } else {
        renderCurrentPage();
    }
    Notifications.renderList();
};

window.toggleComments = function(postId) {
    const div = document.getElementById(`comments-${postId}`);
    if (div) {
        if (div.style.display === 'none') {
            div.style.display = 'block';
            // Carregar todos os comentários quando abrir
            loadAllComments(postId);
        } else {
            div.style.display = 'none';
        }
    }
};

window.addComment = function(postId) {
    const input = document.getElementById(`commentInput-${postId}`);
    const text = input.value.trim();
    if (!text) return;
    
    const posts = DB.getPosts();
    const post = posts.find(p => p.id === postId);
    
    if (post) {
        if (!post.comentarios) post.comentarios = [];
        post.comentarios.unshift({ 
            userId: currentUser.id, 
            username: currentUser.name, 
            texto: text, 
            data: new Date().toISOString() 
        });
        DB.savePosts(posts);
        
        if (post.userId !== currentUser.id) {
            Notifications.create(post.userId, 'comment', `${currentUser.name} comentou no seu post: "${text.substring(0, 50)}"`, postId);
        }
        input.value = '';
        
        if (viewingProfileId) {
            renderProfilePage(viewingProfileId);
        } else {
            renderCurrentPage();
        }
    }
};

window.playAudio = function(audioData) {
    const audio = new Audio(audioData);
    audio.play();
    showToast('🎤 Reproduzindo áudio...');
};

window.deletePost = function(postId) {
    if (confirm('Tem certeza que deseja excluir esta publicação? Esta ação não pode ser desfeita.')) {
        DB.deletePost(postId);
        showToast('🗑️ Publicação excluída');
        
        if (viewingProfileId) {
            renderProfilePage(viewingProfileId);
        } else {
            renderCurrentPage();
        }
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
        document.getElementById('publishPostBtn').textContent = '✏️ Atualizar publicação';
    }
};

window.searchHashtag = function(hashtag) {
    currentSearchTerm = '#' + hashtag;
    const searchInput = document.getElementById('searchInput');
    if (searchInput) searchInput.value = '#' + hashtag;
    renderSearchResults();
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

// Fechar modal de imagem
document.querySelector('#fullImageModal .close-modal')?.addEventListener('click', () => {
    document.getElementById('fullImageModal').style.display = 'none';
});

// ============================================
// FUNÇÕES DE DM
// ============================================

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
            <div style="font-size: 0.65rem; opacity: 0.6; margin-top: 4px;">${new Date(msg.time).toLocaleTimeString()}</div>
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
    const userList = users.map(u => `${u.name} (@${u.username})`).join('\n');
    const username = prompt(`Digite o nome de usuário para conversar:\n\nUsuários disponíveis:\n${userList}`);
    if (username) {
        const user = DB.getUserByUsername(username);
        if (user) openDM(user.id);
        else showToast('❌ Usuário não encontrado');
    }
}

// ============================================
// FUNÇÕES DE POSTAGEM
// ============================================

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
            showToast('🎙️ Gravando... fale à vontade');
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
        showToast('✅ Publicação criada!');
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
    if (viewingProfileId) {
        renderProfilePage(viewingProfileId);
    } else {
        renderCurrentPage();
    }
}

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

function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
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
            if (viewingProfileId) {
                renderProfilePage(viewingProfileId);
            } else {
                renderCurrentPage();
            }
            renderDMList();
            Notifications.renderList();
            Notifications.updateBadge();
            renderSuggestions();
        }
    }, 10000);
}

function showToast(message) {
    const existingToast = document.querySelector('.toast');
    if (existingToast) existingToast.remove();
    
    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.textContent = message;
    toast.style.cssText = `
        position: fixed;
        bottom: 80px;
        left: 50%;
        transform: translateX(-50%);
        background: var(--bg-card);
        border: 1px solid var(--accent);
        border-radius: 40px;
        padding: 10px 20px;
        color: white;
        font-size: 0.85rem;
        z-index: 2500;
        animation: fadeInUp 0.3s ease;
        white-space: nowrap;
    `;
    document.body.appendChild(toast);
    
    setTimeout(() => {
        toast.remove();
    }, 3000);
}

window.sharePost = function(title, url) {
    if (navigator.share) {
        navigator.share({
            title: title,
            text: 'Confira esta publicação no Repórter da Periferia!',
            url: url
        }).catch(() => {});
    } else {
        copyToClipboard(url);
    }
};

window.copyToClipboard = function(text) {
    navigator.clipboard.writeText(text);
    showToast('✅ Link copiado!');
};

window.showProfile = showProfile;
window.followUser = followUser;
window.toggleLike = toggleLike;
window.toggleSavePost = toggleSavePost;
window.toggleComments = toggleComments;
window.addComment = addComment;
window.playAudio = playAudio;
window.openDM = openDM;
window.deletePost = deletePost;
window.editPost = editPost;
window.searchHashtag = searchHashtag;
window.viewFullImage = viewFullImage;
window.sharePost = sharePost;
window.copyToClipboard = copyToClipboard;
window.showToast = showToast;