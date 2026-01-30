# Authentication Patterns

<!-- This is an EXAMPLE KB file demonstrating the required structure and style.
     It shows best practices for documenting reusable technical patterns. -->

## Why This Exists

Modern web applications need secure, maintainable authentication that works across different projects. This knowledge base file documents proven authentication patterns for React/Next.js applications, including OAuth2, JWT tokens, and session management. These patterns solve common security vulnerabilities and provide consistent user experiences.

**Problem solved:** Without standardized auth patterns, teams reinvent authentication for each project, often introducing security issues like CSRF vulnerabilities, insecure token storage, or poor session management.

## When to Use It

Reference this KB file when:

- Implementing user authentication in a new React/Next.js project
- Choosing between session-based vs token-based authentication
- Integrating OAuth2 providers (Google, GitHub, etc.)
- Deciding where to store authentication tokens securely
- Implementing protected routes or API endpoints
- Handling token refresh flows

**Specific triggers:**

- User story mentions "login", "signup", or "authentication"
- API requires authentication headers
- Need to restrict access to certain routes or components
- Implementing SSO (Single Sign-On)

## Details

### OAuth2 Flow (Recommended for Third-Party Auth)

Use OAuth2 when authenticating with external providers like Google, GitHub, or Auth0.

**Implementation pattern:**

```javascript
// 1. Redirect to provider
const handleLogin = () => {
  const authUrl = `${OAUTH_PROVIDER_URL}?client_id=${CLIENT_ID}&redirect_uri=${REDIRECT_URI}&state=${generateState()}`;
  window.location.href = authUrl;
};

// 2. Handle callback (e.g., /api/auth/callback route)
export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get('code');
  const state = searchParams.get('state');
  
  // Verify state parameter (prevents CSRF)
  if (state !== getStoredState()) {
    return new Response('Invalid state', { status: 400 });
  }
  
  // Exchange code for tokens
  const tokens = await exchangeCodeForTokens(code);
  
  // Store tokens securely (httpOnly cookie)
  return new Response('Success', {
    headers: {
      'Set-Cookie': `token=${tokens.access_token}; HttpOnly; Secure; SameSite=Strict; Path=/`
    }
  });
}
```text

**Security considerations:**

- Always validate `state` parameter to prevent CSRF attacks
- Use PKCE (Proof Key for Code Exchange) for public clients
- Store access tokens in httpOnly cookies, never localStorage
- Use short-lived access tokens (15-30 minutes) with refresh tokens

### JWT Token-Based Authentication

Use JWT tokens for API authentication when you control both client and server.

**Token storage:**

- ✅ **httpOnly cookies** - Most secure, prevents XSS attacks
- ⚠️ **sessionStorage** - Acceptable for SPAs, lost on tab close
- ❌ **localStorage** - Vulnerable to XSS, avoid for sensitive tokens

**Implementation pattern:**

```javascript
// Server: Generate JWT on login
import jwt from 'jsonwebtoken';

export async function POST(request) {
  const { email, password } = await request.json();
  const user = await validateCredentials(email, password);
  
  if (!user) {
    return new Response('Invalid credentials', { status: 401 });
  }
  
  // Create JWT with short expiration
  const token = jwt.sign(
    { userId: user.id, email: user.email },
    process.env.JWT_SECRET,
    { expiresIn: '15m' }
  );
  
  // Create refresh token
  const refreshToken = jwt.sign(
    { userId: user.id },
    process.env.REFRESH_SECRET,
    { expiresIn: '7d' }
  );
  
  return new Response(JSON.stringify({ success: true }), {
    headers: {
      'Set-Cookie': [
        `token=${token}; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=900`,
        `refreshToken=${refreshToken}; HttpOnly; Secure; SameSite=Strict; Path=/api/auth/refresh; Max-Age=604800`
      ]
    }
  });
}

// Client: Use token in requests (automatic with httpOnly cookies)
// Tokens sent automatically by browser with each request
```text

**Refresh token pattern:**

```javascript
// /api/auth/refresh route
export async function POST(request) {
  const refreshToken = request.cookies.get('refreshToken');
  
  if (!refreshToken) {
    return new Response('No refresh token', { status: 401 });
  }
  
  try {
    const payload = jwt.verify(refreshToken, process.env.REFRESH_SECRET);
    
    // Issue new access token
    const newToken = jwt.sign(
      { userId: payload.userId },
      process.env.JWT_SECRET,
      { expiresIn: '15m' }
    );
    
    return new Response('OK', {
      headers: {
        'Set-Cookie': `token=${newToken}; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=900`
      }
    });
  } catch (error) {
    return new Response('Invalid refresh token', { status: 401 });
  }
}
```text

### Session-Based Authentication

Use sessions when you need server-side state or are building traditional server-rendered apps.

**When to choose sessions:**

- Traditional server-rendered applications (not SPAs)
- Need server-side state (shopping cart, multi-step forms)
- Compliance requires server-side session management
- Using frameworks with built-in session support (Next.js with next-auth)

**Implementation with next-auth (recommended):**

```javascript
// pages/api/auth/[...nextauth].js
import NextAuth from 'next-auth';
import GoogleProvider from 'next-auth/providers/google';

export default NextAuth({
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    }),
  ],
  session: {
    strategy: 'jwt', // Use JWT instead of database sessions for scalability
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.userId = user.id;
      }
      return token;
    },
    async session({ session, token }) {
      session.user.id = token.userId;
      return session;
    },
  },
});

// Use in components
import { useSession } from 'next-auth/react';

function ProtectedComponent() {
  const { data: session, status } = useSession();
  
  if (status === 'loading') return <div>Loading...</div>;
  if (status === 'unauthenticated') return <div>Access Denied</div>;
  
  return <div>Welcome {session.user.email}</div>;
}
```text

### Protected Routes Pattern

**Client-side protection (for UX, not security):**

```javascript
// components/ProtectedRoute.jsx
import { useAuth } from '@/hooks/useAuth';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

export function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();
  const router = useRouter();
  
  useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
    }
  }, [user, loading, router]);
  
  if (loading) return <div>Loading...</div>;
  if (!user) return null;
  
  return children;
}
```text

**Server-side protection (for security):**

```javascript
// app/dashboard/page.jsx (Next.js 13+ App Router)
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import jwt from 'jsonwebtoken';

export default async function DashboardPage() {
  const token = cookies().get('token')?.value;
  
  if (!token) {
    redirect('/login');
  }
  
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    // User is authenticated, render page
    return <div>Dashboard for user {payload.userId}</div>;
  } catch (error) {
    redirect('/login');
  }
}
```text

### Decision Matrix

| Pattern | Best For | Pros | Cons |
| ------- | -------- | ---- | ---- |
| OAuth2 | Third-party auth (Google, GitHub) | No password management, trusted providers | Requires external service, more complex |
| JWT | SPAs, microservices, stateless APIs | Scalable, no server session storage | Token revocation is complex |
| Sessions | Traditional apps, server-rendered | Simple revocation, server-side state | Requires session storage, less scalable |

### Common Mistakes to Avoid

❌ **Storing tokens in localStorage** - Vulnerable to XSS attacks  
❌ **Not validating state parameter in OAuth2** - CSRF vulnerability  
❌ **Long-lived access tokens without refresh tokens** - Security risk  
❌ **Client-side only route protection** - Not secure, always verify server-side  
❌ **Hardcoding secrets in code** - Use environment variables  
❌ **Not using HTTPS** - Tokens exposed in transit

### Related Patterns

- See `server-cache-react.md` for caching authenticated API responses
- See `async-api-routes.md` for handling authentication in API routes
- Consider using libraries: `next-auth`, `Auth0`, `Clerk`, `Supabase Auth`

## See Also

- **[Security Patterns](../infrastructure/security-patterns.md)** - Security best practices and input validation
- **[API Design Patterns](api-design-patterns.md)** - API authentication and authorization
- **[Error Handling Patterns](error-handling-patterns.md)** - Authentication error handling
- **[Database Patterns](database-patterns.md)** - Session storage (database vs Redis)

## References

- [OAuth 2.0 Specification](https://oauth.net/2/)
- [JWT Best Practices](https://tools.ietf.org/html/rfc8725)
- [OWASP Authentication Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Authentication_Cheat_Sheet.html)
- [Next.js Authentication Docs](https://nextjs.org/docs/authentication)
