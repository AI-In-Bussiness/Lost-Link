"""Phase 2 behavioral checks. Start `node tools/phase2-preview.mjs` first.

Requires Python Playwright and a Chromium executable (CHROMIUM_PATH optional).
Fictional evidence only; generated screenshots go to /tmp, never source control.
"""
import os
import unittest
from pathlib import Path
from playwright.sync_api import sync_playwright, expect

BASE = os.environ.get('LOSTLINK_PREVIEW_URL', 'http://127.0.0.1:4173')
SCHOOL = '/o/cedar-grove'


class InterfaceTest(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.runtime = sync_playwright().start()
        cls.browser = cls.runtime.chromium.launch(
            executable_path=os.environ.get('CHROMIUM_PATH', '/usr/bin/chromium'),
            headless=True, args=['--no-sandbox'])

    @classmethod
    def tearDownClass(cls):
        cls.browser.close()
        cls.runtime.stop()

    def setUp(self):
        self.context = self.browser.new_context(viewport={'width': 1440, 'height': 1000})
        self.page = self.context.new_page()
        self.errors = []
        self.page.on('pageerror', lambda err: self.errors.append(str(err)))
        self.page.goto(BASE)
        self.ready()

    def tearDown(self):
        self.context.close()
        self.assertEqual(self.errors, [], 'Uncaught browser errors')

    def ready(self):
        self.page.locator('main:not([aria-busy])').wait_for()

    def route(self, path):
        self.page.evaluate("path => {history.pushState({}, '', path); dispatchEvent(new PopStateEvent('popstate'));}", path)
        self.ready()

    def control(self, kind, value):
        self.page.locator('.demo-panel details').evaluate('node => node.open = true')
        self.page.locator('#demo-' + kind).select_option(value)
        self.ready()

    def test_public_search_filters_and_private_boundary(self):
        p = self.page
        p.get_by_label('What are you looking for?').fill('black Nike duffel')
        p.get_by_label('What are you looking for?').press('Enter')
        self.ready()
        self.assertIn('q=black+Nike+duffel', p.url)
        expect(p.locator('.item-card').first).to_contain_text('Black Nike duffel bag')
        self.assertNotIn('item-maple', p.locator('main').inner_html())
        p.get_by_label('Category', exact=True).select_option('bag')
        p.get_by_label('Color', exact=True).select_option('black')
        p.get_by_label('Found on or after').fill('2026-10-23')
        p.get_by_label('Found on or before').fill('2026-10-25')
        p.get_by_role('button', name='Search items').click()
        self.ready()
        expect(p.locator('.item-card')).to_have_count(1)
        p.get_by_role('link', name='Black Nike duffel bag', exact=True).click()
        self.ready()
        expect(p.locator('h1')).to_have_text('Black Nike duffel bag')
        self.assertNotIn('purple jump rope', p.locator('main').inner_text())
        self.assertNotIn('cabinet', p.locator('main').inner_text().lower())
        p.get_by_role('link', name='This might be mine').click()
        self.ready()
        self.assertIn('/sign-in?returnTo=', p.url)
        p.get_by_role('button', name='Continue as demo student').click()
        self.ready()
        expect(p.locator('#claim-form')).to_be_visible()
        self.assertIn('/items/item-duffel/claim', p.url)

    @unittest.skipUnless(os.environ.get('AXE_SCRIPT'), 'Set AXE_SCRIPT to a local axe-core axe.min.js')
    def test_accessibility_scan(self):
        p = self.page
        axe = Path(os.environ['AXE_SCRIPT']).read_text()
        routes = [('/', 'anonymous'), (SCHOOL + '/search', 'anonymous'),
                  (SCHOOL + '/items/item-duffel', 'anonymous'), ('/sign-in', 'anonymous'),
                  (SCHOOL + '/items/item-duffel/claim', 'student'), ('/my/claims', 'student'),
                  ('/my/claims/claim-approved', 'student'),
                  (SCHOOL + '/staff', 'staff'), (SCHOOL + '/staff/items', 'staff'),
                  (SCHOOL + '/staff/items/new', 'staff'),
                  (SCHOOL + '/staff/items/item-jacket', 'staff'),
                  (SCHOOL + '/staff/claims/claim-pending', 'staff')]
        for path, persona in routes:
            self.control('persona', persona)
            self.route(path)
            p.evaluate(axe)
            violations = p.evaluate("""async () => (await axe.run(document, {runOnly:{type:'tag',
              values:['wcag2a','wcag2aa','wcag21aa','wcag22aa']}})).violations.map(v =>
              ({id:v.id,impact:v.impact,nodes:v.nodes.map(n=>n.target)}))""")
            self.assertEqual(violations, [], path)

    def test_claim_approve_physical_return_and_status(self):
        p = self.page
        self.control('persona', 'student')
        self.route(SCHOOL + '/items/item-duffel/claim')
        p.get_by_label('How can staff tell this belongs to you?').fill('mine')
        p.get_by_role('button', name='Send private claim').click()
        expect(p.locator('.error-summary')).to_be_focused()
        expect(p.get_by_label('How can staff tell this belongs to you?')).to_have_value('mine')
        evidence = 'The inside pocket contains a fictional purple jump rope.'
        p.get_by_label('How can staff tell this belongs to you?').fill(evidence)
        p.get_by_role('button', name='Send private claim').click()
        self.ready()
        expect(p.locator('main')).to_contain_text('Claim received. Staff will review your ownership details.')
        claim_id = p.url.split('/my/claims/')[1].split('?')[0]
        self.assertNotIn('jump', p.url)
        self.control('persona', 'staff')
        self.route(SCHOOL + '/staff/claims/' + claim_id)
        expect(p.locator('main')).to_contain_text(evidence)
        p.get_by_role('button', name='Approve for collection').click()
        self.ready()
        expect(p.locator('#return-form')).to_be_visible()
        expect(p.locator('.badge.approved')).to_be_visible()
        p.get_by_role('button', name='Mark item returned').click()
        expect(p.locator('.error-summary')).to_be_focused()
        p.locator('#handover').check()
        p.get_by_role('button', name='Mark item returned').click()
        self.ready()
        expect(p.locator('main')).to_contain_text('Item returned')
        self.control('persona', 'student')
        self.route('/my/claims/' + claim_id)
        expect(p.locator('.badge.fulfilled')).to_be_visible()
        self.route(SCHOOL + '/search?q=duffel')
        expect(p.locator('main')).to_contain_text('No matching items found.')
        self.route('/my/claims/claim-competing')
        expect(p.locator('h1')).to_have_text('This page is unavailable')

    def test_staff_intake_public_preview_and_rejection(self):
        p = self.page
        self.control('persona', 'staff')
        self.route(SCHOOL + '/staff/items/new')
        for label, value in [
            ('Item title', 'Purple pencil case'),
            ('Public description', 'Purple zip pencil case with a fabric handle.'),
            ('Color', 'purple'), ('Broad found location', 'Art room'),
            ('Date found', '2026-10-25'),
            ('Identifying notes (optional)', 'Secret fictional star inside the lining.'),
            ('Staff storage location', 'Fictional cabinet C')]:
            p.get_by_label(label, exact=True).fill(value)
        p.get_by_label('Category', exact=True).select_option('accessory')
        p.get_by_role('button', name='Preview public listing').click()
        expect(p.locator('#public-preview')).to_be_visible()
        self.assertNotIn('Secret fictional', p.locator('#public-preview').inner_text())
        self.assertNotIn('cabinet C', p.locator('#public-preview').inner_text())
        p.get_by_role('button', name='Publish demo item').click()
        self.ready()
        item_id = p.url.rsplit('/', 1)[1]
        expect(p.locator('h1')).to_have_text('Purple pencil case')
        self.route(SCHOOL + '/staff/items?status=available')
        expect(p.locator('main')).to_contain_text('Purple pencil case')
        self.control('persona', 'anonymous')
        self.route(SCHOOL + '/items/' + item_id)
        self.assertNotIn('Secret fictional', p.locator('main').inner_text())
        self.control('persona', 'staff')
        self.route(SCHOOL + '/staff/claims/claim-pending')
        p.get_by_label('Reason for rejection').fill('The private identifying detail did not match.')
        p.get_by_role('button', name='Reject claim').click()
        self.ready()
        expect(p.locator('.badge.rejected')).to_be_visible()
        self.control('persona', 'student')
        self.route('/my/claims/claim-pending')
        expect(p.locator('main')).to_contain_text('The private identifying detail did not match.')

    def test_errors_empty_fallback_and_access(self):
        p = self.page
        self.route(SCHOOL + '/search?q=telescope')
        expect(p.locator('main')).to_contain_text('No matching items found.')
        self.control('scenario', 'network')
        expect(p.locator('h1')).to_have_text('We couldn’t load this page')
        self.assertIn('q=telescope', p.url)
        p.get_by_role('button', name='Try again', exact=True).click()
        self.ready()
        expect(p.locator('h1')).to_have_text('We couldn’t load this page')
        self.control('scenario', 'normal')
        expect(p.locator('#q')).to_have_value('telescope')
        self.control('scenario', 'rateLimit')
        expect(p.locator('main')).to_contain_text('Too many requests. Try again later.')
        self.control('scenario', 'normal')
        self.control('scenario', 'empty')
        self.route(SCHOOL + '/search')
        expect(p.locator('main')).to_contain_text('No items are listed here yet.')
        self.control('scenario', 'aiUnavailable')
        expect(p.locator('main')).to_contain_text('Showing keyword and filter results while smart matching is unavailable.')
        self.control('scenario', 'normal')
        self.control('persona', 'student')
        self.route(SCHOOL + '/staff')
        expect(p.locator('h1')).to_have_text('This page is unavailable')
        self.assertNotIn('Moon Club', p.locator('main').inner_text())
        self.assertNotIn('Staff workspace', p.locator('.main-nav').inner_text())
        self.control('persona', 'otherStaff')
        self.route(SCHOOL + '/staff/items/new')
        expect(p.locator('h1')).to_have_text('This page is unavailable')
        self.route('/o/closed-school/search')
        expect(p.locator('h1')).to_have_text('This page is unavailable')
        self.route('/sign-in?returnTo=https%3A%2F%2Fevil.invalid')
        p.get_by_role('button', name='Continue as demo student').click()
        self.ready()
        self.assertEqual(p.url, BASE + '/my/claims')

    def test_submission_failure_retains_evidence_and_retry(self):
        p = self.page
        # Exercise the public dependency-injection seam with a failing transport.
        p.evaluate("""async () => {
          const {claimsView} = await import('/src/interface/claims.ts');
          const {createMockApi,createMockStore} = await import('/src/mocks/client.ts');
          const api = createMockApi(createMockStore(), {persona:'student'});
          let attempts = 0;
          const transport = {...api, submitClaim: async input => ++attempts === 1
            ? {ok:false,error:{code:'INTERNAL_ERROR',message:'Please retry your claim.',requestId:'test'}}
            : api.submitClaim(input)};
          const ctx = {api:transport,url:new URL('/o/cedar-grove/items/item-duffel/claim',location.origin),
            orgSlug:'cedar-grove',orgName:'Cedar Grove School',
            session:{name:'Avery',email:'avery@example.invalid',staffOrgSlugs:[]},
            navigate:path => window.__claimPath=path,refresh:()=>{}};
          const view = await claimsView(ctx);
          const section = document.createElement('section'); section.id='transport-test';
          document.querySelector('#app').hidden=true;
          section.innerHTML=view.html; document.body.append(section); view.bind(section);
        }""")
        evidence = 'Fictional purple jump rope in the inside pocket.'
        p.get_by_label('How can staff tell this belongs to you?').fill(evidence)
        p.get_by_role('button', name='Send private claim').click()
        expect(p.locator('.error-summary')).to_be_focused()
        expect(p.get_by_label('How can staff tell this belongs to you?')).to_have_value(evidence)
        p.get_by_role('button', name='Send private claim').click()
        p.wait_for_function("window.__claimPath?.startsWith('/my/claims/')")
        self.assertEqual(p.evaluate('localStorage.length + sessionStorage.length'), 0)

    def test_navigation_races_keyboard_and_invalid_search(self):
        p = self.page
        self.route(SCHOOL + '/search?from=2026-02-31&q=%3Cscript%3E')
        expect(p.locator('#from')).to_have_value('2026-02-31')
        expect(p.locator('.error-summary')).to_be_focused()
        self.assertEqual(p.locator('main script').count(), 0)
        self.control('persona', 'student')
        self.control('scenario', 'slow')
        self.route(SCHOOL + '/items/item-duffel/claim')
        p.get_by_label('How can staff tell this belongs to you?').fill('Fictional purple jump rope in the inner pocket.')
        p.get_by_role('button', name='Send private claim').click()
        p.get_by_role('button', name='Sign out').click()
        self.ready()
        p.wait_for_timeout(2200)
        self.assertEqual(p.url, BASE + '/')
        expect(p.locator('#ownershipEvidence')).to_have_count(0)
        self.control('scenario', 'normal')
        p.keyboard.press('Control+Home')
        p.locator('.skip-link').focus()
        p.keyboard.press('Enter')
        self.assertTrue(p.evaluate("document.activeElement.id === 'main'"))

    def test_responsive_pages_landmarks_and_screenshots(self):
        p = self.page
        routes = ['/', SCHOOL + '/search', SCHOOL + '/items/item-duffel', '/my/claims',
                  SCHOOL + '/items/item-duffel/claim', SCHOOL + '/staff',
                  SCHOOL + '/staff/items', SCHOOL + '/staff/items/new',
                  SCHOOL + '/staff/items/item-jacket', SCHOOL + '/staff/claims/claim-pending']
        self.control('persona', 'staff')
        for width in [320, 768, 1440]:
            p.set_viewport_size({'width': width, 'height': 1000})
            for path in routes:
                self.route(path)
                self.assertEqual(p.locator('h1').count(), 1, path)
                self.assertEqual(p.locator('main').count(), 1)
                self.assertFalse(p.evaluate('document.documentElement.scrollWidth > innerWidth'), f'{width}: {path}')
            self.route(SCHOOL + '/search')
            p.screenshot(path=f'/tmp/lostlink-search-{width}.png', full_page=True)
        self.route(SCHOOL + '/staff')
        p.screenshot(path='/tmp/lostlink-staff.png', full_page=True)


if __name__ == '__main__':
    unittest.main(verbosity=2)
