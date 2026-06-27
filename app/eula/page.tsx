export const metadata = {
  title: 'End User License Agreement | InterlinedList',
  description: 'End User License Agreement for the InterlinedList iOS application',
};

export default function EulaPage() {
  return (
    <div className="container-fluid container-fluid-max py-4">
      <div style={{ maxWidth: '800px', margin: '0 auto' }}>
        <h1 className="mb-1">End User License Agreement</h1>
        <p style={{ color: 'var(--color-text-secondary)' }}>
          Last updated: June 27, 2026
        </p>

        <p>
          This End User License Agreement (&ldquo;EULA&rdquo;) governs your use of the
          InterlinedList application for iOS and other Apple-branded products (the
          &ldquo;Licensed Application&rdquo;). The Licensed Application is licensed, not sold, to
          you by InterlinedList (&ldquo;we,&rdquo; &ldquo;us,&rdquo; or &ldquo;our&rdquo;) for use
          only under the terms of this EULA.
        </p>
        <p>
          Your use of the Licensed Application is also governed by our{' '}
          <a href="/terms">Terms of Service</a> and{' '}
          <a href="/privacy">Privacy Policy</a>, which are incorporated into this EULA by
          reference. In the event of a conflict between this EULA and the Terms of Service with
          respect to the Licensed Application, this EULA controls. By downloading, installing, or
          using the Licensed Application, you agree to be bound by this EULA.
        </p>

        <h2 className="h4 mt-4">1. Acknowledgement</h2>
        <p>
          You and we acknowledge that this EULA is concluded between you and InterlinedList only,
          and not with Apple Inc. (&ldquo;Apple&rdquo;). We, not Apple, are solely responsible for
          the Licensed Application and the content thereof. This EULA does not provide for usage
          rules for the Licensed Application that conflict with the Apple Media Services Terms and
          Conditions as of the effective date of this EULA, which you acknowledge you have had the
          opportunity to review.
        </p>

        <h2 className="h4 mt-4">2. Scope of License</h2>
        <p>
          We grant you a non-transferable license to use the Licensed Application on any
          Apple-branded products that you own or control and as permitted by the Usage Rules set
          forth in the Apple Media Services Terms and Conditions. The Licensed Application may be
          accessed and used by other accounts associated with you via Family Sharing or volume
          purchasing, where permitted. Except as set out in this EULA and the Usage Rules, you may
          not distribute or make the Licensed Application available over a network where it could
          be used by multiple devices at the same time, and you may not transfer, redistribute, or
          sublicense the Licensed Application.
        </p>

        <h2 className="h4 mt-4">3. Maintenance and Support</h2>
        <p>
          We are solely responsible for providing any maintenance and support services with
          respect to the Licensed Application, as specified in this EULA or as required under
          applicable law. You and we acknowledge that Apple has no obligation whatsoever to
          furnish any maintenance and support services with respect to the Licensed Application.
          Maintenance and support questions should be directed to the contact in Section 8.
        </p>

        <h2 className="h4 mt-4">4. Warranty</h2>
        <p>
          We are solely responsible for any product warranties, whether express or implied by law,
          to the extent not effectively disclaimed. In the event of any failure of the Licensed
          Application to conform to any applicable warranty, you may notify Apple, and Apple will
          refund the purchase price (if any) for the Licensed Application to you. To the maximum
          extent permitted by applicable law, Apple will have no other warranty obligation
          whatsoever with respect to the Licensed Application, and any other claims, losses,
          liabilities, damages, costs, or expenses attributable to any failure to conform to any
          warranty will be our sole responsibility.
        </p>

        <h2 className="h4 mt-4">5. Product Claims</h2>
        <p>
          You and we acknowledge that we, not Apple, are responsible for addressing any claims by
          you or any third party relating to the Licensed Application or your possession and/or
          use of the Licensed Application, including, but not limited to: (i) product liability
          claims; (ii) any claim that the Licensed Application fails to conform to any applicable
          legal or regulatory requirement; and (iii) claims arising under consumer protection,
          privacy, or similar legislation. This EULA does not limit our liability to you beyond
          what is permitted by applicable law.
        </p>

        <h2 className="h4 mt-4">6. Intellectual Property Rights</h2>
        <p>
          You and we acknowledge that, in the event of any third-party claim that the Licensed
          Application or your possession and use of the Licensed Application infringes that third
          party&rsquo;s intellectual property rights, we, not Apple, will be solely responsible
          for the investigation, defense, settlement, and discharge of any such intellectual
          property infringement claim.
        </p>

        <h2 className="h4 mt-4">7. Legal Compliance</h2>
        <p>
          You represent and warrant that (i) you are not located in a country that is subject to a
          U.S. Government embargo, or that has been designated by the U.S. Government as a
          &ldquo;terrorist supporting&rdquo; country; and (ii) you are not listed on any U.S.
          Government list of prohibited or restricted parties.
        </p>

        <h2 className="h4 mt-4">8. Developer Name and Address</h2>
        <p>
          The Licensed Application is provided by InterlinedList. Any questions, complaints, or
          claims with respect to the Licensed Application should be directed to:
        </p>
        <ul>
          <li>[Developer legal name — to be completed before submission]</li>
          <li>[Mailing address — to be completed before submission]</li>
          <li>
            Email: <a href="mailto:adronhall@proton.me">adronhall@proton.me</a>
          </li>
        </ul>

        <h2 className="h4 mt-4">9. Third-Party Terms of Agreement</h2>
        <p>
          You must comply with applicable third-party terms of agreement when using the Licensed
          Application. For example, if the Licensed Application enables cross-posting to or
          interaction with third-party services (such as Bluesky, Mastodon, or X/Twitter), you
          must not be in violation of those third parties&rsquo; terms of service when using the
          Licensed Application, and you are solely responsible for ensuring your use and content
          comply with each such service.
        </p>

        <h2 className="h4 mt-4">10. Third-Party Beneficiary</h2>
        <p>
          You and we acknowledge and agree that Apple, and Apple&rsquo;s subsidiaries, are
          third-party beneficiaries of this EULA, and that, upon your acceptance of the terms and
          conditions of this EULA, Apple will have the right (and will be deemed to have accepted
          the right) to enforce this EULA against you as a third-party beneficiary thereof.
        </p>

        <h2 className="h4 mt-4">11. Contact</h2>
        <p>
          If you have questions about this EULA, please contact us at{' '}
          <a href="mailto:adronhall@proton.me">adronhall@proton.me</a>.
        </p>
      </div>
    </div>
  );
}
