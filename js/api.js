// ─────────────────────────────────────────────
//  CONFIGURACIÓN GLOBAL DE LA API
// ─────────────────────────────────────────────
export const API = 'http://localhost:3000';

// ─────────────────────────────────────────────
//  HELPERS DE localStorage  (flujo de agendado)
//  Se guardan 3 claves: 'paciente', 'servicio', 'slot'
// ─────────────────────────────────────────────
export const store = {
    get: (key)        => JSON.parse(localStorage.getItem(key)),
    set: (key, value) => localStorage.setItem(key, JSON.stringify(value)),
    clear: ()         => ['paciente', 'servicio', 'slot'].forEach(k => localStorage.removeItem(k))
};