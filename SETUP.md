# BagCheck setup

## Services

Run the backend, frontend, and ML service in separate terminals.

```powershell
# Backend
cd "D:\Rubab\Git Repos\BagCheck\backend"
npm.cmd install
if (-not (Test-Path .env)) { Copy-Item .env.example .env }
# Configure the values in .env before starting the service.
npm.cmd run dev

# Frontend
cd "D:\Rubab\Git Repos\BagCheck\frontend"
npm.cmd install
if (-not (Test-Path .env)) { Copy-Item .env.example .env }
# Set VITE_API_URL=http://localhost:3001 for the local backend.
npm.cmd run dev

# ML service
cd "D:\Rubab\Git Repos\BagCheck\ml"
python -m venv .venv
.\.venv\Scripts\python.exe -m pip install -r requirements.txt
.\.venv\Scripts\python.exe -m moderate.train
.\.venv\Scripts\python.exe -m uvicorn api:app --host 127.0.0.1 --port 8000
```

## MongoDB connection

The backend now uses the native `mongodb` Node.js driver. It no longer uses SQLite, Knex, or `backend/bagcheck.db`. MongoDB stores these collections:

```text
users
universities
campuses
reports
matches
counters
```

### Option A: local MongoDB

Install MongoDB Community Server from https://www.mongodb.com/try/download/community and keep the MongoDB service running. Use:

```env
MONGODB_URI=mongodb://127.0.0.1:27017
MONGODB_DB_NAME=bagcheck
```

MongoDB Compass, for viewing the database, is available at https://www.mongodb.com/products/tools/compass.

### Option B: MongoDB Atlas

Create a free cluster at https://www.mongodb.com/atlas/database. In Atlas:

1. Create a database user and password.
2. Add your IP address under Network Access. For temporary development only, `0.0.0.0/0` allows access from anywhere; a restricted IP is safer.
3. Select **Connect → Drivers → Node.js** and copy the connection string.
4. Replace the placeholders and put it in `backend/.env`:

```env
MONGODB_URI=mongodb+srv://USERNAME:PASSWORD@YOUR-CLUSTER.mongodb.net/?retryWrites=true&w=majority
MONGODB_DB_NAME=bagcheck
```

If the password contains characters such as `@`, `:`, `/`, or `#`, URL-encode it. Never commit `backend/.env` or expose this connection string in frontend code.

## Environment files

Backend `backend/.env`:

```env
PORT=3001
JWT_SECRET=replace_with_a_long_random_secret
MONGODB_URI=mongodb+srv://USERNAME:PASSWORD@YOUR-CLUSTER.mongodb.net/?retryWrites=true&w=majority
MONGODB_DB_NAME=bagcheck
FRONTEND_URLS=http://localhost:5173,http://127.0.0.1:5173
ML_SERVICE_URL=http://localhost:8000
RESEND_API_KEY=
FROM_EMAIL=BagCheck <noreply@example.com>
```

Frontend `frontend/.env`:

```env
VITE_API_URL=http://localhost:3001
```

`VITE_API_URL` points to the backend only. Do not put `MONGODB_URI` in the frontend environment file.

## Data initialization

To populate an empty development database after setting `MONGODB_URI`, run:

```powershell
cd "D:\Rubab\Git Repos\BagCheck\backend"
npm.cmd run seed
```

The seed command clears and recreates the BagCheck collections. For an existing database affected by null IDs, preview the repair with `npm.cmd run repair:legacy-ids`. After reviewing the results, run `npm.cmd run repair:legacy-ids -- --apply` against the MongoDB Atlas database or a replica set. The repair preserves the records, restores verified relationships from the demo seed, and reports how many existing reports still need owner and campus details. Users with old sessions must sign in again.

Demo login:

```text
Email: demo@bagcheck.app
Password: demo1234
```

## Image uploads

Multer is already used by `POST /api/reports` with the multipart field name `photo`. Local files are stored in `backend/uploads/` and served at:

```text
http://localhost:3001/uploads/<filename>
```

Multer is not a cloud-storage link. For production durable image storage, use one of:

- Cloudinary: https://cloudinary.com/
- Supabase Storage: https://supabase.com/storage
- Firebase Storage: https://firebase.google.com/products/storage
- Amazon S3: https://aws.amazon.com/s3/

## ML service

### Windows start commands

Open a new PowerShell terminal and run these commands from the repository root:

```powershell
cd "D:\Rubab\Git Repos\BagCheck\ml"
python -m venv .venv
.\.venv\Scripts\python.exe -m pip install -r requirements.txt
.\.venv\Scripts\python.exe -m moderate.train
.\.venv\Scripts\python.exe -m uvicorn api:app --host 127.0.0.1 --port 8000
```

Keep this terminal running. In another PowerShell terminal verify the service:

```powershell
Invoke-WebRequest http://127.0.0.1:8000/health
```

The training command creates `ml/moderate/model.pkl`. Run it again whenever the moderation CSV dataset changes. Set `ML_SERVICE_URL=http://127.0.0.1:8000` in `backend/.env` for the local ML service.

The ML service checks the title and the combined title-description text. If the classifier has not been trained, the service uses text rules. If the service is unavailable, the backend asks the user to retry the submission before creating a report.

The backend calls:

```text
GET  http://localhost:8000/health
POST http://localhost:8000/api/moderate
POST http://localhost:8000/api/match
```

The ML matcher reads `MONGODB_URI` and `MONGODB_DB_NAME` from the process environment or `ml/.env`, with `backend/.env` as a fallback. Set both services to use the same database. The first match with eligible candidates downloads MiniLM if needed.

## Optional email

For automatic moderation-rejection emails, create a Resend account at https://resend.com/ and configure `RESEND_API_KEY` and a verified `FROM_EMAIL`. Email delivery is non-blocking.

## Useful local URLs

- Frontend: http://localhost:5173
- Backend health: http://localhost:3001/api/health
- ML health: http://localhost:8000/health
- Uploaded images: http://localhost:3001/uploads/<filename>
