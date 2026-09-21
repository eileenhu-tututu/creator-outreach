'use client';

import { useEffect, useState } from 'react';
import { ArrowRight, FlaskConical, ShieldCheck } from 'lucide-react';
import Link from 'next/link';
import {
  configuredCredentialCount,
  readDemoCredentials,
} from '@/lib/demo-credentials';

export function DemoModeBanner() {
  const [configured, setConfigured] = useState(0);

  useEffect(() => {
    const refresh = () =>
      setConfigured(configuredCredentialCount(readDemoCredentials()));
    const timer = window.setTimeout(refresh, 0);
    window.addEventListener('demo-credentials-changed', refresh);
    window.addEventListener('storage', refresh);
    return () => {
      window.clearTimeout(timer);
      window.removeEventListener('demo-credentials-changed', refresh);
      window.removeEventListener('storage', refresh);
    };
  }, []);

  return (
    <section className="border-b border-[#27322d]/10 bg-[#fffefa] text-[#27322d]">
      <div className="mx-auto flex max-w-[1440px] flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-5 lg:px-10">
        <div className="flex items-center gap-3">
          <span className="grid size-9 shrink-0 place-items-center rounded-full bg-[#ddd0ff]">
            <FlaskConical className="size-4" />
          </span>
          <div>
            <p className="text-sm font-black">Demo mode</p>
            <p className="text-xs leading-5 text-[#27322d]/60">
              {configured === 3
                ? 'All three content APIs are ready in this browser tab.'
                : `${configured}/3 content APIs configured · add your own keys before collecting videos.`}
            </p>
          </div>
        </div>
        <Link
          href="/demo-settings"
          className="inline-flex h-10 items-center justify-center gap-2 rounded-full bg-[#27322d] px-4 text-sm font-bold text-white transition hover:bg-[#39463f]"
        >
          <ShieldCheck className="size-4" />
          Configure demo
          <ArrowRight className="size-4" />
        </Link>
      </div>
    </section>
  );
}
