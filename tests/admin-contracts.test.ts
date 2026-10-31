import test from 'node:test';
import assert from 'node:assert/strict';
import { adminCommand,readAdminCommand } from '../src/lib/admin/contracts';
import { safeReturnPath } from '../src/lib/auth/security';
const school={action:'create_school',name:'Oak School',slug:'oak-school',timezone:'America/New_York',contactEmail:'office@example.test',collectionInstructions:'Collect at the office, 3–4pm.',published:'false'};
test('owner forms validate real settings and cannot assign website ownership',()=>{
 const parsed=adminCommand.parse(school);
 assert.equal(parsed.action,'create_school');
 assert.ok('published' in parsed);
 assert.equal(parsed.published,false);
 assert.equal(adminCommand.safeParse({...school,published:'yes'}).success,false);
 assert.equal(adminCommand.safeParse({...school,timezone:'Mars/Base'}).success,false);
 assert.equal(adminCommand.safeParse({...school,contactEmail:'bad'}).success,false);
 assert.equal(adminCommand.safeParse({...school,slug:'../../admin'}).success,false);
 assert.equal(adminCommand.safeParse({...school,owner:true}).success,false);
 const member={action:'set_member',schoolId:'10000000-0000-4000-8000-000000000001',expectedVersion:'1',email:'staff@example.test',role:'staff'};
 assert.equal(adminCommand.safeParse(member).success,true);
 assert.equal(adminCommand.safeParse({...member,role:'admin'}).success,true);
 for(const role of ['owner','platform_admin'])assert.equal(adminCommand.safeParse({...member,role}).success,false);
 assert.equal(adminCommand.safeParse({...member,expectedVersion:'1e2'}).success,false);
 assert.equal(adminCommand.safeParse({...member,action:'remove_member',email:undefined,userId:member.schoolId,confirm:undefined}).success,false);
});
test('owner command bodies reject duplicate fields, JSON and oversized data',async()=>{
 const form=new URLSearchParams(school);
 const request=(body:string,type='application/x-www-form-urlencoded')=>new Request('http://localhost/api/admin',{method:'POST',headers:{'Content-Type':type},body});
 assert.equal((await readAdminCommand(request(form.toString()))).action,'create_school');
 await assert.rejects(readAdminCommand(request(form+'&published=true')));
 await assert.rejects(readAdminCommand(request(JSON.stringify(school),'application/json')));
 await assert.rejects(readAdminCommand(request('name='+ 'x'.repeat(17000))));
});
test('owner return destination is explicit; arbitrary admin subpaths remain rejected',()=>{
 assert.equal(safeReturnPath('/admin'),'/admin');
 for(const path of ['/admin?school=secret','/admin/delete','//evil.test/admin'])assert.equal(safeReturnPath(path),'/account');
});

test('school deletion requires explicit confirmation, address and a current version',async()=>{
 const command={action:'delete_school',schoolId:'10000000-0000-4000-8000-000000000001',expectedVersion:'2',schoolSlug:'oak-school',confirm:'delete'};
 assert.equal(adminCommand.parse(command).action,'delete_school');
 for(const change of [{confirm:undefined},{confirm:'remove'},{schoolSlug:''},{expectedVersion:'0'},{expectedVersion:'1e2'},{schoolId:'all'},{allSchools:true}]){
  assert.equal(adminCommand.safeParse({...command,...change}).success,false);
 }
 const body=new URLSearchParams(command);
 const request=new Request('http://localhost/api/admin',{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded'},body});
 assert.equal((await readAdminCommand(request)).action,'delete_school');
 assert.equal(adminCommand.safeParse({action:'cleanup_school_photos',schoolId:command.schoolId}).success,false);
});
