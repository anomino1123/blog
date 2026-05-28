// ============================================
// REPÓRTER DA PERIFERIA - NOTIFICAÇÕES
// ============================================

const Notifications = {
    create: function(userId, type, message, relatedId = null) {
        const notifications = DB.getNotifications();
        
        const newNotification = {
            id: Date.now(),
            userId: userId,
            type: type,
            message: message,
            relatedId: relatedId,
            read: false,
            createdAt: new Date().toISOString()
        };
        
        notifications.push(newNotification);
        DB.saveNotifications(notifications);
        
        const currentUser = DB.getCurrentUser();
        if (currentUser && currentUser.id === userId) {
            this.updateBadge();
            this.renderList();
        }
        
        this.showPushNotification(message);
        return newNotification;
    },
    
    markAsRead: function(notificationId) {
        const notifications = DB.getNotifications();
        const index = notifications.findIndex(n => n.id === notificationId);
        if (index !== -1) {
            notifications[index].read = true;
            DB.saveNotifications(notifications);
            this.updateBadge();
            this.renderList();
        }
    },
    
    markAllAsRead: function() {
        const currentUser = DB.getCurrentUser();
        if (!currentUser) return;
        const notifications = DB.getNotifications();
        notifications.forEach(n => { if (n.userId === currentUser.id) n.read = true; });
        DB.saveNotifications(notifications);
        this.updateBadge();
        this.renderList();
    },
    
    getUserNotifications: function() {
        const currentUser = DB.getCurrentUser();
        if (!currentUser) return [];
        const notifications = DB.getNotifications();
        return notifications.filter(n => n.userId === currentUser.id).sort((a, b) => b.id - a.id);
    },
    
    getUnreadCount: function() {
        const currentUser = DB.getCurrentUser();
        if (!currentUser) return 0;
        const notifications = DB.getNotifications();
        return notifications.filter(n => n.userId === currentUser.id && !n.read).length;
    },
    
    updateBadge: function() {
        const count = this.getUnreadCount();
        const badge = document.getElementById('notificationBadge');
        const countSpan = document.getElementById('notificationCount');
        
        if (badge && countSpan) {
            if (count > 0) {
                countSpan.textContent = count > 99 ? '99+' : count;
                badge.style.display = 'flex';
            } else {
                badge.style.display = 'none';
            }
        }
        
        document.title = count > 0 ? `(${count}) Repórter da Periferia` : 'Repórter da Periferia';
    },
    
    showPushNotification: function(message) {
        if ('Notification' in window && Notification.permission === 'granted') {
            new Notification('Repórter da Periferia', {
                body: message,
                icon: 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="%23e85d04"%3E%3Cpath d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2z"%3E%3C/path%3E%3C/svg%3E',
                silent: false
            });
        }
    },
    
    requestPermission: function() {
        if ('Notification' in window && Notification.permission === 'default') {
            Notification.requestPermission();
        }
    },
    
    renderList: function() {
        const container = document.getElementById('notificationsList');
        if (!container) return;
        
        const notifications = this.getUserNotifications();
        
        if (notifications.length === 0) {
            container.innerHTML = '<p class="placeholder">Sem notificações</p>';
            return;
        }
        
        container.innerHTML = notifications.slice(0, 10).map(notif => {
            const timeAgo = this.getTimeAgo(notif.createdAt);
            const icon = this.getIconForType(notif.type);
            
            return `
                <div class="notification-item" data-id="${notif.id}" style="${notif.read ? 'opacity: 0.7;' : 'border-left: 3px solid var(--accent);'}">
                    <div class="notification-icon">${icon}</div>
                    <div class="notification-text">
                        ${notif.message}
                        <div class="notification-time">${timeAgo}</div>
                    </div>
                </div>
            `;
        }).join('');
        
        document.querySelectorAll('.notification-item').forEach(item => {
            item.addEventListener('click', () => {
                const id = parseInt(item.dataset.id);
                this.markAsRead(id);
            });
        });
    },
    
    getIconForType: function(type) {
        const icons = { 'like': '❤️', 'comment': '💬', 'follow': '👤', 'dm': '✉️' };
        return icons[type] || '🔔';
    },
    
    getTimeAgo: function(dateString) {
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
};

if (typeof window !== 'undefined') {
    document.addEventListener('DOMContentLoaded', () => {
        Notifications.requestPermission();
    });
}