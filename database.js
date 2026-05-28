// ============================================
// PENSAMENTO ABERTO - DATABASE
// Usuários: adminniriswest, anonimo, convidado
// ============================================

const DB = {
    KEYS: {
        USERS: 'pa_users',
        POSTS: 'pa_posts',
        CURRENT_USER: 'pa_current_user',
        DMS: 'pa_dms',
        NOTIFICATIONS: 'pa_notifications'
    },

    getUsers: function() {
        const data = localStorage.getItem(this.KEYS.USERS);
        if (data) return JSON.parse(data);
        
        // USUÁRIOS FIXOS
        const initialUsers = [
            {
                id: 1,
                username: "adminniriswest",
                password: "123",
                name: "Niris West",
                bio: "Criadora do Pensamento Aberto. Jornalista, escritora e apaixonada por educação crítica.",
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
                bio: "Explorando o Pensamento Aberto. Quem sabe um dia crio minha conta?",
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
                titulo: "A educação que queremos",
                conteudo: "Depois de muito pensar, cheguei à conclusão: a escola não precisa de mais tecnologia. Precisa de mais humanidade. O que vocês acham?",
                emoji: "📰",
                audioData: null,
                data: new Date().toISOString(),
                curtidas: [2, 3],
                comentarios: [
                    { userId: 2, username: "Anônimo", texto: "Concordo totalmente! Tecnologia sem propósito não resolve nada.", data: new Date().toISOString() }
                ]
            },
            {
                id: Date.now() + 1,
                userId: 2,
                tipo: "pensamento",
                titulo: "O poder do questionamento",
                conteudo: "A escola me ensinou a responder, não a perguntar. Só que as perguntas certas valem mais que qualquer resposta decorada.",
                emoji: "💭",
                audioData: null,
                data: new Date(Date.now() - 86400000).toISOString(),
                curtidas: [1],
                comentarios: []
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

    deletePost: function(postId) {
        let posts = this.getPosts();
        posts = posts.filter(p => p.id !== postId);
        this.savePosts(posts);
        return true;
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
        return user && user.role === 'admin';
    }
};