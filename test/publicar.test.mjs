// Test de la publicación en Instagram (functions/publicar.mjs): la parte
// pura — qué imagen se lleva el post. El flujo de Graph corre contra la API
// real y no se unit-testea; su desenlace queda en publicaciones (D1).
import { test } from "node:test";
import assert from "node:assert/strict";
import { elegirImagen } from "../functions/publicar.mjs";

test("la imagen del autor gana; sin ella, la portada de Spotify; sin nada, pendiente", () => {
  assert.equal(elegirImagen("https://yo/foto.jpg", "https://scdn/portada.jpg"), "https://yo/foto.jpg");
  assert.equal(elegirImagen("  ", "https://scdn/portada.jpg"), "https://scdn/portada.jpg"); // blancos no cuentan
  assert.equal(elegirImagen(undefined, "https://scdn/portada.jpg"), "https://scdn/portada.jpg");
  assert.equal(elegirImagen(null, null), null);
});
