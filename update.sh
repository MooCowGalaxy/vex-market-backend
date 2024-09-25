set -e

git pull
npm i
rm .env
infisical export --format=dotenv --projectId 780cdbc8-02ac-492c-8c45-a254311dcf3b > .env
npm run build
pm2 restart vex-backend
