import test from "node:test";
import assert from "node:assert/strict";
import { organizationDisplayName } from "../src/lib/organizations/display-name";

const maple = { id: "10000000-0000-4000-8000-000000000001", slug: "maple-school", name: "Maple School (fictional)" };
const cedar = { id: "10000000-0000-4000-8000-000000000002", slug: "cedar-school", name: "Cedar School (fictional)" };

test("existing production demo rows display the requested school names before migration", () => {
  assert.equal(organizationDisplayName(maple), "Flint Hill School");
  assert.equal(organizationDisplayName(cedar), "Fairfax High School");
});

test("migrated and customized organization names stay unchanged", () => {
  for (const [row, name] of [[maple, "Flint Hill School"], [cedar, "Fairfax High School"], [maple, "Custom school"]] as const) {
    assert.equal(organizationDisplayName({ ...row, name }), name);
  }
});

test("unrelated organizations cannot be renamed by a matching legacy name or slug alone", () => {
  assert.equal(organizationDisplayName({ ...maple, id: "unrelated" }), maple.name);
  assert.equal(organizationDisplayName({ ...cedar, slug: "another-school" }), cedar.name);
  assert.equal(organizationDisplayName({ ...cedar, id: maple.id }), cedar.name);
});
