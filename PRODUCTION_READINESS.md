# BagCheck production readiness

## Current verdict

BagCheck is functionally assembled but is **not ready for public production deployment until the required external services, secrets, and deployment checks below are completed**. The application now has MongoDB integration, Cloudinary image storage wiring, live text moderation, semantic matching, authentication, and reproducible Node lockfiles.

## Required production services

1. **MongoDB Atlas or managed MongoDB** for users, universities, campuses, reports, matches, and counters. Use a dedicated database user with the minimum database permissions needed by BagCheck. Restrict Atlas Network Access to the backend and ML service egress IPs; do not use `0.0.0.0/0` in production.
2. **Cloudinary** for durable image storage. The backend accepts the `photo` multipart field, limits uploads to 5 MB, validates image extensions/MIME types, uploads server-side, and stores the returned HTTPS URL in MongoDB. Never put Cloudinary credentials in the frontend.
3. **A continuously running ML service** with the trained `ml/moderate/model.pkl` file and the sentence-transformers model available. The backend should use an internal/private ML URL where the hosting provider supports it.
4. **A public HTTPS frontend** and **public HTTPS API**. Set the frontend `VITE_API_URL` to the API URL and set backend `FRONTEND_URLS` to the exact frontend origin(s), without a trailing slash.
5. **Optional Resend email** with a verified sender domain for rejection notifications.

## Required backend variables

Copy `backend/.env.example` to `backend/.env` only for local use, or create these as protected deployment secrets:

- `NODE_ENV=production`
- `PORT` supplied by the host, normally `3001`
- `JWT_SECRET` as a long random secret, at least 32 characters
- `MONGODB_URI`
- `MONGODB_DB_NAME=bagcheck`
- `FRONTEND_URLS=https://your-real-frontend-domain`
- `ML_SERVICE_URL=https://your-real-ml-domain`
- `ML_SERVICE_TOKEN` with the same randomly generated value in the backend and ML services
- `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET`
- optional `RESEND_API_KEY` and verified `FROM_EMAIL`

The MongoDB URI, JWT secret, Cloudinary API secret, Resend key, and ML service credentials must never be placed in frontend files or committed to Git.

## Image upload production path

The frontend sends `photo` as multipart form data to `POST /api/reports`. Multer holds the image in memory temporarily, rejects files over 5 MB, and accepts JPG/JPEG/PNG/WEBP/GIF. The backend uploads the buffer to Cloudinary and stores only the returned HTTPS URL in MongoDB. This is the correct durable-storage model for ephemeral containers; do not rely on `backend/uploads/` after deployment.

If Cloudinary is not configured, photo posts will fail rather than silently storing files on an ephemeral server. Configure Cloudinary before enabling the public report form.

## Deployment sequence

1. Create the MongoDB database and restricted user, then set `MONGODB_URI` and `MONGODB_DB_NAME`.
2. Deploy the ML service, install `ml/requirements.txt`, train the moderation model with `python -m moderate.train`, and verify `GET /health`.
3. Deploy the backend with its protected variables. Run the seed command only when intentionally initializing an empty demo database.
4. Verify `GET /api/health`, registration/login, `POST /api/reports`, a photo upload, `POST /api/reports/check-content`, and matching with both a match and no-match case.
5. Build and deploy the frontend with `VITE_API_URL` set to the HTTPS API URL.
6. Configure HTTPS, domain restrictions, logs/alerts, database backups, and a rollback procedure before announcing the service.

## Still required before launch

- Choose and configure the production hosting providers for frontend, backend, and ML.
- Store all secrets in the hosting provider's secret manager.
- Add rate limiting and security headers at the API edge or with Express middleware.
- Add monitoring/error tracking and automated backups for MongoDB.
- Run an end-to-end test against staging using real Cloudinary and MongoDB services.
- Review the moderation dataset/model quality with representative university content; the starter classifier is not a substitute for abuse review.
