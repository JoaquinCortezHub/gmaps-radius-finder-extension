import test from "node:test";
import assert from "node:assert/strict";
import { DEFAULT_CATEGORIES, SCHEMA_VERSION } from "../lib/constants.js";
import { loadState, migrateState, resetState, saveState } from "../lib/storage.js";

function fakeStorage(initial = {}) {
  let data = structuredClone(initial);
  return {
    async get() { return structuredClone(data); },
    async set(value) { data = { ...data, ...structuredClone(value) }; },
    async clear() { data = {}; },
  };
}

test("crea valores predeterminados para almacenamiento vacío", () => {
  const state = migrateState();
  assert.equal(state.schemaVersion, SCHEMA_VERSION);
  assert.deepEqual(state.categories.map((category) => category.name), DEFAULT_CATEGORIES.map((category) => category.name));
  assert.deepEqual(state.favorites, []);
});

test("migra favoritos con claves antiguas y sanea valores", () => {
  const state = migrateState({
    schemaVersion: 0,
    ultimaUbicacion: "  Mendoza  ",
    categories: [{ label: " Panaderías ", enabled: true }],
    favorites: [{ id: "casa", nombre: " Casa ", ubicacion: " Godoy Cruz ", order: 8 }],
  });
  assert.equal(state.schemaVersion, 1);
  assert.equal(state.lastLocation, "Mendoza");
  assert.deepEqual(state.categories[0], { id: state.categories[0].id, name: "Panaderías", query: "Panaderías", enabled: true, order: 0 });
  assert.deepEqual(state.favorites[0], { id: "casa", name: "Casa", location: "Godoy Cruz", enabled: true, order: 0 });
});

test("guarda, carga y restablece favoritos", async () => {
  const storage = fakeStorage();
  let state = await resetState(storage);
  state.favorites.push({ id: "trabajo", name: "Trabajo", location: "Ciudad de Mendoza", enabled: true, order: 0 });
  await saveState(state, storage);
  assert.equal((await loadState(storage)).favorites[0].name, "Trabajo");
  assert.equal((await resetState(storage)).favorites.length, 0);
});

test("permite eliminar todas las categorías de forma explícita", () => {
  assert.deepEqual(migrateState({ categories: [], favorites: [] }).categories, []);
});
