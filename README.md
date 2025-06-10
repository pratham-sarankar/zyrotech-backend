# Zyrotech Backend API

Backend API for Zyrotech built with Express.js and TypeScript.

## Overview

This is the backend API for the Zyrotech application, providing authentication, user management, and other core functionalities.

## Features

- User authentication (Email/Password and Google OAuth)
- Email and phone verification
- PIN-based security
- Password management
- Profile management

## Getting Started

### Prerequisites

- Node.js (v14 or higher)
- MongoDB
- Google OAuth credentials (for Google Sign-in)

### Installation

1. Clone the repository
2. Install dependencies:
   ```bash
   npm install
   ```
3. Create a `.env` file with required environment variables:
   ```
   PORT=3000
   MONGODB_URI=mongodb://localhost:27017/zyrotech
   JWT_SECRET=your-secret-key
   GOOGLE_CLIENT_ID=your-google-client-id
   GOOGLE_IOS_CLIENT_ID=your-google-ios-client-id
   ```
4. Start the development server:
   ```bash
   npm run dev
   ```

## API Documentation

The API uses standardized error codes for consistent error handling. See [ERROR_CODES.md](ERROR_CODES.md) for a complete list of error codes and their descriptions.

### Error Handling

All API responses follow a consistent format:

```json
{
  "status": "fail", // or "error" for 5xx errors
  "message": "Human readable error message",
  "code": "machine-readable-error-code"
}
```

For detailed error codes and frontend implementation guidelines, refer to [ERROR_CODES.md](ERROR_CODES.md).

## Available Scripts

- `npm run dev` - Start development server with hot reload
- `npm run build` - Build for production
- `npm start` - Start production server

## License

ISC
