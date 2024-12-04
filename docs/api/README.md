# Patient PSI API Documentation

## Authentication

All authenticated endpoints require a valid session token provided via an HTTP-only cookie.

### Login

```http
POST /api/auth/login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "password123"
}
```

### Register

```http
POST /api/auth/register
Content-Type: application/json

{
  "name": "John Doe",
  "email": "user@example.com",
  "password": "password123"
}
```

### Participant Login

```http
POST /api/auth/participant-login
Content-Type: application/json

{
  "participantId": "participant123"
}
```

### Logout

```http
POST /api/auth/logout
```

## User Profile

### Get Profile

```http
GET /api/user/profile
```

### Update Profile

```http
PATCH /api/user/profile
Content-Type: application/json

{
  "name": "Updated Name",
  "settings": {
    "theme": "dark",
    "notifications": true,
    "language": "en"
  },
  "metadata": {
    "customField": "value"
  }
}
```

## Response Formats

### Success Response

```json
{
  "success": true,
  "redirect": "/dashboard"
}
```

### Error Response

```json
{
  "error": "Error message"
}
```

## Status Codes

- `200`: Success
- `400`: Bad Request
- `401`: Unauthorized
- `403`: Forbidden
- `404`: Not Found
- `409`: Conflict
- `500`: Internal Server Error

## Authentication Flow

1. User submits credentials via login/register/participant-login
2. Server validates credentials and creates a session
3. Server returns a secure HTTP-only cookie containing the session token
4. Client includes cookie automatically in subsequent requests
5. Server validates token and session for each authenticated request

## Security Considerations

- All tokens are JWT-based and expire after 7 days
- Cookies are HTTP-only to prevent XSS attacks
- CSRF protection via SameSite=Lax cookie attribute
- Passwords are hashed using bcrypt
- Sessions are stored in Redis with automatic expiration
- Rate limiting is applied to authentication endpoints

## Error Handling

All endpoints return consistent error responses:

```json
{
  "error": "Descriptive error message"
}
```

Common error scenarios:
- Invalid credentials
- Session expired
- Invalid input data
- Resource not found
- Server errors

## Data Types

### UserProfile

```typescript
interface UserProfile {
  id: string;
  email: string;
  name: string;
  role: 'admin' | 'therapist' | 'participant';
  settings: {
    theme: 'light' | 'dark';
    notifications: boolean;
    language: string;
  };
  metadata: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}
```

### Session

```typescript
interface Session {
  id: string;
  userId: string;
  createdAt: string;
  lastAccess: string;
  data: Record<string, unknown>;
}
```

## Rate Limiting

- Login: 5 requests per minute per IP
- Register: 3 requests per minute per IP
- Other endpoints: 60 requests per minute per user

## Best Practices

1. Always handle error responses
2. Implement proper token refresh logic
3. Use type-safe API clients
4. Validate input data on the client side
5. Implement proper error recovery
6. Monitor authentication failures
7. Implement proper logging

For detailed OpenAPI/Swagger documentation, see [openapi.yaml](./openapi.yaml)
