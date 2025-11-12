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
        
        const appointment = {
            clientName: document.getElementById('clientName').value,
            service: document.getElementById('selectedService').value,
            price: document.getElementById('selectedPrice').value,
            date: document.getElementById('date').value,
            time: document.getElementById('time').value,
            payment: document.querySelector('input[name="payment"]:checked').value,
            status: 'pending',
            timestamp: new Date().toISOString(),
            barbershop: "Vatos BarbeShop",
            reminderSent: false
        };
        
        try {
            // 1. Guardar en la base de datos
            await db.collection('barber_appointments').add(appointment);
            
            // 2. Notificar al barbero
            await notifyBarber(appointment);
            
            // 3. Mostrar confirmación al usuario
            showToast('success', '¡Cita Reservada!', 
                `Te esperamos el ${appointment.date} a las ${appointment.time}. 
                 Recibirás un recordatorio 2 horas antes.`);
            
            // 4. Reiniciar formulario
            e.target.reset();
            document.querySelectorAll('.service-option').forEach(opt => {
                opt.classList.remove('selected');
            });
            document.getElementById('booking-summary').classList.add('hidden');
            document.getElementById('availability-indicator').classList.add('hidden');
            
            // 5. Solicitar permisos para recordatorios
            requestNotificationPermission();
            
        } catch (error) {
            showToast('error', 'Error', 'No se pudo reservar la cita: ' + error.message);
        }
    }
    
    async loadAppointments() {
        const list = document.getElementById('appointments-list');
        list.innerHTML = '<p class="text-center py-4">Cargando citas...</p>';
        
        try {
            let query = db.collection('barber_appointments')
                .where('barbershop', '==', 'Vatos BarbeShop');
            
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
                
                if (!filterDate || appointment.date === (filterDate || today)) {
                    this.renderAppointment(appointment, list);
                }
            });
            
            if (list.innerHTML === '') {
                list.innerHTML = '<p class="text-center py-4 text-gray-400">No hay citas con los filtros seleccionados</p>';
            }
            
            this.updateStats(appointments);
            this.updateRevenue(appointments);
            
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
            </div>
            <div class="appointment-actions">
                <button onclick="updateAppointmentStatus('${appointment.id}', 'confirmed')" class="action-button confirm">
                    <i class="fas fa-check"></i>Confirmar
                </button>
                <button onclick="updateAppointmentStatus('${appointment.id}', 'completed')" class="action-button complete">
                    <i class="fas fa-flag-checkered"></i>Completar
                </button>
                <button onclick="updateAppointmentStatus('${appointment.id}', 'cancelled')" class="action-button cancel">
                    <i class="fas fa-times"></i>Cancelar
                </button>
            </div>
        `;
        container.appendChild(div);
    }
}

// Actualizar estado de cita
async function updateAppointmentStatus(appointmentId, newStatus) {
    try {
        await db.collection('barber_appointments').doc(appointmentId).update({
            status: newStatus
        });
        
        showToast('success', 'Estado Actualizado', `Cita marcada como ${newStatus}`);
        appointmentManager.loadAppointments();
    } catch (error) {
        showToast('error', 'Error', 'No se pudo actualizar el estado: ' + error.message);
    }
}

// Inicializar el gestor de citas
const appointmentManager = new AppointmentManager();