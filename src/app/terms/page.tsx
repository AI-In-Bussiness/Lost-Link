import type { Metadata } from 'next';
import Link from 'next/link';
import LegalLinks from '../legal-links';

export const metadata: Metadata = { title: 'Terms and conditions · LostLink' };

export default function TermsPage() {
  return <main id="main" className="container main-content policy-page">
    <Link href="/">LostLink home</Link>
    <h1>Terms and conditions</h1>
    <p className="muted">Last updated: 28 October 2026</p>
    <p>LostLink is a demonstration of a school lost-and-found service. It lets visitors browse found belongings and lets signed-in users send private claims for staff review. Use fictional item descriptions and ownership details when testing the demo.</p>

    <h2>Accounts and staff access</h2>
    <p>Use an email address you can access, keep your password private, and sign out on shared devices. Creating an account provides claimant access. It does not grant staff or administrator permissions; those are assigned separately for each school.</p>

    <h2>Listings and ownership claims</h2>
    <p>Submit a claim only for an item you own. Provide truthful ownership information and follow the school’s collection instructions. A suggested match is not proof of ownership or a guarantee that an item will be returned to you.</p>
    <p>Authorized staff review claims and decide whether an item is ready for collection. Approval reserves the item; staff record the return after checking ownership and physically handing it over. Listing availability and claim decisions can change as staff manage the inventory.</p>

    <h2>Content and acceptable use</h2>
    <p>Share only content you have permission to provide. Keep private identifying details in the claim form or staff-only notes, not in public descriptions or photographs. Do not submit passwords, identity documents, or unnecessary sensitive personal information.</p>
    <p>Do not make fraudulent claims, impersonate school staff, try to access another person’s claims or another school’s private records, upload malicious files, bypass access controls or request limits, or disrupt the service through automated abuse.</p>

    <h2>Availability and assistance</h2>
    <p>LostLink may be temporarily unavailable, and a school’s listings may not contain every found item. Contact the school office managing the listing if you need help with an item, a decision, or collection. Account and service issues may require assistance from the LostLink operator.</p>

    <h2>Privacy and changes</h2>
    <p>Read the <Link href="/privacy">privacy policy</Link> for the information used by this demonstration, who can see it, and its current retention limits. Check the date on this page when reviewing updated terms.</p>
    <LegalLinks />
  </main>;
}
