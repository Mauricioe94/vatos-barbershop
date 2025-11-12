// Gestor de interfaz de usuario - VERSIÓN CORREGIDA
class UIManager {
    constructor() {
        this.init();
    }
    
    init() {
        this.setupTabNavigation();
        this.setupToastSystem();
        // Asegurar que solo el panel cliente esté visible al inicio
        this.switchTab('client');
    }
    
    setupTabNavigation() {
        document.getElementById('client-tab').addEventListener('click', () => this.switchTab('client'));
        document.getElementById('admin-tab').addEventListener('click', () => this.switchTab('admin'));
    }
    
    switchTab(tab) {
        const clientView = document.getElementById('client-view');
        const adminView = document.getElementById('admin-view');
        const clientTab = document.getElementById('client-tab');
        const adminTab = document.getElementById('admin-tab');
        
        // Remover todas las clases activas primero
        clientView.classList.remove('active');
        adminView.classList.remove('active');
        clientView.classList.add('hidden');
        adminView.classList.add('hidden');
        clientTab.classList.remove('active', 'border-yellow-400', 'text-yellow-400');
        adminTab.classList.remove('active', 'border-yellow-400', 'text-yellow-400');
        
        // Aplicar clases según la pestaña seleccionada
        if (tab === 'client') {
            clientView.classList.remove('hidden');
            clientView.classList.add('active');
            clientTab.classList.add('active', 'border-yellow-400', 'text-yellow-400');
            adminTab.classList.add('text-gray-400');
        } else {
            adminView.classList.remove('hidden');
            adminView.classList.add('active');
            adminTab.classList.add('active', 'border-yellow-400', 'text-yellow-400');
            clientTab.classList.add('text-gray-400');
            
            // Cargar datos del panel admin cuando se active
            appointmentManager.loadAppointments();
            loadBarberNotifications();
        }
    }
    
    setupToastSystem() {
        // El sistema de toast ya está definido en el CSS
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
        toast.classList.add('border-green-600');
    } else {
        toastIcon.className = 'fas fa-exclamation-circle text-red-400';
        toast.classList.add('border-red-600');
    }
    
    toastTitle.textContent = title;
    toastMessage.textContent = message;
    
    toast.classList.remove('hidden');
    
    setTimeout(() => {
        toast.classList.add('hidden');
        toast.classList.remove('border-green-600', 'border-red-600');
    }, 5000);
}

// Inicializar el gestor de UI
const uiManager = new UIManager();

// Inicializar sistema de recordatorios
const reminderSystem = new ReminderSystem();