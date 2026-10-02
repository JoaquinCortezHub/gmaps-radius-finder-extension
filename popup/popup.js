import { buildSearchUrl, extractLocationFromMapContext, isOfficialGoogleMapsUrl, isShortGoogleMapsUrl, resolveLocationInput } from "../lib/maps.js";
import { loadState, saveState } from "../lib/storage.js";

const elements = {
  location: document.querySelector("#location"),
  favorite: document.querySelector("#favorite"),
  categories: document.querySelector("#categories"),
  status: document.querySelector("#status"),
  approximateBox: document.querySelector("#approximate-box"),
  confirmApproximate: document.querySelector("#confirm-approximate"),
  openSelected: document.querySelector("#open-selected"),
  takeLocation: document.querySelector("#take-location"),
  clearLocation: document.querySelector("#clear-location"),
  toggleAll: document.querySelector("#toggle-all"),
  openOptions: document.querySelector("#open-options"),
};

let state;
let approximateCapture = false;

function setStatus(message = "", kind = "info") {
  elements.status.textContent = message;
  elements.status.dataset.kind = kind;
}

function setApproximate(value) {
  approximateCapture = value;
  elements.approximateBox.hidden = !value;
  elements.confirmApproximate.checked = false;
}

function renderFavorites() {
  elements.favorite.replaceChildren(new Option("Elegir un favorito…", ""));
  state.favorites.filter((favorite) => favorite.enabled).forEach((favorite) => {
    elements.favorite.append(new Option(favorite.name, favorite.id));
  });
}

function renderCategories() {
  const fragment = document.createDocumentFragment();
  state.categories.filter((category) => category.enabled).forEach((category) => {
    const row = document.createElement("div");
    row.className = "category";

    const label = document.createElement("label");
    const checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    checkbox.dataset.categoryId = category.id;
    const name = document.createElement("span");
    name.textContent = category.name;
    label.append(checkbox, name);

    const searchButton = document.createElement("button");
    searchButton.type = "button";
    searchButton.textContent = "Buscar";
    searchButton.addEventListener("click", () => searchCategory(category));
    row.append(label, searchButton);
    fragment.append(row);
  });
  elements.categories.replaceChildren(fragment);
}

function selectedCategories() {
  const ids = [...elements.categories.querySelectorAll("input:checked")].map((input) => input.dataset.categoryId);
  return state.categories.filter((category) => ids.includes(category.id));
}

async function getValidatedLocation() {
  const resolved = resolveLocationInput(elements.location.value);
  if (resolved.shortUrl) {
    const tab = await activeTab();
    const shortUrl = elements.location.value.trim();
    if (tab?.id && isOfficialGoogleMapsUrl(tab.url)) await browser.tabs.update(tab.id, { url: shortUrl });
    else await browser.tabs.create({ url: shortUrl });
    throw new Error("Esperá la redirección del enlace corto y volvé a abrir la extensión.");
  }
  if (!resolved.ok) throw new Error(resolved.error);
  if (approximateCapture && !elements.confirmApproximate.checked) {
    throw new Error("Confirmá visualmente la ubicación aproximada antes de buscar.");
  }

  elements.location.value = resolved.location;
  state.lastLocation = resolved.location;
  state = await saveState(state);
  return resolved.location;
}

async function activeTab() {
  const [tab] = await browser.tabs.query({ active: true, currentWindow: true });
  return tab;
}

async function searchCategory(category) {
  try {
    setStatus();
    const location = await getValidatedLocation();
    const url = buildSearchUrl(category.query, location);
    const tab = await activeTab();
    if (tab?.id && isOfficialGoogleMapsUrl(tab.url) && !isShortGoogleMapsUrl(tab.url)) {
      await browser.tabs.update(tab.id, { url });
    } else {
      await browser.tabs.create({ url });
    }
    window.close();
  } catch (error) {
    setStatus(error.message, "error");
  }
}

async function searchSelected() {
  try {
    const categories = selectedCategories();
    if (!categories.length) throw new Error("Seleccioná al menos una categoría.");
    const location = await getValidatedLocation();
    await Promise.all(categories.map((category) => browser.tabs.create({ url: buildSearchUrl(category.query, location), active: false })));
    setStatus(`Se abrieron ${categories.length} búsquedas sin reemplazar la pestaña actual.`, "success");
  } catch (error) {
    setStatus(error.message, "error");
  }
}

function readVisibleMapsSearchField() {
  const selectors = ["#searchboxinput", "input[name='q']", "input[aria-label*='Buscar']", "input[aria-label*='Search']"];
  for (const selector of selectors) {
    const input = document.querySelector(selector);
    if (input && typeof input.value === "string" && input.value.trim()) return input.value.trim();
  }
  return "";
}

async function takeLocationFromMaps() {
  try {
    setStatus();
    const tab = await activeTab();
    if (!tab?.id || !tab.url || !isOfficialGoogleMapsUrl(tab.url)) {
      throw new Error("La pestaña activa no es una URL oficial de Google Maps.");
    }

    if (isShortGoogleMapsUrl(tab.url)) {
      await browser.tabs.update(tab.id, { url: tab.url });
      setStatus("Se abrió el enlace corto. Esperá la redirección y volvé a abrir la extensión.", "success");
      return;
    }

    let visibleSearchValue = "";
    try {
      const results = await browser.scripting.executeScript({ target: { tabId: tab.id }, func: readVisibleMapsSearchField });
      visibleSearchValue = results?.[0]?.result || "";
    } catch {
      // La URL todavía puede contener una ubicación útil.
    }

    const extracted = extractLocationFromMapContext(tab.url, visibleSearchValue);
    if (!extracted.ok) throw new Error(extracted.error);

    elements.location.value = extracted.location;
    setApproximate(extracted.approximate);
    state.lastLocation = extracted.location;
    state = await saveState(state);
    setStatus(extracted.approximate ? "Tomamos el centro visible del mapa; revisalo antes de buscar." : "Ubicación tomada de Google Maps.", extracted.approximate ? "info" : "success");
  } catch (error) {
    setStatus(error.message, "error");
  }
}

elements.favorite.addEventListener("change", () => {
  const favorite = state.favorites.find((item) => item.id === elements.favorite.value);
  if (!favorite) return;
  elements.location.value = favorite.location;
  setApproximate(false);
  setStatus(`Favorito “${favorite.name}” cargado.`, "success");
});

elements.location.addEventListener("input", () => {
  if (approximateCapture) setApproximate(false);
  setStatus();
});

elements.takeLocation.addEventListener("click", takeLocationFromMaps);
elements.clearLocation.addEventListener("click", async () => {
  elements.location.value = "";
  elements.favorite.value = "";
  setApproximate(false);
  state.lastLocation = "";
  state = await saveState(state);
  setStatus("Ubicación borrada.", "success");
});
elements.openSelected.addEventListener("click", searchSelected);
elements.toggleAll.addEventListener("click", () => {
  const checkboxes = [...elements.categories.querySelectorAll("input[type='checkbox']")];
  const select = checkboxes.some((checkbox) => !checkbox.checked);
  checkboxes.forEach((checkbox) => { checkbox.checked = select; });
  elements.toggleAll.textContent = select ? "Quitar selección" : "Seleccionar todas";
});
elements.openOptions.addEventListener("click", () => browser.runtime.openOptionsPage());

async function initialize() {
  try {
    state = await loadState();
    state = await saveState(state);
    elements.location.value = state.lastLocation;
    renderFavorites();
    renderCategories();
  } catch (error) {
    setStatus(`No se pudo cargar la configuración: ${error.message}`, "error");
  }
}

initialize();
