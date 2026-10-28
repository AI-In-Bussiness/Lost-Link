import type { AdminSchool } from '@/lib/admin/contracts';
export function SchoolFields({school}:{school?:AdminSchool}) {
 const prefix=school?.id ?? 'new';
 return <>
  <div className="field"><label htmlFor={`${prefix}-name`}>School name</label><input id={`${prefix}-name`} name="name" required maxLength={100} defaultValue={school?.name} /></div>
  {!school && <div className="field"><label htmlFor={`${prefix}-slug`}>School web address</label><input id={`${prefix}-slug`} name="slug" required maxLength={63} pattern="[a-z0-9]+(-[a-z0-9]+)*" placeholder="oak-school" /><p className="muted">Lowercase letters, numbers and single hyphens. The address stays fixed after creation.</p></div>}
  <div className="field"><label htmlFor={`${prefix}-timezone`}>Time zone</label><input id={`${prefix}-timezone`} name="timezone" required maxLength={100} defaultValue={school?.timezone ?? 'America/New_York'} placeholder="America/New_York" /><p className="muted">Used to validate found dates. Examples: America/New_York, America/Chicago, Europe/London, UTC.</p></div>
  <div className="field"><label htmlFor={`${prefix}-contact`}>Public school contact email</label><input type="email" id={`${prefix}-contact`} name="contactEmail" maxLength={254} defaultValue={school?.contact_email ?? ''} /><p className="muted">Optional. Visible to visitors; use a school office address.</p></div>
  <div className="field"><label htmlFor={`${prefix}-collection`}>Collection instructions</label><textarea id={`${prefix}-collection`} name="collectionInstructions" maxLength={1000} rows={4} defaultValue={school?.collection_instructions ?? ''} /><p className="muted">Public guidance, such as office location and hours. Keep private item details out.</p></div>
  <div className="field"><label htmlFor={`${prefix}-published`}>Public listings</label><select id={`${prefix}-published`} name="published" defaultValue={String(school?.published ?? false)}><option value="false">Hidden — school staff can continue working</option><option value="true">Published — visitors can browse and claim</option></select><p className="muted">Hiding a school removes public browsing and new claims. Existing records are retained.</p></div>
 </>;
}
export function Target({school}:{school:AdminSchool}) {
 return <><input type="hidden" name="schoolId" value={school.id} /><input type="hidden" name="expectedVersion" value={school.settings_version} /></>;
}
