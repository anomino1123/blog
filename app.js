// ============================================
// REPÓRTER DA PERIFERIA - APLICAÇÃO PRINCIPAL
// ============================================

let currentUser = null;
let currentPage = 'feed';
let currentDMTarget = null;
let selectedPostType = 'pensamento';
let mediaRecorder = null;
let audioChunks = [];

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
            } else if (page) {
                changePage(page);
            }
        });
    });
    
    document.getElementById('fabPostBtn').addEventListener('click', openPostModal);
    document.getElementById('refreshFeedBtn').addEventListener('click', () => renderCurrentPage());
    document.getElementById('darkModeBtn').addEventListener('click', toggleDarkMode);
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
}

function changePage(page) {
    currentPage = page;
    document.querySelectorAll('.nav-btn').forEach(btn => {
        if (btn.dataset.page === page) {
            btn.classList.add('active');
        } else {
            btn.classList.remove('active');
        }
    });
    
    const titles = { 'feed': 'Início', 'teses': 'Teses', 'diario': 'Diário', 'jornal': 'Notícias', 'audio': 'Áudios' };
    document.getElementById('pageTitle').textContent = titles[page] || 'Repórter da Periferia';
    renderCurrentPage();
}

function renderCurrentPage() {
    let posts = DB.getPosts();
    
    switch(currentPage) {
        case 'feed':
            posts = posts.filter(p => currentUser.following.includes(p.userId) || p.userId === currentUser.id);
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
    }
    
    renderFeed(posts);
}

function renderFeed(posts) {
    const container = document.getElementById('feedContainer');
    const isAdmin = Auth.isAdmin();
    
    if (posts.length === 0) {
        container.innerHTML = `<div class="placeholder" style="padding: 60px; text-align: center;"><i class="fas fa-newspaper" style="font-size: 3rem; opacity: 0.3;"></i><p style="margin-top: 16px;">Nenhuma publicação por aqui.</p><p style="font-size: 0.8rem;">Clique no botão + para começar!</p></div>`;
        return;
    }
    
    container.innerHTML = posts.map(post => {
        const author = DB.getUserById(post.userId);
        const badgeClass = `badge-${post.tipo}`;
        const badgeName = { 'pensamento': '💭 Pensamento', 'tese': '📚 Tese', 'diario': '📓 Diário', 'jornal': '📰 Notícia', 'audio': '🎙️ Áudio' }[post.tipo];
        const isLiked = post.curtidas && post.curtidas.includes(currentUser.id);
        const timeAgo = getTimeAgo(post.data);
        
        let audioHtml = '';
        if (post.audioData) {
            audioHtml = `<div style="margin: 12px 0;"><button onclick="playAudio('${post.audioData}')" class="action-btn"><i class="fas fa-play"></i> Ouvir áudio</button></div>`;
        }
        
        const commentsHtml = (post.comentarios || []).map(c => `<div style="padding: 8px 0; border-bottom: 1px solid var(--border);"><strong>${c.username}</strong>: ${c.texto}</div>`).join('');
        
        const deleteButton = (isAdmin || post.userId === currentUser.id) ? 
            `<button class="delete-btn" onclick="deletePost(${post.id})"><i class="fas fa-trash"></i> Excluir</button>` : '';
        
        const verifiedBadge = author?.isVerified ? '<i class="fas fa-check-circle verified-icon"></i>' : '';
        
        return `
            <div class="post-card">
                <div class="post-header">
                    <div class="post-avatar">${author?.avatar ? `<img src="${author.avatar}">` : `<span>${author?.emoji || '📝'}</span>`}</div>
                    <div>
                        <div class="post-author">${author?.name || 'Usuário'} ${verifiedBadge}</div>
                        <div class="post-time">${timeAgo}</div>
                    </div>
                    ${deleteButton}
                </div>
                <div class="post-badge ${badgeClass}">${badgeName}</div>
                <h3 class="post-title">${post.emoji || '📝'} ${post.titulo}</h3>
                <div class="post-content">${post.conteudo.replace(/\n/g, '<br>')}</div>
                ${audioHtml}
                <div class="post-actions">
                    <button class="action-btn ${isLiked ? 'liked' : ''}" onclick="toggleLike(${post.id})"><i class="fa-${isLiked ? 'solid' : 'regular'} fa-heart"></i> ${post.curtidas?.length || 0}</button>
                    <button class="action-btn" onclick="toggleComments(${post.id})"><i class="far fa-comment"></i> ${post.comentarios?.length || 0}</button>
                </div>
                <div id="comments-${post.id}" style="display: none; margin-top: 16px;">
                    <div class="comment-list">${commentsHtml || '<p style="opacity:0.6;">Nenhum comentário ainda</p>'}</div>
                    <div style="display: flex; gap: 8px; margin-top: 12px;">
                        <input type="text" id="commentInput-${post.id}" placeholder="Escreva um comentário..." style="flex:1; padding: 10px; background: var(--bg-hover); border: 1px solid var(--border); border-radius: 40px; color: white;">
                        <button onclick="addComment(${post.id})" style="background: var(--accent); border: none; padding: 0 20px; border-radius: 40px; cursor: pointer;">Enviar</button>
                    </div>
                </div>
            </div>
        `;
    }).join('');
}

window.deletePost = function(postId) {
    if (confirm('Tem certeza que deseja excluir esta publicação? Esta ação não pode ser desfeita.')) {
        DB.deletePost(postId);
        renderCurrentPage();
        Notifications.create(currentUser.id, 'system', 'Você excluiu uma publicação', postId);
    }
};

function renderSuggestions() {
    const users = DB.getUsers();
    const suggestions = users.filter(u => u.id !== currentUser.id && !currentUser.following.includes(u.id));
    const container = document.getElementById('suggestionsList');
    
    if (suggestions.length === 0) {
        container.innerHTML = '<p class="placeholder">Nenhuma sugestão</p>';
        return;
    }
    
    container.innerHTML = suggestions.slice(0, 5).map(user => `
        <div class="suggestion-item">
            <div class="suggestion-avatar">${user.avatar ? `<img src="${user.avatar}">` : user.emoji || '📝'}</div>
            <div class="suggestion-info">
                <div class="suggestion-name">${user.name} ${user.isVerified ? '<i class="fas fa-check-circle" style="color:#3b82f6; font-size:0.7rem;"></i>' : ''}</div>
                <div class="suggestion-bio">@${user.username}</div>
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
                    <div class="dm-preview">${chat.lastMessage.substring(0, 40)}</div>
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
        } else {
            post.curtidas.push(currentUser.id);
            if (post.userId !== currentUser.id) {
                Notifications.create(post.userId, 'like', `${currentUser.name} curtiu seu post "${post.titulo.substring(0, 30)}"`, postId);
            }
        }
        DB.savePosts(posts);
        renderCurrentPage();
    }
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
        post.comentarios.push({ userId: currentUser.id, username: currentUser.name, texto: text, data: new Date().toISOString() });
        DB.savePosts(posts);
        
        if (post.userId !== currentUser.id) {
            Notifications.create(post.userId, 'comment', `${currentUser.name} comentou no seu post "${post.titulo.substring(0, 30)}"`, postId);
        }
        input.value = '';
        renderCurrentPage();
    }
};

window.followUser = function(userId) {
    DB.followUser(currentUser.id, userId);
    renderSuggestions();
    renderCurrentPage();
};

window.playAudio = function(audioData) {
    const audio = new Audio(audioData);
    audio.play();
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
            <div style="background: ${msg.from === currentUser.id ? 'var(--accent)' : 'var(--bg-hover)'}; display: inline-block; padding: 10px 16px; border-radius: 20px; max-width: 80%;">${msg.message}</div>
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
    const username = prompt('Digite o nome de usuário para conversar:\n\n' + users.map(u => `@${u.username} - ${u.name}`).join('\n'));
    if (username) {
        const user = DB.getUserByUsername(username);
        if (user) openDM(user.id);
        else alert('Usuário não encontrado');
    }
}

function openPostModal() {
    document.getElementById('postModal').classList.add('open');
    document.getElementById('postTitleInput').value = '';
    document.getElementById('postContentInput').value = '';
    document.getElementById('postEmojiInput').value = '';
    document.getElementById('audioPreviewArea').innerHTML = '';
    document.getElementById('audioDataField').value = '';
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
        } catch(err) {
            alert('Permita acesso ao microfone para gravar áudio');
        }
    });
    
    stopBtn.addEventListener('click', () => {
        if (mediaRecorder) {
            mediaRecorder.stop();
            startBtn.style.display = 'block';
            stopBtn.style.display = 'none';
        }
    });
}

function publishPost() {
    const titulo = document.getElementById('postTitleInput').value.trim();
    const conteudo = document.getElementById('postContentInput').value.trim();
    const emoji = document.getElementById('postEmojiInput').value.trim();
    const audioData = document.getElementById('audioDataField').value;
    
    if (!titulo || !conteudo) {
        alert('Preencha título e conteúdo');
        return;
    }
    
    const newPost = {
        id: Date.now(),
        userId: currentUser.id,
        tipo: selectedPostType,
        titulo: titulo,
        conteudo: conteudo,
        emoji: emoji || null,
        audioData: selectedPostType === 'audio' ? audioData : null,
        data: new Date().toISOString(),
        curtidas: [],
        comentarios: []
    };
    
    DB.addPost(newPost);
    document.getElementById('postModal').classList.remove('open');
    document.getElementById('postTitleInput').value = '';
    document.getElementById('postContentInput').value = '';
    document.getElementById('postEmojiInput').value = '';
    document.getElementById('audioPreviewArea').innerHTML = '';
    document.getElementById('audioDataField').value = '';
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

let darkMode = false;
function toggleDarkMode() {
    darkMode = !darkMode;
    document.body.style.background = darkMode ? '#1a1a2e' : '#0a0a0a';
}

function startRealtimeUpdates() {
    setInterval(() => {
        if (document.visibilityState === 'visible') {
            renderCurrentPage();
            renderDMList();
            Notifications.renderList();
            Notifications.updateBadge();
        }
    }, 5000);
}

window.toggleLike = toggleLike;
window.toggleComments = toggleComments;
window.addComment = addComment;
window.followUser = followUser;
window.playAudio = playAudio;
window.openDM = openDM;
window.deletePost = deletePost;