/**
 * Ustawia hasło trybu administratora:
 *
 *   npm run ustaw-haslo -- "moje-haslo"     # własne hasło
 *   npm run ustaw-haslo                      # wylosuje hasło i je wypisze
 *
 * Do data/admin.json trafia tylko skrót PBKDF2 (z solą) – samego hasła nie ma w repozytorium.
 * Po zmianie trzeba zbudować i wdrożyć stronę; dotychczasowe sesje administratora wygasają.
 */
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { skrotHasla } from "../lib/admin";

const ITERACJE = 310_000;

async function main() {
  const podane = process.argv[2];
  const haslo = podane ?? crypto.randomBytes(12).toString("base64url");
  if (haslo.length < 10) {
    console.error("Hasło musi mieć co najmniej 10 znaków.");
    process.exit(1);
  }
  const sol = crypto.randomBytes(16).toString("hex");
  const skrot = await skrotHasla(haslo, sol, ITERACJE);
  fs.writeFileSync(path.resolve(process.cwd(), "data/admin.json"), JSON.stringify({ sol, iteracje: ITERACJE, skrot }, null, 2) + "\n");
  console.log("Zapisano skrót hasła w data/admin.json.");
  if (!podane) console.log(`Wylosowane hasło administratora: ${haslo}\nZapisz je – nie da się go odtworzyć z pliku.`);
}
main();
