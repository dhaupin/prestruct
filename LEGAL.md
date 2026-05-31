# License Agreement & Legal Framework

> **⚖️ This document provides legally binding terms for using, forking, and building upon Prestruct.**

> **Last Updated: 2026-05-31** | **Version: 1.0** | **[Prestruct](https://github.com/creadev/prestruct)**

---

## PART 1: CORE LEGAL FRAMEWORK

### §1. License Grant (Fair-Code / Source-Available Model)

**Prestruct** is provided under a **Fair-Code / Source-Available license model.**

**This is NOT a pure MIT License** - Prestruct includes supplemental terms (especially §8, §15) that restrict commercial exploitation. These terms are explicit and disclosed.

**Grant:** Permission is granted, free of charge, to use, copy, modify, merge, distribute, sublicense, and/or sell copies of Prestruct, subject to the following conditions:

1. **Attribution** - Modified or unmodified versions must retain LEGAL.md and cite Prestruct as originating work
2. **No Prestruct Branding** - Derivatives may NOT use "Prestruct" name in product/project names without written permission
3. **No Commercial Service** - Prestruct may NOT be used to provide commercial SAAS/platform services to third parties (see §15)

---

### §2. Copyright & Ownership

**© 2026 Creadev.org** and **The Contributors.**

Prestruct is an open-source project with copyright held by the maintainer and contributors collectively.

- **Maintainer:** **Creadev.org**
- **Contributor License:** **CLA-C** (Contributor License Agreement - Copyright) - By submitting PRs, contributors agree to license contributions under this document's terms

**No IP Transfer Required:** Contributors retain copyright to their contributions. License is non-exclusive, worldwide, royalty-free.

---

### §3. Disclaimer of Warranty

**PRESTRUCT IS PROVIDED "AS IS" WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED.**

Specifically:
- **NO FITNESS FOR A PARTICULAR PURPOSE** - Prestruct may not be suitable for any specific use case
- **NO SECURITY GUARANTEES** - Despite best efforts, no guarantee security vulnerabilities don't exist
- **NO AVAILABILITY** - No SLA for uptime, updates, or support
- **NO RUNTIME PROTECTION** - Prestruct doesn't provide runtime security for rendered content

---

### §4. Limitation of Liability

**TO THE MAXIMUM EXTENT PERMITTED BY LAW, IN NO EVENT SHALL PRESTRUCT CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES.**

This includes, but is not limited to:
- Data loss or corruption
- Security breaches via Prestruct
- System damage
- Business interruption
- Lost profits

---

### §5. Patent Defense & Termination

If any party brings a patent infringement claim against Prestruct, Contributors may defend but are **NOT obligated** to do so.

**Defensive Termination:** If a user files patent litigation claiming Prestruct infringes their patents, their license to use Prestruct terminates immediately. They may not receive a license back unless Contributors grant it.

---

## PART 2: TRADEMARK & BRANDING

### §6. Trademark & Naming Convention

**"Prestruct"** is used as a descriptive **compound term** for this project's technical purpose: **pre**render + **struct**ure.

**™ Status:** This document establishes **common-law trademark** protection through consistent use in the open-source community. We have NOT filed a formal USPTO registration.

**Nomenclature Rationale:**
The term "Prestruct" was chosen as a descriptive technical designation:
- **Pre**render - server-side rendering at build time
- **Structure** - framework for SEO prerendering

This naming is a descriptive technical designation, NOT a commercial brand attempt, and is explicitly **separate** from any registered corporate trademarks in web frameworks, SEO tools, or development tooling.

---

### §7. Non-Affiliation (Competitive Separation)

Prestruct is **INDEPENDENT** from all commercial entities. Specifically:

| Entity | Relationship |
|--------|-------------|
| **Preact** | Not affiliated, completely independent (different project) |
| **Vite** | Not affiliated, but built on top of (Vite is a build tool) |
| **React** | Not affiliated, but designed for (React is a UI library) |
| **Any SEO SaaS** | Not affiliated, completely independent |

Using Prestruct does not imply endorsement by any entity.

---

### §8. Project Name Protection (Anti-Confusion)

Prestruct is a distinct project. To avoid confusion with similarly-named projects:

**This is NOT Preact:**
- **Preact** is a 3kB alternative to React with a different API and architecture
- Prestruct is built FOR React/Preact apps, not an alternative to either
- Do not confuse Prestruct with Preact

**This is NOT Prerender:**
- There is no project called "Prerender" that this relates to
- Prestruct is the project name, not a generic term

**Naming Collision Prevention:** Derivatives must NOT use "Prestruct" in:
- Repository names
- Package names (npm, pip, etc.)
- Product names
- Company/project names

Acceptable: "Built with Prestruct" (with attribution)
Forbidden: "PrestructFlow", "PrestructCloud", "MyPrestruct", "Prestructify"

---

## PART 3: DERIVATIVE WORKS

### §9. Fork Rules ("Cantrell Clause")

Derivatives of Prestruct must adhere to the following to remain compliant:

**Permitted:**
- Private forks for internal use
- Open-source forks that clearly distinguish from Prestruct
- Educational use and research
- Building tools that USE Prestruct

**Prohibited:**
- Commercial SAAS platforms built ON Prestruct (offering Prestruct as a service)
- Re-branding derivatives as "Prestruct" products
- Using Prestruct to provide services to paying customers
- Creating "Prestruct-as-a-Service" offerings

**Naming Convention:** Derivatives must NOT use "Prestruct" in:
- Repository names
- Package names (npm, pip, etc.)
- Product names
- Company/project names

Acceptable: "Built with Prestruct framework" (with attribution)
Forbidden: "PrestructFlow", "PrestructCloud", "MyPrestruct"

---

### §10. Attribution Requirements

All distributions (binary, source, documentation) must include:

1. **Notice:** "This project uses Prestruct ([URL]/[version])"
2. **License:** Include COPY OF MIT License or link to LICENSE file
3. **Copyright:** Credit "Copyright (c) The Prestruct Contributors"
4. **Source:** For source distributions, link to original Prestruct source

**Minimum Attribution Language:**
> "This software includes Prestruct, an open-source SEO prerendering framework. Prestruct is copyright The Contributors and licensed under MIT. See LICENSE file."

---

### §11. Citation for Academic Work

If Prestruct contributes to academic research, please cite:

```
Prestruct (Version [x.y.z]). AI-first SEO Prerender for Vite + React.
Available at: https://github.com/creadev/prestruct
```

---

## PART 4: SECURITY & COMPLIANCE

### §12. Security Responsibilities

**Prestruct is a BUILD-TIME FRAMEWORK, not a security product.**

- Users are SOLELY responsible for securing their deployments
- Prerendered output is static HTML - no runtime execution
- No guarantee against: XSS in user-provided content, injection attacks in config
- Audit your configuration before production use

---

### §13. Data Handling

If you build products that process user data using Prestruct:

- You're solely responsible for GDPR, CCPA, and other compliance
- Prestruct doesn't inherently protect PII/PHI
- Implement your own encryption, access controls
- Prestruct contributors assume NO data protection obligations

---

### §14. Export Compliance

Prestruct is developed in the **United States**.

- Users are responsible for ITAR, EAR, and sanctions compliance
- Some jurisdictions may restrict use
- Verify your use complies with local laws

---

### §15. Termination Provisions

License terminates IMMEDIATELY upon:

1. Breaching §9 (Fork Rules)
2. Bringing patent litigation (Defensive Termination §5)
3. Misusing trademark (§6 violations)
4. Using Prestruct in ways that harm Contributors' reputation

**Effect of Termination:** Must cease all use and destroy all copies.

**Survival:** §§3, 4, 12 (Disclaimer, Liability, Security) survive termination.

---

## PART 5: ANTI-COMPETITION CLAUSE

### §16. Commercial Use Restrictions

**Specific restrictions** to prevent Prestruct from being exploited commercially by others:

**YOU MAY NOT:**
- Offer Prestruct as a managed/hosted service (SAAS/PAAS)
- Charge for access to Prestruct (directly or indirectly)
- Bundle Prestruct in commercial products sold for profit
- Use Prestruct to power services for your customers
- Create marketplaces selling Prestruct-based solutions

**YOU MAY:**
- Build tools/services FOR yourself using Prestruct
- Sell products that USE Prestruct (but not Prestruct itself)
- Offer Prestruct consulting/support services
- Create educational content about Prestruct

---

## PART 6: PROJECT TECHNICAL CLASSIFICATION

### §17. What Prestruct Is (and Isn't)

| Category | Classification |
|----------|----------------|
| **Type** | Build-time SEO prerendering framework |
| **License** | MIT + supplemental terms |
| **Commercial Use** | Restricted (§16) |
| **Target Users** | Developers building Vite + React/Preact apps |
| **Production Ready** | Yes (see CHANGELOG) |

Prestruct is NOT:
- A JavaScript runtime
- A React alternative (works with React)
- A security product
- A SAAS platform
- A managed service
- An enterprise compliance tool

---

### §18. Badges & Endorsements

**Official Badges (when granted):**
- Prestruct-Verified: Packages tested against Prestruct standards
- Prestruct-Compatible: Works with Prestruct API

**Endorsements:**
- No companies are endorsed
- No commercial partnerships exist
- Listings in README are community-curated

---

## ENFORCEMENT & DISPUTES

### §19. Enforcement

Violations may result in:
- DMCA takedown requests
- Trademark enforcement
- License termination

**Contact:** For licensing questions: Open an issue on GitHub.

### §20. Governing Law

This document is governed by **United States federal law** and **California state law**, excluding conflict of law provisions.

### §21. Severability

If any provision is held unenforceable, the remainder continues in effect.

---

## QUICK REFERENCE

| Action | Allowed? |
|--------|----------|
| Use Prestruct in open source | ✅ Yes |
| Use Prestruct in closed source | ✅ Yes |
| Fork privately | ✅ Yes |
| Fork publicly (rebranded) | ❌ No |
| Call it "Prestruct" in name | ❌ No |
| SAAS offering | ❌ No |
| Sell Prestruct directly | ❌ No |
| Use "Built with Prestruct" | ✅ Yes |
| Reasonable attribution | ✅ Required |

---

**By using Prestruct, you agree to these terms.**