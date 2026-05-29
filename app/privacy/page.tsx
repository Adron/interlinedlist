export const metadata = {
  title: 'Privacy Policy | InterlinedList',
  description: 'InterlinedList Privacy Policy',
};

export default function PrivacyPage() {
  return (
    <div className="container-fluid container-fluid-max py-4">
      <div style={{ maxWidth: '800px', margin: '0 auto' }}>
        <h1 className="mb-1">Privacy Policy</h1>
        <p style={{ color: 'var(--color-text-secondary)' }}>
          Last updated: May 29, 2026
        </p>

        <p>
          This Privacy Policy describes how InterlinedList (&ldquo;we,&rdquo; &ldquo;us,&rdquo;
          or &ldquo;our&rdquo;) collects, uses, and shares information when you use our service
          at <strong>https://interlinedlist.com</strong>. By using InterlinedList, you agree to
          the practices described in this policy.
        </p>

        <h2 className="h4 mt-4">1. Information We Collect</h2>

        <h3 className="h5 mt-3">Account Information</h3>
        <p>When you register for an account, we collect:</p>
        <ul>
          <li>Your name</li>
          <li>Email address</li>
          <li>Username</li>
          <li>Password (stored as a secure hash — we never store your plaintext password)</li>
        </ul>

        <h3 className="h5 mt-3">Content You Create</h3>
        <p>
          We store the content you create and submit through the Service, including messages,
          lists, list items, documents, tags, and any other material you post or upload.
        </p>

        <h3 className="h5 mt-3">Usage Data</h3>
        <p>
          We automatically collect certain information about how you interact with the Service,
          including IP address, browser type, device information, pages visited, and timestamps
          of activity. This data is used solely for operating and improving the Service.
        </p>

        <h3 className="h5 mt-3">OAuth Tokens for Cross-Posting</h3>
        <p>
          Subscriber-tier users who enable cross-posting to third-party platforms (Bluesky,
          Mastodon, X/Twitter) grant us OAuth access tokens for those platforms. We store these
          tokens securely and use them only to transmit content on your behalf when you
          explicitly initiate a cross-post. You may revoke these tokens at any time through
          your account settings or directly through the third-party platform.
        </p>

        <h2 className="h4 mt-4">2. How We Use Your Information</h2>
        <ul>
          <li>
            <strong>Provide and operate the Service:</strong> Your account information and content
            are used to deliver the core functionality of InterlinedList.
          </li>
          <li>
            <strong>Transactional emails:</strong> We use{' '}
            <strong>Resend</strong> to send account-related emails such as email verification,
            password resets, and important service notices.
          </li>
          <li>
            <strong>Payment processing:</strong> Subscriber-tier billing is handled by{' '}
            <strong>Stripe</strong>. We pass your payment details directly to Stripe and do not
            store full card numbers on our servers.
          </li>
          <li>
            <strong>Push notifications:</strong> If you opt in to push notifications, we deliver
            them via <strong>Apple Push Notification Service (APNS)</strong>.
          </li>
          <li>
            <strong>Service improvement:</strong> Usage data helps us diagnose issues, measure
            performance, and improve the user experience.
          </li>
        </ul>

        <h2 className="h4 mt-4">3. Data Sharing</h2>
        <p>
          We do not sell your personal data. We share information only with the following
          service providers, strictly as necessary to operate the Service:
        </p>
        <ul>
          <li>
            <strong>Stripe</strong> — payment processing for Subscriber accounts
          </li>
          <li>
            <strong>Resend</strong> — transactional email delivery
          </li>
          <li>
            <strong>Apple (APNS)</strong> — push notification delivery
          </li>
        </ul>
        <p>
          Each service provider is bound by their own privacy terms and is prohibited from using
          your data for any purpose other than providing services to us. We may also disclose
          information if required by law, court order, or to protect the rights, safety, or
          property of InterlinedList, our users, or the public.
        </p>

        <h2 className="h4 mt-4">4. Data Retention</h2>
        <p>
          We retain your account information and content for as long as your account is active.
          If you delete your account, we will delete or anonymize your personal data within 30
          days, except where retention is required by law or legitimate business purposes such as
          fraud prevention. Billing records are retained as required by applicable law.
        </p>

        <h2 className="h4 mt-4">5. Your Rights</h2>
        <p>
          You have the following rights regarding your personal data:
        </p>
        <ul>
          <li>
            <strong>Access:</strong> Request a copy of the personal data we hold about you.
          </li>
          <li>
            <strong>Correction:</strong> Ask us to correct inaccurate or incomplete data.
          </li>
          <li>
            <strong>Deletion:</strong> Request deletion of your account and associated personal
            data.
          </li>
          <li>
            <strong>Portability:</strong> Request an export of your content in a machine-readable
            format.
          </li>
          <li>
            <strong>Objection:</strong> Object to or restrict processing of your data in certain
            circumstances.
          </li>
        </ul>
        <p>
          To exercise any of these rights, contact us at{' '}
          <a href="mailto:adronhall@proton.me">adronhall@proton.me</a>. We will respond within 30
          days.
        </p>

        <h2 className="h4 mt-4">6. Cookies</h2>
        <p>
          We use session cookies solely for authentication purposes — to keep you logged in while
          you use the Service. We do not use advertising cookies, third-party tracking cookies,
          or analytics cookies beyond what is necessary to operate the Service. You may disable
          cookies in your browser settings, but doing so will prevent you from logging in.
        </p>

        <h2 className="h4 mt-4">7. Children&rsquo;s Privacy</h2>
        <p>
          InterlinedList is not directed at children under the age of 13. We do not knowingly
          collect personal information from children under 13. If you believe a child under 13
          has created an account, please contact us at{' '}
          <a href="mailto:adronhall@proton.me">adronhall@proton.me</a> and we will delete the
          account promptly.
        </p>

        <h2 className="h4 mt-4">8. Security</h2>
        <p>
          We implement industry-standard technical and organizational measures to protect your
          personal data against unauthorized access, loss, or misuse. These include encrypted
          data transmission (HTTPS), hashed password storage, and access controls. No method of
          transmission or storage is completely secure, and we cannot guarantee absolute security.
        </p>

        <h2 className="h4 mt-4">9. Changes to This Policy</h2>
        <p>
          We may update this Privacy Policy from time to time. When we do, we will post the
          updated policy on this page with a revised &ldquo;Last updated&rdquo; date. For
          material changes, we will notify you via email or a prominent notice within the Service
          at least 14 days before the changes take effect.
        </p>

        <h2 className="h4 mt-4">10. Contact</h2>
        <p>
          If you have questions, concerns, or requests regarding this Privacy Policy or how we
          handle your data, please contact us at{' '}
          <a href="mailto:adronhall@proton.me">adronhall@proton.me</a>.
        </p>
      </div>
    </div>
  );
}
