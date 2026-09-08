# Backend za produkciju — deploy priprema

## Fajlovi u ovom paketu
- app/services/storage/r2.py       (NOV — R2 storage adapter)
- app/services/storage/factory.py  (povezan R2)
- config.py                         (R2 varijable + cross-domain cookie za produkciju)
- Procfile                          (gunicorn)
- runtime.txt                       (Python verzija)

## KORAK 1 — dodaj u requirements.txt
Otvori requirements.txt i dodaj (ako nisu već):
    gunicorn
    boto3

## KORAK 2 — zameni/dodaj fajlove
- config.py                → zameni svoj
- app/services/storage/r2.py    → dodaj (nov)
- app/services/storage/factory.py → zameni svoj
- Procfile, runtime.txt    → dodaj u Backend root

## KORAK 3 — env varijable (na Render-u, kasnije)
Za produkciju backend čita ove env varijable:

    FLASK_ENV=production
    SECRET_KEY=<generiši dugačak random string>
    DATABASE_URL=<Neon connection string, ali sa +psycopg2 — vidi dole>
    CORS_ORIGINS=https://tvoj-frontend.pages.dev
    GITHUB_TOKEN=<tvoj github token>

    STORAGE_BACKEND=r2
    R2_ACCOUNT_ID=<sa R2>
    R2_ACCESS_KEY_ID=<sa R2 tokena>
    R2_SECRET_ACCESS_KEY=<sa R2 tokena>
    R2_BUCKET=portfolio-storage
    R2_PUBLIC_BASE_URL=https://pub-xxxxx.r2.dev

## BITNO — DATABASE_URL format
Neon daje:   postgresql://user:pass@host/db?sslmode=require
Tvoj kod traži psycopg2 drajver, pa dodaj +psycopg2:
    postgresql+psycopg2://user:pass@host/db?sslmode=require
(samo umetni "+psycopg2" posle "postgresql")

## KORAK 4 — migracije na Neon (lokalno, jednom)
Postavi DATABASE_URL na Neon string (privremeno u lokalnom .env), pa:
    flask db upgrade
Ovo napravi sve tabele na Neon bazi. Onda vrati lokalni .env nazad.
(Ili pokreneš migracije sa Render-a — objasniću kad dođemo tamo.)

## Cross-domain cookie (zašto SameSite=None)
Frontend (.pages.dev) i backend (.onrender.com) su različiti domeni.
Da login radi, cookie mora SameSite=None + Secure. To je već podešeno u
ProductionConfig. Radi samo preko HTTPS (Render/Cloudflare daju HTTPS).
