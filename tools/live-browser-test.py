"""Real local Auth/Postgres/Storage browser acceptance. No intercepted API responses.
Run through npm run test:browser; credentials exist only in its temporary 0600 file.
"""
import json
import os
import struct
import unittest
import zlib
from pathlib import Path
from playwright.sync_api import sync_playwright, expect


def png_bytes():
    def chunk(kind, data):
        return struct.pack('!I', len(data)) + kind + data + struct.pack('!I', zlib.crc32(kind + data))
    return b'\x89PNG\r\n\x1a\n' + chunk(b'IHDR', struct.pack('!IIBBBBB', 40, 20, 8, 6, 0, 0, 0)) + chunk(b'IDAT', zlib.compress((b'\0' + bytes([60, 80, 120, 255]) * 40) * 20)) + chunk(b'IEND', b'')


class PersistedWorkflow(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.fixtures = json.loads(Path(os.environ['LOSTLINK_BROWSER_FIXTURES']).read_text())
        cls.origin = cls.fixtures['origin']
        cls.school = '/o/' + cls.fixtures['orgs'][0]['slug']
        cls.runtime = sync_playwright().start()
        cls.browser = cls.runtime.chromium.launch(headless=True, args=['--no-sandbox'], **({'executable_path': os.environ['CHROMIUM_PATH']} if os.environ.get('CHROMIUM_PATH') else {}))

    @classmethod
    def tearDownClass(cls):
        cls.browser.close()
        cls.runtime.stop()

    def setUp(self):
        self.errors = []

    def tearDown(self):
        self.assertEqual(self.errors, [], 'Uncaught errors in the live application')

    def context(self, **options):
        context = self.browser.new_context(**options)
        context.on('page', lambda page: page.on('pageerror', lambda error: self.errors.append(str(error))))
        self.addCleanup(context.close)
        return context

    def keyboard_activate(self, page, target, key='Enter'):
        expect(target).to_be_visible()
        for _ in range(100):
            if target.evaluate('node => node === document.activeElement'):
                page.keyboard.press(key)
                return
            page.keyboard.press('Tab')
        self.fail('Control is not reachable using Tab: ' + str(target))

    def login(self, account, path):
        context = self.context(viewport={'width': 1440, 'height': 1000})
        page = context.new_page()
        page.goto(self.origin + '/sign-in?returnTo=' + path)
        page.get_by_label('Email', exact=True).fill(account['email'])
        page.get_by_label('Password', exact=True).fill(account['password'])
        page.get_by_role('button', name='Sign in', exact=True).click()
        page.wait_for_url(self.origin + path)
        expect(page.locator('main')).not_to_have_attribute('aria-busy', 'true')
        session_cookies = [cookie for cookie in context.cookies() if cookie['name'].startswith('sb-') and '-auth-token' in cookie['name']]
        self.assertTrue(session_cookies, 'Sign-in must establish server session cookies')
        self.assertTrue(all(cookie['httpOnly'] and cookie['sameSite'] == 'Lax' and cookie['secure'] == self.origin.startswith('https:') for cookie in session_cookies))
        self.assertFalse(page.evaluate("document.cookie.split(';').some(value => /^\\s*sb-.*-auth-token/.test(value))"), 'Browser JavaScript must not read session tokens')
        return context, page

    def review(self, page, name):
        expect(page.locator('main h1')).to_have_count(1)
        expect(page.locator('main')).not_to_have_attribute('aria-busy', 'true')
        axe = Path('tools/phase2/node_modules/axe-core/axe.min.js')
        self.assertTrue(axe.exists(), 'Install the pinned tools/phase2 dependencies for accessibility checks.')
        if not page.evaluate('typeof window.axe !== "undefined"'):
            # Run the fixed test tool through the debugger; CSP intentionally
            # blocks unnonced script tags inserted into the application.
            page.evaluate(axe.read_text())
        for width, height in [(320, 1000), (390, 844), (568, 320), (768, 1000), (1440, 1000)]:
            with self.subTest(route=name, width=width, height=height):
                page.set_viewport_size({'width': width, 'height': height})
                page.evaluate('async () => {await document.fonts.ready}')
                self.assertTrue(page.evaluate('document.documentElement.scrollWidth <= innerWidth'), f'{name} overflow at {width}')
                results = page.evaluate("async () => (await axe.run(document, {runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21aa','wcag22aa']}})).violations.map(v=>({id:v.id,impact:v.impact,targets:v.nodes.map(n=>n.target)}))")
                self.assertEqual(results, [], f'{name} accessibility violations at {width}: {results}')
                page.screenshot(path=f'/tmp/lostlink-live-{name}-{width}.png', full_page=True)
        original_size = page.evaluate('document.documentElement.style.fontSize')
        page.emulate_media(reduced_motion='reduce')
        try:
            page.set_viewport_size({'width': 320, 'height': 640})
            page.evaluate("document.documentElement.style.fontSize=(parseFloat(getComputedStyle(document.documentElement).fontSize)*2)+'px'")
            self.assertTrue(page.evaluate('document.documentElement.scrollWidth <= innerWidth'), f'{name} overflow at doubled text size')
            page.screenshot(path=f'/tmp/lostlink-live-{name}-text-200.png', full_page=True)
        finally:
            page.evaluate('value => document.documentElement.style.fontSize=value', original_size)
            page.emulate_media(reduced_motion='no-preference')
            page.set_viewport_size({'width': 1440, 'height': 1000})

    def test_document_security_and_exposed_file_boundaries(self):
        context = self.context()
        page = context.new_page()
        response = page.goto(self.origin + '/sign-in')
        page.get_by_role('heading', name='Sign in', exact=True).wait_for()
        policy = response.headers['content-security-policy']
        nonce = __import__('re').search(r"'nonce-([^']+)'", policy).group(1)
        self.assertNotIn("'unsafe-eval'", policy)
        self.assertIn("frame-ancestors 'none'", policy)
        self.assertIn("form-action 'self'", policy)
        self.assertIn('no-store', response.headers['cache-control'])
        scripts = page.locator('script').evaluate_all('(nodes) => nodes.map(node => node.nonce)')
        self.assertTrue(scripts and all(value == nonce for value in scripts), 'Framework scripts must match the response nonce')
        reloaded = page.reload()
        page.get_by_role('heading', name='Sign in', exact=True).wait_for()
        self.assertNotEqual(policy, reloaded.headers['content-security-policy'])
        icon = page.locator('link[rel=icon]').first.get_attribute('href')
        icon_response = context.request.get(self.origin + icon)
        self.assertEqual(icon_response.status, 200)
        self.assertIn('image/svg+xml', icon_response.headers['content-type'])
        # Simulate untrusted markup in the real HTML response, preserving the
        # server's CSP and nonces. API responses are never intercepted.
        def inject_markup(route):
            original = route.fetch()
            body = original.text().replace('</head>', '<meta name="security-injection-probe" content="present"><script>window.__parserInjectionExecuted = true</script></head>', 1)
            route.fulfill(response=original, body=body)
        context.route(self.origin + '/sign-in', inject_markup)
        page.reload()
        page.get_by_role('heading', name='Sign in', exact=True).wait_for()
        page.wait_for_load_state('networkidle')
        expect(page.locator('meta[name=security-injection-probe]')).to_have_count(1)
        self.assertFalse(page.evaluate('window.__parserInjectionExecuted === true'))
        page.evaluate("""() => {
          window.__securityProbe = 0;
          window.__policyViolations = [];
          document.addEventListener('securitypolicyviolation', event => {
            window.__policyViolations.push(event.effectiveDirective);
            if (window.__policyViolations.length >= 2) document.documentElement.dataset.securityProbeComplete = 'true';
          });
          const button = document.createElement('button');
          button.setAttribute('onclick', 'window.__securityProbe += 1'); document.body.append(button); button.click(); button.remove();
          const base = document.createElement('base'); base.href = 'https://example.invalid/'; document.head.append(base);
        }""")
        expect(page.locator('html')).to_have_attribute('data-security-probe-complete', 'true')
        self.assertEqual(page.evaluate('window.__securityProbe'), 0)
        self.assertEqual(page.evaluate('new URL(document.baseURI).origin'), self.origin)
        for path in ['/.env', '/.env.local', '/.git/config', '/package.json', '/src/proxy.ts', '/supabase/config.toml', '/tools/phase2-preview.html']:
            self.assertEqual(context.request.get(self.origin + path).status, 404, path)
        for path in ['/api/auth/sign-in', '/api/auth/sign-up', '/api/auth/resend-confirmation', '/api/auth/sign-out', '/api/v1/organizations/' + self.fixtures['orgs'][0]['slug'] + '/staff/items']:
            rejected = context.request.post(self.origin + path, headers={'Origin': 'https://example.invalid'}, data={})
            self.assertEqual(rejected.status, 403, path)
            self.assertNotIn('access-control-allow-origin', rejected.headers)
        preflight = context.request.fetch(self.origin + '/api/auth/sign-in', method='OPTIONS', headers={'Origin': 'https://example.invalid', 'Access-Control-Request-Method': 'POST'})
        self.assertNotIn('access-control-allow-origin', preflight.headers)

    def test_policy_pages_and_public_navigation(self):
        page = self.context().new_page()
        page.goto(self.origin)
        page.get_by_role('heading', level=1, name='School lost & found').wait_for()
        page.get_by_role('navigation', name='Policies').get_by_role('link', name='Privacy policy', exact=True).click()
        page.wait_for_url(self.origin + '/privacy')
        page.get_by_role('heading', level=1, name='Privacy policy', exact=True).wait_for()
        expect(page.locator('main')).to_contain_text('does not yet enforce an automatic deletion schedule')
        self.review(page, 'privacy')
        page.get_by_role('navigation', name='Policies').get_by_role('link', name='Terms and conditions', exact=True).click()
        page.wait_for_url(self.origin + '/terms')
        page.get_by_role('heading', level=1, name='Terms and conditions', exact=True).wait_for()
        self.review(page, 'terms')
        page.goto(self.origin + '/sign-up')
        page.get_by_role('navigation', name='Policies').get_by_role('link', name='Privacy policy', exact=True).click()
        page.wait_for_url(self.origin + '/privacy')
        page.get_by_role('heading', level=1, name='Privacy policy', exact=True).wait_for()
        page.get_by_role('link', name='LostLink home', exact=True).click()
        page.wait_for_url(self.origin + '/')
        page.get_by_role('heading', level=1, name='School lost & found').wait_for()

    def test_real_upload_claim_review_return_and_isolation(self):
        staff_context, staff = self.login(self.fixtures['staff'], self.school + '/staff/items/new')
        self.review(staff, 'intake')
        for label, value in [('Item title','Blue acceptance backpack'),('Public description','A blue backpack with a white outside pocket.'),('Color','blue'),('Broad found location','Library'),('Date found','2026-01-01'),('Identifying notes (required)','Synthetic private green dinosaur inside.'),('Staff storage location','Synthetic staff cabinet')]:
            staff.get_by_label(label, exact=True).fill(value)
        staff.get_by_role('button', name='Preview public listing').click()
        self.assertNotIn('dinosaur', staff.locator('#public-preview').inner_text())
        staff.get_by_role('button', name='Save listing and add photo').click()
        staff.get_by_role('heading', name='Verification details', exact=True).wait_for()
        item_id = staff.url.rsplit('/', 1)[1]
        item_path = self.school + '/items/' + item_id
        staff.get_by_label('Choose item photo').set_input_files({'name':'spoof.jpg','mimeType':'image/jpeg','buffer':b'<html>not an image</html>'})
        staff.get_by_role('button', name='Upload for private review').click()
        expect(staff.locator('#photo-upload [role=alert]')).to_be_visible()
        staff.get_by_label('Choose item photo').set_input_files({'name':'synthetic.png','mimeType':'image/png','buffer':png_bytes()})
        staff.get_by_role('button', name='Upload for private review').click()
        staff.get_by_text('Private preview · not published', exact=True).wait_for()
        expect(staff.get_by_role('status').filter(has_text='Photo uploaded. Review')).to_be_visible()
        private_photo = staff.locator('[data-publish-photo]').locator('..').locator('img')
        expect(private_photo).to_be_visible()
        self.assertTrue(private_photo.evaluate('(img)=>img.decode().then(()=>img.naturalWidth > 0)'))
        staff.reload()
        staff.get_by_text('Private preview · not published', exact=True).wait_for()
        self.assertTrue(staff.locator('#photo-review').evaluate('(panel)=>Boolean(panel.compareDocumentPosition(document.querySelector(".two-column")) & Node.DOCUMENT_POSITION_FOLLOWING)'))
        staff.goto(self.origin + item_path)
        staff.get_by_role('link', name='Review or add photos', exact=True).click()
        staff.get_by_text('Private preview · not published', exact=True).wait_for()
        staff.goto(self.origin + self.school + '/search')
        staff.get_by_role('link', name='Review or add photos', exact=True).click()
        staff.get_by_text('Private preview · not published', exact=True).wait_for()
        visitor_context = self.context()
        visitor = visitor_context.new_page()
        visitor.goto(self.origin + item_path)
        visitor.get_by_role('heading', name='Blue acceptance backpack', exact=True).wait_for()
        self.assertNotIn('dinosaur', visitor.locator('main').inner_text())
        self.assertIn('No published photograph', visitor.locator('main').inner_text())
        expect(visitor.get_by_role('link', name='Review or add photos', exact=True)).to_have_count(0)
        self.assertNotIn('photo pending',visitor.content())
        staff.get_by_label('I inspected this processed photo').check()
        staff.get_by_role('button', name='Publish reviewed photo').click()
        staff.get_by_text('Published photograph', exact=True).wait_for()
        staff.reload()
        staff.get_by_text('Published photograph', exact=True).wait_for()
        self.review(staff, 'manage')
        self.assertIn('Photo published', staff.locator('main').inner_text())
        visitor.reload()
        photo = visitor.locator('main img')
        expect(photo).to_have_attribute('src', __import__('re').compile('/api/v1/organizations/.*/photos/.*/content'))
        self.assertTrue(photo.evaluate('(img)=>img.decode().then(()=>img.naturalWidth > 0)'))
        public_photo_url = photo.get_attribute('src')
        self.review(visitor, 'public-item')
        visitor.goto(self.origin)
        visitor.get_by_role('heading', level=1, name='School lost & found').wait_for()
        self.review(visitor, 'home')
        visitor.goto(self.origin + self.school + '/search?from=2026-01-02')
        visitor.get_by_text('No matching items found.', exact=True).wait_for()
        visitor.get_by_label('Found on or after').fill('2026-01-01')
        visitor.get_by_label('Found on or before').fill('2026-01-01')
        visitor.get_by_role('button', name='Search items').click()
        visitor.get_by_role('link', name='Blue acceptance backpack', exact=True).wait_for()
        self.review(visitor, 'search')
        visitor.get_by_role('link', name='Blue acceptance backpack', exact=True).click()
        visitor.get_by_role('link', name='This might be mine').click()
        visitor.get_by_role('heading', name='Sign in', exact=True).wait_for()
        expect(visitor.get_by_role('link', name='Resend confirmation email', exact=True)).to_have_count(0)
        self.review(visitor, 'sign-in')
        self.keyboard_activate(visitor, visitor.get_by_role('link', name='Create an account', exact=True))
        visitor.get_by_role('heading', name='Create an account', exact=True).wait_for()
        self.assertEqual(visitor.locator('input[name="next"]').input_value(), self.school + '/items/' + item_id + '/claim')
        self.review(visitor, 'sign-up')
        expect(visitor.get_by_role('link', name='Resend confirmation email', exact=True)).to_have_count(0)
        expect(visitor.get_by_role('button', name='Resend confirmation email', exact=True)).to_have_count(0)
        # Inspect the post-registration waiting state without sending another real email.
        visitor.goto(visitor.url + '&status=sent')
        visitor.get_by_role('heading', name='Check your email', exact=True).wait_for()
        self.assertEqual(visitor.locator('input[name="next"]').input_value(), self.school + '/items/' + item_id + '/claim')
        visitor.get_by_role('button', name='Resend confirmation email', exact=True).click()
        expect(visitor.get_by_label('Confirmation email address', exact=True)).to_be_focused()
        self.review(visitor, 'resend-confirmation')
        self.keyboard_activate(visitor, visitor.get_by_role('link', name='Sign in', exact=True))
        visitor.get_by_role('heading', name='Sign in', exact=True).wait_for()
        visitor.get_by_label('Email', exact=True).fill(self.fixtures['claimant']['email'])
        visitor.get_by_label('Password', exact=True).fill(self.fixtures['claimant']['password'])
        visitor.get_by_role('button', name='Sign in', exact=True).click()
        visitor.get_by_role('heading', name='Tell us what makes it yours.', exact=True).wait_for()
        self.review(visitor, 'claim-form')
        evidence = visitor.get_by_label('How can staff tell')
        self.keyboard_activate(visitor, visitor.get_by_role('button', name='Send private claim'))
        expect(visitor.locator('.error-summary')).to_be_focused()
        self.review(visitor, 'claim-validation')
        self.keyboard_activate(visitor, visitor.locator('.error-summary a[href="#ownershipEvidence"]'))
        expect(evidence).to_be_focused()
        proof = 'A synthetic green dinosaur is inside the zipped pocket.'
        evidence.fill(proof)
        # Real browser network failure, without replacing any API response.
        visitor_context.set_offline(True)
        try:
            self.keyboard_activate(visitor, visitor.get_by_role('button', name='Send private claim'))
            expect(visitor.locator('.error-summary')).to_be_focused()
            expect(visitor.locator('.error-summary')).to_contain_text('Unable to reach LostLink')
            expect(evidence).to_have_value(proof)
            expect(visitor.get_by_role('button', name='Send private claim')).to_be_enabled()
        finally:
            visitor_context.set_offline(False)
        visitor.get_by_role('button', name='Send private claim').click()
        visitor.get_by_role('heading', name='Your claim is with staff.', exact=True).wait_for()
        claim_id = visitor.url.split('?')[0].rsplit('/',1)[1]
        visitor.reload()
        visitor.get_by_role('heading', name='Your claim is with staff.', exact=True).wait_for()
        self.review(visitor, 'claim-status')
        visitor.goto(self.origin + '/my/claims')
        visitor.get_by_role('heading', name='My claims', exact=True).wait_for()
        self.review(visitor, 'own-claims')
        other_context, other = self.login(self.fixtures['other'], '/my/claims')
        denied = other_context.request.get(self.origin + '/api/v1/me/claims').json()
        self.assertEqual(denied['data'], [])
        other.goto(self.origin + '/my/claims/' + claim_id)
        other.get_by_role('heading', name='This page is unavailable', exact=True).wait_for()
        self.review(other, 'other-owner-denied')
        foreign_context, foreign = self.login(self.fixtures['foreign'], '/o/' + self.fixtures['orgs'][1]['slug'] + '/staff')
        for endpoint in ['/staff/items/' + item_id, '/staff/items/' + item_id + '/photos', '/staff/activity?itemId=' + item_id]:
            self.assertEqual(foreign_context.request.get(self.origin + '/api/v1/organizations/' + self.fixtures['orgs'][0]['slug'] + endpoint).status,404)
        self.assertEqual(foreign_context.request.get(self.origin + '/api/v1/organizations/' + self.fixtures['orgs'][0]['slug'] + '/staff/claims').status,404)
        foreign.goto(self.origin + self.school + '/staff/claims/' + claim_id)
        foreign.get_by_role('heading', name='This page is unavailable', exact=True).wait_for()
        self.review(foreign, 'other-school-denied')
        staff.goto(self.origin + self.school + '/staff')
        staff.get_by_role('heading', name='Claim review queue', exact=True).wait_for()
        self.review(staff, 'dashboard')
        staff.goto(self.origin + self.school + '/staff/items')
        staff.get_by_role('heading', name='Found items', exact=True).wait_for()
        self.review(staff, 'inventory')
        staff.goto(self.origin + self.school + '/staff/claims/' + claim_id)
        staff.get_by_role('heading', name='Review this claim', exact=True).wait_for()
        self.review(staff, 'review')
        self.keyboard_activate(staff, staff.get_by_role('button', name='Approve for collection'))
        staff.get_by_role('heading', name='Record physical handover', exact=True).wait_for()
        expect(staff.locator('main h1')).to_be_focused()
        staff.reload()
        staff.get_by_role('heading', name='Record physical handover', exact=True).wait_for()
        self.assertEqual(visitor_context.request.get(self.origin + public_photo_url).status,404)
        self.assertEqual(staff_context.request.get(self.origin + public_photo_url).status,404)
        visitor.goto(self.origin + '/my/claims/' + claim_id)
        visitor.get_by_role('heading', name='Ready for collection.', exact=True).wait_for()
        self.keyboard_activate(staff, staff.get_by_label('I confirm'), 'Space')
        self.keyboard_activate(staff, staff.get_by_role('button', name='Mark item returned'))
        staff.get_by_text('The physical handover has been recorded.', exact=True).wait_for()
        expect(staff.locator('main h1')).to_be_focused()
        staff.reload()
        staff.get_by_text('The physical handover has been recorded.', exact=True).wait_for()
        visitor.reload()
        visitor.get_by_role('heading', name='Back where it belongs.', exact=True).wait_for()
        visitor.goto(self.origin + self.school + '/search')
        visitor.get_by_text('No items are listed here yet.', exact=True).wait_for()
        self.assertEqual(visitor_context.request.get(self.origin + public_photo_url).status,404)
        # A second persisted claim verifies public rejection text and staff-only note isolation.
        staff.goto(self.origin + self.school + '/staff/items/new')
        for label, value in [('Item title','Rejection acceptance case'),('Public description','A blue case for another fictional workflow.'),('Color','blue'),('Broad found location','Library'),('Date found','2026-01-01'),('Identifying notes (required)','Synthetic hidden mark.'),('Staff storage location','Synthetic staff cabinet')]:
            staff.get_by_label(label, exact=True).fill(value)
        staff.get_by_role('button', name='Preview public listing').click()
        staff.get_by_role('button', name='Save listing and add photo').click()
        staff.get_by_role('heading', name='Verification details', exact=True).wait_for()
        second_id = staff.url.rsplit('/',1)[1]
        visitor.goto(self.origin + self.school + '/items/' + second_id + '/claim')
        visitor.get_by_label('How can staff tell').fill('Synthetic evidence provided for rejection testing.')
        visitor.get_by_role('button', name='Send private claim').click()
        visitor.get_by_role('heading', name='Your claim is with staff.', exact=True).wait_for()
        rejected_id = visitor.url.split('?')[0].rsplit('/',1)[1]
        staff.goto(self.origin + self.school + '/staff/claims/' + rejected_id)
        staff.get_by_label('Reason for rejection',exact=True).fill('The supplied details do not match. Contact the school office.')
        staff.get_by_label('Private review note (optional)',exact=True).fill('Synthetic private internal comparison only.')
        staff.get_by_role('button', name='Reject claim',exact=True).click()
        staff.get_by_text('Claim rejected',exact=True).wait_for()
        visitor.reload()
        visitor.get_by_role('heading', name='This claim wasn’t approved.',exact=True).wait_for()
        self.assertIn('The supplied details do not match.',visitor.locator('main').inner_text())
        self.assertNotIn('Synthetic private internal comparison only.',visitor.content())
        self.assertNotIn('dinosaur', visitor.url)
        self.assertEqual(visitor.evaluate('Object.keys(localStorage)'), [])
        print('PASS: twelve live routes at 320/390/568/768/1440px with axe, real login, photos, date filters, keyboard validation/approval/return, offline claim recovery, persistence, isolation and safe rejection.')


if __name__ == '__main__':
    unittest.main(verbosity=2)
