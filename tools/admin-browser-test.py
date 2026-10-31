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
    def test_both_owners_upload_review_and_publish_jpegs_without_school_memberships(self):
        school = '/o/' + self.fixtures['uploadSlug']
        api = self.origin + '/api/v1/organizations/' + self.fixtures['uploadSlug']
        visitor_context = self.browser.new_context()
        self.addCleanup(visitor_context.close)
        visitor = visitor_context.new_page()
        foreign_context, _ = self.login(self.fixtures['legacyAdmin'], '/my/claims')
        # The runner asserts neither website owner has any school membership.
        # One owner uploads an ordinary JPEG; the other exercises JPEG compression.
        for number, (actor, jpeg_path) in enumerate(zip([self.fixtures['one'], self.fixtures['two']], self.fixtures['jpegPaths']), 1):
            with self.subTest(owner=number):
                context, page = self.login(actor, school + '/staff')
                title = f'Fictional owner {number} photo item'
                created = context.request.post(api + '/staff/items', headers={'Origin': self.origin}, data={
                    'title': title, 'publicDescription': 'A fictional pink pencil for owner JPEG upload acceptance.',
                    'category': 'other', 'color': 'pink', 'publicLocation': 'Library', 'foundDate': '2026-10-25',
                    'identifyingDetails': 'Synthetic owner-upload private detail.', 'storageLocation': 'Office shelf',
                })
                self.assertEqual(created.status, 201)
                item_id = created.json()['data']['id']
                page.goto(self.origin + school + '/staff/items/' + item_id)
                page.get_by_role('heading', name='Item photographs', exact=True).wait_for()
                page.get_by_label('Choose item photo').set_input_files(jpeg_path)
                with page.expect_response(lambda response: response.request.method == 'POST' and response.url == api + '/staff/items/' + item_id + '/photos') as uploaded:
                    page.get_by_role('button', name='Upload for private review', exact=True).click()
                self.assertEqual(uploaded.value.status, 201, 'Owners must reach both photo_begin and photo_finish without school membership')
                page.get_by_text('Private preview · not published', exact=True).wait_for()
                private_photo = page.locator('[data-publish-photo]').locator('..').locator('img')
                self.assertTrue(private_photo.evaluate('(img) => img.decode().then(() => img.naturalWidth > 0)'))
                private_url = private_photo.get_attribute('src')
                public_url = private_url.replace('/staff/items/', '/items/')
                self.assertEqual(visitor_context.request.get(self.origin + private_url).status, 401)
                self.assertEqual(foreign_context.request.get(self.origin + private_url).status, 404)
                self.assertEqual(visitor_context.request.get(self.origin + public_url).status, 404)
                pending = context.request.get(api + '/staff/items/' + item_id + '/photos')
                self.assertEqual(pending.status, 200)
                self.assertEqual([photo['status'] for photo in pending.json()['data']], ['pending'])
                page.reload()
                page.get_by_text('Private preview · not published', exact=True).wait_for()
                page.get_by_label('I inspected this processed photo').check()
                page.get_by_role('button', name='Publish reviewed photo', exact=True).click()
                page.get_by_text('Published photograph', exact=True).wait_for()
                page.reload()
                page.get_by_text('Published photograph', exact=True).wait_for()
                visitor.goto(self.origin + school + '/items/' + item_id)
                visitor.get_by_role('heading', name=title, exact=True).wait_for()
                public_photo = visitor.locator('main img')
                expect(public_photo).to_have_attribute('src', public_url)
                self.assertTrue(public_photo.evaluate('(img) => img.decode().then(() => img.naturalWidth > 0)'))
                published = visitor_context.request.get(self.origin + public_url)
                self.assertEqual(published.status, 200)
                self.assertEqual(published.headers['content-type'], 'image/webp')
                self.assertIn('no-store', published.headers['cache-control'])
    def test_owner_and_school_staff_review_student_claims(self):
        school = '/o/' + self.fixtures['reviewSlug']
        api = self.origin + '/api/v1/organizations/' + self.fixtures['reviewSlug']
        headers = {'Origin': self.origin}
        owner_context, owner = self.login(self.fixtures['one'], school + '/staff')
        created = owner_context.request.post(api + '/staff/items', headers=headers, data={
            'title': 'Fictional review bag', 'publicDescription': 'A fictional black bag for claim review.',
            'category': 'bag', 'color': 'black', 'publicLocation': 'Library', 'foundDate': '2026-10-25',
            'identifyingDetails': 'Fictional hidden green star.', 'storageLocation': 'Office shelf',
        })
        self.assertEqual(created.status, 201)
        item_id = created.json()['data']['id']
        claimant_context, claimant = self.login(self.fixtures['claimant'], '/my/claims')
        evidence = 'My fictional bag has a hidden green star.'
        submitted = claimant_context.request.post(api + '/items/' + item_id + '/claims', headers=headers, data={'evidenceText': evidence})
        self.assertEqual(submitted.status, 201)
        claim_id = submitted.json()['data']['id']
        review_path = school + '/staff/claims/' + claim_id
        # Owners have no school membership; ordinary staff retain school-scoped access.
        staff_context, staff = self.login(self.fixtures['staff'], school + '/staff')
        for context, page in [(owner_context, owner), (staff_context, staff)]:
            for suffix in ['/staff/items/' + item_id + '/photos', '/staff/activity?itemId=' + item_id]:
                result = context.request.get(api + suffix)
                self.assertEqual(result.status, 200)
                self.assertIn('no-store', result.headers['cache-control'])
            page.goto(self.origin + school + '/staff')
            page.get_by_role('row').filter(has_text=claim_id).get_by_role('link', name='Review').click()
            page.wait_for_url(self.origin + review_path)
            expect(page.get_by_role('heading', name='Review this claim', exact=True)).to_be_visible()
            expect(page.locator('blockquote')).to_have_text(evidence)
            expect(page.get_by_text('Fictional hidden green star.', exact=True)).to_be_visible()
            page.reload()
            expect(page.get_by_role('heading', name='Review this claim', exact=True)).to_be_visible()
        foreign_context, foreign = self.login(self.fixtures['legacyAdmin'], '/my/claims')
        visitor_context = self.browser.new_context()
        self.addCleanup(visitor_context.close)
        for suffix in ['/staff/claims', '/staff/items/' + item_id, '/staff/items/' + item_id + '/photos', '/staff/activity?itemId=' + item_id]:
            self.assertEqual(foreign_context.request.get(api + suffix).status, 404)
            self.assertEqual(claimant_context.request.get(api + suffix).status, 404)
            self.assertEqual(visitor_context.request.get(api + suffix).status, 401)
        for page in [foreign, claimant]:
            page.goto(self.origin + review_path)
            expect(page.get_by_role('heading', name='This page is unavailable', exact=True)).to_be_visible()
        owner.get_by_role('button', name='Approve for collection', exact=True).click()
        expect(owner.get_by_role('heading', name='Record physical handover', exact=True)).to_be_visible()
        owner.reload()
        expect(owner.get_by_role('heading', name='Record physical handover', exact=True)).to_be_visible()
        owner.get_by_label('I confirm').check()
        owner.get_by_role('button', name='Mark item returned', exact=True).click()
        expect(owner.get_by_text('The physical handover has been recorded.', exact=True)).to_be_visible()
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
    def test_owner_deletion_removes_school_and_protects_other_schools(self):
        context, page = self.login(self.fixtures['one'])
        path = '/admin?school=' + self.fixtures['deletionSchoolId']
        page.goto(self.origin + path)
        page.locator('summary').filter(has_text='Delete school permanently').click()
        form = page.get_by_role('form', name='Delete school', exact=True)
        form.get_by_label('Type the school web address', exact=False).fill('wrong-school')
        form.get_by_role('checkbox').check()
        form.get_by_role('button', name='Delete school permanently', exact=True).click()
        expect(form.get_by_role('alert')).to_contain_text('Check all fields')
        # Both owners can edit; an old deletion form must not erase a newer edit.
        _, second = self.login(self.fixtures['two'])
        second.goto(self.origin + path)
        settings = second.get_by_role('form', name='School settings', exact=True)
        settings.get_by_label('School name', exact=True).fill('Renamed Delete School')
        self.save(second, settings, 'Save school settings')
        form.get_by_label('Type the school web address', exact=False).fill(self.fixtures['slug'] + '-delete')
        form.get_by_role('button', name='Delete school permanently', exact=True).click()
        expect(form.get_by_role('alert')).to_contain_text('another session')
        page.reload()
        expect(page.get_by_role('heading', name='Renamed Delete School settings', exact=True)).to_be_visible()
        page.locator('summary').filter(has_text='Delete school permanently').click()
        form = page.get_by_role('form', name='Delete school', exact=True)
        form.get_by_label('Type the school web address', exact=False).fill(self.fixtures['slug'] + '-delete')
        form.get_by_role('checkbox').check()
        with page.expect_navigation(wait_until='load'):
            form.get_by_role('button', name='Delete school permanently', exact=True).click()
        expect(page.get_by_role('status')).to_contain_text('School deleted.')
        expect(page.get_by_role('link', name='Renamed Delete School', exact=True)).to_have_count(0)
        expect(page.get_by_text('School permanently deleted', exact=True)).to_be_visible()
        self.assertEqual(context.request.get(self.origin + '/api/v1/organizations/' + self.fixtures['slug'] + '-delete').status, 404)
        staff_context, _ = self.login(self.fixtures['staff'], '/account')
        self.assertEqual(staff_context.request.get(self.origin + '/api/v1/organizations/' + self.fixtures['slug'] + '-delete/staff/items').status, 404)
        page.reload()
        expect(page.get_by_role('link', name='Fictional legacy school', exact=True)).to_be_visible()
        expect(page.get_by_role('link', name='Fictional other school', exact=True)).to_be_visible()
        # The second owner can permanently remove an empty hidden school too.
        second.goto(self.origin + '/admin?school=' + self.fixtures['emptyDeletionSchoolId'])
        second.locator('summary').filter(has_text='Delete school permanently').click()
        form = second.get_by_role('form', name='Delete school', exact=True)
        form.get_by_label('Type the school web address', exact=False).fill(self.fixtures['slug'] + '-delete-empty')
        form.get_by_role('checkbox').check()
        with second.expect_navigation(wait_until='load'):
            form.get_by_role('button', name='Delete school permanently', exact=True).click()
        expect(second.get_by_role('status')).to_contain_text('School deleted.')

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
            for action in ['create_school','update_school','set_member','remove_member','delete_school','cleanup_school_photos']:
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
        expect(page.get_by_role('form', name='Delete school', exact=True)).to_have_count(0)
        own_api = self.origin + '/api/school-admin/' + own_slug
        deletion = {'action':'delete_school','schoolId':self.fixtures['legacySchoolId'],'expectedVersion':'1','schoolSlug':own_slug,'confirm':'delete'}
        self.assertEqual(context.request.post(own_api,headers={'Origin':self.origin,'Accept':'application/json'},form=deletion).status,403)
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
