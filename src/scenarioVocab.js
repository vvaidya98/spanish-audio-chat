// Themed word pools shown in LoadingSpinner's carousel while a scenario's
// story/response is generating. Keyed by the exact DEFAULT_SCENARIOS title.
const SCENARIO_VOCAB = {
  'Introducing Yourself': ['hola', 'me llamo', 'mucho gusto', 'amigo', 'nombre', 'conocer'],
  'Ordering at a Restaurant': ['restaurante', 'camarero', 'comida', 'menú', 'cuenta', 'delicioso'],
  'Asking for Directions': ['dónde', 'calle', 'izquierda', 'derecha', 'cerca', 'mapa'],
  'Making a New Friend': ['amigo', 'hobby', 'música', 'divertido', 'conocer', 'charlar'],
  'At the Airport/Hotel': ['vuelo', 'pasaporte', 'habitación', 'maleta', 'reserva', 'llegada'],
  'At a Pharmacy/Doctor': ['dolor', 'medicina', 'receta', 'salud', 'síntoma', 'farmacia'],
  'Shopping in a Store': ['precio', 'talla', 'probar', 'pagar', 'tienda', 'oferta'],
  'Asking for Help/Emergency': ['ayuda', 'emergencia', 'policía', 'rápido', 'perdido', 'peligro'],
}

const FALLBACK = ['hola', 'gracias', 'por favor', 'bueno', 'amigo', 'aprender']

export function getScenarioVocab(scenario) {
  return SCENARIO_VOCAB[scenario] || FALLBACK
}
