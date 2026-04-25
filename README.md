# Findit_Backend
Backend Repository for the FindIt CTSE Smart Campus Lost &amp; Found

# To run the Backend
cd infra
docker compose up -d --build

# Re-Build and run again
docker compose up -d --build

# To check containers and logs
docker compose ps
docker compose logs -f

# To stop the backend
docker compose down

# How to run ubuntu machine AWS locally
1. go to the downloads root through terminal
2. type chmod 400 FindIt\ Key.pem (this will allow to execute security file).
3. ssh -i FindIt\ Key.pem ubuntu@54.254.67.207

