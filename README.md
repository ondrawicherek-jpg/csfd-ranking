# Filmotéka — ČSFD Ranking App

Hodnoť filmy ze žebříčků ČSFD Tinder stylem. Hostováno na Cloudflare Pages s D1 databází.

## Stack

- **Next.js 15** (App Router, Edge Runtime)
- **Cloudflare Pages** — hosting
- **Cloudflare D1** (SQLite) — databáze
- **Framer Motion** — swipe animace
- **Tailwind CSS** — styling

---

## Spuštění lokálně

```bash
# 1. Nainstaluj závislosti
npm install

# 2. Scrape filmů ze ČSFD (vytvoří scripts/films.json)
npm run scrape

# 3. Vygeneruj SQL seed soubor
npm run seed

# 4. Vytvoř lokální D1 databázi a spusť migrace
wrangler d1 create csfd-ranking-db
# Zkopíruj database_id do wrangler.toml
wrangler d1 migrations apply csfd-ranking-db --local

# 5. Nahraj filmy do lokální DB
wrangler d1 execute csfd-ranking-db --local --file=scripts/seed.sql

# 6. Spusť vývojový server
npm run dev
```

---

## Deployment na Cloudflare Pages

### 1. Vytvoření D1 databáze

```bash
wrangler login
wrangler d1 create csfd-ranking-db
```

Zkopíruj `database_id` z výstupu do `wrangler.toml`:
```toml
[[d1_databases]]
binding = "DB"
database_name = "csfd-ranking-db"
database_id = "TVOJE_DATABASE_ID_ZDE"
```

### 2. Spusť migrace a seed

```bash
wrangler d1 migrations apply csfd-ranking-db
wrangler d1 execute csfd-ranking-db --file=scripts/seed.sql
```

### 3. Nastav JWT_SECRET

```bash
wrangler pages secret put JWT_SECRET
# Zadej náhodný řetězec min. 32 znaků
```

### 4. Deploy

```bash
npm run deploy
```

### 5. Propoj s doménou

V Cloudflare Dashboard → Pages → tvůj projekt → Custom domains → přidej `filmy.ondrejwicherek.cz` nebo podobně.

---

## Struktura projektu

```
src/
├── app/
│   ├── page.tsx              — Přehled (statistiky, top filmy)
│   ├── hodnoceni/page.tsx    — Tinder swipe hodnocení
│   ├── moje-filmy/page.tsx   — Moje filmy + filtry + přidání
│   ├── prihlaseni/page.tsx   — Přihlášení
│   ├── registrace/page.tsx   — Registrace
│   └── api/                  — Edge API routes
│       ├── auth/             — login, register, logout, me
│       ├── films/            — queue, stats, my
│       ├── ratings/          — uložení hodnocení
│       └── search/           — vyhledávání + ČSFD scrape
├── components/
│   ├── AuthContext.tsx       — Auth state (React context)
│   ├── Navigation.tsx        — Top bar + bottom tab bar
│   ├── FilmCard.tsx          — Karta filmu (compact + full)
│   ├── SwipeCard.tsx         — Tinder swipe karta
│   └── RatingModal.tsx       — Modal pro hodnocení
└── lib/
    ├── auth.ts               — JWT + PBKDF2 hesla
    ├── db.ts                 — D1 query funkce
    └── context.ts            — Cloudflare env helper

scripts/
├── scrape-csfd.ts            — Scraper ČSFD žebříčků
└── seed.ts                   — Generátor SQL seed souboru

migrations/
└── 0001_init.sql             — Schéma databáze
```

---

## Ovládání hodnocení

| Akce | Klávesa | Tlačítko |
|------|---------|---------|
| Viděl | `→` | Zelené tlačítko |
| Neviděl | `←` | Červené tlačítko |
| Přeskočit | `Mezerník` | Šipka tlačítko |
| Swipe | Tažení kartou | — |
