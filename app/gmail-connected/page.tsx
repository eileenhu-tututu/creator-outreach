'use client';

import { useEffect } from 'react';
import { Check, Mail } from 'lucide-react';

export default function GmailConnectedPage() {
  useEffect(() => {
    if (window.opener) {
      window.opener.postMessage({ type: 'gmail-connected' }, window.location.origin);
      window.setTimeout(() => window.close(), 500);
    }
  }, []);

  return <main className="grid min-h-screen place-items-center bg-[#0f0f0f] p-6 text-white"><div className="w-full max-w-sm rounded-[28px] bg-white p-8 text-center text-black"><span className="mx-auto grid size-14 place-items-center rounded-full bg-[#ff5400]"><Check className="size-6" /></span><h1 className="mt-5 text-2xl font-black">Gmail connected</h1><p className="mt-2 text-sm leading-6 text-black/50">Returning to your outreach draft without refreshing it.</p><div className="mt-6 flex items-center justify-center gap-2 text-sm font-bold"><Mail className="size-4" /> This window will close automatically</div></div></main>;
}
