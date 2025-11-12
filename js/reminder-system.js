// Sistema de recordatorios
class ReminderSystem {
    constructor() {
        this.checkReminders();
        // Verificar cada hora
        setInterval(() => this.checkReminders(), 60 * 60 * 1000);
    }
    
    async checkReminders() {
        const now = new Date();
        const twoHoursFromNow = new Date(now.getTime() + 2 * 60 * 60 * 1000);
        
        try {
            const appointments = await db.collection('barber_appointments')
                .where('date', '==', twoHoursFromNow.toISOString().split('T')[0])
                .where('time', '==', this.formatTime(twoHoursFromNow))
                .where('status', 'in', ['pending', 'confirmed'])
                .where('reminderSent', '==', false)
                .get();
            
            for (const doc of appointments.docs) {
                const appointment = doc.data();
                await this.sendReminder(appointment);
                await doc.ref.update({ reminderSent: true });
            }
        } catch (error) {
            console.error('Error en recordatorios:', error);
        }
    }
    
    formatTime(date) {
        return date.toTimeString().slice(0, 5);
    }
    
    async sendReminder(appointment) {
        // En un sistema real, aquí integrarías con WhatsApp/Email
        const message = `⏰ RECORDATORIO: Tu cita en Vatos BarbeShop es en 2 horas (${appointment.time})`;
        console.log('📲 Recordatorio enviado:', message);
        
        // Mostrar notificación al usuario si está en la página
        this.showBrowserNotification(appointment);
    }
    
    showBrowserNotification(appointment) {
        if ("Notification" in window && Notification.permission === "granted") {
            new Notification("Vatos BarbeShop - Recordatorio", {
                body: `Tu cita es a las ${appointment.time}`,
                icon: "/icon.png"
            });
        }
    }
}

// Solicitar permisos para notificaciones
function requestNotificationPermission() {
    if ("Notification" in window && Notification.permission === "default") {
        Notification.requestPermission();
    }
}

// Notificación al barbero
async function notifyBarber(appointment) {
    try {
        await db.collection('barber_notifications').add({
            type: 'new_booking',
            appointment: appointment,
            barbershop: 'Vatos BarbeShop',
            timestamp: new Date().toISOString(),
            read: false
        });
        console.log('🔔 Notificación enviada al barbero');
    } catch (error) {
        console.error('Error notificando al barbero:', error);
    }
}

// Cargar notificaciones del barbero
async function loadBarberNotifications() {
    try {
        const snapshot = await db.collection('barber_notifications')
            .where('barbershop', '==', 'Vatos BarbeShop')
            .orderBy('timestamp', 'desc')
            .limit(10)
            .get();
        
        const container = document.getElementById('notifications-list');
        
        if (snapshot.empty) {
            container.innerHTML = '<p class="text-gray-400">No hay notificaciones recientes</p>';
            return;
        }
        
        container.innerHTML = '';
        snapshot.forEach(doc => {
            const notification = doc.data();
            const notificationElement = createNotificationElement(notification, doc.id);
            container.appendChild(notificationElement);
        });
    } catch (error) {
        console.error('Error cargando notificaciones:', error);
    }
}

// Crear elemento de notificación
function createNotificationElement(notification, id) {
    const div = document.createElement('div');
    div.className = 'bg-gray-600 p-3 rounded-lg mb-2';
    div.innerHTML = `
        <div class="flex justify-between items-center">
            <div>
                <p class="font-bold">📅 Nueva reserva de ${notification.appointment.clientName}</p>
                <p class="text-sm text-gray-300">
                    ${notification.appointment.service} - ${notification.appointment.date} ${notification.appointment.time}
                </p>
            </div>
            <button onclick="markNotificationRead('${id}')" class="text-gray-400 hover:text-white">
                <i class="fas fa-times"></i>
            </button>
        </div>
    `;
    return div;
}

// Marcar notificación como leída
async function markNotificationRead(notificationId) {
    try {
        await db.collection('barber_notifications').doc(notificationId).delete();
        loadBarberNotifications();
    } catch (error) {
        console.error('Error marcando notificación:', error);
    }
}