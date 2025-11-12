// Gestor de interfaz de usuario
class UIManager {
    constructor() {
        this.init();
    }
    
    init() {
        this.setupTabNavigation();
        this.setupToastSystem();
        // Asegurar que solo el panel cliente esté visible al inicio
        this.showClientView();
    }
    
    setupTabNavigation() {
        document.getElementById('client-tab').addEventListener('click', () => this.showClientView());
        document.getElementById('admin-tab').addEventListener('click', () => this.showAdminLogin());
    }
    
    showClientView() {
        // Ocultar admin view y login
        document.getElementById('admin-view').classList.add('hidden');
        this.hideAdminLogin();
        
        // Mostrar client view
        document.getElementById('client-view').classList.remove('hidden');
        
        // Actualizar estado de pestañas
        document.getElementById('client-tab').classList.add('border-yellow-400', 'text-yellow-400');
        document.getElementById('client-tab').classList.remove('text-gray-400');
        document.getElementById('admin-tab').classList.remove('border-yellow-400', 'text-yellow-400');
        document.getElementById('admin-tab').classList.add('text-gray-400');
    }
    
    showAdminLogin() {
        // Mostrar modal de login
        document.getElementById('admin-login').classList.remove('hidden');
    }
    
    hideAdminLogin() {
        // Ocultar modal de login
        document.getElementById('admin-login').classList.add('hidden');
    }
    
    showAdminView() {
        // Ocultar client view y login
        document.getElementById('client-view').classList.add('hidden');
        this.hideAdminLogin();
        
        // Mostrar admin view
        document.getElementById('admin-view').classList.remove('hidden');
        
        // Actualizar estado de pestañas
        document.getElementById('admin-tab').classList.add('border-yellow-400', 'text-yellow-400');
        document.getElementById('admin-tab').classList.remove('text-gray-400');
        document.getElementById('client-tab').classList.remove('border-yellow-400', 'text-yellow-400');
        document.getElementById('client-tab').classList.add('text-gray-400');
        
        // Cargar datos del panel admin
        appointmentManager.loadAppointments();
        loadBarberNotifications();
    }
    
    setupToastSystem() {
        // El sistema de toast ya está definido
    }
}

// Verificar acceso admin
function verifyAdminAccess() {
    const inputCode = document.getElementById('admin-code').value;
    const ADMIN_ACCESS_CODE = "Barbero123$"; // Cambiar por código real
    
    if (inputCode === ADMIN_ACCESS_CODE) {
        // Código correcto - mostrar panel admin
        uiManager.showAdminView();
        
        // Limpiar campo
        document.getElementById('admin-code').value = '';
        
        showToast('success', 'Acceso concedido', 'Bienvenido al panel de barbero');
    } else {
        showToast('error', 'Acceso denegado', 'Código incorrecto');
        document.getElementById('admin-code').value = '';
        document.getElementById('admin-code').focus();
    }
}

// Función para mostrar notificaciones Toast
function showToast(type, title, message) {
    const toast = document.getElementById('toast');
    const toastIcon = document.getElementById('toast-icon');
    const toastTitle = document.getElementById('toast-title');
    const toastMessage = document.getElementById('toast-message');
    
    if (type === 'success') {
        toastIcon.className = 'fas fa-check-circle text-green-400';
    } else if (type === 'error') {
        toastIcon.className = 'fas fa-exclamation-circle text-red-400';
    } else {
        toastIcon.className = 'fas fa-info-circle text-blue-400';
    }
    
    toastTitle.textContent = title;
    toastMessage.textContent = message;
    
    toast.classList.remove('hidden');
    
    setTimeout(() => {
        toast.classList.add('hidden');
    }, 5000);
}

// Inicializar el gestor de UI
const uiManager = new UIManager();

// Inicializar sistema de recordatorios
const reminderSystem = new ReminderSystem();