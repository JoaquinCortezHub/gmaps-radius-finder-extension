export const SCHEMA_VERSION = 1;

export const LIMITS = Object.freeze({
  categoryName: 60,
  categoryQuery: 100,
  favoriteName: 60,
  location: 500,
  categories: 50,
  favorites: 100,
});

export const DEFAULT_CATEGORIES = Object.freeze([
  { id: "restaurantes", name: "Restaurantes", query: "restaurantes", enabled: true, order: 0 },
  { id: "cafes", name: "Cafés", query: "cafés", enabled: true, order: 1 },
  { id: "supermercados", name: "Supermercados", query: "supermercados", enabled: true, order: 2 },
  { id: "farmacias", name: "Farmacias", query: "farmacias", enabled: true, order: 3 },
  { id: "hospitales", name: "Hospitales", query: "hospitales", enabled: true, order: 4 },
  { id: "gimnasios", name: "Gimnasios", query: "gimnasios", enabled: true, order: 5 },
]);

export const EMPTY_STATE = Object.freeze({
  schemaVersion: SCHEMA_VERSION,
  categories: DEFAULT_CATEGORIES,
  favorites: [],
  lastLocation: "",
});
