import type { Metadata } from 'next';
import Link from 'next/link';
import LegalLinks from '../legal-links';

export const metadata: Metadata = { title: 'Privacy policy · LostLink' };

export default function PrivacyPage() {
  return <main id="main" className="container main-content policy-page">
    <Link href="/">LostLink home</Link>
    <h1>Privacy policy</h1>
    <p className="muted">Last updated: 28 October 2026</p>
    <p>LostLink helps people browse found belongings, send private ownership claims, and follow school staff decisions. This notice describes the current demonstration. Use fictional item descriptions and ownership details in the demo.</p>

    <h2>Information you provide</h2>
    <p>Creating an account requires an email address and password. Supabase Auth handles authentication and password storage. Account details are not included in public item listings.</p>
    <p>A claim includes your account identifier, ownership evidence, its status, and staff decisions or collection instructions. Staff also record item descriptions, found dates, broad found locations, photographs, private identifying notes, and storage locations.</p>

    <h2>Public listings and private claims</h2>
    <p>Visitors can see published item descriptions, categories, colors, found dates, broad found locations, and reviewed photographs. Keep names, contact details, and secret identifying marks out of public listings and photographs.</p>
    <p>Your ownership evidence is available to you and authorized staff at the school handling the claim. Other visitors cannot browse it. Internal staff notes and storage locations are restricted to authorized school staff and website owners. School admins manage only their assigned schools. Website owners can administer records across all schools. Service operators and infrastructure providers may also access information when administering or supporting the service.</p>

    <h2>How information is used</h2>
    <p>LostLink uses account information to sign you in and control access. Item and claim records support searching, ownership review, collection, and return. Activity records help staff track changes to items and claims.</p>
    <p>Matching compares search descriptions with public item information on the application server. Private ownership evidence and internal staff notes are not sent to the matching model. The application does not send searches to an external AI inference service.</p>
    <p>Search descriptions and filters appear in page URLs and may remain in browser history or hosting logs. Use public details such as an item type and color. Do not put passwords, identity documents, contact information, or private ownership evidence in a search.</p>

    <h2>Service providers and cookies</h2>
    <p>The demonstration uses Vercel for hosting and Supabase for authentication, the database, and photograph storage. Email delivery providers process account confirmation and sign-in messages. These providers process information needed to operate their services, including technical logs.</p>
    <p>Essential cookies keep you signed in and complete email confirmation. A separate cookie remembers the email entered during signup or confirmation recovery for up to one hour. LostLink does not include advertising or analytics code.</p>

    <h2>Retention and requests</h2>
    <p>The demonstration does not yet enforce an automatic deletion schedule for item records, claims, staff notes, or photographs. Those records remain until an operator removes them. Provider logs and backups have separate retention settings; deleting an active record does not necessarily remove backup copies immediately.</p>
    <p>Ask the school office managing a listing about correcting its item or claim information, or to reach the LostLink operator about account information. Account deletion and data export require operator assistance; there is no self-service deletion control. Do not send passwords or sensitive ownership evidence in a general support message.</p>
    <p>Before using real school records or students’ personal information, the operator and participating school must establish their retention, privacy contact, and data handling arrangements. This demonstration notice does not assert that those arrangements have been completed.</p>
    <LegalLinks />
  </main>;
}
