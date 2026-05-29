// ============================================
// REPÓRTER DA PERIFERIA - DATABASE
// Versão 4.0
// ============================================

const DB = {
    KEYS: {
        USERS: 'reporter_users',
        POSTS: 'reporter_posts',
        CURRENT_USER: 'reporter_current_user',
        DMS: 'reporter_dms',
        NOTIFICATIONS: 'reporter_notifications',
        SAVED_POSTS: 'reporter_saved_posts'
    },

    getUsers: function() {
        const data = localStorage.getItem(this.KEYS.USERS);
        if (data) return JSON.parse(data);
        
        const initialUsers = [
            {
                id: 1,
                username: "adminniriswest",
                password: "123",
                name: "Niris West",
                bio: "Fundadora do Repórter da Periferia. Jornalista, escritora e apaixonada por educação crítica. 🎙️",
                avatar: null,
                emoji: "👑",
                isVerified: true,
                followers: [2, 3],
                following: [2, 3],
                role: "admin",
                createdAt: new Date().toISOString()
            },
            {
                id: 2,
                username: "anonimo",
                password: "qwe123qwe123",
                name: "Anônimo",
                bio: "🎭 Sem rótulos, sem máscaras. Só pensamento livre.",
                avatar: null,
                emoji: "🎭",
                isVerified: false,
                followers: [1],
                following: [1],
                role: "user",
                createdAt: new Date().toISOString()
            },
            {
                id: 3,
                username: "convidado",
                password: "convidado123",
                name: "Visitante",
                bio: "Explorando o Repórter da Periferia. 👋",
                avatar: null,
                emoji: "👋",
                isVerified: false,
                followers: [1],
                following: [1],
                role: "guest",
                createdAt: new Date().toISOString()
            }
        ];
        localStorage.setItem(this.KEYS.USERS, JSON.stringify(initialUsers));
        return initialUsers;
    },

    saveUsers: function(users) {
        localStorage.setItem(this.KEYS.USERS, JSON.stringify(users));
    },

    getPosts: function() {
        const data = localStorage.getItem(this.KEYS.POSTS);
        if (data) return JSON.parse(data);
        
        const initialPosts = [
            {
                id: Date.now(),
                userId: 1,
                tipo: "jornal",
                titulo: "Bem-vindos ao Repórter da Periferia",
                conteudo: "Este é um espaço para pensar criticamente a sociedade, a escola e o mundo. Aqui, a periferia tem voz própria. TODOS os posts aparecem para TODOS os usuários!",
                emoji: "📰",
                imagem: null,
                hashtags: ["periferia", "educacao", "sociedade"],
                audioData: null,
                data: new Date().toISOString(),
                curtidas: [2, 3],
                comentarios: [
                    { userId: 2, username: "Anônimo", texto: "Que iniciativa incrível!", data: new Date().toISOString() }
                ],
                editado: false
            }
        ];
        localStorage.setItem(this.KEYS.POSTS, JSON.stringify(initialPosts));
        return initialPosts;
    },

    savePosts: function(posts) {
        localStorage.setItem(this.KEYS.POSTS, JSON.stringify(posts));
    },

    addPost: function(post) {
        const posts = this.getPosts();
        posts.unshift(post);
        this.savePosts(posts);
        return post;
    },

    updatePost: function(postId, updates) {
        const posts = this.getPosts();
        const index = posts.findIndex(p => p.id === postId);
        if (index !== -1) {
            posts[index] = { ...posts[index], ...updates, editado: true };
            this.savePosts(posts);
            return true;
        }
        return false;
    },

    deletePost: function(postId) {
        let posts = this.getPosts();
        posts = posts.filter(p => p.id !== postId);
        this.savePosts(posts);
        return true;
    },

    getSavedPosts: function(userId) {
        const saved = localStorage.getItem(this.KEYS.SAVED_POSTS);
        const savedData = saved ? JSON.parse(saved) : {};
        return savedData[userId] || [];
    },

    savePost: function(userId, postId) {
        const saved = localStorage.getItem(this.KEYS.SAVED_POSTS);
        const savedData = saved ? JSON.parse(saved) : {};
        if (!savedData[userId]) savedData[userId] = [];
        if (!savedData[userId].includes(postId)) {
            savedData[userId].push(postId);
            localStorage.setItem(this.KEYS.SAVED_POSTS, JSON.stringify(savedData));
            return true;
        }
        return false;
    },

    unsavePost: function(userId, postId) {
        const saved = localStorage.getItem(this.KEYS.SAVED_POSTS);
        const savedData = saved ? JSON.parse(saved) : {};
        if (savedData[userId]) {
            savedData[userId] = savedData[userId].filter(id => id !== postId);
            localStorage.setItem(this.KEYS.SAVED_POSTS, JSON.stringify(savedData));
            return true;
        }
        return false;
    },

    isPostSaved: function(userId, postId) {
        const saved = this.getSavedPosts(userId);
        return saved.includes(postId);
    },

    getDMs: function() {
        const data = localStorage.getItem(this.KEYS.DMS);
        if (data) return JSON.parse(data);
        return {};
    },

    saveDMs: function(dms) {
        localStorage.setItem(this.KEYS.DMS, JSON.stringify(dms));
    },

    sendMessage: function(fromUserId, toUserId, message) {
        const dms = this.getDMs();
        const chatKey = [fromUserId, toUserId].sort().join('-');
        if (!dms[chatKey]) dms[chatKey] = [];
        dms[chatKey].push({
            id: Date.now(),
            from: fromUserId,
            to: toUserId,
            message: message,
            time: new Date().toISOString(),
            read: false
        });
        this.saveDMs(dms);
        if (typeof Notifications !== 'undefined') {
            Notifications.create(toUserId, 'dm', `${this.getUserById(fromUserId).name} te enviou uma mensagem`, fromUserId);
        }
        return dms[chatKey];
    },

    getConversation: function(userId1, userId2) {
        const dms = this.getDMs();
        const chatKey = [userId1, userId2].sort().join('-');
        return dms[chatKey] || [];
    },

    getNotifications: function() {
        const data = localStorage.getItem(this.KEYS.NOTIFICATIONS);
        if (data) return JSON.parse(data);
        return [];
    },

    saveNotifications: function(notifications) {
        localStorage.setItem(this.KEYS.NOTIFICATIONS, JSON.stringify(notifications));
    },

    getUserById: function(id) {
        const users = this.getUsers();
        return users.find(u => u.id === id);
    },

    getUserByUsername: function(username) {
        const users = this.getUsers();
        return users.find(u => u.username === username);
    },

    getCurrentUser: function() {
        const data = localStorage.getItem(this.KEYS.CURRENT_USER);
        if (data) {
            const userData = JSON.parse(data);
            return this.getUserById(userData.id);
        }
        return null;
    },

    setCurrentUser: function(user) {
        if (user) {
            localStorage.setItem(this.KEYS.CURRENT_USER, JSON.stringify({ id: user.id, username: user.username }));
        } else {
            localStorage.removeItem(this.KEYS.CURRENT_USER);
        }
    },

    followUser: function(currentUserId, targetUserId) {
        const users = this.getUsers();
        const currentUser = users.find(u => u.id === currentUserId);
        const targetUser = users.find(u => u.id === targetUserId);
        
        if (currentUser && targetUser && !currentUser.following.includes(targetUserId)) {
            currentUser.following.push(targetUserId);
            targetUser.followers.push(currentUserId);
            this.saveUsers(users);
            if (typeof Notifications !== 'undefined') {
                Notifications.create(targetUserId, 'follow', `${currentUser.name} começou a seguir você`, currentUserId);
            }
            return true;
        }
        return false;
    },

    unfollowUser: function(currentUserId, targetUserId) {
        const users = this.getUsers();
        const currentUser = users.find(u => u.id === currentUserId);
        const targetUser = users.find(u => u.id === targetUserId);
        
        if (currentUser && targetUser) {
            currentUser.following = currentUser.following.filter(id => id !== targetUserId);
            targetUser.followers = targetUser.followers.filter(id => id !== currentUserId);
            this.saveUsers(users);
            return true;
        }
        return false;
    },

    isAdmin: function(userId) {
        const user = this.getUserById(userId);
        return user && (user.role === 'admin' || user.username === 'adminniriswest');
    },

    searchPosts: function(termo) {
        const posts = this.getPosts();
        const termoLower = termo.toLowerCase();
        return posts.filter(post => 
            post.titulo.toLowerCase().includes(termoLower) ||
            post.conteudo.toLowerCase().includes(termoLower) ||
            (post.hashtags && post.hashtags.some(tag => tag.toLowerCase().includes(termoLower)))
        );
    }
};