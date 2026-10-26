import test from 'node:test';
import assert from 'node:assert/strict';
import { readBoundedBody, BodyReadError } from '../src/lib/http/body';
import { BodyError } from '../src/lib/api/body';
import { uploadBytes } from '../src/lib/photos/upload';
import { readAuthForm } from '../src/lib/auth/security';
const streamed = (stream:ReadableStream<Uint8Array>, headers:Record<string,string>={}) => new Request('http://localhost/test',{method:'POST',headers,body:stream,duplex:'half'} as RequestInit);

test('stalled streams hit an absolute deadline even when cancellation itself stalls', async()=>{
  let cancelled=false;
  const stream=new ReadableStream<Uint8Array>({cancel(){cancelled=true;return new Promise(()=>{});}});
  await assert.rejects(()=>readBoundedBody(streamed(stream),10,20),(e)=>e instanceof BodyReadError&&e.kind==='timeout');
  assert.ok(cancelled);
});
test('a trickling stream cannot renew the deadline',async()=>{
  let interval:ReturnType<typeof setInterval>;
  const stream=new ReadableStream<Uint8Array>({start(controller){interval=setInterval(()=>controller.enqueue(new Uint8Array([1])),5);},cancel(){clearInterval(interval);}});
  await assert.rejects(()=>readBoundedBody(streamed(stream),10000,25),(e)=>e instanceof BodyReadError&&e.kind==='timeout');
});
test('actual bytes enforce caps despite dishonest lengths and cancel excess input',async()=>{
  let cancelled=false;
  const stream=new ReadableStream<Uint8Array>({start(c){c.enqueue(new Uint8Array(11));},cancel(){cancelled=true;}});
  await assert.rejects(()=>readBoundedBody(streamed(stream,{'content-length':'1'}),10),BodyReadError);
  assert.ok(cancelled);
  const exact=await readBoundedBody(new Request('http://localhost',{method:'POST',body:'abc'}),3);
  assert.equal(new TextDecoder().decode(exact),'abc');
});
test('multipart rejects duplicate files, extra fields, malformed boundaries and oversize streams',async()=>{
  const form=new FormData();form.append('file',new File(['bytes'],'../../unsafe.svg',{type:'image/svg+xml'}));
  // Filename/MIME are not used as paths or authorization; decoder validates actual image bytes later.
  assert.equal((await uploadBytes(new Request('http://localhost',{method:'POST',body:form}))).toString(),'bytes');
  form.append('other','private');
  await assert.rejects(()=>uploadBytes(new Request('http://localhost',{method:'POST',body:form})));
  const duplicates=new FormData();duplicates.append('file',new File(['a'],'a'));duplicates.append('file',new File(['b'],'b'));
  await assert.rejects(()=>uploadBytes(new Request('http://localhost',{method:'POST',body:duplicates})));
  await assert.rejects(()=>uploadBytes(new Request('http://localhost',{method:'POST',headers:{'content-type':'multipart/form-data; boundary=x'},body:'invalid'})));
});
test('sign-in rejects malformed UTF-8 rather than silently substituting credential bytes',async()=>{
  const stream=new ReadableStream<Uint8Array>({start(c){c.enqueue(new Uint8Array([0xff]));c.close();}});
  assert.equal(await readAuthForm(streamed(stream,{'content-type':'application/x-www-form-urlencoded'})),null);
});

test('JSON and multipart readers map stalled bodies to a safe retryable timeout', async(t)=>{
  t.mock.timers.enable({apis:['setTimeout']});
  try {
    const {readJsonBody}=await import('../src/lib/api/body');
    for (const [reader,type] of [[readJsonBody,'application/json'],[uploadBytes,'multipart/form-data; boundary=x']] as const) {
      const request=streamed(new ReadableStream<Uint8Array>(),{'content-type':type});
      const pending=reader(request);
      t.mock.timers.tick(10_000);
      await assert.rejects(pending,(e)=>e instanceof BodyError&&e.status===408&&e.code==='REQUEST_TIMEOUT');
    }
  } finally { t.mock.timers.reset(); }
});

test('multipart stream caps cannot be bypassed by a small Content-Length',async()=>{
  let cancelled=false;
  const stream=new ReadableStream<Uint8Array>({start(c){c.enqueue(new Uint8Array(4*1024*1024+16*1024+1));},cancel(){cancelled=true;}});
  await assert.rejects(()=>uploadBytes(streamed(stream,{'content-type':'multipart/form-data; boundary=x','content-length':'1'})),(e)=>e instanceof BodyError&&e.status===413);
  assert.ok(cancelled);
});
