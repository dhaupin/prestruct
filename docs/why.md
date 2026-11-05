---
layout: default
title: Why Prestruct
description: "A Vite + React app ships an empty HTML shell, so crawlers and unfurlers see nothing. Why prerendering the real routes is the fix, and what it does not change."
nav_order: 25
version: 1.2.0
permalink: /why
---

# Why Prestruct

A Vite + React app builds one `index.html` with an empty root. The browser
fills it in; a crawler or a link unfurler does not wait around to find out.

## The problem

Client-side React renders after the JavaScript loads. Until then the HTML is a
shell with no title, no description, no Open Graph tags, and no content.
Search engines index the empty version, and chat and social unfurlers show a
blank card. The site works for a human with a fast connection and fails for
everything that reads the HTML.

## The thesis

Prerender the real routes at build time. Run the app through the same React
components, capture the HTML per route, and stamp the head tags that route
needs. The crawler gets real HTML; the human gets the same React app, hydrated
over the HTML that was already there. No second framework, no rewrite - two
Node scripts after `vite build`.

The invariant is that the page the crawler indexed is the page the browser
paints. Because the prerender runs the same `AppLayout` the client runs, and
the client hydrates over that HTML instead of replacing it, there is no second
source of truth.

## Who it is for

Teams on Vite + React + React Router who want real SEO and real unfurls
without moving to a full SSR framework; and anyone on Cloudflare Pages who
wants static files and no runtime server.

<div class="crosslinks">
<p><strong>Next:</strong>
<a href="{{ '/what' | relative_url }}">what prestruct is</a> ·
<a href="{{ '/about' | relative_url }}">how it works</a></p>
</div>
