---
layout: default
title: Performance Optimization
nav_order: 7
---

Optimizing your prestruct site for maximum PageSpeed scores.

## Core Web Vitals

Prestruct provides good defaults. Follow these tips to hit 100s:

### LCP (Largest Contentful Paint)

Optimize hero images with WebP/AVIF and explicit dimensions:

```css
/* In your CSS */
@font-face {
  font-family: 'MyFont';
  src: url('/fonts/myfont.woff2') format('woff2');
  font-display: swap; /* Critical for LCP */
}
```

Always include width and height on img tags to prevent layout shift.

### CLS (Cumulative Layout Shift)

Set explicit image dimensions:

```html
<img src="hero.webp" width="1200" height="600" alt="Hero">
```

Use `font-display: swap` to avoid FOUT (Flash of Unstyled Text).

### INP (Interaction to Next Paint)

Prestruct's islands pattern keeps the main thread free for initial render. Defer heavy JavaScript to islands.

## Asset optimization

Vite handles asset optimization automatically:

- JS/CSS minification
- Tree shaking
- Code splitting
- Asset hashing for cache busting

## Bundle analysis

Analyze your bundle to find large dependencies:

```bash
npm install rollup-plugin-visualizer
```

Add to vite.config.js:

```js
import { visualizer } from 'rollup-plugin-visualizer'
plugins: [..., visualizer()]
```

## Image optimization

Serve images in modern formats:

```html
<picture>
  <source srcset="/img.avif" type="image/avif">
  <source srcset="/img.webp" type="image/webp">
  <img src="/img.jpg" alt="Description">
</picture>
```

Use lazy loading for below-fold images:

```html
<img src="photo.jpg" loading="lazy" alt="Description">
```

## Font optimization

Self-host fonts to avoid Google Fonts round trips:

```html
<link rel="preload" href="/fonts/geist.woff2" as="font" type="font/woff2" crossorigin>
```

Use `font-display: swap` to show text immediately:

```css
@font-face {
  font-family: 'MyFont';
  src: url('/fonts/myfont.woff2') format('woff2');
  font-display: swap;
}
```
