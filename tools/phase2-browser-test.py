"""Phase 2 behavioral checks. Start `node tools/phase2-preview.mjs` first.

Requires Python Playwright and a Chromium executable (CHROMIUM_PATH optional).
Fictional evidence only; generated screenshots go to /tmp, never source control.
"""
import os
import struct
import unittest
import zlib
from pathlib import Path
from playwright.sync_api import sync_playwright, expect

BASE = os.environ.get('LOSTLINK_PREVIEW_URL', 'http://127.0.0.1:4173')
SCHOOL = '/o/cedar-grove'


def png_bytes(red=160):
    """Original, tiny raster fixture; no external assets or image library needed."""
    def chunk(kind, data):
        return struct.pack('!I', len(data)) + kind + data + struct.pack('!I', zlib.crc32(kind + data))
    pixels = b''.join(b'\0' + bytes([red, 80, 120, 255]) * 4 for _ in range(4))
    return (b'\x89PNG\r\n\x1a\n' + chunk(b'IHDR', struct.pack('!IIBBBBB', 4, 4, 8, 6, 0, 0, 0))
            + chunk(b'IDAT', zlib.compress(pixels)) + chunk(b'IEND', b''))


class InterfaceTest(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.runtime = sync_playwright().start()
        chromium = os.environ.get('CHROMIUM_PATH')
        if not chromium and Path('/usr/bin/chromium').exists():
            chromium = '/usr/bin/chromium'
        cls.browser = cls.runtime.chromium.launch(
            **({'executable_path': chromium} if chromium else {}),
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
        self.page.locator('form[aria-busy="true"]').wait_for(state='hidden')
        self.page.locator('main:not([aria-busy])').wait_for()

    def route(self, path):
        self.page.evaluate("path => {history.pushState({}, '', path); dispatchEvent(new PopStateEvent('popstate'));}", path)
        self.ready()

    def control(self, kind, value):
        self.page.locator('.demo-panel details').evaluate('node => node.open = true')
        self.page.locator('#demo-' + kind).select_option(value)
        self.ready()

    def tab_to(self, target):
        """Find a control with native Tab navigation; never programmatically focus it."""
        expect(target).to_be_visible()
        for _ in range(100):
            if target.evaluate('node => node === document.activeElement'):
                return
            self.page.keyboard.press('Tab')
        self.fail('Control was not reachable using the Tab key: ' + str(target))

    def keyboard_activate(self, target, key='Enter'):
        self.tab_to(target)
        self.page.keyboard.press(key)

    def test_landing_features_and_next_steps(self):
        p = self.page
        expect(p.locator('.hero-description')).to_contain_text('Your school’s lost-and-found')
        expect(p.locator('.feature-notes')).to_contain_text('Keep your proof private')
        expect(p.locator('.feature-notes')).to_contain_text('physical handover')
        self.keyboard_activate(p.get_by_role('link', name='Explore features', exact=True))
        expect(p.locator('#features')).to_be_focused()
        self.assertTrue(p.url.endswith('#features'))
        self.keyboard_activate(p.get_by_role('link', name='How it works', exact=True))
        expect(p.locator('#how-it-works')).to_be_focused()
        self.assertTrue(p.url.endswith('#how-it-works'))
        p.go_back()
        self.ready()
        expect(p.locator('#features')).to_be_focused()
        p.reload()
        self.ready()
        expect(p.locator('#features')).to_be_focused()
        p.get_by_role('link', name='Create an account', exact=True).click()
        self.ready()
        expect(p.get_by_role('button', name='Continue as demo student')).to_be_visible()
        p.get_by_role('button', name='Continue as demo student').click()
        self.ready()
        self.route('/')
        p.get_by_role('link', name='View my claims', exact=True).click()
        self.ready()
        self.assertEqual(p.url, BASE + '/my/claims')
        self.route('/')
        p.get_by_role('link', name='Staff sign in', exact=True).click()
        self.ready()
        expect(p.get_by_role('button', name='Continue as demo staff')).to_be_visible()

    def test_landing_stays_available_without_school_directory(self):
        p = self.page
        # Exercise the live composition contract with a synthetic directory only.
        p.evaluate("""async () => {
          const {mountLostLink} = await import('/src/interface/app.ts');
          const {createMockApi,createMockStore} = await import('/src/mocks/client.ts');
          const original = createMockApi(createMockStore());
          window.__homeDirectory = 'failure';
          const api = {...original,live:true,listOrganizations:async () =>
            window.__homeDirectory === 'failure'
              ? {ok:false,error:{code:'NETWORK_ERROR',message:'Unavailable',requestId:'test'}}
              : window.__homeDirectory === 'empty' ? {ok:true,data:[]} : original.listOrganizations()};
          document.querySelector('#app').remove();
          const root = document.createElement('div');root.id='app';document.body.prepend(root);
          window.__homeApp = mountLostLink(root,{live:true,getApi:()=>api,
            getSession:()=>null,signOut:()=>{}});
        }""")
        self.ready()
        expect(p.locator('h1')).to_contain_text('Lost something?')
        expect(p.locator('#features')).to_be_visible()
        expect(p.locator('main')).to_contain_text('We couldn’t load the school list.')
        expect(p.locator('#home-search')).to_have_count(0)
        expect(p.get_by_role('link', name='Create an account', exact=True)).to_have_attribute('href', '/sign-up')
        p.evaluate("window.__homeDirectory = 'normal'")
        p.get_by_role('button', name='Try again', exact=True).click()
        self.ready()
        expect(p.locator('#home-search')).to_be_visible()
        expect(p.locator('h1')).to_be_focused()
        p.evaluate("window.__homeDirectory = 'empty'; window.__homeApp.refresh()")
        self.ready()
        expect(p.locator('main')).to_contain_text('No schools are currently listing items.')
        expect(p.locator('#features')).to_be_visible()
        expect(p.locator('#home-search')).to_have_count(0)
        expect(p.get_by_role('button', name='Try again', exact=True)).to_have_count(0)

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

    def test_keyboard_only_search_claim_review_and_return(self):
        p = self.page
        self.tab_to(p.get_by_label('What are you looking for?'))
        p.keyboard.type('black Nike duffel')
        p.keyboard.press('Enter')
        self.ready()
        self.keyboard_activate(p.get_by_role('link', name='Black Nike duffel bag', exact=True))
        self.ready()
        self.keyboard_activate(p.get_by_role('link', name='This might be mine'))
        self.ready()
        self.keyboard_activate(p.get_by_role('button', name='Continue as demo student'))
        self.ready()
        self.tab_to(p.get_by_label('How can staff tell this belongs to you?'))
        p.keyboard.type('Fictional purple jump rope in the inside pocket.')
        self.keyboard_activate(p.get_by_role('button', name='Send private claim'))
        self.ready()
        claim_id = p.url.split('/my/claims/')[1].split('?')[0]
        # The persona control is review-harness setup, outside the product journey.
        self.control('persona', 'staff')
        self.keyboard_activate(p.locator('.main-nav').get_by_role('link', name='Staff workspace'))
        self.ready()
        self.keyboard_activate(p.locator(f'a[href="{SCHOOL}/staff/claims/{claim_id}"]'))
        self.ready()
        self.keyboard_activate(p.get_by_role('button', name='Approve for collection'))
        self.ready()
        self.keyboard_activate(p.locator('#handover'), key='Space')
        self.keyboard_activate(p.get_by_role('button', name='Mark item returned'))
        self.ready()
        expect(p.locator('main')).to_contain_text('Item returned')
        self.assertEqual(p.evaluate('localStorage.length + sessionStorage.length'), 0)

    def test_own_statuses_duplicate_receipt_and_empty_lists(self):
        p = self.page
        self.control('persona', 'student')
        for claim_id, status in [('claim-pending', 'pending'), ('claim-approved', 'approved'),
                                 ('claim-rejected', 'rejected')]:
            self.route('/my/claims/' + claim_id)
            expect(p.locator('.badge.' + status)).to_be_visible()
            if status == 'approved':
                expect(p.locator('main')).to_contain_text('Collection instructions')
            else:
                self.assertEqual(p.get_by_role('heading', name='Collection instructions').count(), 0)
        self.control('persona', 'otherStudent')
        self.route('/my/claims/claim-fulfilled')
        expect(p.locator('.badge.fulfilled')).to_be_visible()
        self.control('persona', 'student')
        for _ in range(2):
            self.route(SCHOOL + '/items/item-duffel/claim')
            p.get_by_label('How can staff tell this belongs to you?').fill('Fictional purple jump rope in the inside pocket.')
            p.get_by_role('button', name='Send private claim').click()
            self.ready()
            current = p.url.split('/my/claims/')[1].split('?')[0]
            if _ == 0:
                first_receipt = current
            else:
                self.assertEqual(current, first_receipt)
        self.control('scenario', 'empty')
        self.route('/my/claims')
        expect(p.locator('main')).to_contain_text('No claims yet')
        self.control('persona', 'staff')
        self.route(SCHOOL + '/staff')
        expect(p.locator('main')).to_contain_text('No pending claims here.')
        self.route(SCHOOL + '/staff/items')
        expect(p.locator('main')).to_contain_text('No items in this view.')

    def test_history_and_cross_school_sign_in_context(self):
        p = self.page
        p.get_by_label('Your school', exact=True).select_option('maple-hill')
        p.get_by_label('What are you looking for?').fill('duffel')
        p.get_by_role('button', name='Find my item').click()
        self.ready()
        search_url = p.url
        p.get_by_role('link', name='Black Nike duffel bag', exact=True).click()
        self.ready()
        item_url = p.url
        p.go_back()
        self.ready()
        self.assertEqual(p.url, search_url)
        expect(p.get_by_label('Describe your item')).to_have_value('duffel')
        p.go_forward()
        self.ready()
        self.assertEqual(p.url, item_url)
        p.get_by_role('link', name='This might be mine').click()
        self.ready()
        expect(p.locator('#school-name')).to_have_text('Maple Hill School')
        expect(p.get_by_role('link', name='Back to school search')).to_have_attribute('href', '/o/maple-hill/search')
        p.get_by_role('button', name='Continue as demo student').click()
        self.ready()
        self.assertIn('/o/maple-hill/items/item-maple-duffel/claim', p.url)
        p.get_by_label('How can staff tell this belongs to you?').fill('Fictional Maple Hill ownership detail in the inner pocket.')
        p.get_by_role('button', name='Send private claim').click()
        self.ready()
        expect(p.locator('#school-name')).to_have_text('Maple Hill School')
        expect(p.locator('.main-nav').get_by_role('link', name='Find an item')).to_have_attribute('href', '/o/maple-hill/search')

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
        p.wait_for_function("() => window.__claimPath?.startsWith('/my/claims/')")
        self.assertEqual(p.evaluate('localStorage.length + sessionStorage.length'), 0)

    def test_conflict_recovery_preserves_forms_and_error_links_focus(self):
        p = self.page
        p.evaluate("""async () => {
          const {claimsView} = await import('/src/interface/claims.ts');
          const {createMockApi,createMockStore} = await import('/src/mocks/client.ts');
          const api = createMockApi(createMockStore(), {persona:'student'});
          const conflict={ok:false,error:{code:'CONFLICT',message:'This item is no longer available.',requestId:'test'}};
          const ctx={api:{...api,submitClaim:async()=>conflict},
            url:new URL('/o/cedar-grove/items/item-duffel/claim',location.origin),
            orgSlug:'cedar-grove',orgName:'Cedar Grove School',
            session:{name:'Avery',email:'avery@example.invalid',staffOrgSlugs:[]},navigate:()=>{},refresh:()=>{}};
          const view=await claimsView(ctx);
          const section=document.createElement('section');section.id='conflict-test';
          document.querySelector('#app').hidden=true;section.innerHTML=view.html;
          document.body.append(section);view.bind(section);
        }""")
        evidence = 'Fictional purple jump rope in the inside pocket.'
        p.get_by_label('How can staff tell this belongs to you?').fill(evidence)
        p.get_by_role('button', name='Send private claim').click()
        expect(p.locator('.error-summary')).to_be_focused()
        expect(p.get_by_label('How can staff tell this belongs to you?')).to_have_value(evidence)
        expect(p.get_by_role('link', name='Refresh item availability')).to_have_attribute('href', SCHOOL + '/items/item-duffel')
        p.evaluate("""async () => {
          document.querySelector('#conflict-test').remove();
          const {staffView}=await import('/src/interface/staff.ts');
          const {createMockApi,createMockStore}=await import('/src/mocks/client.ts');
          const api=createMockApi(createMockStore(),{persona:'staff'});
          const conflict={ok:false,error:{code:'CONFLICT',message:'Another staff member reviewed this claim.',requestId:'test'}};
          const ctx={api:{...api,decideClaim:async()=>conflict},
            url:new URL('/o/cedar-grove/staff/claims/claim-pending',location.origin),
            orgSlug:'cedar-grove',orgName:'Cedar Grove School',
            session:{name:'Staff',email:'staff@example.invalid',staffOrgSlugs:['cedar-grove']},
            navigate:()=>{},refresh:()=>window.__refreshed=true};
          const view=await staffView(ctx);
          const section=document.createElement('section');section.id='conflict-test';section.innerHTML=view.html;
          document.body.append(section);view.bind(section);
        }""")
        reason = 'The fictional identifying detail did not match.'
        p.get_by_label('Reason for rejection').fill(reason)
        p.get_by_role('button', name='Reject claim').click()
        expect(p.locator('.error-summary')).to_be_focused()
        expect(p.get_by_label('Reason for rejection')).to_have_value(reason)
        expect(p.locator('.badge.pending')).to_be_visible()
        p.get_by_role('button', name='Refresh current status').click()
        self.assertTrue(p.evaluate('window.__refreshed'))
        p.evaluate("document.querySelector('#conflict-test').remove(); document.querySelector('#app').hidden=false")
        self.control('persona', 'staff')
        self.route(SCHOOL + '/staff/items/new')
        p.get_by_label('Image description').fill('')
        p.get_by_role('button', name='Preview public listing').click()
        p.locator('.error-summary a[href="#photo.alt"]').click()
        expect(p.get_by_label('Image description')).to_be_focused()

    def test_local_photo_selection_errors_replace_remove_and_publish(self):
        p = self.page
        self.control('persona', 'staff')
        self.route(SCHOOL + '/staff/items/new')
        upload = p.locator('#photo')
        for payload in [
            {'name': 'unsafe.svg', 'mimeType': 'image/svg+xml', 'buffer': b'<svg xmlns="http://www.w3.org/2000/svg"/>'},
            {'name': 'large.png', 'mimeType': 'image/png', 'buffer': b'x' * (5 * 1024 * 1024 + 1)},
            {'name': 'broken.png', 'mimeType': 'image/png', 'buffer': b'not an image'}]:
            upload.set_input_files(payload)
            expect(p.locator('.error-summary')).to_be_focused()
            expect(upload).to_have_attribute('aria-invalid', 'true')
        for shade in [160, 210]:
            upload.set_input_files({'name': 'fictional-item.png', 'mimeType': 'image/png', 'buffer': png_bytes(shade)})
            p.wait_for_function("() => document.querySelector('#photo-preview')?.complete && document.querySelector('#photo-preview')?.naturalWidth > 0")
            photo_url = p.locator('#photo-preview').get_attribute('src')
            self.assertTrue(photo_url.startswith('blob:'))
            if shade == 160:
                first_photo = photo_url
            else:
                self.assertNotEqual(first_photo, photo_url)
        p.locator('#photo-remove').click()
        p.get_by_role('button', name='Preview public listing').click()
        expect(upload).to_have_attribute('aria-invalid', 'true')
        p.locator('#photo-demo').click()
        expect(p.locator('#photo-preview')).to_have_attribute('src', '/mock-assets/item-placeholder.svg')
        upload.set_input_files({'name': 'fictional-item.png', 'mimeType': 'image/png', 'buffer': png_bytes()})
        p.wait_for_function("() => document.querySelector('#photo-preview')?.complete && document.querySelector('#photo-preview')?.naturalWidth > 0")
        selected_photo = p.locator('#photo-preview').get_attribute('src')
        for field, value in [('Item title', 'Fictional photographed pencil case'),
                             ('Public description', 'Purple pencil case shown in a local test photograph.'),
                             ('Color', 'purple'), ('Broad found location', 'Art room'),
                             ('Date found', '2026-10-25'), ('Staff storage location', 'Fictional cabinet C')]:
            p.get_by_label(field, exact=True).fill(value)
        p.get_by_label('Image description').fill('Fictional purple pencil case test photograph')
        p.get_by_role('button', name='Preview public listing').click()
        expect(p.locator('#public-preview img')).to_have_attribute('src', selected_photo)
        p.get_by_role('button', name='Publish demo item').click()
        self.ready()
        item_id = p.url.rsplit('/', 1)[1]
        self.control('persona', 'anonymous')
        self.route(SCHOOL + '/items/' + item_id)
        expect(p.locator('main img')).to_have_attribute('src', selected_photo)
        self.assertEqual(p.evaluate('localStorage.length + sessionStorage.length'), 0)

    def test_latest_route_loading_resize_text_and_reduced_motion(self):
        p = self.page
        self.control('scenario', 'slow')
        p.evaluate("history.pushState({}, '', '/o/cedar-grove/search?q=duffel'); dispatchEvent(new PopStateEvent('popstate'))")
        expect(p.locator('.loading-state')).to_be_visible()
        p.evaluate("history.pushState({}, '', '/sign-in'); dispatchEvent(new PopStateEvent('popstate'))")
        self.ready()
        p.wait_for_timeout(4000)
        self.assertEqual(p.url, BASE + '/sign-in')
        expect(p.locator('h1')).to_have_text('Pick up where you left off.')
        self.control('scenario', 'normal')
        self.control('persona', 'staff')
        p.emulate_media(reduced_motion='reduce')
        p.evaluate("document.documentElement.style.fontSize='200%'")
        for path in [SCHOOL + '/search', SCHOOL + '/staff', SCHOOL + '/items/item-duffel/claim']:
            self.route(path)
            self.assertFalse(p.evaluate('document.documentElement.scrollWidth > innerWidth'), path)
            p.locator('.skip-link').focus()
            p.keyboard.press('Enter')
            expect(p.locator('main')).to_be_focused()
        p.evaluate("document.querySelector('main').insertAdjacentHTML('beforeend','<span class=spinner id=motion-check></span>')")
        self.assertEqual(p.locator('#motion-check').evaluate('n=>getComputedStyle(n).animationName'), 'none')

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

    def test_retry_restores_keyboard_focus_after_page_replacement(self):
        p = self.page
        # One failed read followed by a successful retry, through the real mount seam.
        p.evaluate("""async () => {
          const {mountLostLink} = await import('/src/interface/app.ts');
          const {createMockApi,createMockStore} = await import('/src/mocks/client.ts');
          const api = createMockApi(createMockStore());
          let failed = false;
          const transport = {...api,listOrganizations:async () => {
            if (!failed) {failed=true;return {ok:false,error:{code:'INTERNAL_ERROR',message:'Please retry.',requestId:'test'}};}
            return api.listOrganizations();
          }};
          history.replaceState({},'', '/o/cedar-grove/search');
          window.__retryApp = mountLostLink(document.querySelector('#app'),{
            getApi:()=>transport,getSession:()=>null,signOut:()=>{}});
        }""")
        expect(p.locator('h1')).to_have_text('We couldn’t load this page')
        self.keyboard_activate(p.get_by_role('button', name='Try again', exact=True))
        expect(p.locator('h1')).to_have_text("Let's find your item.")
        expect(p.locator('h1')).to_be_focused()
        p.keyboard.press('Tab')
        expect(p.get_by_label('Describe your item')).to_be_focused()

    def test_staff_refresh_announces_updated_claim_to_keyboard_users(self):
        p = self.page
        self.control('persona', 'staff')
        self.route(SCHOOL + '/staff/claims/claim-pending')
        self.keyboard_activate(p.get_by_role('button', name='Approve for collection'))
        expect(p.get_by_role('heading', name='Record physical handover')).to_be_visible()
        expect(p.locator('h1')).to_be_focused()
        self.keyboard_activate(p.get_by_label('I confirm'), 'Space')
        self.keyboard_activate(p.get_by_role('button', name='Mark item returned'))
        expect(p.locator('main')).to_contain_text('The physical handover has been recorded.')
        expect(p.locator('h1')).to_be_focused()

    def test_phone_text_resize_and_reduced_motion(self):
        p = self.page
        self.control('persona', 'staff')
        p.set_viewport_size({'width': 320, 'height': 640})
        p.emulate_media(reduced_motion='reduce')
        p.evaluate("document.documentElement.style.fontSize=(parseFloat(getComputedStyle(document.documentElement).fontSize)*2)+'px'")
        for path in ['/', SCHOOL + '/search', SCHOOL + '/items/item-duffel',
                     SCHOOL + '/items/item-duffel/claim', '/my/claims',
                     '/my/claims/claim-approved', SCHOOL + '/staff',
                     SCHOOL + '/staff/items', SCHOOL + '/staff/items/new',
                     SCHOOL + '/staff/items/item-jacket',
                     SCHOOL + '/staff/claims/claim-pending']:
            self.route(path)
            p.evaluate('async () => {await document.fonts.ready}')
            self.assertFalse(p.evaluate('document.documentElement.scrollWidth > innerWidth'), path)
            for control in p.locator('main input:not([type=hidden]), main textarea, main select, main button').all():
                if not control.is_visible():
                    continue
                control.scroll_into_view_if_needed()
                bounds = control.bounding_box()
                self.assertIsNotNone(bounds, path)
                self.assertGreaterEqual(bounds['x'], 0, path)
                self.assertLessEqual(bounds['x'] + bounds['width'], 321, path)
        p.screenshot(path='/tmp/lostlink-phone-text-200.png', full_page=True)

    def test_responsive_pages_landmarks_and_screenshots(self):
        p = self.page
        routes = ['/', SCHOOL + '/search', SCHOOL + '/items/item-duffel', '/sign-in', '/my/claims',
                  '/my/claims/claim-approved',
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
