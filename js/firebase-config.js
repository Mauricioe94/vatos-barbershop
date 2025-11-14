// Configuración de Firebase
const firebaseConfig = {
    apiKey: "AIzaSyD89yZfOmWYVJphe08Fi3gz9tWlIsv6dE5o",
    authDomain: "vatos-barbershop.firebaseapp.com",
    projectId: "vatos-barbershop",
    storageBucket: "vatos-barbershop.firebasestorage.app",
    messagingSenderId: "358166347787",
    appId: "1:358166347787:web:32bd07ceddef274b12c79e"
};

// Inicializar Firebase
firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();

// Configuración de horarios - Último servicio a las 19:30
const businessHours = {
    start: 9,      // 9:00 AM
    end: 19,       // Hasta las 19:30 (19 en formato 24h + minutos)
    interval: 30   // minutos entre turnos
};

// Mapeo de precios de servicios - ACTUALIZADO
const servicePrices = {
    'Degradado Profesional': 9000,      // Antes: 10000
    'Colorometría': 45000,              // Sin cambios
    'Recorte de Barba': 3500,           // Antes: 7000  
    'Combo Full': 12000                 // Antes: 15000
};