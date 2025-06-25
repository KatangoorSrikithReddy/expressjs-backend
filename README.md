# TBackend - Express.js Authentication API

A complete authentication system built with Express.js, Node.js, and PostgreSQL featuring user registration, login, password reset, email verification, and session management.

## Features

- 🔐 **User Authentication**: Register, login, logout with JWT tokens
- 📧 **Email Verification**: Secure email verification system
- 🔑 **Password Reset**: Forgot password and reset functionality
- 🛡️ **Security**: Rate limiting, input validation, password hashing
- 📱 **Session Management**: Multi-device session tracking
- 🔒 **Account Security**: Account locking, failed login attempts tracking
- 📊 **Database**: PostgreSQL with optimized indexes and constraints

## Tech Stack

- **Backend**: Express.js, Node.js
- **Database**: PostgreSQL
- **Authentication**: JWT, bcryptjs
- **Email**: Nodemailer
- **Validation**: express-validator
- **Security**: Helmet, CORS, Rate Limiting

## Prerequisites

- Node.js (v14 or higher)
- PostgreSQL (v12 or higher)
- npm or yarn

## Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd TBackend
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   ```bash
   cp env.example .env
   ```
   
   Edit `.env` file with your configuration:
   ```env
   # Server Configuration
   PORT=3000
   NODE_ENV=development

   # Database Configuration
   DB_HOST=localhost
   DB_PORT=5432
   DB_NAME=tbackend_db
   DB_USER=postgres
   DB_PASSWORD=your_password

   # JWT Configuration
   JWT_SECRET=your_jwt_secret_key_here_make_it_long_and_secure
   JWT_EXPIRES_IN=24h
   JWT_REFRESH_EXPIRES_IN=7d

   # Email Configuration
   EMAIL_HOST=smtp.gmail.com
   EMAIL_PORT=587
   EMAIL_USER=your_email@gmail.com
   EMAIL_PASS=your_app_password
   EMAIL_FROM=noreply@yourdomain.com
   ```

4. **Set up PostgreSQL database**
   ```sql
   -- Create database
   CREATE DATABASE tbackend_db;
   
   -- Run the schema
   \i database/schema.sql
   ```

5. **Start the server**
   ```bash
   # Development
   npm run dev
   
   # Production
   npm start
   ```

## API Endpoints

### Authentication Endpoints

#### POST `/api/v1/register`
Register a new user account.

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "SecurePass123!",
  "name": "John Doe",
  "mobile_number": "1234567890"
}
```

**Response:**
```json
{
  "success": true,
  "message": "User registered successfully. Please check your email for verification.",
  "data": {
    "user": {
      "id": "uuid",
      "email": "user@example.com",
      "name": "John Doe",
      "mobile_number": "1234567890",
      "email_verified": false
    }
  }
}
```

#### POST `/api/v1/login`
Authenticate user and get access token.

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "SecurePass123!"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Login successful",
  "data": {
    "user": {
      "id": "uuid",
      "email": "user@example.com",
      "name": "John Doe",
      "mobile_number": "1234567890",
      "email_verified": true,
      "last_login_at": "2024-01-01T00:00:00.000Z"
    },
    "token": "jwt_token_here",
    "refreshToken": "refresh_token_here"
  }
}
```

#### POST `/api/v1/forgot-password`
Request password reset email.

**Request Body:**
```json
{
  "email": "user@example.com"
}
```

#### POST `/api/v1/reset-password`
Reset password using token from email.

**Request Body:**
```json
{
  "token": "reset_token_from_email",
  "password": "NewSecurePass123!"
}
```

#### POST `/api/v1/verify-email`
Verify email address using token.

**Request Body:**
```json
{
  "token": "verification_token_from_email"
}
```

#### POST `/api/v1/logout`
Logout user (requires authentication).

**Headers:**
```
Authorization: Bearer <jwt_token>
```

#### POST `/api/v1/refresh-token`
Refresh JWT token using refresh token.

**Request Body:**
```json
{
  "refreshToken": "refresh_token_here"
}
```

### User Management Endpoints

#### GET `/api/v1/user/profile`
Get user profile (requires authentication).

#### PUT `/api/v1/user/profile`
Update user profile (requires authentication).

**Request Body:**
```json
{
  "name": "Updated Name",
  "mobile_number": "9876543210"
}
```

#### POST `/api/v1/user/change-password`
Change user password (requires authentication).

**Request Body:**
```json
{
  "currentPassword": "OldPassword123!",
  "newPassword": "NewPassword123!"
}
```

#### GET `/api/v1/user/sessions`
Get all active sessions (requires authentication).

#### DELETE `/api/v1/user/sessions/:sessionId`
Terminate specific session (requires authentication).

#### POST `/api/v1/user/logout-all`
Logout from all devices (requires authentication).

#### POST `/api/v1/user/deactivate`
Deactivate user account (requires authentication and email verification).

#### POST `/api/v1/user/resend-verification`
Resend email verification (requires authentication).

## Database Schema

### Users Table
- `id` (UUID, Primary Key)
- `email` (VARCHAR, Unique)
- `password` (VARCHAR, Hashed)
- `name` (VARCHAR)
- `mobile_number` (VARCHAR)
- `is_active` (BOOLEAN)
- `email_verified` (BOOLEAN)
- `account_locked` (BOOLEAN)
- `failed_login_attempts` (INTEGER)
- `last_login_at` (TIMESTAMP)
- Social login fields
- Audit fields (created_by, updated_by, created_on, updated_on)

### Password Reset Tokens Table
- `id` (UUID, Primary Key)
- `user_id` (UUID, Foreign Key)
- `token` (VARCHAR, Unique)
- `expires_at` (TIMESTAMP)
- `used` (BOOLEAN)
- Audit fields

### Email Verification Tokens Table
- `id` (UUID, Primary Key)
- `contact_value` (VARCHAR)
- `token` (VARCHAR)
- `expires_at` (TIMESTAMP)
- `contact_type` (VARCHAR)
- `verified` (BOOLEAN)
- Audit fields

### User Sessions Table
- `id` (UUID, Primary Key)
- `user_id` (UUID, Foreign Key)
- `session_token` (VARCHAR, Unique)
- `refresh_token` (VARCHAR, Unique)
- `expires_at` (TIMESTAMP)
- `refresh_expires_at` (TIMESTAMP)
- `is_active` (BOOLEAN)
- Audit fields

## Security Features

- **Password Hashing**: bcryptjs with salt rounds
- **JWT Authentication**: Secure token-based authentication
- **Rate Limiting**: Prevents brute force attacks
- **Input Validation**: Comprehensive request validation
- **Account Locking**: Automatic account lock after failed attempts
- **Session Management**: Secure session tracking
- **CORS Protection**: Configurable cross-origin requests
- **Helmet**: Security headers

## Email Configuration

The system supports email notifications for:
- Email verification
- Password reset
- Welcome emails

Configure your email settings in the `.env` file. For Gmail, you'll need to:
1. Enable 2-factor authentication
2. Generate an app password
3. Use the app password in `EMAIL_PASS`

## Development

### Running in Development Mode
```bash
npm run dev
```

### Running Tests
```bash
npm test
```

### Database Migrations
The database schema is defined in `database/schema.sql`. Run this file to set up your database.

## Error Handling

The API returns consistent error responses:

```json
{
  "success": false,
  "message": "Error description",
  "errors": [
    {
      "field": "email",
      "message": "Invalid email format"
    }
  ]
}
```

## Rate Limiting

- Default: 100 requests per 15 minutes per IP
- Configurable via environment variables
- Applies to all endpoints

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `PORT` | Server port | 3000 |
| `NODE_ENV` | Environment | development |
| `DB_HOST` | Database host | localhost |
| `DB_PORT` | Database port | 5432 |
| `DB_NAME` | Database name | tbackend_db |
| `DB_USER` | Database user | postgres |
| `DB_PASSWORD` | Database password | - |
| `JWT_SECRET` | JWT secret key | - |
| `JWT_EXPIRES_IN` | JWT expiration | 24h |
| `EMAIL_HOST` | SMTP host | - |
| `EMAIL_PORT` | SMTP port | 587 |
| `EMAIL_USER` | SMTP username | - |
| `EMAIL_PASS` | SMTP password | - |
| `EMAIL_FROM` | From email address | - |

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## License

MIT License - see LICENSE file for details.

## Support

For support and questions, please open an issue in the repository. 