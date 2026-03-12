# Artisan Marketplace Backend API

A comprehensive backend API for an Artisan Service Marketplace platform similar to TaskRabbit. Built with Node.js, Express, MongoDB, and Socket.io.

## Features

- **Authentication & Authorization**: JWT-based auth with role-based access control
- **User Management**: Users, Artisans, and Admin roles
- **Booking System**: Complete booking lifecycle management
- **Payment Integration**: Paystack payment gateway with webhook support
- **Real-time Chat**: Socket.io powered messaging system
- **Review & Rating**: Review system with moderation
- **Service Categories**: Categorized artisan services

## Tech Stack

- **Runtime**: Node.js
- **Framework**: Express.js
- **Database**: MongoDB with Mongoose
- **Authentication**: JWT (JSON Web Tokens)
- **Real-time**: Socket.io
- **Payment**: Paystack
- **File Storage**: Cloudinary
- **Email**: Nodemailer
- **Validation**: express-validator
- **Security**: helmet, cors, express-rate-limit

## Project Structure

```
backend/
├── config/           # Configuration files
│   ├── db.js        # Database connection
│   └── cloudinary.js # Cloudinary config
├── controllers/      # Route controllers
├── middleware/       # Express middleware
│   ├── auth.js      # Authentication middleware
│   ├── errorHandler.js # Error handling
│   ├── validation.js   # Input validation
│   └── rateLimiter.js  # Rate limiting
├── models/          # Mongoose models
├── routes/          # API routes
├── services/        # Business logic services
│   ├── paymentService.js # Paystack integration
│   └── emailService.js   # Email service
├── sockets/         # Socket.io handlers
├── utils/           # Utility functions
├── uploads/         # File uploads directory
├── seed/            # Database seeding
├── app.js           # Express app setup
├── server.js        # Server entry point
└── package.json
```

## Getting Started

### Prerequisites

- Node.js (v18 or higher)
- MongoDB (local or Atlas)
- Paystack account (for payments)
- Cloudinary account (for image uploads)

### Installation

1. Clone the repository
2. Navigate to backend directory:
   ```bash
   cd backend
   ```

3. Install dependencies:
   ```bash
   npm install
   ```

4. Create `.env` file from example:
   ```bash
   cp .env.example .env
   ```

5. Update `.env` with your configuration:
   ```env
   PORT=5000
   MONGODB_URI=mongodb://localhost:27017/artisan_marketplace
   JWT_SECRET=your_jwt_secret_key
   JWT_REFRESH_SECRET=your_refresh_secret
   PAYSTACK_SECRET_KEY=sk_test_your_key
   CLOUDINARY_CLOUD_NAME=your_cloud_name
   CLOUDINARY_API_KEY=your_api_key
   CLOUDINARY_API_SECRET=your_api_secret
   ```

6. Seed the database:
   ```bash
   npm run seed
   ```

7. Start the server:
   ```bash
   # Development mode
   npm run dev
   
   # Production mode
   npm start
   ```

## API Documentation

### Authentication Endpoints

| Method | Endpoint | Description | Access |
|--------|----------|-------------|--------|
| POST | `/api/auth/register` | Register new user | Public |
| POST | `/api/auth/login` | Login user | Public |
| POST | `/api/auth/logout` | Logout user | Private |
| GET | `/api/auth/me` | Get current user | Private |
| PUT | `/api/auth/update-profile` | Update profile | Private |
| PUT | `/api/auth/change-password` | Change password | Private |
| POST | `/api/auth/forgot-password` | Request password reset | Public |
| POST | `/api/auth/reset-password/:token` | Reset password | Public |

### User Endpoints

| Method | Endpoint | Description | Access |
|--------|----------|-------------|--------|
| GET | `/api/users/dashboard` | User dashboard | Private |
| GET | `/api/users/bookings` | User bookings | Private |
| GET | `/api/users/reviews` | User reviews | Private |

### Artisan Endpoints

| Method | Endpoint | Description | Access |
|--------|----------|-------------|--------|
| GET | `/api/artisans` | List artisans | Public |
| GET | `/api/artisans/:id` | Get artisan details | Public |
| POST | `/api/artisans` | Create artisan profile | Private |
| PUT | `/api/artisans/:id` | Update artisan profile | Artisan |
| GET | `/api/artisans/dashboard/me` | Artisan dashboard | Artisan |
| GET | `/api/artisans/bookings/me` | Artisan bookings | Artisan |

### Booking Endpoints

| Method | Endpoint | Description | Access |
|--------|----------|-------------|--------|
| GET | `/api/bookings` | List bookings | Admin |
| POST | `/api/bookings` | Create booking | Private |
| GET | `/api/bookings/:id` | Get booking details | Private |
| PUT | `/api/bookings/:id/status` | Update booking status | Private |
| PUT | `/api/bookings/:id/cancel` | Cancel booking | Private |

### Payment Endpoints

| Method | Endpoint | Description | Access |
|--------|----------|-------------|--------|
| POST | `/api/payments/initialize` | Initialize payment | Private |
| GET | `/api/payments/verify` | Verify payment | Private |
| GET | `/api/payments/my-payments` | User payments | Private |
| POST | `/api/payments/webhook` | Paystack webhook | Public |

### Review Endpoints

| Method | Endpoint | Description | Access |
|--------|----------|-------------|--------|
| GET | `/api/reviews` | List reviews | Public |
| POST | `/api/reviews` | Create review | Private |
| GET | `/api/reviews/artisan/:id` | Artisan reviews | Public |
| PUT | `/api/reviews/:id` | Update review | Private |

### Message Endpoints

| Method | Endpoint | Description | Access |
|--------|----------|-------------|--------|
| GET | `/api/messages/conversations` | List conversations | Private |
| POST | `/api/messages/conversations` | Create conversation | Private |
| GET | `/api/messages/conversations/:id/messages` | Get messages | Private |
| POST | `/api/messages/conversations/:id/messages` | Send message | Private |

### Admin Endpoints

| Method | Endpoint | Description | Access |
|--------|----------|-------------|--------|
| GET | `/api/admin/dashboard` | Admin dashboard | Admin |
| GET | `/api/admin/users` | List all users | Admin |
| GET | `/api/admin/artisans` | List all artisans | Admin |
| GET | `/api/admin/bookings` | List all bookings | Admin |
| GET | `/api/admin/payments` | List all payments | Admin |
| GET | `/api/admin/analytics` | System analytics | Admin |

## Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `PORT` | Server port | No (default: 5000) |
| `NODE_ENV` | Environment mode | No (default: development) |
| `MONGODB_URI` | MongoDB connection string | Yes |
| `JWT_SECRET` | JWT secret key | Yes |
| `JWT_REFRESH_SECRET` | JWT refresh token secret | Yes |
| `PAYSTACK_SECRET_KEY` | Paystack secret key | Yes |
| `CLOUDINARY_CLOUD_NAME` | Cloudinary cloud name | Yes |
| `CLOUDINARY_API_KEY` | Cloudinary API key | Yes |
| `CLOUDINARY_API_SECRET` | Cloudinary API secret | Yes |
| `CLIENT_URL` | Frontend URL | No (default: http://localhost:5173) |

## Scripts

```bash
# Start server
npm start

# Development mode with hot reload
npm run dev

# Seed database
npm run seed
```

## Socket.io Events

### Client to Server

| Event | Description | Payload |
|-------|-------------|---------|
| `join_conversation` | Join a conversation room | `{ conversationId }` |
| `leave_conversation` | Leave a conversation room | `{ conversationId }` |
| `send_message` | Send a message | `{ conversationId, content, messageType }` |
| `typing` | Typing indicator | `{ conversationId, isTyping }` |
| `mark_read` | Mark messages as read | `{ conversationId }` |

### Server to Client

| Event | Description | Payload |
|-------|-------------|---------|
| `new_message` | New message received | `{ conversationId, message }` |
| `message_edited` | Message was edited | `{ conversationId, message }` |
| `message_deleted` | Message was deleted | `{ conversationId, messageId }` |
| `user_typing` | User is typing | `{ conversationId, user, isTyping }` |
| `participant_read` | Participant read messages | `{ conversationId, userId }` |

## Error Handling

The API uses consistent error responses:

```json
{
  "success": false,
  "message": "Error description",
  "errorCode": "ERROR_CODE",
  "errors": ["Detailed errors"] // Optional
}
```

## License

MIT
