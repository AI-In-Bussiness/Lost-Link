import test from 'node:test';
import assert from 'node:assert/strict';
import sharp from 'sharp';
import { sanitizeImage, ImageError, MAX_IMAGE_BYTES } from '../src/lib/photos/image';
const solid=()=>sharp({create:{width:32,height:16,channels:3,background:'#224477'}});
function rejects(status:number){return(error:unknown)=>error instanceof ImageError && error.status===status;}

test('supported images are decoded and converted to fresh bounded WebP bytes',async()=>{
 for(const input of [await solid().jpeg().toBuffer(),await solid().png().toBuffer(),await solid().webp().toBuffer()]){
  const output=await sanitizeImage(input),meta=await sharp(output.bytes).metadata();
  assert.equal(meta.format,'webp');assert.equal(output.contentType,'image/webp');
  assert.equal(meta.width,32);assert.equal(meta.height,16);assert.match(output.sha256,/^[a-f0-9]{64}$/);
 }
});
test('metadata is stripped and EXIF orientation is applied before publication',async()=>{
 const input=await solid().withMetadata({orientation:6,exif:{IFD0:{ImageDescription:'Synthetic private upload metadata'}}}).jpeg().toBuffer();
 assert.ok((await sharp(input).metadata()).exif);
 const output=await sanitizeImage(input),meta=await sharp(output.bytes).metadata();
 assert.equal(meta.width,16);assert.equal(meta.height,32);
 assert.equal(meta.exif,undefined);assert.equal(meta.icc,undefined);assert.equal(meta.orientation,undefined);
 assert.ok(!output.bytes.includes(Buffer.from('Synthetic private upload metadata')));
});
test('HTML SVG GIF and spoofed or malformed image bytes fail safely',async()=>{
 for(const input of [Buffer.from('<html>not an image</html>'),Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"/>'),Buffer.from('GIF89a')])await assert.rejects(sanitizeImage(input),rejects(415));
 await assert.rejects(sanitizeImage(Buffer.from([0xff,0xd8,0xff,0x00])),rejects(400));
 await assert.rejects(sanitizeImage(new Uint8Array()),rejects(400));
});
test('input bytes and decoded pixel count are bounded',async()=>{
 await assert.rejects(sanitizeImage(Buffer.alloc(MAX_IMAGE_BYTES+1)),rejects(413));
 const large=await sharp({create:{width:5000,height:4001,channels:3,background:'white'}}).png().toBuffer();
 assert.ok(large.length<MAX_IMAGE_BYTES);
 await assert.rejects(sanitizeImage(large),rejects(413));
});
test('large valid images are resized without enlarging small images',async()=>{
 const input=await sharp({create:{width:2400,height:1200,channels:3,background:'white'}}).png().toBuffer();
 const output=await sanitizeImage(input);assert.equal(output.width,2000);assert.equal(output.height,1000);
});
test('animation control chunks are rejected before public output',async()=>{
 const png=await solid().png().toBuffer();
 const chunk=Buffer.alloc(20);chunk.writeUInt32BE(8,0);chunk.write('acTL',4,'ascii');
 const animated=Buffer.concat([png.subarray(0,33),chunk,png.subarray(33)]);
 await assert.rejects(sanitizeImage(animated),rejects(415));
 // A WebP animation flag also fails even before a malformed container can decode.
 const webp=Buffer.alloc(30);webp.write('RIFF',0);webp.writeUInt32LE(22,4);webp.write('WEBP',8);webp.write('VP8X',12);webp.writeUInt32LE(10,16);webp[20]=2;
 await assert.rejects(sanitizeImage(webp),rejects(415));
});
test('trailing nonimage data is not carried into the derivative',async()=>{
 const payload=Buffer.from('<script>synthetic-injected-content</script>');
 const input=Buffer.concat([await solid().png().toBuffer(),payload]);
 const output=await sanitizeImage(input);
 assert.ok(!output.bytes.includes(payload));assert.equal((await sharp(output.bytes).metadata()).format,'webp');
});
