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
        if (!appointment.clientWhatsApp) {
            console.warn('⚠️ No hay WhatsApp para enviar recordatorio a:', appointment.clientName);
            return;
        }
        
        const message = this.formatReminderMessage(appointment);
        
        // En un sistema real, aquí integrarías con la API de WhatsApp
        console.log('📲 Recordatorio WhatsApp para:', appointment.clientName);
        console.log('📱 Número:', appointment.clientWhatsApp);
        console.log('💬 Mensaje:', message);
        
        // Simular envío (en producción conectar con API de WhatsApp)
        this.simulateWhatsAppSend(appointment.clientWhatsApp, message);
        
        // Mostrar notificación en navegador también
        this.showBrowserNotification(appointment);
    }
    
    formatReminderMessage(appointment) {
        return `🪒 *Vatos Barber Shop - Recordatorio*

Hola ${appointment.clientName}! 

Te recordamos que tenés una cita con nosotros:

📅 *Fecha:* ${appointment.date}
⏰ *Hora:* ${appointment.time} hs
✂️ *Servicio:* ${appointment.service}
💰 *Precio:* $${parseInt(appointment.price).toLocaleString()}

📍 *Dirección:* Quinquela Martin 714
📞 *Teléfono:* 11 5424-3540

*Importante:*
- Llegá 5 minutos antes
- Recordá que podés cancelar o reagendar con 1 hora de anticipación

¡Te esperamos! ✨`;
    }
    
    simulateWhatsAppSend(phone, message) {
        // En desarrollo: mostrar mensaje en consola
        // En producción: integrar con API de WhatsApp Business
        console.log('🚀 SIMULACIÓN ENVÍO WHATSAPP:');
        console.log('👉 A:', phone);
        console.log('📝 Mensaje:', message);
        
        // Opcional: crear enlace de WhatsApp (solo para testing)
        if (window.innerWidth > 768) {
            const whatsappUrl = `https://web.whatsapp.com/send?phone=${phone}&text=${encodeURIComponent(message)}`;
            console.log('🔗 Enlace WhatsApp Web:', whatsappUrl);
        }
    }
    
    showBrowserNotification(appointment) {
        if ("Notification" in window && Notification.permission === "granted") {
            new Notification("Vatos Barber Shop - Recordatorio", {
                body: `Recordatorio: ${appointment.clientName} - ${appointment.date} ${appointment.time}`,
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

// Configuración del barbero - DATOS REALES
const BARBER_CONFIG = {
    whatsapp: "+5491154243540", // NÚMERO REAL DEL BARBERO
    name: "Vatos Barber Shop"
};

// Notificación al barbero
async function notifyBarber(appointment) {
    try {
        // 1. Guardar notificación en Firebase
        await db.collection('barber_notifications').add({
            type: 'new_booking',
            appointment: appointment,
            barbershop: 'Vatos Barber Shop',
            timestamp: new Date().toISOString(),
            read: false
        });
        
        // 2. Enviar WhatsApp al barbero
        await sendBarberWhatsApp(appointment);
        
        console.log('🔔 Notificación enviada al barbero');
    } catch (error) {
        console.error('Error notificando al barbero:', error);
    }
}

// Enviar WhatsApp al barbero
async function sendBarberWhatsApp(appointment) {
    const message = formatBarberMessage(appointment);
    
    console.log('📱 NOTIFICACIÓN BARBERO:');
    console.log('👉 Mensaje:', message);
    
    // En desarrollo: mostrar en consola
    // En producción: integrar con API de WhatsApp
    showToast('info', 'Nueva Reserva', 
        `Cliente: ${appointment.clientName}\nServicio: ${appointment.service}\nFecha: ${appointment.date} ${appointment.time}`);
    
    // Crear enlace de WhatsApp para testing
    if (window.innerWidth > 768) {
        const whatsappUrl = generateWhatsAppUrl(BARBER_CONFIG.whatsapp, message);
        console.log('🔗 Enlace WhatsApp Barbero:', whatsappUrl);
        
        // Opcional: abrir automáticamente (solo en desarrollo)
        // window.open(whatsappUrl, '_blank');
    }
}

function formatBarberMessage(appointment) {
    return `🪒 *NUEVA RESERVA - Vatos Barber Shop*

👤 *Cliente:* ${appointment.clientName}
📞 *WhatsApp:* ${appointment.clientWhatsAppDisplay || appointment.clientWhatsApp}
✂️ *Servicio:* ${appointment.service}
💰 *Precio:* $${parseInt(appointment.price).toLocaleString()}
📅 *Fecha:* ${appointment.date}
⏰ *Hora:* ${appointment.time}
💳 *Pago:* ${appointment.payment}

📍 *Dirección:* Quinquela Martin 714
📞 *Teléfono:* 11 5424-3540

_Reserva realizada: ${new Date().toLocaleString('es-AR')}_`;
}

function generateWhatsAppUrl(phone, message) {
    const encodedMessage = encodeURIComponent(message);
    const cleanPhone = phone.replace(/\D/g, '');
    return `https://web.whatsapp.com/send?phone=${cleanPhone}&text=${encodedMessage}`;
}

// Cargar notificaciones del barbero
async function loadBarberNotifications() {
    try {
        const snapshot = await db.collection('barber_notifications')
            .where('barbershop', '==', 'Vatos Barber Shop')
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
                <p class="text-sm text-yellow-400 mt-1">
                    <i class="fab fa-whatsapp"></i> ${notification.appointment.clientWhatsAppDisplay || 'Sin WhatsApp'}
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