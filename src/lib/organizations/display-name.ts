type OrganizationIdentity = { id: string; slug: string; name: string };

const demoSchools = [
  { id: "10000000-0000-4000-8000-000000000001", slug: "maple-school",
    name: "Flint Hill School", legacy: ["Maple School (fictional)", "Maple School", "Maple Hill School"] },
  { id: "10000000-0000-4000-8000-000000000002", slug: "cedar-school",
    name: "Fairfax High School", legacy: ["Cedar School (fictional)", "Cedar School", "Cedar Grove School"] },
];

/** Keep existing demo records readable while the school-name migration rolls out. */
export function organizationDisplayName(organization: OrganizationIdentity): string {
  const school = demoSchools.find(school => school.id === organization.id && school.slug === organization.slug);
  return school?.legacy.includes(organization.name) ? school.name : organization.name;
}
