---
layout: default
title: Playbooks
description: "The task-first recipes for working on prestruct: first prerender, adding a route, wiring an island, triaging a red audit, shipping a docs change, and releasing a version."
nav_order: 25
version: 1.2.0
permalink: /playbooks/
---

# Playbooks

Each playbook is the short series of commands for one job, with the receipts
named at every step. All of them stay inside the contract: the CLI verbs are
the only entry points, the config is the only source of routes, and the baked
output is judged by `prestruct audit`.

| # | playbook | the job |
|---|----------|---------|
| 1 | [First prerender](/prestruct/playbooks/first-prerender/) | install, init, configure, build, audit, deploy |
| 2 | [Adding a route](/prestruct/playbooks/add-a-route/) | one route in `ssr.config.js`, rebuilt and audited |
| 3 | [Wiring an island](/prestruct/playbooks/wire-an-island/) | client-only content punched through the static HTML |
| 4 | [Triaging a red audit](/prestruct/playbooks/red-audit-triage/) | a FAIL row, its class, and the move |
| 5 | [Shipping a docs change](/prestruct/playbooks/docs-change/) | edit, lint, strict build, deploy |
| 6 | [Releasing a version](/prestruct/playbooks/release/) | bump, changelog, tag, watch the ladder |

Recipes are single-file by design: they move text without moving intent, and
each one stays letter-accurate against the workflow it documents. The
[CI guide](/prestruct/ci) documents the lanes themselves; playbooks are what
you run through those lanes.
