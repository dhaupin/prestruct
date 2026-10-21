/**
 * Contact page for Prestruct
 * Help page for users who need assistance setting up Prestruct
 */

import usePageMeta from '../hooks/usePageMeta.js'

export default function Contact() {
  usePageMeta({
    path:        '/contact',
    title:       'Get Help | Prestruct',
    description: "Get help setting up Prestruct - contact the maintainer or open a GitHub issue.",
  })

  return (
    <div className="page-hero">
      <div className="container">
        <div className="page-kicker">help</div>
        <h1 className="page-heading">Get Help</h1>
        <p className="page-sub">
          Need a hand? Here's how to reach us.
        </p>
      </div>

      <div className="container">
        <div className="u-mt-2" style={{ maxWidth: '680px' }}>
          <section className="u-mb-2">
            <h2 style={{ fontSize: '1.1rem', fontWeight: '600', marginBottom: '1rem', color: 'var(--text)' }}>
              Email the Maintainer
            </h2>
            <p style={{ color: 'var(--text-2)', lineHeight: '1.7', marginBottom: '1rem' }}>
              I'm a real human in the US, not a bot. If you're stuck on setup or just want to say hi, feel free to reach out. If you're running into errors, include the details below and I'll do my best to help.
            </p>
            <p style={{ color: 'var(--accent)', lineHeight: '1.7', marginBottom: '1rem' }}>
              <pre-island data-pre-island="email-island">
                <span className="island-loading">loading...</span>
              </pre-island>
            </p>
          </section>

          <section className="u-mb-2">
            <h2 style={{ fontSize: '1.1rem', fontWeight: '600', marginBottom: '1rem', color: 'var(--text)' }}>
              GitHub Issues
            </h2>
            <p style={{ color: 'var(--text-2)', lineHeight: '1.7', marginBottom: '1rem' }}>
              Found a bug or have a feature request? Open an issue on GitHub. Before you do, check if there's already one filed.
            </p>
            <p style={{ marginBottom: '1rem' }}>
              <a href="https://github.com/dhaupin/prestruct/issues" className="btn btn-ghost" target="_blank" rel="noopener noreferrer">
                Open an Issue ->
              </a>
            </p>
          </section>

          <section className="u-mb-2">
            <h2 style={{ fontSize: '1.1rem', fontWeight: '600', marginBottom: '1rem', color: 'var(--text)' }}>
              GitHub Discussions
            </h2>
            <p style={{ color: 'var(--text-2)', lineHeight: '1.7', marginBottom: '1rem' }}>
              Have a question or want to show off what you built? Join the conversation in Discussions.
            </p>
            <p style={{ marginBottom: '1rem' }}>
              <a href="https://github.com/dhaupin/prestruct/discussions" className="btn btn-ghost" target="_blank" rel="noopener noreferrer">
                Join the Discussion ->
              </a>
            </p>
          </section>

          <section className="u-mb-2">
            <h2 style={{ fontSize: '1.1rem', fontWeight: '600', marginBottom: '1rem', color: 'var(--text)' }}>
              What to Include in Your Message
            </h2>
            <p style={{ color: 'var(--text-2)', lineHeight: '1.7', marginBottom: '1rem' }}>
              The more details you provide, the faster I can help. Please include:
            </p>
            <ul style={{ color: 'var(--text-2)', lineHeight: '1.9', paddingLeft: '1.25rem', marginBottom: '1rem' }}>
              <li>What you're trying to set up (the platform/host)</li>
              <li>What your site is running on (Vite + React, framework, etc.)</li>
              <li>The exact error message you're seeing</li>
              <li>Any relevant logs or stack traces</li>
              <li>Steps to reproduce the issue</li>
            </ul>
          </section>
        </div>
      </div>
    </div>
  )
}