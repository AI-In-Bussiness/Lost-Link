'use client';
import { useEffect, useRef, useState, type ReactNode, type FormEvent } from 'react';

export default function AdminForm({children,label}:{children:ReactNode;label:string}) {
 const [error,setError]=useState('');
 const [pending,setPending]=useState(false);
 const alert=useRef<HTMLDivElement>(null);
 // Focus after React commits the alert, including when another owner tab was active.
 useEffect(()=>{if(error)alert.current?.focus();},[error]);
 async function submit(event:FormEvent<HTMLFormElement>) {
  event.preventDefault();
  if(pending)return;
  const body=new URLSearchParams();
  for(const [key,value] of new FormData(event.currentTarget)) if(typeof value==='string')body.append(key,value);
  setPending(true);setError('');
  try {
   const response=await fetch('/api/admin',{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded',Accept:'application/json'},body,signal:AbortSignal.timeout(20000)});
   const result=await response.json();
   if(!response.ok)throw Error(result.error?.message || 'Unable to save settings.');
   // Only a local server-generated admin destination is accepted.
   if(typeof result.destination!=='string' || !result.destination.startsWith('/admin?'))throw Error('Refresh to check whether your change was saved.');
   window.location.assign(result.destination);
  }catch(cause){
   setError(cause instanceof Error && cause.name!=='TimeoutError'?cause.message:'The request did not finish. Refresh to check whether it was saved before retrying.');
   setPending(false);
  }
 }
 return <form action="/api/admin" method="post" onSubmit={submit} className="stack owner-form" aria-label={label} aria-busy={pending}>
  {error && <div className="error-summary" role="alert" tabIndex={-1} ref={alert}>{error}</div>}
  <fieldset disabled={pending} className="stack">{children}</fieldset>
  {pending && <p role="status">Saving changes…</p>}
 </form>;
}
