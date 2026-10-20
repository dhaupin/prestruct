/**
 * Privacy Policy page for Prestruct
 * A build-time prerender layer for Vite + React + Cloudflare Pages apps
 */

import usePageMeta from '../hooks/usePageMeta.js'

export default function Privacy() {
  usePageMeta({
    path:        '/privacy',
    title:       'Privacy Policy | Prestruct',
    description: "Privacy Policy for Prestruct - learn how we handle data in our build-time prerendering tool for Vite + React.",
  })

  return (
    <div className="page-hero">
      <div className="container">
        <div className="page-kicker">legal</div>
        <h1 className="page-heading">Privacy Policy</h1>
        <p className="page-sub">
          Last updated: 2026
        </p>
      </div>

      <div className="container">
        <div className="u-mt-2" style={{ maxWidth: '680px' }}>
          <section className="u-mb-2">
            <h2 style={{ fontSize: '1.1rem', fontWeight: '600', marginBottom: '1rem', color: 'var(--text)' }}>
              1. Overview
            </h2>
            <p style={{ color: 'var(--text-2)', lineHeight: '1.7', marginBottom: '1rem' }}>
              Prestruct is a build-time prerendering tool. This Privacy Policy explains how we handle data when you use Prestruct to generate static HTML for your Vite + React applications deployed on Cloudflare Pages.
            </p>
          </section>

          <section className="u-mb-2">
            <h2 style={{ fontSize: '1.1rem', fontWeight: '600', marginBottom: '1rem', color: 'var(--text)' }}>
              2. Data We Collect
            </h2>
            <p style={{ color: 'var(--text-2)', lineHeight: '1.7', marginBottom: '1rem' }}>
              <strong style={{ color: 'var(--text)' }}>Prestruct itself does not collect any personal data.</strong> Prestruct runs as a build-time tool that processes your source code to generate static HTML files. During this process:
            </p>
            <ul style={{ color: 'var(--text-2)', lineHeight: '1.9', paddingLeft: '1.25rem', marginBottom: '1rem' }}>
              <li>We do not collect user information from visitors to your website</li>
              <li>We do not store cookies or similar tracking technologies</li>
              <li>We do not have access to any data submitted through your website</li>
              <li>We do not analyze or monitor your site's traffic or usage</li>
            </ul>
          </section>

          <section className="u-mb-2">
            <h2 style={{ fontSize: '1.1rem', fontWeight: '600', marginBottom: '1rem', color: 'var(--text)' }}>
              3. Build-Time Processing
            </h2>
            <p style={{ color: 'var(--text-2)', lineHeight: '1.7', marginBottom: '1rem' }}>
              When you run Prestruct during your build process, it reads your source files and generates static HTML. This processing happens locally on your machine or within your CI/CD environment.
            </p>
            <p style={{ color: 'var(--text-2)', lineHeight: '1.7', marginBottom: '1rem' }}>
              Prestruct does not transmit your code, content, or build output to any external servers beyond what you explicitly deploy to Cloudflare Pages.
            </p>
          </section>

          <section className="u-mb-2">
            <h2 style={{ fontSize: '1.1rem', fontWeight: '600', marginBottom: '1rem', color: 'var(--text)' }}>
              4. Third-Party Services
            </h2>
            <p style={{ color: 'var(--text-2)', lineHeight: '1.7', marginBottom: '1rem' }}>
              Prestruct itself does not use any third-party analytics or tracking services. However, when you deploy your prerendered site to Cloudflare Pages, Cloudflare's own <a href="https://www.cloudflare.com/privacypolicy/" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--accent)' }}>Privacy Policy</a> applies to their hosting services.
            </p>
            <p style={{ color: 'var(--text-2)', lineHeight: '1.7', marginBottom: '1rem' }}>
              If your website includes third-party services (analytics, ads, embeds), those services may collect data independently. You are responsible for understanding and complying with those services' privacy practices.
            </p>
          </section>

          <section className="u-mb-2">
            <h2 style={{ fontSize: '1.1rem', fontWeight: '600', marginBottom: '1rem', color: 'var(--text)' }}>
              5. Cookies and Local Storage
            </h2>
            <p style={{ color: 'var(--text-2)', lineHeight: '1.7', marginBottom: '1rem' }}>
              Prestruct does not set or use cookies. Your website may use cookies if you implement that functionality in your own code, but that is outside the scope of Prestruct.
            </p>
          </section>

          <section className="u-mb-2">
            <h2 style={{ fontSize: '1.1rem', fontWeight: '600', marginBottom: '1rem', color: 'var(--text)' }}>
              6. Children's Privacy
            </h2>
            <p style={{ color: 'var(--text-2)', lineHeight: '1.7', marginBottom: '1rem' }}>
              Prestruct is a developer tool and does not knowingly collect personal information from children under 13. If you believe your website using Prestruct may collect data from children, you are responsible for complying with applicable laws like COPPA or GDPR.
            </p>
          </section>

          <section className="u-mb-2">
            <h2 style={{ fontSize: '1.1rem', fontWeight: '600', marginBottom: '1rem', color: 'var(--text)' }}>
              7. Data Security
            </h2>
            <p style={{ color: 'var(--text-2)', lineHeight: '1.7', marginBottom: '1rem' }}>
              Since Prestruct does not collect or store personal data, there is no personal data for us to secure. However, we recommend that you follow best practices for securing your development environment, build pipelines, and deployed websites.
            </p>
          </section>

          <section className="u-mb-2">
            <h2 style={{ fontSize: '1.1rem', fontWeight: '600', marginBottom: '1rem', color: 'var(--text)' }}>
              8. Changes to This Policy
            </h2>
            <p style={{ color: 'var(--text-2)', lineHeight: '1.7', marginBottom: '1rem' }}>
              We may update this Privacy Policy from time to time. If we make material changes, we will update the "Last updated" date at the top of this page and post the new policy here. We encourage you to review this policy periodically.
            </p>
          </section>

          <section className="u-mb-2">
            <h2 style={{ fontSize: '1.1rem', fontWeight: '600', marginBottom: '1rem', color: 'var(--text)' }}>
              9. Your Rights
            </h2>
            <p style={{ color: 'var(--text-2)', lineHeight: '1.7', marginBottom: '1rem' }}>
              Since we do not collect personal data, there are no personal data rights for us to fulfill. If you have questions about this policy or your rights related to your own website's data, please contact us at <a href="https://github.com/dhaupin/prestruct" style={{ color: 'var(--accent)' }}>GitHub</a>.
            </p>
          </section>

          <section className="u-mb-2">
            <h2 style={{ fontSize: '1.1rem', fontWeight: '600', marginBottom: '1rem', color: 'var(--text)' }}>
              10. GDPR Compliance
            </h2>
            <p style={{ color: 'var(--text-2)', lineHeight: '1.7', marginBottom: '1rem' }}>
              Prestruct processes data locally during your build and does not transmit any personal data outside your environment. For users in the EU/EEA, this means no personal data leaves your controlled build environment. We do not have access to any personal data through Prestruct itself.
            </p>
          </section>

          <section className="u-mb-2">
            <h2 style={{ fontSize: '1.1rem', fontWeight: '600', marginBottom: '1rem', color: 'var(--text)' }}>
              11. CCPA Compliance
            </h2>
            <p style={{ color: 'var(--text-2)', lineHeight: '1.7', marginBottom: '1rem' }}>
              Prestruct does not collect personal information from California residents. As a developer tool that runs locally, it is not subject to the California Consumer Privacy Act (CCPA). If you use Prestruct to build a website that collects user data, you are responsible for your own CCPA compliance.
            </p>
          </section>

          <section className="u-mb-2">
            <h2 style={{ fontSize: '1.1rem', fontWeight: '600', marginBottom: '1rem', color: 'var(--text)' }}>
              12. Data Retention
            </h2>
            <p style={{ color: 'var(--text-2)', lineHeight: '1.7', marginBottom: '1rem' }}>
              Prestruct does not retain any personal data. Build artifacts are static HTML files that you control and deploy. We do not store any of your code, content, or generated HTML on our servers.
            </p>
          </section>

          <section className="u-mb-2">
            <h2 style={{ fontSize: '1.1rem', fontWeight: '600', marginBottom: '1rem', color: 'var(--text)' }}>
              13. Business Transfer
            </h2>
            <p style={{ color: 'var(--text-2)', lineHeight: '1.7', marginBottom: '1rem' }}>
              In the event of a merger, acquisition, or sale of all or a portion of our assets, your information may be transferred as part of that transaction. We will notify you before your data becomes subject to a different privacy policy.
            </p>
          </section>

          <section className="u-mb-2">
            <h2 style={{ fontSize: '1.1rem', fontWeight: '600', marginBottom: '1rem', color: 'var(--text)' }}>
              14. Contact
            </h2>
            <p style={{ color: 'var(--text-2)', lineHeight: '1.7', marginBottom: '1rem' }}>
              If you have any questions about this Privacy Policy, please contact us at <a href="https://github.com/dhaupin/prestruct" style={{ color: 'var(--accent)' }}>GitHub</a>.
            </p>
          </section>
        </div>
      </div>
    </div>
  )
}