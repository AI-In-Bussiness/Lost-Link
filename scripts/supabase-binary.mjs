import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

// Invoke the pinned package's native executable, never an npm .cmd shell shim.
// Supabase 2.75.0's installer uses bin/supabase.exe on Windows.
export function supabaseBinary() {
 const name = process.platform === 'win32' ? 'supabase.exe' : 'supabase';
 const binary = fileURLToPath(new URL(`../node_modules/supabase/bin/${name}`, import.meta.url));
 if (!existsSync(binary)) throw new Error('Local Supabase CLI is not installed. Run npm ci; if npm blocked its installer, approve supabase with npm install-scripts approve supabase, then run npm rebuild supabase.');
 return binary;
}
