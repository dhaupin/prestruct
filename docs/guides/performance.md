---
layout: default
title: Performance Optimization
---


Optimize your prestruct site for maximum PageSpeed scores.

## Core Web Vitals

Prestruct provides good defaults, but follow these tips to hit 100s:

### LCP (Largest Contentful Paint)

- **Optimize hero images**: Use WebP/AVIF, include `width` and `height` attributes
- **Preload critical assets**: Prestruct automatically adds `rel="modulepreload"` for JS
- **Font optimization**: Use `font-display: swap` in your CSS (Google Fonts does this by default)

```css
/* In your CSS */
@font-face {
  font-family: 'MyFont';
  src: url('/fonts/myfont.woff2') format('woff2');
  font-display: swap; /* Critical for LCP */
}
```

### CLS (Cumulative Layout Shift)

- **Set explicit image dimensions**: Always include width/height on `<img>` tags
- **Reserve space for ads/embeds**: Use min-height CSS placeholders
- **Font loading**: Use `font-display: swap` to prevent FOIT (flash of invisible text)

### FID/INP (Interactivity)

- **Code splitting**: Prestruct handles this via Vite's chunking
- **Lazy load below-fold content**: Use `loading="lazy"` on images

## Bundle Optimization

```js
// ssr.config.js - optimize chunking
build: {
  rollupOptions: {
    output: {
      manualChunks: {
        vendor: ['react', 'react-dom'],
        // Add your heavy deps here
      }
    }
  }
}
```

## Image Best Practices

1. Use modern formats: WebP or AVIF
2. Compress: TinyPNG, Squoosh, or Sharp
3. Responsive: Multiple sizes with `srcset`

```html
<img 
  srcset="hero-400.webp 400w, hero-800.webp 800w, hero-1200.webp 1200w"
  sizes="(max-width: 600px) 400px, (max-width: 1200px) 800px, 1200px"
  src="hero-800.webp"
  alt="Hero"
  width="1200" height="600"
  loading="eager" <!-- LCP image: eager -->
>
<!-- Below fold -->
<img src="thumbnail.webp" loading="lazy" width="400" height="300">
```

## Third-Party Scripts

- **Defer analytics**: Load after page load completes
- **Use web workers**: For heavy computations

```js
// Delay non-critical scripts
window.addEventListener('load', () => {
  setTimeout(() => {
    loadAnalytics();
  }, 2000);
});
```

## Results

With these optimizations, target scores:

| Metric | Target |
|--------|--------|
| Performance | 95-100 |
| Accessibility | 100 |
| Best Practices | 100 |
| SEO | 100 |

## Gotchas

### Third-Party Scripts Kill Performance

Cloudflare Analytics, ads, chat widgets, and tracking scripts can drop your score 20-30 points. Best practices:

- Delay loading: `setTimeout(() => { loadScript() }, 3000)`
- Use `requestIdleCallback` for non-critical scripts
- Consider self-hosted alternatives

### Images Above the Fold

The hero image on your homepage is often the LCP element. Ensure:
- `loading="eager"` (not lazy)
- Proper `width`/`height` attributes
- WebP/AVIF format
- Preload if critical: `<link rel="preload" as="image" href="hero.webp">`

### Font Loading Delay

If fonts are large or not optimized:
- Use `font-display: swap` (prevents invisible text)
- Self-host fonts instead of Google Fonts CDN
- Subset fonts to only include needed characters

### Cloudflare Analytics Impact

Cloudflare's browser insights can impact performance scores onPageSpeed. This is a trade-off - real-user monitoring vs lab scores. The impact on real users is minimal.