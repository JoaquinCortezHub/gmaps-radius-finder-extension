import { LIMITS } from "./constants.js";

const SHORT_MAPS_HOST = "maps.app.goo.gl";
const COORDINATES_PATTERN = /^[-+]?\d{1,2}(?:\.\d+)?\s*,\s*[-+]?\d{1,3}(?:\.\d+)?$/;
const MAP_COORDINATES_PATTERN = /@(-?\d{1,2}(?:\.\d+)?),(-?\d{1,3}(?:\.\d+)?)(?:,|\/|$)/;

function safeDecode(value) {
  try {
    return decodeURIComponent(value.replace(/\+/g, " "));
  } catch {
    return value;
  }
}

export function cleanText(value, maxLength = LIMITS.location) {
  return String(value ?? "")
    .replace(/[\u0000-\u001F\u007F]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, maxLength);
}

export function isShortGoogleMapsUrl(value) {
  try {
    const url = new URL(value);
    return url.protocol === "https:" && url.hostname.toLowerCase() === SHORT_MAPS_HOST;
  } catch {
    return false;
  }
}

export function isOfficialGoogleMapsUrl(value) {
  try {
    const url = new URL(value);
    if (url.protocol !== "https:") return false;

    const host = url.hostname.toLowerCase();
    if (host === SHORT_MAPS_HOST) return true;

    const officialGoogleHost = /^(?:www\.|maps\.)?google\.(?:com|[a-z]{2,3}|com\.[a-z]{2})$/i.test(host);
    const dedicatedMapsHost = host.startsWith("maps.google.");
    return officialGoogleHost && (dedicatedMapsHost || url.pathname === "/maps" || url.pathname.startsWith("/maps/"));
  } catch {
    return false;
  }
}

export function parseGoogleMapsUrl(value) {
  if (!isOfficialGoogleMapsUrl(value)) {
    return { ok: false, error: "La URL no pertenece a Google Maps." };
  }

  if (isShortGoogleMapsUrl(value)) {
    return { ok: false, shortUrl: true, error: "El enlace corto debe abrirse para resolver la redirección." };
  }

  const url = new URL(value);
  const query = cleanText(url.searchParams.get("query") || url.searchParams.get("q"));
  if (query) return { ok: true, location: query, source: "query", approximate: false };

  const placeMatch = url.pathname.match(/\/place\/([^/]+)/i);
  const place = cleanText(placeMatch ? safeDecode(placeMatch[1]) : "");
  if (place) return { ok: true, location: place, source: "place", approximate: false };

  const coordinatesMatch = `${url.pathname}${url.hash}`.match(MAP_COORDINATES_PATTERN);
  if (coordinatesMatch) {
    return {
      ok: true,
      location: `${coordinatesMatch[1]},${coordinatesMatch[2]}`,
      source: "coordinates",
      approximate: true,
    };
  }

  return { ok: false, error: "No se encontró una ubicación utilizable en la URL de Maps." };
}

export function resolveLocationInput(value) {
  const input = cleanText(value);
  if (!input) return { ok: false, error: "Ingresá una ubicación." };

  if (/^https?:\/\//i.test(input)) return parseGoogleMapsUrl(input);

  if (COORDINATES_PATTERN.test(input)) {
    const [latitude, longitude] = input.split(",").map((part) => Number(part.trim()));
    if (latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) {
      return { ok: false, error: "Las coordenadas están fuera de rango." };
    }
    return { ok: true, location: `${latitude},${longitude}`, source: "coordinates", approximate: false };
  }

  return { ok: true, location: input, source: "text", approximate: false };
}

export function extractLocationFromMapContext(url, visibleSearchValue = "") {
  const parsed = parseGoogleMapsUrl(url);
  if (parsed.ok && parsed.source !== "coordinates") return parsed;

  const visible = cleanText(visibleSearchValue);
  if (visible) return { ok: true, location: visible, source: "search-field", approximate: false };

  if (parsed.ok) return parsed;
  return parsed;
}

export function buildSearchUrl(categoryQuery, location) {
  const category = cleanText(categoryQuery, LIMITS.categoryQuery);
  const place = cleanText(location, LIMITS.location);
  if (!category) throw new Error("La categoría no tiene un término de búsqueda.");
  if (!place) throw new Error("La ubicación está vacía.");

  const url = new URL("https://www.google.com/maps/search/");
  url.searchParams.set("api", "1");
  url.searchParams.set("query", `${category} cerca de ${place}`);
  return url.toString();
}
