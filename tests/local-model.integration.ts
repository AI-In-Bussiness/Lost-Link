import test from 'node:test';
import assert from 'node:assert/strict';
import { embed, closeEmbedder } from '../src/lib/search/embeddings';
import { cosine } from '../src/lib/search/ranking';
test('actual local model returns normalized semantic vectors and rejects concurrent work', async () => {
  try {
    const first=embed(['rucksack','a backpack worn on shoulders','a gold wedding ring']);
    await assert.rejects(()=>embed(['busy']),/busy/);
    const vectors=await first;
    assert.equal(vectors.length,3);
    assert.ok(vectors.every(v=>v.length===384 && Math.abs(Math.hypot(...v)-1)<0.001));
    assert.ok(cosine(vectors[0],vectors[1])>cosine(vectors[0],vectors[2]));
    assert.equal((await embed(['another request'])).length,1);
  } finally { await closeEmbedder(); }
});
