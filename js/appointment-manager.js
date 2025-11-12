// Gestor de citas
class AppointmentManager {
    constructor() {
        this.init();
    }
    
    init() {
        this.generateTimeSlots();
        this.setupEventListeners();
        this.setMinDates();
    }
    
    generateTimeSlots() {
        const timeSelect = document.getElementById('time');
        timeSelect.innerHTML = '<option value="">Selecciona hora</option>';
        
        for (let hour = businessHours.start; hour < businessHours.end; hour++) {
            for (let minute = 0; minute < 60; minute += businessHours.interval) {
                const timeString = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
                const option = document.createElement('option');
                option.value = timeString;
                option.textContent = timeString;
                timeSelect.appendChild(option);
            }
        }
    }
    
    setupEventListeners() {
        // Servicios
        document.querySelectorAll('.service-option').forEach(option => {
            option.addEventListener('click', (e) => this.handleServiceSelection(e));
        });
        
        // Verificar disponibilidad
        document.getElementById('date').addEventListener('change', () => this.checkAvailability());
        document.getElementById('time').addEventListener('change', () => this.checkAvailability());
        
        // Formulario de reserva
        document.getElementById('booking-form').addEventListener('submit', (e) => this.handleBooking(e));
        
        // Filtros del panel
        document.getElementById('filter-date').addEventListener('change', () => this.loadAppointments());
        document.getElementById('filter-status').addEventListener('change', () => this.loadAppointments());
    }
    
    setMinDates() {
        const today = new Date().toISOString().split('T')[0];
        document.getElementById('date').min = today;
        document.getElementById('filter-date').value = today;
    }
    
    handleServiceSelection(e) {
        const option = e.currentTarget;
        document.querySelectorAll('.service-option').forEach(opt => {
            opt.classList.remove('selected');
        });
        option.classList.add('selected');
        document.getElementById('selectedService').value = option.getAttribute('data-service');
        document.getElementById('selectedPrice').value = option.getAttribute('data-price');
        this.updateBookingSummary();
    }
    
    // NUEVA FUNCIÓN: Validar WhatsApp Argentina
    validateArgentineWhatsApp(phone) {
        // Limpiar el número (quitar espacios, guiones)
        const cleanPhone = phone.replace(/\s|-/g, '');
        
        // Validar formato argentino: 11 1234-5678 o 112345678 (8-10 dígitos)
        const whatsappRegex = /^(11|15|2\d|3\d|4\d|5\d|6\d|7\d|8\d|9\d)\d{6,8}$/;
        
        if (!whatsappRegex.test(cleanPhone)) {
            return {
                isValid: false,
                message: 'Formato inválido. Usá: 11 1234-5678'
            };
        }
        
        // Formatear número para guardar (11 1234-5678 -> 5491112345678)
        const formattedPhone = `549${cleanPhone}`;
        
        return {
            isValid: true,
            cleanNumber: formattedPhone,
            displayNumber: this.formatPhoneDisplay(cleanPhone)
        };
    }
    
    // NUEVA FUNCIÓN: Formatear número para mostrar
    formatPhoneDisplay(phone) {
        const cleanPhone = phone.replace(/\D/g, '');
        
        if (cleanPhone.length === 8) {
            // Formato: 1234-5678 -> 11 1234-5678
            return `11 ${cleanPhone.substring(0, 4)}-${cleanPhone.substring(4)}`;
        } else if (cleanPhone.length === 10) {
            // Formato: 1123456789 -> 11 2345-6789
            return `${cleanPhone.substring(0, 2)} ${cleanPhone.substring(2, 6)}-${cleanPhone.substring(6)}`;
        }
        
        return cleanPhone;
    }
    
    async checkAvailability() {
        const date = document.getElementById('date').value;
        const time = document.getElementById('time').value;
        const indicator = document.getElementById('availability-indicator');
        
        if (!date || !time) {
            indicator.classList.add('hidden');
            return;
        }
        
        try {
            const snapshot = await db.collection('barber_appointments')
                .where('barbershop', '==', 'Vatos BarbeShop')
                .where('date', '==', date)
                .where('time', '==', time)
                .get();
            
            if (snapshot.empty) {
                indicator.classList.remove('hidden');
                indicator.classList.remove('unavailable');
                indicator.classList.add('available');
                document.getElementById('availability-message').textContent = '✅ Horario disponible';
            } else {
                indicator.classList.remove('hidden');
                indicator.classList.remove('available');
                indicator.classList.add('unavailable');
                document.getElementById('availability-message').textContent = '❌ Horario ocupado, elige otro';
            }
        } catch (error) {
            console.error('Error verificando disponibilidad:', error);
        }
    }
    
    updateBookingSummary() {
        const service = document.getElementById('selectedService').value;
        const price = document.getElementById('selectedPrice').value;
        const date = document.getElementById('date').value;
        const time = document.getElementById('time').value;
        const summary = document.getElementById('booking-summary');
        
        if (service && date && time) {
            summary.classList.remove('hidden');
            document.getElementById('summary-service').textContent = service;
            document.getElementById('summary-price').textContent = `$${parseInt(price).toLocaleString()}`;
            document.getElementById('summary-datetime').textContent = `${date} a las ${time}`;
            document.getElementById('summary-total').textContent = `$${parseInt(price).toLocaleString()}`;
        } else {
            summary.classList.add('hidden');
        }
    }
    
    async handleBooking(e) {
        e.preventDefault();
        
        // Validar WhatsApp ANTES de proceder
        const whatsappInput = document.getElementById('clientWhatsApp').value;
        const validation = this.validateArgentineWhatsApp(whatsappInput);
        
        if (!validation.isValid) {
            showToast('error', 'WhatsApp Inválido', validation.message);
            return;
        }
        
        const appointment = {
            clientName: document.getElementById('clientName').value,
            clientWhatsApp: validation.cleanNumber, // Número formateado internacional
            clientWhatsAppDisplay: validation.displayNumber, // Para mostrar en UI
            service: document.getElementById('selectedService').value,
            price: document.getElementById('selectedPrice').value,
            date: document.getElementById('date').value,
            time: document.getElementById('time').value,
            payment: document.querySelector('input[name="payment"]:checked').value,
            status: 'pending',
            timestamp: new Date().toISOString(),
            barbershop: "Vatos BarbeShop",
            reminderSent: false,
            archived: false // 🆕 NUEVO CAMPO: Para controlar visibilidad
        };
        
        try {
            // 1. Guardar en la base de datos
            await db.collection('barber_appointments').add(appointment);
            
            // 2. Notificar al barbero
            await notifyBarber(appointment);
            
            // 3. Mostrar confirmación al usuario
            showToast('success', '¡Cita Reservada!', 
                `Te esperamos el ${appointment.date} a las ${appointment.time}. 
                 Te enviaremos un recordatorio por WhatsApp.`);
            
            // 4. Reiniciar formulario
            e.target.reset();
            document.querySelectorAll('.service-option').forEach(opt => {
                opt.classList.remove('selected');
            });
            document.getElementById('booking-summary').classList.add('hidden');
            document.getElementById('availability-indicator').classList.add('hidden');
            
        } catch (error) {
            showToast('error', 'Error', 'No se pudo reservar la cita: ' + error.message);
        }
    }
    
    // 🆕 NUEVA FUNCIÓN: Ordenar citas - más recientes primero
    ordenarCitasRecientesPrimero(citas) {
        return citas.sort((a, b) => {
            // Crear objetos Date combinando fecha + hora
            const fechaHoraA = new Date(`${a.date} ${a.time}`);
            const fechaHoraB = new Date(`${b.date} ${b.time}`);
            
            // Orden DESCENDENTE (más reciente primero)
            return fechaHoraB - fechaHoraA;
        });
    }

    // 🆕 NUEVA FUNCIÓN: Enviar WhatsApp de confirmación al cliente
    async enviarWhatsAppConfirmacion(appointment) {
        try {
            const mensaje = `✅ *Confirmación de Cita - Vatos BarbeShop*

Hola ${appointment.clientName}! 

Te confirmamos tu cita para:
📅 *Fecha:* ${appointment.date}
⏰ *Hora:* ${appointment.time}
✂️ *Servicio:* ${appointment.service}

¡Te esperamos en Vatos BarbeShop! 
Por favor llegá puntual.

*Saludos cordiales,* 
*El equipo Vatos BarbeShop*`;

            // Usar tu función existente de WhatsApp o implementar una nueva
            await this.enviarMensajeWhatsApp(appointment.clientWhatsApp, mensaje);
            
            return true;
        } catch (error) {
            console.error('Error enviando WhatsApp de confirmación:', error);
            return false;
        }
    }

    // 🆕 NUEVA FUNCIÓN: Enviar mensaje WhatsApp (puedes adaptarla a tu sistema)
    async enviarMensajeWhatsApp(numero, mensaje) {
        // Aquí integras con tu API de WhatsApp (Twilio, WhatsApp Business API, etc.)
        const urlWhatsApp = `https://api.whatsapp.com/send?phone=${numero}&text=${encodeURIComponent(mensaje)}`;
        
        // Opción 1: Abrir en nueva pestaña
        window.open(urlWhatsApp, '_blank');
        
        // Opción 2: Si tienes API backend para enviar automáticamente
        /*
        const response = await fetch('/api/send-whatsapp', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ to: numero, message: mensaje })
        });
        return await response.json();
        */
    }

    // 🆕 NUEVA FUNCIÓN: Archivar cita (eliminar de vista pero mantener en BD)
    async archivarCita(appointmentId) {
        try {
            await db.collection('barber_appointments').doc(appointmentId).update({
                archived: true,
                archivedAt: new Date().toISOString()
            });
            return true;
        } catch (error) {
            console.error('Error archivando cita:', error);
            return false;
        }
    }
    
    async loadAppointments() {
        const list = document.getElementById('appointments-list');
        list.innerHTML = '<p class="text-center py-4">Cargando citas...</p>';
        
        try {
            let query = db.collection('barber_appointments')
                .where('barbershop', '==', 'Vatos BarbeShop')
                .where('archived', '==', false); // 🆕 SOLO CITAS NO ARCHIVADAS
            
            const filterDate = document.getElementById('filter-date').value;
            const filterStatus = document.getElementById('filter-status').value;
            
            if (filterDate) {
                query = query.where('date', '==', filterDate);
            }
            
            if (filterStatus) {
                query = query.where('status', '==', filterStatus);
            }
            
            const snapshot = await query.get();
            
            if (snapshot.empty) {
                list.innerHTML = '<p class="text-center py-4 text-gray-400">No hay citas con los filtros seleccionados</p>';
                this.updateStats([]);
                this.updateRevenue([]);
                return;
            }
            
            list.innerHTML = '';
            const appointments = [];
            const today = new Date().toISOString().split('T')[0];
            
            snapshot.forEach(doc => {
                const appointment = doc.data();
                appointment.id = doc.id;
                appointments.push(appointment);
            });
            
            // 🎯 MEJORA APLICADA AQUÍ: Ordenar citas antes de mostrar
            const citasOrdenadas = this.ordenarCitasRecientesPrimero(appointments);
            
            // Ahora renderizar las citas ordenadas
            citasOrdenadas.forEach(appointment => {
                if (!filterDate || appointment.date === (filterDate || today)) {
                    this.renderAppointment(appointment, list);
                }
            });
            
            if (list.innerHTML === '') {
                list.innerHTML = '<p class="text-center py-4 text-gray-400">No hay citas con los filtros seleccionados</p>';
            }
            
            this.updateStats(citasOrdenadas);
            this.updateRevenue(citasOrdenadas);
            
        } catch (error) {
            list.innerHTML = '<p class="text-center py-4 text-red-400">Error cargando citas</p>';
            console.error(error);
        }
    }
    
    updateStats(appointments) {
        const today = new Date().toISOString().split('T')[0];
        const filterDate = document.getElementById('filter-date').value || today;
        
        const stats = {
            today: 0,
            confirmed: 0,
            completed: 0,
            cancelled: 0
        };
        
        appointments.forEach(appt => {
            if (appt.date === filterDate) stats.today++;
            if (appt.status === 'confirmed') stats.confirmed++;
            if (appt.status === 'completed') stats.completed++;
            if (appt.status === 'cancelled') stats.cancelled++;
        });
        
        document.getElementById('today-count').textContent = stats.today;
        document.getElementById('confirmed-count').textContent = stats.confirmed;
        document.getElementById('completed-count').textContent = stats.completed;
        document.getElementById('cancelled-count').textContent = stats.cancelled;
    }
    
    updateRevenue(appointments) {
        const today = new Date().toISOString().split('T')[0];
        const filterDate = document.getElementById('filter-date').value || today;
        
        let totalRevenue = 0;
        const serviceCount = {};
        
        appointments.forEach(appt => {
            if (appt.date === filterDate && appt.status === 'completed' && appt.price) {
                totalRevenue += parseInt(appt.price);
                
                if (appt.service) {
                    serviceCount[appt.service] = (serviceCount[appt.service] || 0) + 1;
                }
            }
        });
        
        document.getElementById('daily-revenue').textContent = `$${totalRevenue.toLocaleString()}`;
        
        const breakdown = Object.entries(serviceCount)
            .map(([service, count]) => `${service}: ${count}`)
            .join(' • ');
        
        document.getElementById('revenue-breakdown').textContent = 
            breakdown || 'No hay servicios completados hoy';
    }
    
    renderAppointment(appointment, container) {
        const statusColors = {
            'pending': 'pending',
            'confirmed': 'confirmed',
            'completed': 'completed',
            'cancelled': 'cancelled'
        };
        
        const statusIcons = {
            'pending': '⏳',
            'confirmed': '✅',
            'completed': '🎯',
            'cancelled': '❌'
        };
        
        const div = document.createElement('div');
        div.className = 'appointment-card';
        div.innerHTML = `
            <div class="appointment-header">
                <h4 class="appointment-client">${appointment.clientName}</h4>
                <span class="appointment-status ${statusColors[appointment.status]}">
                    ${statusIcons[appointment.status]} ${appointment.status}
                </span>
            </div>
            <div class="appointment-details">
                <p class="appointment-detail">
                    <i class="fas fa-cut"></i>${appointment.service} - $${parseInt(appointment.price || 0).toLocaleString()}
                </p>
                <p class="appointment-detail">
                    <i class="fas fa-clock"></i>${appointment.date} a las ${appointment.time}
                </p>
                <p class="appointment-detail">
                    <i class="fas fa-money-bill"></i>${appointment.payment}
                </p>
                <p class="appointment-detail">
                    <i class="fab fa-whatsapp"></i>${appointment.clientWhatsAppDisplay || 'N/A'}
                </p>
            </div>
            <div class="appointment-actions">
                <button onclick="appointmentManager.confirmarCita('${appointment.id}')" class="action-button confirm">
                    <i class="fas fa-check"></i>Confirmar
                </button>
                <button onclick="appointmentManager.completarCita('${appointment.id}')" class="action-button complete">
                    <i class="fas fa-flag-checkered"></i>Completar
                </button>
                <button onclick="appointmentManager.cancelarCita('${appointment.id}')" class="action-button cancel">
                    <i class="fas fa-times"></i>Cancelar
                </button>
            </div>
        `;
        container.appendChild(div);
    }

    // 🆕 NUEVA FUNCIÓN: Confirmar cita + enviar WhatsApp
    async confirmarCita(appointmentId) {
        try {
            // 1. Obtener datos de la cita
            const doc = await db.collection('barber_appointments').doc(appointmentId).get();
            const appointment = doc.data();
            
            // 2. Actualizar estado a "confirmed"
            await db.collection('barber_appointments').doc(appointmentId).update({
                status: 'confirmed',
                confirmedAt: new Date().toISOString()
            });
            
            // 3. Enviar WhatsApp de confirmación
            const whatsappEnviado = await this.enviarWhatsAppConfirmacion(appointment);
            
            // 4. Mostrar mensaje de éxito
            if (whatsappEnviado) {
                showToast('success', 'Cita Confirmada', '✅ Estado actualizado y WhatsApp enviado al cliente');
            } else {
                showToast('success', 'Cita Confirmada', '✅ Estado actualizado (Error enviando WhatsApp)');
            }
            
            // 5. Recargar la lista
            this.loadAppointments();
            
        } catch (error) {
            showToast('error', 'Error', 'No se pudo confirmar la cita: ' + error.message);
        }
    }

    // 🆕 NUEVA FUNCIÓN: Completar cita + archivar
    async completarCita(appointmentId) {
        try {
            // 1. Actualizar estado a "completed"
            await db.collection('barber_appointments').doc(appointmentId).update({
                status: 'completed',
                completedAt: new Date().toISOString()
            });
            
            // 2. Archivar automáticamente después de 5 segundos (para que vea la confirmación)
            setTimeout(async () => {
                await this.archivarCita(appointmentId);
                this.loadAppointments();
            }, 5000);
            
            showToast('success', 'Servicio Completado', '✅ Cita marcada como completada y se archivará automáticamente');
            
            // 3. Recargar lista inmediatamente
            this.loadAppointments();
            
        } catch (error) {
            showToast('error', 'Error', 'No se pudo completar la cita: ' + error.message);
        }
    }

    // 🆕 NUEVA FUNCIÓN: Cancelar cita + archivar
    async cancelarCita(appointmentId) {
        if (!confirm('¿Estás seguro de que querés cancelar esta cita?')) {
            return;
        }
        
        try {
            // 1. Actualizar estado a "cancelled"
            await db.collection('barber_appointments').doc(appointmentId).update({
                status: 'cancelled',
                cancelledAt: new Date().toISOString()
            });
            
            // 2. Archivar automáticamente
            await this.archivarCita(appointmentId);
            
            showToast('success', 'Cita Cancelada', '❌ Cita cancelada y archivada');
            
            // 3. Recargar lista
            this.loadAppointments();
            
        } catch (error) {
            showToast('error', 'Error', 'No se pudo cancelar la cita: ' + error.message);
        }
    }
}

// Función global para mantener compatibilidad (opcional)
async function updateAppointmentStatus(appointmentId, newStatus) {
    // Redirigir a las nuevas funciones específicas
    switch(newStatus) {
        case 'confirmed':
            appointmentManager.confirmarCita(appointmentId);
            break;
        case 'completed':
            appointmentManager.completarCita(appointmentId);
            break;
        case 'cancelled':
            appointmentManager.cancelarCita(appointmentId);
            break;
        default:
            showToast('error', 'Error', 'Estado no reconocido');
    }
}

// Inicializar el gestor de citas
const appointmentManager = new AppointmentManager();