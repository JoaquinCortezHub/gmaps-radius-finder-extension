import { DEFAULT_CATEGORIES, EMPTY_STATE, LIMITS, SCHEMA_VERSION } from "./constants.js";
import { cleanText } from "./maps.js";

function cloneDefaults() {
  return {
    schemaVersion: SCHEMA_VERSION,
    categories: DEFAULT_CATEGORIES.map((category) => ({ ...category })),
    favorites: [],
    lastLocation: "",
  };
}

function makeId(prefix = "item") {
  if (globalThis.crypto?.randomUUID) return `${prefix}-${crypto.randomUUID()}`;
  return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function normalizeCategories(categories) {
  if (!Array.isArray(categories)) return cloneDefaults().categories;
  if (categories.length === 0) return [];

  const normalized = categories.slice(0, LIMITS.categories).map((category, index) => ({
    id: cleanText(category?.id, 100) || makeId("categoria"),
    name: cleanText(category?.name ?? category?.label, LIMITS.categoryName),
    query: cleanText(category?.query ?? category?.name ?? category?.label, LIMITS.categoryQuery),
    enabled: category?.enabled !== false,
    order: Number.isFinite(category?.order) ? category.order : index,
  })).filter((category) => category.name && category.query);

  return normalized.length ? normalized.sort((a, b) => a.order - b.order).map((item, index) => ({ ...item, order: index })) : cloneDefaults().categories;
}

function normalizeFavorites(favorites) {
  if (!Array.isArray(favorites)) return [];

  return favorites.slice(0, LIMITS.favorites).map((favorite, index) => ({
    id: cleanText(favorite?.id, 100) || makeId("favorito"),
    name: cleanText(favorite?.name ?? favorite?.nombre, LIMITS.favoriteName),
    location: cleanText(favorite?.location ?? favorite?.ubicacion, LIMITS.location),
    enabled: favorite?.enabled !== false,
    order: Number.isFinite(favorite?.order) ? favorite.order : index,
  })).filter((favorite) => favorite.name && favorite.location)
    .sort((a, b) => a.order - b.order)
    .map((item, index) => ({ ...item, order: index }));
}

export function migrateState(rawState) {
  const raw = rawState && typeof rawState === "object" ? rawState : EMPTY_STATE;

  return {
    schemaVersion: SCHEMA_VERSION,
    categories: normalizeCategories(raw.categories),
    favorites: normalizeFavorites(raw.favorites),
    lastLocation: cleanText(raw.lastLocation ?? raw.ultimaUbicacion, LIMITS.location),
  };
}

export async function loadState(storageArea = browser.storage.local) {
  return migrateState(await storageArea.get());
}

export async function saveState(state, storageArea = browser.storage.local) {
  const normalized = migrateState(state);
  await storageArea.set(normalized);
  return normalized;
}

export async function resetState(storageArea = browser.storage.local) {
  await storageArea.clear();
  const defaults = cloneDefaults();
  await storageArea.set(defaults);
  return defaults;
}

export { makeId };
