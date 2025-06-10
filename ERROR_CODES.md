# API Error Codes

This document provides a comprehensive list of all error codes used in the Zyrotech API. Each error response includes:

- `status`: Either "fail" (4xx errors) or "error" (5xx errors)
- `message`: Human-readable error message
- `code`: Machine-readable error code for frontend handling

## Example Error Response

```json
{
  "status": "fail",
  "message": "Invalid email or password",
  "code": "invalid-credentials"
}
```

## Error Code Categories

### Authentication Error Codes

| Code                   | HTTP Status | Description                                            |
| ---------------------- | ----------- | ------------------------------------------------------ |
| `missing-credentials`  | 400         | Email or password is missing in login request          |
| `invalid-credentials`  | 401         | Invalid email/password combination                     |
| `email-not-verified`   | 403         | Attempting to login with unverified email              |
| `google-auth-required` | 401         | Attempting to login with password for a Google account |

### Registration Error Codes

| Code                      | HTTP Status | Description                                                       |
| ------------------------- | ----------- | ----------------------------------------------------------------- |
| `missing-required-fields` | 400         | Required fields (fullName, email, password) are missing in signup |
| `email-already-exists`    | 409         | Email address is already registered                               |

### Email Verification Error Codes

| Code                     | HTTP Status | Description                                                  |
| ------------------------ | ----------- | ------------------------------------------------------------ |
| `missing-email`          | 400         | Email is not provided in request                             |
| `user-not-found`         | 404         | User with provided email does not exist                      |
| `email-already-verified` | 400         | Email is already verified                                    |
| `otp-cooldown`           | 429         | Too many OTP requests, please wait before requesting another |
| `invalid-otp`            | 400         | OTP is invalid or has expired                                |

### Google Authentication Error Codes

| Code                    | HTTP Status | Description                                   |
| ----------------------- | ----------- | --------------------------------------------- |
| `missing-id-token`      | 400         | Google ID token is missing in request         |
| `google-config-error`   | 500         | Google client IDs are not properly configured |
| `invalid-google-token`  | 401         | Google ID token is invalid                    |
| `missing-google-email`  | 400         | Email is missing from Google profile          |
| `invalid-google-config` | 500         | Google client ID configuration is invalid     |
| `expired-google-token`  | 401         | Google ID token has expired                   |

### Password Reset Error Codes

| Code                   | HTTP Status | Description                                                       |
| ---------------------- | ----------- | ----------------------------------------------------------------- |
| `missing-reset-fields` | 400         | Required fields (token, newPassword, confirmPassword) are missing |
| `passwords-dont-match` | 400         | New password and confirm password do not match                    |
| `password-too-short`   | 400         | Password is less than 8 characters long                           |
| `invalid-reset-token`  | 400         | Reset token is invalid or has expired                             |
| `missing-token`        | 400         | Reset token is not provided                                       |

### Profile Error Codes

| Code                       | HTTP Status | Description                                        |
| -------------------------- | ----------- | -------------------------------------------------- |
| `missing-phone`            | 400         | Phone number is not provided in request            |
| `phone-already-verified`   | 400         | Phone number is already verified                   |
| `missing-otp-fields`       | 400         | Phone number and OTP are required for verification |
| `invalid-pin-format`       | 400         | PIN must be a 6-digit number                       |
| `pin-not-set`              | 400         | PIN has not been set for the account               |
| `invalid-pin`              | 401         | Provided PIN is incorrect                          |
| `missing-password-fields`  | 400         | Current password and new password are required     |
| `invalid-current-password` | 401         | Current password is incorrect                      |

## Frontend Implementation

When handling these errors in the frontend, you should:

1. Check the `code` field to determine the specific error type
2. Use the `message` field to display user-friendly error messages
3. Implement appropriate UI feedback based on the error code
4. Handle rate limiting (429) errors with appropriate cooldown periods
5. Redirect users to appropriate flows (e.g., email verification) when needed

Example frontend error handling:

```typescript
try {
  const response = await api.login(credentials);
  // Handle successful login
} catch (error) {
  switch (error.code) {
    case "invalid-credentials":
      showError("Please check your email and password");
      break;
    case "email-not-verified":
      redirectToEmailVerification();
      break;
    case "google-auth-required":
      showGoogleLoginButton();
      break;
    case "invalid-pin":
      showPinError("Incorrect PIN. Please try again.");
      break;
    case "pin-not-set":
      redirectToSetPin();
      break;
    // Handle other error codes...
  }
}
```
