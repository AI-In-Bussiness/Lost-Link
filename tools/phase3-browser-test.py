"""Production-shell smoke checks and isolated HTTP-fixture interaction checks.

Start `npm start` on localhost:3000 and the phase2 loopback harness on 4173.
HTTP fixtures exercise the adapter/screens; they do NOT verify Supabase persistence.
No real credentials or database writes are used by this suite.
"""
import json
import os
import unittest
from urllib.parse import urlparse
from playwright.sync_api import sync_playwright

ORIGIN = os.environ.get("LOSTLINK_APP_URL", "http://localhost:3000")
HARNESS = "http://127.0.0.1:4173"


class WorkflowChecks(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.pw = sync_playwright().start()
        cls.browser = cls.pw.chromium.launch(executable_path=os.environ.get("CHROMIUM_PATH", "/usr/bin/chromium"), args=["--no-sandbox"])

    @classmethod
    def tearDownClass(cls):
        cls.browser.close()
        cls.pw.stop()

    def setUp(self):
        self.context = self.browser.new_context()
        self.page = self.context.new_page()
        self.errors = []
        self.page.on("pageerror", lambda error: self.errors.append(str(error)))
        self.claim = None
        self.item = {"id": "item-1", "organizationSlug": "maple-school", "title": "Purple pencil case", "publicDescription": "A purple fabric case with a zip.", "category": "other", "color": "purple", "publicLocation": "Library", "foundDate": "2026-01-01", "status": "available", "identifyingDetails": "Fictional hidden green star", "storageLocation": "Staff cabinet", "version": 1}
        self.fail_submission = False
        self.stale = False

    def tearDown(self):
        self.context.close()
        self.assertEqual(self.errors, [])

    def fixture(self, route):
        request = route.request
        path = urlparse(request.url).path.split("/api/v1")[-1]
        body = request.post_data_json if request.method == "POST" else None
        status = 200
        if path in ["/organizations/maple-school", "/organizations/cedar-school"]:
            slug = path.split("/")[-1]
            data = {"id": slug, "slug": slug, "name": slug.replace("-", " ").title()}
        elif path.endswith("/staff/items") and body:
            self.assertNotIn("photo", body)
            self.assertEqual(body["identifyingDetails"], "Fictional hidden green star")
            self.item.update(body)
            data = self.item
            status = 201
        elif path.endswith("/staff/items"):
            data = [self.item]
        elif path.endswith("/staff/items/item-1"):
            data = self.item
        elif path.endswith("/items/item-1/claims"):
            self.assertEqual(set(body), {"evidenceText"})
            if self.fail_submission:
                route.fulfill(status=503, json={"error": {"code": "UNAVAILABLE"}})
                return
            self.claim = {"id": "claim-1", "itemId": "item-1", "organizationSlug": "maple-school", "itemTitle": self.item["title"], "status": "submitted", "evidenceText": body["evidenceText"], "submittedAt": "2026-10-25T12:00:00Z", "reviewedAt": None, "decisionReason": None, "version": 1, "claimantId": "claimant-reference"}
            data = self.claim
            status = 201
        elif path.endswith("/staff/claims/claim-1/review"):
            if self.stale:
                route.fulfill(status=409, json={"error": {"code": "CONFLICT"}})
                return
            self.assertEqual(body["expectedVersion"], self.claim["version"])
            self.claim["version"] += 1
            self.claim["status"] = "approved" if body["decision"] == "approve" else "rejected"
            self.claim["privateReviewNote"] = body.get("privateNote")
            self.item["status"] = "reserved" if body["decision"] == "approve" else "available"
            data = self.claim
        elif path.endswith("/staff/claims/claim-1/return"):
            self.assertEqual(body, {"expectedVersion": self.claim["version"], "ownershipVerified": True})
            self.claim["version"] += 1
            self.claim["status"] = "fulfilled"
            self.item["status"] = "returned"
            data = self.claim
        elif path.endswith("/staff/claims") or path == "/me/claims":
            data = [self.claim] if self.claim else []
        elif path.endswith("/search"):
            data = [{"item": self.item, "reasons": ["Matching public item details"]}] if self.item["status"] == "available" else []
        elif path.endswith("/items"):
            data = [self.item] if self.item["status"] == "available" else []
        elif path.endswith("/items/item-1"):
            data = self.item
        else:
            raise AssertionError(f"Unexpected fixture path: {path}")
        route.fulfill(status=status, json={"data": data, "page": {"nextCursor": None}})

    def mount_fixture(self, path, staff=False):
        self.page.route("**/api/v1/**", self.fixture)
        # The loopback harness is test-only. Prevent its mock entry from mounting.
        self.page.route("**/src/interface/demo.ts", lambda route: route.fulfill(body="", content_type="text/javascript"))
        self.page.goto(HARNESS + path)
        self.page.evaluate("""async ({staff}) => {
          const {mountLostLink} = await import('/src/interface/app.ts');
          const {createHttpApi} = await import('/src/interface/http.ts');
          const api = createHttpApi(['maple-school']);
          const session = {name:'Fictional test user',email:'test@example.test',staffOrgSlugs:staff?['maple-school']:[]};
          window.fixtureApp = mountLostLink(document.querySelector('#app'), {live:true,getApi:()=>api,getSession:()=>session,signOut:()=>{}});
        }""", {"staff": staff})

    def test_production_routes_and_anonymous_signin_continuation(self):
        self.page.route("**/api/v1/**", self.fixture)
        self.page.goto(ORIGIN)
        self.page.get_by_role("heading", name="Find what you lost.").wait_for()
        self.page.get_by_label("What are you looking for?").fill("purple case")
        self.page.get_by_role("button", name="Find my item").click()
        self.page.get_by_role("link", name="Purple pencil case", exact=True).click()
        self.page.reload()
        self.page.get_by_role("heading", name="Purple pencil case", exact=True).wait_for()
        self.assertNotIn("Fictional hidden green star", self.page.locator("main").inner_text())
        self.page.get_by_role("link", name="This might be mine").click()
        self.page.wait_for_url("**/sign-in?returnTo=**")
        self.page.get_by_role("heading", name="Sign in", exact=True).wait_for()
        self.assertNotIn("Interactive preview", self.page.content())
        self.assertIn("returnTo=", self.page.url)

    def test_http_fixture_claim_retry_review_conflict_return_and_receipt(self):
        self.mount_fixture("/o/maple-school/items/item-1/claim")
        self.page.get_by_label("How can staff tell").fill("A fictional hidden green star is stitched inside.")
        self.assertTrue(self.page.get_by_label("Contact email").get_attribute("readonly") is not None)
        self.fail_submission = True
        self.page.get_by_role("button", name="Send private claim").click()
        self.page.get_by_role("alert").wait_for()
        self.assertIn("green star", self.page.get_by_label("How can staff tell").input_value())
        self.fail_submission = False
        self.page.get_by_role("button", name="Send private claim").click()
        self.page.get_by_role("heading", name="Your claim is with staff.").wait_for()
        self.page.reload()
        self.mount_fixture("/o/maple-school/staff/claims/claim-1", staff=True)
        self.stale = True
        self.page.get_by_role("button", name="Approve for collection").click()
        self.page.get_by_role("button", name="Refresh current status").wait_for()
        self.assertEqual(self.claim["status"], "submitted")
        self.stale = False
        self.page.get_by_role("button", name="Refresh current status").click()
        self.page.get_by_role("button", name="Approve for collection").click()
        self.page.get_by_role("heading", name="Record physical handover").wait_for()
        self.page.get_by_label("I confirm").check()
        self.page.get_by_role("button", name="Mark item returned").click()
        self.page.get_by_text("The physical handover has been recorded.", exact=True).wait_for()
        self.mount_fixture("/my/claims/claim-1")
        self.page.get_by_role("heading", name="Back where it belongs.").wait_for()
        self.assertNotIn("Fictional hidden green star", self.page.locator("main").inner_text())
        for closed in ["withdrawn", "cancelled"]:
            self.claim["status"] = closed
            self.mount_fixture("/my/claims/claim-1")
            self.page.get_by_role("heading", name="Claim withdrawn." if closed == "withdrawn" else "Reservation cancelled.").wait_for()
            self.mount_fixture("/o/maple-school/staff/claims/claim-1", staff=True)
            self.page.get_by_text(closed.capitalize(), exact=True).last.wait_for()
            self.assertNotIn("Claim rejected", self.page.locator("main").inner_text())

    def test_http_fixture_intake_public_preview_and_private_rejection_note(self):
        self.mount_fixture("/o/maple-school/staff/items/new", staff=True)
        for name, value in [("Item title", "Purple pencil case"), ("Public description", "A purple fabric case with a zip."), ("Color", "purple"), ("Broad found location", "Library"), ("Date found", "2026-01-01"), ("Identifying notes (required)", "Fictional hidden green star"), ("Staff storage location", "Staff cabinet")]:
            self.page.get_by_label(name, exact=True).fill(value)
        self.page.get_by_role("button", name="Preview public listing").click()
        self.assertNotIn("hidden green star", self.page.locator("#public-preview").inner_text())
        self.page.get_by_role("button", name="Publish found item").click()
        self.page.get_by_role("heading", name="Verification details").wait_for()
        self.claim = {"id": "claim-1", "itemId": "item-1", "organizationSlug": "maple-school", "itemTitle": "Purple pencil case", "status": "submitted", "evidenceText": "Fictional ownership evidence from claimant.", "submittedAt": "2026-10-25T12:00:00Z", "reviewedAt": None, "decisionReason": None, "version": 1}
        self.mount_fixture("/o/maple-school/staff/claims/claim-1", staff=True)
        self.page.get_by_label("Private review note").fill("Fictional private staff decision.")
        self.page.get_by_role("button", name="Reject claim", exact=True).click()
        self.page.get_by_role("heading", name="Private review note").wait_for()
        self.mount_fixture("/my/claims/claim-1")
        self.page.get_by_role("heading", name="This claim wasn’t approved.").wait_for()
        self.assertNotIn("Fictional private staff decision.", self.page.locator("main").inner_text())

    def test_production_mobile_layout_and_service_error(self):
        self.page.route("**/api/v1/**", self.fixture)
        for width in [320, 768, 1440]:
            self.page.set_viewport_size({"width": width, "height": 900})
            self.page.goto(ORIGIN + "/o/maple-school/search")
            self.page.get_by_role("heading", name="Let's find your item.").wait_for()
            self.assertTrue(self.page.evaluate("document.documentElement.scrollWidth <= innerWidth"))
        self.page.screenshot(path="/tmp/lostlink-phase3-search.png", full_page=True)
        self.page.unroute("**/api/v1/**")
        self.page.goto(ORIGIN)
        self.page.get_by_role("heading", name="We couldn’t load this page").wait_for()
        self.page.get_by_role("button", name="Try again").wait_for()


if __name__ == "__main__":
    unittest.main(verbosity=2)
