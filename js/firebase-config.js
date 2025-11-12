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

// Configuración de horarios
const businessHours = {
    start: 9,    // 9:00 AM
    end: 18,     // 6:00 PM
    interval: 30 // minutos entre turnos
};

// Mapeo de precios de servicios
const servicePrices = {
    'Degradado Profesional': 10000,
    'Colorometría': 45000,
    'Recorte de Barba': 7000,
    'Combo Full': 15000
};