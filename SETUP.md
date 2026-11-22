# BagCheck setup

## Local services

Run the three services in separate terminals:

```powershell
# 1. Backend API
cd "D:\Rubab\Git Repos\BagCheck\backend"
npm.cmd install
Copy-Item .env.example .env
npm.cmd run seed
npm.cmd run dev

# 2. Frontend
cd "D:\Rubab\Git Repos\BagCheck\frontend"
npm.cmd install
Copy-Item .env.example .env
npm.cmd run dev

# 3. ML service
cd "D:\Rubab\Git Repos\BagCheck\ml"
py -m venv .venv
.\.venv\Scripts\Activate.ps1
py -m pip install -r requirements.txt
py -m moderate.train
py -m uvicorn api:app --reload --port 8000
```

If `python` is not on PATH, use `py` as shown above. The trained moderation model is written to `ml/moderate/model.pkl`; this file is generated and should not be committed if the repository ignores model artifacts.

## Environment values

Backend `backend/.env`:

```env
PORT=3001
JWT_SECRET=replace_with_a_long_random_secret
ML_SERVICE_URL=http://localhost:8000
FRONTEND_URLS=http://localhost:5173,http://127.0.0.1:5173
RESEND_API_KEY=
FROM_EMAIL=BagCheck <noreply@example.com>
```

Frontend `frontend/.env`:

```env
VITE_API_URL=http://localhost:3001
```

`VITE_API_URL` is the backend origin, not the ML URL. The frontend calls `/api/...` through that origin.

## Database

The current implementation uses SQLite. The database file is:

```text
backend/bagcheck.db
```

No database URL is required for local development. Knex creates the tables at backend startup and the seed command resets them with demo data. Demo login:

```text
Email: demo@bagcheck.app
Password: demo1234
```

For production, replace the SQLite/Knex configuration with a hosted database adapter and keep credentials in environment variables; do not commit passwords.

## Image uploads

Multer is already installed and used by `POST /api/reports` with the field name `photo`. Images are limited to 5 MB and accept JPG, JPEG, PNG, WEBP, and GIF. Local files are stored in:

```text
backend/uploads/
```

They are served through:

```text
http://localhost:3001/uploads/<filename>
```

For production, use durable object storage rather than a container filesystem. Recommended links:

- Cloudinary: https://cloudinary.com/
- Supabase Storage: https://supabase.com/storage
- Firebase Storage: https://firebase.google.com/products/storage
- Amazon S3: https://aws.amazon.com/s3/

Multer itself is not a link or upload host; it only receives the multipart file on the backend.

## ML endpoints

The backend expects the ML service at `ML_SERVICE_URL`:

```text
GET  http://localhost:8000/health
POST http://localhost:8000/api/moderate
POST http://localhost:8000/api/match
```

The first matching request downloads `all-MiniLM-L6-v2` through `sentence-transformers`, so the first request can take longer and requires internet access once.

## Rejection email

Email is optional in local development. To enable automatic rejection emails, create a Resend account at https://resend.com/ and set `RESEND_API_KEY` plus a verified `FROM_EMAIL`. The report is still rejected if the provider is unavailable; email delivery is intentionally non-blocking.

## Useful URLs

- Frontend: http://localhost:5173
- Backend health: http://localhost:3001/api/health
- ML health: http://localhost:8000/health
- Uploaded images: http://localhost:3001/uploads/<filename>
