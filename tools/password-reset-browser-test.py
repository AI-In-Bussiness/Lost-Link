"""Real PKCE recovery, local mail and password sign-in for all four account types."""
import json
import os
import re
import time
import unittest
from pathlib import Path
from urllib.parse import parse_qs, quote, urlparse
from playwright.sync_api import sync_playwright, expect


class PasswordRecovery(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.fixtures = json.loads(Path(os.environ['LOSTLINK_RECOVERY_FIXTURES']).read_text())
        cls.origin = cls.fixtures['origin']
        cls.runtime = sync_playwright().start()
        chromium = os.environ.get('CHROMIUM_PATH') or ('/usr/bin/chromium' if Path('/usr/bin/chromium').exists() else None)
        cls.browser = cls.runtime.chromium.launch(headless=True, args=['--no-sandbox'], **({'executable_path': chromium} if chromium else {}))

    @classmethod
    def tearDownClass(cls):
        cls.browser.close()
        cls.runtime.stop()

    def context(self):
        context = self.browser.new_context(viewport={'width': 390, 'height': 844})
        self.addCleanup(context.close)
        return context

    def email_link(self, context, email):
        mail = self.fixtures['mailOrigin']
        for _ in range(40):
            text = ''
            inbox = context.request.get(mail + '/api/v1/messages')
            if inbox.ok:
                messages = inbox.json()['messages']
                entry = next((message for message in messages if any(to['Address'] == email for to in message['To'])), None)
                if entry:
                    text = context.request.get(mail + '/api/v1/message/' + entry['ID']).json()['Text']
            else:
                mailbox = email.split('@')[0]
                messages = context.request.get(mail + '/api/v1/mailbox/' + mailbox).json()
                if messages:
                    text = context.request.get(mail + '/api/v1/mailbox/' + mailbox + '/' + messages[-1]['id']).json()['body']['text']
            for candidate in re.findall(r'https?://[^\s<>"\']+', text):
                url = urlparse(candidate)
                if url.path == '/auth/v1/verify' and url.scheme + '://' + url.netloc == self.fixtures['authOrigin']:
                    self.assertEqual(parse_qs(url.query)['type'], ['recovery'])
                    return candidate
            time.sleep(0.25)
        self.fail('Local password recovery email did not arrive.')

    def review(self, page, name):
        page.evaluate(Path('tools/phase2/node_modules/axe-core/axe.min.js').read_text())
        for width in [320, 390, 768, 1440]:
            page.set_viewport_size({'width': width, 'height': 1000})
            self.assertFalse(page.evaluate('document.documentElement.scrollWidth > innerWidth + 1'))
            violations = page.evaluate('async () => (await axe.run(document, {runOnly:{type:"tag",values:["wcag2a","wcag2aa","wcag21aa","wcag22aa"]}})).violations.map(v=>v.id)')
            self.assertEqual(violations, [])
        page.screenshot(path='/tmp/lostlink-live-recovery-' + name + '.png', full_page=True)

    def test_01_validation_unknown_account_and_unverified_session_denial(self):
        context = self.context()
        page = context.new_page()
        page.goto(self.origin + '/sign-in?next=https://attacker.invalid')
        expect(page.get_by_role('link', name='Forgot your password?', exact=True)).to_have_attribute('href', '/forgot-password?next=%2Faccount')
        for path in ['/api/auth/forgot-password', '/api/auth/reset-password']:
            for origin in ['https://attacker.invalid', 'null', '']:
                self.assertEqual(context.request.post(self.origin + path, headers={'Origin': origin}, form={'email': 'invalid'}).status, 403)
        for body in ['email=bad', 'email=a%40b.test&email=c%40d.test', 'email=a%40b.test&role=admin', 'email=a%40b.test&next=%2Fadmin&next=%2Faccount', 'x' * 4097]:
            response = context.request.post(self.origin + '/api/auth/forgot-password', headers={'Origin': self.origin, 'Content-Type': 'application/x-www-form-urlencoded'}, data=body, max_redirects=0)
            self.assertEqual(response.status, 303)
            self.assertEqual(parse_qs(urlparse(response.headers['location']).query)['error'], ['invalid'])
        page.goto(self.origin + '/forgot-password?next=https://attacker.invalid')
        self.review(page, 'request')
        page.get_by_label('Email', exact=True).fill(self.fixtures['unknownEmail'])
        page.get_by_role('button', name='Send password reset link').click()
        expect(page.get_by_role('status')).to_contain_text('If this address has an account')
        self.assertEqual(parse_qs(urlparse(page.url).query)['next'], ['/account'])
        self.assertNotIn(self.fixtures['unknownEmail'], page.url)
        page.goto(self.origin + '/reset-password')
        expect(page.get_by_role('button', name='Save new password')).to_have_count(0)
        response = context.request.post(self.origin + '/api/auth/reset-password', headers={'Origin': self.origin}, form={'password': 'unused-password', 'confirmPassword': 'unused-password'}, max_redirects=0)
        self.assertIn('/forgot-password?error=link', response.headers['location'])
        page.goto(self.origin + '/auth/callback?recovery=1&code=invalid&next=https://attacker.invalid')
        page.wait_for_url('**/forgot-password?error=link&next=%2Faccount')
        expect(page.locator('main').get_by_role('alert')).to_contain_text('expired')
        self.review(page, 'bad-link')

    def test_02_reset_real_passwords_for_claimant_staff_school_admin_and_owner(self):
        for actor in self.fixtures['accounts']:
            with self.subTest(role=actor['role']):
                context = self.context()
                page = context.new_page()
                page.goto(self.origin + '/sign-in?next=' + quote(actor['next'], safe=''))
                # A normal password session alone cannot open the recovery form.
                page.get_by_label('Email', exact=True).fill(actor['email'])
                page.get_by_label('Password', exact=True).fill(actor['password'])
                page.get_by_role('button', name='Sign in', exact=True).click()
                page.wait_for_url(self.origin + actor['next'])
                page.goto(self.origin + '/reset-password')
                expect(page.get_by_role('button', name='Save new password')).to_have_count(0)
                normal_denied = context.request.post(self.origin + '/api/auth/reset-password', headers={'Origin': self.origin}, form={'password': actor['newPassword'], 'confirmPassword': actor['newPassword']}, max_redirects=0)
                self.assertIn('/forgot-password?error=link', normal_denied.headers['location'])
                page.goto(self.origin + '/sign-in?next=' + quote(actor['next'], safe=''))
                page.get_by_role('link', name='Forgot your password?', exact=True).click()
                page.wait_for_url(self.origin + '/forgot-password?next=' + quote(actor['next'], safe=''))
                page.get_by_role('heading', name='Reset your password', exact=True).wait_for()
                page.get_by_label('Email', exact=True).fill(actor['email'])
                page.get_by_role('button', name='Send password reset link').click()
                expect(page.get_by_role('status')).to_contain_text('If this address has an account')
                link = self.email_link(context, actor['email'])
                # A repeat must not invalidate the challenge for the email
                # already sent, even on older Auth servers that replace it
                # before rejecting a second recovery request as throttled.
                retry = context.request.post(self.origin + '/api/auth/forgot-password', headers={'Origin': self.origin}, form={'email': actor['email'], 'next': actor['next']}, max_redirects=0)
                self.assertIn('error=rate-limit', retry.headers['location'])
                verified = context.request.get(link, max_redirects=0)
                callback = verified.headers['location']
                self.assertEqual(urlparse(callback).path, '/auth/callback')
                self.assertTrue(parse_qs(urlparse(callback).query).get('sb_flow_id'))
                wrong_browser = self.context().new_page()
                wrong_browser.goto(callback)
                expect(wrong_browser.locator('main').get_by_role('alert')).to_contain_text('different browser')
                page.goto(callback)
                self.assertEqual(page.url, self.origin + '/reset-password?next=' + quote(actor['next'], safe=''))
                expect(page.get_by_role('button', name='Save new password')).to_be_visible()
                grant = next(cookie for cookie in context.cookies() if cookie['name'] == 'lostlink-password-recovery')
                self.assertTrue(grant['httpOnly'] and grant['sameSite'] == 'Lax')
                self.assertFalse(page.evaluate("document.cookie.includes('lostlink-password-recovery')"))
                self.assertIn('no-store', context.request.get(page.url).headers['cache-control'])
                if actor['role'] == 'claimant':
                    self.review(page, 'new-password')
                # Bypass browser validation to exercise the real server checks.
                for body in [{'password': 'short', 'confirmPassword': 'short'}, {'password': actor['newPassword'], 'confirmPassword': 'different-password'}, {'password': actor['newPassword'], 'confirmPassword': actor['newPassword'], 'role': 'owner'}]:
                    rejected = context.request.post(self.origin + '/api/auth/reset-password', headers={'Origin': self.origin}, form=body, max_redirects=0)
                    self.assertRegex(rejected.headers['location'], r'error=(invalid|mismatch)')
                    self.assertNotIn(actor['newPassword'], rejected.headers['location'])
                page.get_by_label('New password', exact=True).fill(actor['newPassword'])
                page.get_by_label('Confirm new password', exact=True).fill('different-password')
                page.get_by_role('button', name='Save new password', exact=True).click()
                expect(page.locator('main').get_by_role('alert')).to_contain_text('do not match')
                expect(page.get_by_label('New password', exact=True)).to_have_value('')
                page.get_by_label('New password', exact=True).fill(actor['newPassword'])
                page.get_by_label('Confirm new password', exact=True).fill(actor['newPassword'])
                page.get_by_role('button', name='Save new password', exact=True).click()
                expect(page.get_by_role('heading', name='Password updated', exact=True)).to_be_visible()
                self.assertFalse(any(cookie['name'] == 'lostlink-password-recovery' for cookie in context.cookies()))
                repeat = context.request.post(self.origin + '/api/auth/reset-password', headers={'Origin': self.origin}, form={'password': actor['password'], 'confirmPassword': actor['password']}, max_redirects=0)
                self.assertIn('/forgot-password?error=link', repeat.headers['location'])
                replay = context.request.get(callback, max_redirects=0)
                self.assertIn('/forgot-password?error=link', replay.headers['location'])
                page.get_by_role('link', name='Continue to LostLink', exact=True).click()
                page.wait_for_url(self.origin + actor['next'])
                # The original password is rejected; a fresh browser signs in
                # with the replacement and reaches its role-specific destination.
                fresh = self.context().new_page()
                fresh.goto(self.origin + '/sign-in?next=' + quote(actor['next'], safe=''))
                fresh.get_by_label('Email', exact=True).fill(actor['email'])
                fresh.get_by_label('Password', exact=True).fill(actor['password'])
                fresh.get_by_role('button', name='Sign in', exact=True).click()
                expect(fresh.locator('main').get_by_role('alert')).to_contain_text('Unable to sign in')
                fresh.get_by_label('Email', exact=True).fill(actor['email'])
                fresh.get_by_label('Password', exact=True).fill(actor['newPassword'])
                fresh.get_by_role('button', name='Sign in', exact=True).click()
                fresh.wait_for_url(self.origin + actor['next'])
                if actor['role'] == 'owner':
                    expect(fresh.get_by_role('heading', name='Keep LostLink running.')).to_be_visible()
                elif actor['role'] == 'admin':
                    expect(fresh.get_by_role('heading', name='Fictional Recovery School settings', exact=True)).to_be_visible()


if __name__ == '__main__':
    unittest.main(verbosity=2, failfast=True)
