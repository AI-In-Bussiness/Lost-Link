"""Independent Phase 7 navigation probes against the loopback fixture harness.

Start node tools/phase2-preview.mjs first. No real accounts or database writes.
The JSON distinguishes existing-route link checks from a live-host configuration
probe. A failed probe is a review finding, not a passing product acceptance.
"""
import json
import os
from pathlib import Path
from playwright.sync_api import sync_playwright, expect

BASE = os.environ.get("LOSTLINK_PREVIEW_URL", "http://127.0.0.1:4173")
SCHOOL = "/o/cedar-grove"
OUTPUT = Path(os.environ.get("PHASE7_UX_OUTPUT", "/tmp/lostlink-phase7-ux.json"))
ROUTES = [
    ("/", "anonymous"),
    (SCHOOL + "/search", "anonymous"),
    (SCHOOL + "/items/item-duffel", "anonymous"),
    ("/sign-in", "anonymous"),
    (SCHOOL + "/items/item-duffel/claim", "student"),
    ("/my/claims", "student"),
    ("/my/claims/claim-approved", "student"),
    (SCHOOL + "/staff", "staff"),
    (SCHOOL + "/staff/items", "staff"),
    (SCHOOL + "/staff/items/new", "staff"),
    (SCHOOL + "/staff/items/item-jacket", "staff"),
    (SCHOOL + "/staff/claims/claim-pending", "staff"),
]


def ready(page):
    page.locator("main:not([aria-busy])").wait_for()


def route(page, path):
    page.evaluate("path => { history.pushState({}, '', path); dispatchEvent(new PopStateEvent('popstate')); }", path)
    ready(page)


def main():
    result = {"scope": "Loopback fixtures; no hosted or persistence claim", "routes": [], "findings": []}
    with sync_playwright() as runtime:
        browser = runtime.chromium.launch(executable_path=os.environ.get("CHROMIUM_PATH", "/usr/bin/chromium"), args=["--no-sandbox"])
        context = browser.new_context(viewport={"width": 1440, "height": 1000})
        page = context.new_page()
        errors = []
        page.on("pageerror", lambda error: errors.append(str(error)))
        page.goto(BASE)
        ready(page)
        for path, persona in ROUTES:
            page.locator(".demo-panel details").evaluate("node => node.open = true")
            page.locator("#demo-persona").select_option(persona)
            ready(page)
            route(page, path)
            controls = page.locator("#app button, #app input, #app select, #app textarea").evaluate_all("nodes => nodes.map(n => ({tag:n.tagName,id:n.id,type:n.type,text:n.innerText || '',labels:[...(n.labels||[])].map(l=>l.innerText)}))")
            hrefs = list(dict.fromkeys(page.locator("#app a[href]").evaluate_all("nodes => nodes.map(n=>n.getAttribute('href'))")))
            links = []
            for href in hrefs:
                route(page, path)
                anchor = page.locator("#app a[href=" + json.dumps(href) + "]").first
                if href == "#main":
                    # The skip link is intentionally off-screen until focused.
                    anchor.focus()
                    page.keyboard.press("Enter")
                else:
                    anchor.click()
                ready(page)
                if href == "#main":
                    expect(page.locator("main")).to_be_focused()
                heading = page.locator("main h1").inner_text()
                assert heading not in ["This page is unavailable", "We couldn’t load this page"], (path, href, heading)
                links.append({"href": href, "destination": page.url.removeprefix(BASE), "heading": heading})
            result["routes"].append({"path": path, "persona": persona, "links": links, "controls": controls})
        assert not errors, errors
        result["linkChecks"] = sum(len(row["links"]) for row in result["routes"])
        context.close()

        # Exercise shared pagination with enough fictional records to need it.
        context = browser.new_context()
        page = context.new_page()
        page.route("**/src/interface/demo.ts", lambda r: r.fulfill(body="", content_type="text/javascript"))
        page.goto(BASE + SCHOOL + "/search")
        page.evaluate("""async () => {
          const {createMockStore,createMockApi} = await import('/src/mocks/client.ts');
          const {mountLostLink} = await import('/src/interface/app.ts');
          const store = createMockStore();
          const template = store.state.items[0];
          store.state.items = Array.from({length:25},(_,i)=>({...template,id:'audit-'+i,title:'Audit bag '+i}));
          window.auditApp = mountLostLink(document.querySelector('#app'), {
            getApi:()=>createMockApi(store),getSession:()=>null,signOut:()=>{}
          });
        }""")
        ready(page)
        first = page.locator(".item-card").all_inner_texts()
        page.get_by_role("link", name="Next", exact=True).click()
        ready(page)
        second = page.locator(".item-card").all_inner_texts()
        assert first and second and not set(first).intersection(second)
        page.get_by_role("link", name="Previous", exact=True).click()
        ready(page)
        assert page.locator(".item-card").all_inner_texts() == first
        result["pagination"] = {"passed": True, "firstPageItems": len(first), "secondPageItems": len(second)}

        # This host configuration is supported by LOSTLINK_ORGANIZATION_SLUGS.
        # Mount the real live-mode navigation with one non-default school.
        route(page, "/")
        page.evaluate("""async () => {
          window.auditApp.destroy();
          const {mountLostLink} = await import('/src/interface/app.ts');
          const api = {listOrganizations:async()=>({ok:true,data:[{id:'cedar-school',slug:'cedar-school',name:'Cedar School',publicListingEnabled:true}]})};
          window.auditApp = mountLostLink(document.querySelector('#app'), {
            live:true,getApi:()=>api,getSession:()=>null,signOut:()=>{}
          });
        }""")
        ready(page)
        navigation = page.locator(".main-nav").get_by_role("link", name="Find an item")
        href = navigation.get_attribute("href")
        navigation.click()
        ready(page)
        heading = page.locator("main h1").inner_text()
        result["singleSchoolNavigation"] = {"configuredSchool": "cedar-school", "href": href, "headingAfterClick": heading, "passed": href == "/o/cedar-school/search"}
        if not result["singleSchoolNavigation"]["passed"]:
            result["findings"].append("A7-UX-01: anonymous live-mode navigation hardcodes maple-school before a school route is visited")
            page.screenshot(path="/tmp/lostlink-phase7-single-school.png", full_page=True)
        context.close()
        browser.close()
    OUTPUT.write_text(json.dumps(result, indent=2) + "\n")
    print(json.dumps({key: value for key, value in result.items() if key != "routes"}, indent=2))
    return bool(result["findings"])


if __name__ == "__main__":
    raise SystemExit(main())
