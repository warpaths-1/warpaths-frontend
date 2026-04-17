# Login Page

## Who sees it
Unauthenticated users navigating directly to the platform.

## Two login paths
- Player login: email + password → user JWT → redirect to /game or /account
- Org admin login: email + password + client_id → ClientAdmin JWT → redirect to /org

## API calls
- POST /auth/login → { access_token, token_type, expires_in }
- Store token in sessionStorage as 'warpaths_token'

## Visual direction
Centered card on primary background. WarPaths wordmark above the form.
Minimal — form fields and submit only. Not an acquisition page.
Two tabs: "Player" and "Org Admin". Org Admin tab adds a client_id field.
