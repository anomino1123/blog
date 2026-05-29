// ============================================
// REPÓRTER DA PERIFERIA - AUTENTICAÇÃO
// Versão 4.0
// ============================================

const Auth = {
    login: function(username, password) {
        const users = DB.getUsers();
        const user = users.find(u => u.username === username && u.password === password);
        
        if (user) {
            DB.setCurrentUser(user);
            return { success: true, user: user };
        }
        return { success: false, error: 'Usuário ou senha inválidos' };
    },
    
    register: function(username, password, name) {
        const users = DB.getUsers();
        
        if (users.find(u => u.username === username)) {
            return { success: false, error: 'Nome de usuário já existe' };
        }
        
        if (password.length < 3) {
            return { success: false, error: 'Senha deve ter pelo menos 3 caracteres' };
        }
        
        const newUser = {
            id: Date.now(),
            username: username,
            password: password,
            name: name || username,
            bio: "Novo por aqui. Vamos trocar ideias?",
            avatar: null,
            emoji: "📝",
            isVerified: false,
            followers: [],
            following: [],
            role: "user",
            createdAt: new Date().toISOString()
        };
        
        users.push(newUser);
        DB.saveUsers(users);
        DB.setCurrentUser(newUser);
        return { success: true, user: newUser };
    },
    
    logout: function() {
        DB.setCurrentUser(null);
        window.location.href = 'login.html';
    },
    
    isLoggedIn: function() {
        return DB.getCurrentUser() !== null;
    },
    
    updateProfile: function(userId, updates) {
        const users = DB.getUsers();
        const index = users.findIndex(u => u.id === userId);
        
        if (index !== -1) {
            users[index] = { ...users[index], ...updates };
            DB.saveUsers(users);
            
            const currentUser = DB.getCurrentUser();
            if (currentUser && currentUser.id === userId) {
                DB.setCurrentUser(users[index]);
            }
            return true;
        }
        return false;
    },
    
    isAdmin: function() {
        const currentUser = DB.getCurrentUser();
        return currentUser && (currentUser.role === 'admin' || currentUser.username === 'adminniriswest');
    }
};