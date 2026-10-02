import { LIMITS } from "../lib/constants.js";
import { cleanText, resolveLocationInput } from "../lib/maps.js";
import { loadState, makeId, resetState, saveState } from "../lib/storage.js";

const elements = {
  categories: document.querySelector("#categories"),
  favorites: document.querySelector("#favorites"),
  categoryForm: document.querySelector("#category-form"),
  categoryName: document.querySelector("#category-name"),
  categoryQuery: document.querySelector("#category-query"),
  favoriteForm: document.querySelector("#favorite-form"),
  favoriteName: document.querySelector("#favorite-name"),
  favoriteLocation: document.querySelector("#favorite-location"),
  deleteAll: document.querySelector("#delete-all"),
  status: document.querySelector("#status"),
};

let state;

function setStatus(message = "", kind = "info") {
  elements.status.textContent = message;
  elements.status.dataset.kind = kind;
}

async function persist(message) {
  state = await saveState(state);
  render();
  setStatus(message, "success");
}

function textInput(value, maxLength, label) {
  const input = document.createElement("input");
  input.value = value;
  input.maxLength = maxLength;
  input.setAttribute("aria-label", label);
  return input;
}

function controlButton(text, title, handler, className = "") {
  const button = document.createElement("button");
  button.type = "button";
  button.textContent = text;
  button.title = title;
  button.setAttribute("aria-label", title);
  if (className) button.className = className;
  button.addEventListener("click", handler);
  return button;
}

function moveItem(collection, index, direction) {
  const destination = index + direction;
  if (destination < 0 || destination >= collection.length) return;
  [collection[index], collection[destination]] = [collection[destination], collection[index]];
  collection.forEach((item, order) => { item.order = order; });
}

function renderCollection(container, collectionName) {
  const collection = state[collectionName];
  const fragment = document.createDocumentFragment();

  collection.forEach((item, index) => {
    const row = document.createElement("div");
    row.className = "item";
    const name = textInput(item.name, collectionName === "categories" ? LIMITS.categoryName : LIMITS.favoriteName, "Nombre");
    const valueKey = collectionName === "categories" ? "query" : "location";
    const value = textInput(item[valueKey], collectionName === "categories" ? LIMITS.categoryQuery : LIMITS.location, collectionName === "categories" ? "Término de búsqueda" : "Ubicación");

    const controls = document.createElement("div");
    controls.className = "item-controls";
    const enabledLabel = document.createElement("label");
    const enabled = document.createElement("input");
    enabled.type = "checkbox";
    enabled.checked = item.enabled;
    enabled.addEventListener("change", async () => {
      item.enabled = enabled.checked;
      await persist(`${item.name} ${item.enabled ? "activado" : "desactivado"}.`);
    });
    enabledLabel.append(enabled, document.createTextNode("Activo"));

    const save = controlButton("Guardar", `Guardar ${item.name}`, async () => {
      const newName = cleanText(name.value, name.maxLength);
      const newValue = cleanText(value.value, value.maxLength);
      if (!newName || !newValue) return setStatus("El nombre y el valor son obligatorios.", "error");
      if (valueKey === "location") {
        const resolved = resolveLocationInput(newValue);
        if (!resolved.ok) return setStatus(resolved.error, "error");
      }
      item.name = newName;
      item[valueKey] = newValue;
      await persist(`${newName} guardado.`);
    });
    const up = controlButton("↑", `Subir ${item.name}`, async () => { moveItem(collection, index, -1); await persist("Orden actualizado."); });
    const down = controlButton("↓", `Bajar ${item.name}`, async () => { moveItem(collection, index, 1); await persist("Orden actualizado."); });
    up.disabled = index === 0;
    down.disabled = index === collection.length - 1;
    const remove = controlButton("Eliminar", `Eliminar ${item.name}`, async () => {
      state[collectionName] = collection.filter((candidate) => candidate.id !== item.id);
      await persist(`${item.name} eliminado.`);
    }, "danger");

    controls.append(enabledLabel, save, up, down, remove);
    row.append(name, value, controls);
    fragment.append(row);
  });

  if (!collection.length) {
    const empty = document.createElement("p");
    empty.className = "muted";
    empty.textContent = "Todavía no hay elementos.";
    fragment.append(empty);
  }
  container.replaceChildren(fragment);
}

function render() {
  renderCollection(elements.categories, "categories");
  renderCollection(elements.favorites, "favorites");
}

elements.categoryForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  if (state.categories.length >= LIMITS.categories) return setStatus("Alcanzaste el máximo de categorías.", "error");
  const name = cleanText(elements.categoryName.value, LIMITS.categoryName);
  const query = cleanText(elements.categoryQuery.value, LIMITS.categoryQuery);
  if (!name || !query) return setStatus("Completá el nombre y el término de búsqueda.", "error");
  state.categories.push({ id: makeId("categoria"), name, query, enabled: true, order: state.categories.length });
  elements.categoryForm.reset();
  await persist(`${name} agregado.`);
});

elements.favoriteForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  if (state.favorites.length >= LIMITS.favorites) return setStatus("Alcanzaste el máximo de favoritos.", "error");
  const name = cleanText(elements.favoriteName.value, LIMITS.favoriteName);
  const location = cleanText(elements.favoriteLocation.value, LIMITS.location);
  const resolved = resolveLocationInput(location);
  if (!name || !resolved.ok) return setStatus(resolved.error || "Completá el nombre.", "error");
  state.favorites.push({ id: makeId("favorito"), name, location, enabled: true, order: state.favorites.length });
  elements.favoriteForm.reset();
  await persist(`${name} agregado.`);
});

elements.deleteAll.addEventListener("click", async () => {
  if (!confirm("¿Borrar todos los datos locales y restaurar las categorías iniciales?")) return;
  state = await resetState();
  render();
  setStatus("Todos los datos fueron borrados y las categorías iniciales se restauraron.", "success");
});

async function initialize() {
  try {
    state = await loadState();
    state = await saveState(state);
    render();
  } catch (error) {
    setStatus(`No se pudo cargar la configuración: ${error.message}`, "error");
  }
}

initialize();
