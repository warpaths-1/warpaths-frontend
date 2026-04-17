# Signup Page
`src/pages/SignupPage.jsx`

## Who sees it
New users creating a player account. Reached via /join or /join?next=<path>.

## Form fields
- Display name (required)
- Email (required)
- Password (required, min 8 chars)
- Confirm password

## API calls
- POST /auth/register → { access_token, token_type, expires_in }
- Store token in sessionStorage as 'warpaths_token'
- On success: redirect to `next` query param if present, else /leaderboard

## Visual direction
Same centered card layout as Login. WarPaths wordmark above.
Link to login below form: "Already have an account? Log in"
