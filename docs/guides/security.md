---
layout: default
title: Security
nav_order: 17
---

# Security

Securing your prestruct application.

## Security Headers

Prestruct includes security headers via `public/_headers`. Here's what each does:

```
/*
  X-Frame-Options: DENY
  X-Content-Type-Options: nosniff
  Referrer-Policy: strict-origin-when-cross-origin
  Content-Security-Policy: default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self'; connect-src 'self' https:
```

### Header Explained

| Header | Purpose | Value |
|--------|---------|-------|
| `X-Frame-Options` | Prevents clickjacking | `DENY` or `SAMEORIGIN` |
| `X-Content-Type-Options` | Prevents MIME sniffing | `nosniff` |
| `Referrer-Policy` | Controls referrer info | `strict-origin-when-cross-origin` |
| `Content-Security-Policy` | XSS prevention | Custom policy |

### Customizing CSP

Update `public/_headers` for your needs:

```
/*
  Content-Security-Policy: default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self' data:; connect-src 'self' https://api.example.com https://analytics.example.com; frame-ancestors 'none'
```

## Input Validation

### Validate All Input

```jsx
// In your components
function ContactForm() {
  const [email, setEmail] = useState('')
  
  const handleSubmit = async (e) => {
    e.preventDefault()
    
    // Validate email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      setError('Invalid email address')
      return
    }
    
    // Sanitize input
    const sanitized = DOMPurify.sanitize(email)
    
    // Send to API
    await fetch('/api/contact', {
      method: 'POST',
      body: JSON.stringify({ email: sanitized }),
    })
  }
  
  // ... form JSX
}
```

### Install DOMPurify

```bash
npm install dompurify
```

```jsx
import DOMPurify from 'dompurify'

// Sanitize user HTML
const clean = DOMPurify.sanitize(dirtyHtml)
```

## XSS Prevention

### Never Use innerHTML

```jsx
// BAD - vulnerable to XSS
function Comment({ text }) {
  return <div dangerouslySetInnerHTML={{ __html: text }} />
}

// GOOD - render as text
function Comment({ text }) {
  return <div>{text}</div>
}

// GOOD - if you must, sanitize first
import DOMPurify from 'dompurify'
function Comment({ text }) {
  return <div dangerouslySetInnerHTML={{ 
    __html: DOMPurify.sanitize(text) 
  }} />
}
```

### Escape Output

```jsx
// Using React automatically escapes
// This is safe:
return <span>{userInput}</span>

// This is dangerous:
return <span dangerouslySetInnerHTML={{ __html: userInput }} />
```

## CSRF Protection

### For API Calls

```js
// Add CSRF token to requests
async function apiRequest(url, options = {}) {
  const csrfToken = document.querySelector('meta[name="csrf-token"]')?.content
  
  return fetch(url, {
    ...options,
    headers: {
      ...options.headers,
      'X-CSRF-Token': csrfToken || '',
      'Content-Type': 'application/json',
    },
  })
}
```

### Generate Tokens Server-Side

In prerender.js or via an API:

```js
// Generate CSRF token
function generateCsrfToken() {
  return crypto.randomBytes(32).toString('hex')
}

// Include in HTML
html = html.replace(
  '<head>',
  `<head><meta name="csrf-token" content="${generateCsrfToken()}">`
)
```

## Authentication

### Secure Token Storage

```jsx
// Use httpOnly cookies, not localStorage for sensitive tokens
// localStorage is accessible via XSS

// BAD
localStorage.setItem('token', 'abc123')

// GOOD - set as httpOnly cookie from server
// Then send with requests
async function authenticatedRequest(url, options = {}) {
  return fetch(url, {
    ...options,
    credentials: 'include', // Send cookies
  })
}
```

### Session Management

```jsx
function useSession() {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  
  useEffect(() => {
    // Verify session on mount
    fetch('/api/session', { credentials: 'include' })
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        setUser(data?.user)
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [])
  
  const logout = async () => {
    await fetch('/api/logout', { 
      method: 'POST',
      credentials: 'include' 
    })
    setUser(null)
  }
  
  return { user, loading, logout }
}
```

## Rate Limiting

### Client-Side (Basic)

```jsx
// Prevent button spam
function SubmitButton() {
  const [submitting, setSubmitting] = useState(false)
  
  const handleClick = async () => {
    if (submitting) return
    
    setSubmitting(true)
    try {
      await doSubmit()
    } finally {
      setSubmitting(false)
    }
  }
  
  return <button onClick={handleClick} disabled={submitting}>
    {submitting ? 'Sending...' : 'Submit'}
  </button>
}
```

### Server-Side (Cloudflare)

Cloudflare handles rate limiting at the edge. Configure in Cloudflare Dashboard:

1. **Security** → **WAF** → **Rate limiting**
2. Create rule:
   - URI path: `/api/*`
   - Condition: > 100 requests per minute
   - Action: Block for 5 minutes

## Dependencies

### Keep Updated

```bash
# Check for vulnerabilities
npm audit

# Update dependencies
npm update

# Use npm-check-updates
npx npm-check-updates -u
npm install
```

### Audit CI

```yaml
# .github/workflows/security.yml
name: Security Audit

on: [push]

jobs:
  audit:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
      
      - name: Install
        run: npm ci
      
      - name: Audit
        run: npm audit --audit-level=high
      
      - name: Snyk
        uses: snyk/actions/node@master
        env:
          SNYK_TOKEN: ${{ secrets.SNYK_TOKEN }}
```

## Content Security Policy Deep Dive

### Strict CSP

```
Content-Security-Policy: 
  default-src 'none';
  script-src 'self';
  style-src 'self' 'unsafe-inline';
  img-src 'self' data: https:;
  font-src 'self';
  connect-src 'self' https://api.example.com;
  frame-ancestors 'none';
  base-uri 'self';
  form-action 'self';
```

### With Google Analytics

```
Content-Security-Policy: 
  default-src 'self';
  script-src 'self' https://www.googletagmanager.com https://www.google-analytics.com;
  style-src 'self' 'unsafe-inline';
  img-src 'self' data: https: https://www.google-analytics.com;
  font-src 'self';
  connect-src 'self' https://www.google-analytics.com https://region1.analytics.google.com;
  frame-ancestors 'none';
```

### Report Violations

```
Content-Security-Policy-Report-Only: 
  default-src 'self';
  report-uri https://example.com/csp-report;
  report-to csp-endpoint;
```

## Secure Headers for API Routes

If using Cloudflare Pages Functions:

```js
// functions/api/*.js
export function onRequestGet({ request }) {
  return new Response(JSON.stringify({ data: 'ok' }), {
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'no-store',
      'X-Content-Type-Options': 'nosniff',
    }
  })
}
```

## Security Checklist

- [ ] CSP headers configured
- [ ] X-Frame-Options set
- [ ] X-Content-Type-Options set
- [ ] No innerHTML without sanitization
- [ ] Input validation on all forms
- [ ] CSRF tokens for mutations
- [ ] httpOnly cookies for auth
- [ ] Dependencies up to date
- [ ] npm audit passing
- [ ] Rate limiting configured
- [ ] No sensitive data in client code
- [ ] Source maps disabled in production

## Common Vulnerabilities

| Vulnerability | Prevention |
|---------------|------------|
| XSS | Escape output, CSP, DOMPurify |
| CSRF | CSRF tokens, SameSite cookies |
| Clickjacking | X-Frame-Options: DENY |
| MIME sniffing | X-Content-Type-Options: nosniff |
| Dependency vulnerabilities | npm audit, Dependabot |
| Information disclosure | Remove stack traces in production |