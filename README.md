# VEX Market Backend
Backend service for VEX Market, handling user authentication, listings, messaging, file uploads, and other business logic.
## Features
- RESTful API endpoints for frontend functionality
- Real-time WebSocket server using socket.io for messaging
- File upload handling to Bunny.net CDN
- Email notification system with retry capabilities
- Search indexing with Meilisearch
## Getting Started
### Prerequisites
- Node.js 20.x or higher
- PostgreSQL 14.x or higher
- Bunny.net storage bucket and public endpoint for CDN
- RabbitMQ instance for mail delivery queue
- Meilisearch instance
- SMTP server
### Installation
1. Clone the repository:
```bash
git clone https://github.com/MooCowGalaxy/vex-market-backend.git
```
2. Install dependencies:
```bash
cd vex-market-backend
npm install
```
3. Copy `.env.example` to `.env` and edit the variables
```bash
cp .env.example .env
nano .env  # or your favorite CLI text editor
```
4. Run database migrations:
```bash
npx prisma migrate dev
```
5. Start the server:
```bash
npm run start:dev
```
The server will be running at http://localhost:3000 by default, but the port can be specified in `.env`
## Project Structure
```
data/                   # US city names and ZIP codes
mailer/
  └── process-queue.ts  # worker process to handle mail delivery from RabbitMQ - can run multiple instances
prisma/                 # Database schema definition and SQL migration files
scripts/
  └── addZipPrisma.js   # Add US cities and zip codes from `data/USCities.json` to the database
src/
  ├── auth/             # User account routes
  ├── db/               # Databse connector
  ├── listings/         # Listing routes
  ├── location/         # ZIP/city lookup routes
  └── messages/         # WebSocket server + messaging routes
```
## Technologies Used
- Nest.js
- TypeScript
- PostgreSQL with Prisma.js ORM
- Socket.io
- RabbitMQ
- Meilisearch
