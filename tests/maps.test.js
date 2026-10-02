import test from "node:test";
import assert from "node:assert/strict";
import { buildSearchUrl, extractLocationFromMapContext, isOfficialGoogleMapsUrl, parseGoogleMapsUrl, resolveLocationInput } from "../lib/maps.js";

test("acepta direcciones, coordenadas y Unicode", () => {
  assert.deepEqual(resolveLocationInput("  Av. España 123, Mendoza  "), { ok: true, location: "Av. España 123, Mendoza", source: "text", approximate: false });
  assert.equal(resolveLocationInput("-32.8895, -68.8458").location, "-32.8895,-68.8458");
  assert.equal(resolveLocationInput("Café ☕ en Maipú").location, "Café ☕ en Maipú");
  assert.equal(resolveLocationInput("-92,10").ok, false);
});

test("extrae query, place y coordenadas de Maps", () => {
  assert.equal(parseGoogleMapsUrl("https://www.google.com/maps/search/?api=1&query=Parque%20General%20San%20Mart%C3%ADn").location, "Parque General San Martín");
  assert.equal(parseGoogleMapsUrl("https://www.google.com/maps/place/Plaza+Independencia/@-32.89,-68.84,15z").location, "Plaza Independencia");
  assert.deepEqual(parseGoogleMapsUrl("https://www.google.com/maps/@-32.8901,-68.8442,14z"), { ok: true, location: "-32.8901,-68.8442", source: "coordinates", approximate: true });
});

test("respeta el orden query, place, campo visible y coordenadas", () => {
  assert.equal(extractLocationFromMapContext("https://www.google.com/maps/place/URL+Place/@-32,-68,15z?query=Query+Place", "Visible Place").location, "Query Place");
  assert.equal(extractLocationFromMapContext("https://www.google.com/maps/place/URL+Place/@-32,-68,15z", "Visible Place").location, "URL Place");
  assert.equal(extractLocationFromMapContext("https://www.google.com/maps/@-32,-68,15z", "Visible Place").location, "Visible Place");
  assert.equal(extractLocationFromMapContext("https://www.google.com/maps/@-32,-68,15z", "").source, "coordinates");
});

test("rechaza dominios ajenos y enlaces no Maps", () => {
  assert.equal(isOfficialGoogleMapsUrl("https://google.com.evil.example/maps/place/test"), false);
  assert.equal(isOfficialGoogleMapsUrl("https://www.google.com/search?q=maps"), false);
  assert.equal(parseGoogleMapsUrl("https://example.com/maps/@-32,-68").ok, false);
  assert.equal(parseGoogleMapsUrl("https://maps.app.goo.gl/abc").shortUrl, true);
  assert.equal(parseGoogleMapsUrl("https://maps.google.com/?q=Mendoza").location, "Mendoza");
});

test("construye y codifica una búsqueda oficial", () => {
  const result = new URL(buildSearchUrl("cafés y té", "San Martín 123, Mendoza"));
  assert.equal(result.origin, "https://www.google.com");
  assert.equal(result.pathname, "/maps/search/");
  assert.equal(result.searchParams.get("api"), "1");
  assert.equal(result.searchParams.get("query"), "cafés y té cerca de San Martín 123, Mendoza");
});
