"""Owner controls against real local Auth/database. Run npm run test:admin."""
import json
import os
import unittest
from pathlib import Path
from playwright.sync_api import sync_playwright, expect

class OwnerWorkflow(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.fixtures = json.loads(Path(os.environ['LOSTLINK_OWNER_FIXTURES']).read_text())
        cls.origin = cls.fixtures['origin']
        cls.runtime = sync_playwright().start()
        chromium = os.environ.get('CHROMIUM_PATH') or ('/usr/bin/chromium' if Path('/usr/bin/chromium').exists() else None)
        cls.browser = cls.runtime.chromium.launch(headless=True, args=['--no-sandbox'], **({'executable_path': chromium} if chromium else {}))
    @classmethod
    def tearDownClass(cls):
        cls.browser.close()
        cls.runtime.stop()
    def login(self, actor, path='/admin'):
        context = self.browser.new_context(viewport={'width': 1280, 'height': 1000})
        self.addCleanup(context.close)
        page = context.new_page()
        page.goto(self.origin + '/sign-in?next=' + path)
        page.get_by_label('Email', exact=True).fill(actor['email'])
        page.get_by_label('Password', exact=True).fill(actor['password'])
        page.get_by_role('button', name='Sign in', exact=True).click()
        page.wait_for_url(self.origin + path)
        return context, page
    def save(self, page, form, button):
        with page.expect_navigation(wait_until='load'):
            form.get_by_role('button', name=button, exact=True).click()
        expect(page.get_by_role('status')).to_have_text('Changes saved.')
    def test_owner_school_settings_membership_and_public_discovery(self):
        context, page = self.login(self.fixtures['one'])
        expect(page.get_by_role('heading', name='Keep LostLink running.')).to_be_visible()
        page.get_by_text('Create a school', exact=True).click()
        form = page.get_by_role('form', name='Create a school', exact=True)
        form.get_by_label('School name', exact=True).fill('Fictional Owner School')
        form.get_by_label('School web address', exact=True).fill(self.fixtures['slug'])
        form.get_by_label('Time zone', exact=True).fill('UTC')
        form.get_by_label('Public school contact email').fill('office@example.test')
        form.get_by_label('Collection instructions').fill('Collect from the front office after 3pm.')
        self.save(page, form, 'Create school')
        self.assertEqual(context.request.get(self.origin + '/api/v1/organizations/' + self.fixtures['slug'] + '/staff/items').status, 200)
        visitor = self.browser.new_context()
        self.addCleanup(visitor.close)
        def directory():
            result = visitor.request.get(self.origin + '/api/v1/organizations')
            self.assertEqual(result.status, 200)
            self.assertIn('no-store', result.headers['cache-control'])
            return result.json()['data']
        self.assertFalse(any(s['slug'] == self.fixtures['slug'] for s in directory()))
        form = page.get_by_role('form', name='School settings', exact=True)
        form.get_by_label('Public listings').select_option('true')
        self.save(page, form, 'Save school settings')
        self.assertTrue(any(s['slug'] == self.fixtures['slug'] for s in directory()))
        public = visitor.new_page()
        public.goto(self.origin)
        expect(public.locator('#home-school')).to_contain_text('Fictional Owner School')
        public.goto(self.origin + '/o/' + self.fixtures['slug'] + '/search')
        expect(public.get_by_role('link', name='office@example.test', exact=True)).to_be_visible()
        form = page.get_by_role('form', name='Assign school access')
        form.get_by_label('Account email').fill(self.fixtures['staff']['email'])
        form.get_by_label('School role').select_option('admin')
        self.save(page, form, 'Save school access')
        staff_context, staff = self.login(self.fixtures['staff'], '/o/' + self.fixtures['slug'] + '/staff')
        expect(staff.get_by_role('heading', name='A little care. A happy return.', exact=True)).to_be_visible()
        self.assertEqual(staff_context.request.post(self.origin + '/api/admin', headers={'Origin':self.origin,'Accept':'application/json'}, form={'action':'create_school'}).status, 403)
        # Owner 2 has identical controls; server rejects stale owner-1 forms.
        second_context, second = self.login(self.fixtures['two'])
        second.get_by_role('link', name='Fictional Owner School', exact=True).click()
        form = second.get_by_role('form', name='School settings', exact=True)
        form.get_by_label('School name', exact=True).fill('Renamed Owner School')
        self.save(second, form, 'Save school settings')
        form = page.get_by_role('form', name='School settings', exact=True)
        form.get_by_label('School name', exact=True).fill('Unsaved stale text')
        form.get_by_role('button', name='Save school settings', exact=True).click()
        expect(form.get_by_role('alert')).to_contain_text('another session')
        expect(form.get_by_label('School name', exact=True)).to_have_value('Unsaved stale text')
        expect(form.get_by_role('alert')).to_be_focused()
        page.reload()
        expect(page.get_by_role('form', name='School settings', exact=True).get_by_label('School name', exact=True)).to_have_value('Renamed Owner School')
        form = page.get_by_role('form', name='School settings', exact=True)
        form.get_by_label('Public listings').select_option('false')
        self.save(page, form, 'Save school settings')
        self.assertFalse(any(s['slug'] == self.fixtures['slug'] for s in directory()))
        # Hidden school remains available to assigned staff.
        staff.reload()
        expect(staff.get_by_role('heading', name='A little care. A happy return.', exact=True)).to_be_visible()
        page.get_by_text(self.fixtures['staff']['email'] + ' · School admin', exact=True).click()
        form = page.get_by_role('form', name='Remove school access for ' + self.fixtures['staff']['email'])
        form.get_by_role('checkbox').check()
        self.save(page, form, 'Remove school access')
        denied = staff_context.request.get(self.origin + '/api/v1/organizations/' + self.fixtures['slug'] + '/staff/items')
        self.assertEqual(denied.status, 404)
        # Responsive controls and real axe audit on owner settings.
        for width in [320, 390, 768, 1440]:
            page.set_viewport_size({'width': width, 'height': 1000})
            self.assertFalse(page.evaluate('document.documentElement.scrollWidth > innerWidth + 1'))
            if width in [320, 1440]:
                page.screenshot(path=f'/tmp/lostlink-owner-{width}.png', full_page=True)
        axe = Path('tools/phase2/node_modules/axe-core/axe.min.js').read_text()
        page.evaluate(axe)
        violations = page.evaluate('async () => (await axe.run(document, {runOnly:{type:"tag",values:["wcag2a","wcag2aa","wcag21aa"]}})).violations.map(v=>v.id)')
        self.assertEqual(violations, [])
        self.assertEqual(visitor.request.get(self.origin + '/api/v1/organizations/' + self.fixtures['slug']).status, 404)
    def test_owner_api_denies_nonowners_and_hostile_requests(self):
        visitor = self.browser.new_context()
        self.addCleanup(visitor.close)
        result = visitor.request.get(self.origin + '/admin', max_redirects=0)
        self.assertEqual(result.status, 307)
        result = visitor.request.post(self.origin + '/api/admin', headers={'Origin':self.origin,'Accept':'application/json'}, form={'action':'create_school'})
        self.assertEqual(result.status, 401)
        for actor in [self.fixtures['claimant'], self.fixtures['staff'], self.fixtures['legacyAdmin']]:
            context, page = self.login(actor)
            expect(page.get_by_role('heading', name='Website-owner access required')).to_be_visible()
            for action in ['create_school','update_school','set_member','remove_member']:
                result = context.request.post(self.origin + '/api/admin', headers={'Origin': self.origin, 'Accept':'application/json'}, form={'action':action})
                self.assertEqual(result.status, 403, action)
            page.goto(self.origin + '/account')
            expect(page.get_by_role('link', name='Website administration', exact=False)).to_have_count(0)
            page.goto(self.origin)
            expect(page.get_by_role('link', name='Website admin', exact=True)).to_have_count(0)
        context, page = self.login(self.fixtures['one'])
        for origin in ['https://attacker.example', 'null', '']:
            result = context.request.post(self.origin + '/api/admin', headers={'Origin':origin,'Accept':'application/json'}, form={'action':'create_school'})
            self.assertEqual(result.status,403)
        result = context.request.post(self.origin + '/api/admin', headers={'Origin':self.origin,'Accept':'application/json','Content-Type':'application/x-www-form-urlencoded'}, data='action=create_school&action=overview')
        self.assertEqual(result.status,400)
        result = context.request.post(self.origin + '/api/admin', headers={'Origin':self.origin,'Accept':'application/json'}, form={'action':'set_member','role':'owner'})
        self.assertEqual(result.status,400)

    def test_school_admin_controls_stay_inside_assigned_school(self):
        own_slug = self.fixtures['slug'] + '-legacy'
        foreign_slug = self.fixtures['slug'] + '-other'
        path = '/o/' + own_slug + '/staff/settings'
        context, page = self.login(self.fixtures['legacyAdmin'], path)
        expect(page.get_by_role('heading', name='Fictional legacy school settings', exact=True)).to_be_visible()
        expect(page.get_by_text('Fictional other school', exact=True)).to_have_count(0)
        expect(page.get_by_role('link', name='Website admin', exact=True)).to_have_count(0)
        form = page.get_by_role('form', name='School settings', exact=True)
        form.get_by_label('Public school contact email').fill('legacy-office@example.test')
        self.save(page, form, 'Save school settings')
        page.reload()
        expect(page.get_by_role('form', name='School settings', exact=True).get_by_label('Public school contact email')).to_have_value('legacy-office@example.test')
        # A school admin cannot demote the last administrator, including themselves.
        form = page.get_by_role('form', name='Assign school access')
        form.get_by_label('Confirmed account email').fill(self.fixtures['legacyAdmin']['email'])
        form.get_by_label('School role').select_option('staff')
        form.get_by_role('button', name='Save school access', exact=True).click()
        expect(form.get_by_role('alert')).to_contain_text('Keep at least one school admin')
        form.get_by_label('Confirmed account email').fill(self.fixtures['claimant']['email'])
        self.save(page, form, 'Save school access')
        staff_context, staff = self.login(self.fixtures['claimant'], '/o/' + own_slug + '/staff')
        self.assertEqual(staff_context.request.get(self.origin + path).status, 404)
        own_api = self.origin + '/api/school-admin/' + own_slug
        headers = {'Origin':self.origin, 'Accept':'application/json'}
        self.assertEqual(staff_context.request.post(own_api, headers=headers, form={'action':'update_school'}).status, 404)
        self.assertEqual(context.request.get(self.origin + '/o/' + foreign_slug + '/staff/settings').status, 404)
        self.assertEqual(context.request.post(self.origin + '/api/school-admin/' + foreign_slug, headers=headers, form={'action':'update_school'}).status, 404)
        self.assertEqual(context.request.get(self.origin + '/api/v1/organizations/' + foreign_slug + '/staff/items').status, 404)
        # A substituted school ID on an allowed route is also denied.
        version = page.get_by_role('form', name='Assign school access').locator('[name=expectedVersion]').input_value()
        bad = {'action':'set_member','schoolId':self.fixtures['otherSchoolId'],'expectedVersion':version,'email':self.fixtures['claimant']['email'],'role':'admin'}
        self.assertEqual(context.request.post(own_api,headers=headers,form=bad).status,404)
        bad['schoolId'] = self.fixtures['legacySchoolId']
        bad['role'] = 'owner'
        self.assertEqual(context.request.post(own_api,headers=headers,form=bad).status,400)
        self.assertEqual(context.request.post(own_api,headers={'Origin':'https://evil.example','Accept':'application/json'},form=bad).status,403)
        # School admins can promote a second admin, who remains scoped to this school.
        form = page.get_by_role('form', name='Assign school access')
        form.get_by_label('Confirmed account email').fill(self.fixtures['claimant']['email'])
        form.get_by_label('School role').select_option('admin')
        self.save(page, form, 'Save school access')
        self.assertEqual(staff_context.request.get(self.origin + path).status,200)
        self.assertEqual(staff_context.request.post(self.origin + '/api/admin',headers=headers,form={'action':'create_school'}).status,403)
        for width in [320,390,768,1440]:
            page.set_viewport_size({'width':width,'height':1000})
            self.assertFalse(page.evaluate('document.documentElement.scrollWidth > innerWidth + 1'))
        page.evaluate(Path('tools/phase2/node_modules/axe-core/axe.min.js').read_text())
        self.assertEqual(page.evaluate('async () => (await axe.run(document,{runOnly:{type:"tag",values:["wcag2a","wcag2aa","wcag21aa"]}})).violations.map(v=>v.id)'),[])

if __name__ == '__main__':
    unittest.main(verbosity=2)
