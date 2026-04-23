---
layout: default
title: Images
nav_order: 22
---

# Images

Image optimization for prestruct - formats, responsive images, lazy loading.

## Recommended Formats

| Format | Use Case | Browser Support |
|--------|----------|-----------------|
| **WebP** | Photos, complex | 93%+ |
| **AVIF** | Best compression | 80%+ |
| **PNG** | Transparency | All |
| **SVG** | Icons, logos | All |

## Responsive Images

### srcset and sizes

```jsx
<img
  src="/images/hero-800.webp"
  srcset="
    /images/hero-400.webp 400w,
    /images/hero-800.webp 800w,
    /images/hero-1200.webp 1200w
  "
  sizes="
    (max-width: 600px) 400px,
    (max-width: 1200px) 800px,
    1200px
  "
  alt="Hero"
  width={1200}
  height={600}
  loading="eager"
/>
```

### Picture Element (format fallback)

```jsx
<picture>
  <source srcset="hero.avif" type="image/avif" />
  <source srcset="hero.webp" type="image/webp" />
  <img src="hero.jpg" alt="Hero" width={1200} height={600} />
</picture>
```

## Lazy Loading

```jsx
// Below the fold (default is lazy)
<img src="thumbnail.webp" loading="lazy" />

// Above the fold - eager
<img src="hero.webp" loading="eager" fetchPriority="high" />
```

## Image Component

```jsx
// src/components/ResponsiveImage.jsx
export default function ResponsiveImage({
  src, alt, widths = [400, 800, 1200], format = 'webp'
}) {
  const base = src.replace(/\.[^.]+$/, '')
  const srcset = widths.map(w => `${base}-${w}.${format} ${w}w`).join(', ')
  const sizes = `(max-width: 600px) ${widths[0]}px, (max-width: 1200px) ${widths[1]}px, ${widths[2]}px`
  
  return (
    <img
      src={`${base}-${widths[1]}.${format}`}
      srcSet={srcset}
      sizes={sizes}
      alt={alt}
      loading="lazy"
    />
  )
}
```

## Aspect Ratio (prevent CLS)

```jsx
// Always set dimensions
<img src="photo.webp" width={800} height={600} />

// Or CSS aspect ratio
<div style={{ aspectRatio: '16/9' }}>
  <img src="hero.webp" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
</div>
```

## LCP Optimization

```jsx
function Hero() {
  return (
    <picture>
      <source srcset="hero.avif" type="image/avif" />
      <img
        src="hero.webp"
        srcSet="hero-400.webp 400w, hero-800.webp 800w, hero-1200.webp 1200w"
        sizes="100vw"
        alt="Hero"
        width={1200}
        height={600}
        loading="eager"
        fetchPriority="high"
      />
    </picture>
  )
}
```

## Icons

### Favicon

```html
<link rel="icon" type="image/svg+xml" href="/favicon.svg">
<link rel="apple-touch-icon" href="/icons/icon-180.png">
```

### PWA Icons (manifest.json)

```json
{
  "icons": [
    { "src": "/icons/icon-192.png", "sizes": "192x192" },
    { "src": "/icons/icon-512.png", "sizes": "512x512", "purpose": "any maskable" }
  ]
}
```

## Converting Images

### Sharp (Node.js)

```bash
npm install sharp
```

```js
import sharp from 'sharp'

// Convert to WebP
await sharp('input.png').webp({ quality: 80 }).toFile('output.webp')

// Convert to AVIF
await sharp('input.png').avif({ quality: 50 }).toFile('output.avif')

// Resize
await sharp('input.png').resize(800).toFile('output-800.webp')
```

## CDN Services

### Cloudflare Images

```jsx
const url = (id, w) => 
  `https://example.com/cdn-cgi/image/w=${w},f=auto,q=80/${id}`

<img srcSet={`${url(id, 400)} 400w, ${url(id, 800)} 800w`} />
```

## Checklist

- [ ] Use WebP or AVIF format
- [ ] Provide multiple sizes with srcset
- [ ] Set explicit width/height (prevent CLS)
- [ ] Lazy load below-fold images
- [ ] Eager load LCP image
- [ ] Use fetchPriority="high" on hero