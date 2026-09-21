'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  ArrowLeft,
  Check,
  Eye,
  EyeOff,
  FlaskConical,
  KeyRound,
  RotateCcw,
  ShieldCheck,
} from 'lucide-react';
import Link from 'next/link';
import { BrandNav } from '@/components/brand-nav';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  clearDemoCredentials,
  configuredCredentialCount,
  emptyDemoCredentials,
  readDemoCredentials,
  saveDemoCredentials,
  type DemoCredentials,
} from '@/lib/demo-credentials';

const fields = [
  {
    key: 'youtubeApiKey' as const,
    label: 'YouTube Data API key',
    note: 'Find channels and load the latest seven Shorts.',
    placeholder: 'AIza…',
  },
  {
    key: 'supadataApiKey' as const,
    label: 'Supadata API key',
    note: 'Load TikTok metadata and spoken transcripts.',
    placeholder: 'sd_…',
  },
  {
    key: 'geminiApiKey' as const,
    label: 'Gemini API key',
    note: 'Read speech, screen text, and structured creator signals.',
    placeholder: 'AIza…',
  },
] as const;

export default function DemoSettingsPage() {
  const [credentials, setCredentials] =
    useState<DemoCredentials>(emptyDemoCredentials);
  const [visible, setVisible] = useState<
    Record<keyof DemoCredentials, boolean>
  >({
    youtubeApiKey: false,
    supadataApiKey: false,
    geminiApiKey: false,
  });
  const [message, setMessage] = useState('');

  useEffect(() => {
    const timer = window.setTimeout(
      () => setCredentials(readDemoCredentials()),
      0,
    );
    return () => window.clearTimeout(timer);
  }, []);
  const count = useMemo(
    () => configuredCredentialCount(credentials),
    [credentials],
  );

  const save = () => {
    const next = saveDemoCredentials(credentials);
    setCredentials(next);
    setMessage(
      count === 3
        ? 'Demo APIs are ready in this tab.'
        : 'Saved. Add the remaining keys when that feature is needed.',
    );
  };

  const reset = () => {
    clearDemoCredentials();
    setCredentials(emptyDemoCredentials);
    setMessage('All demo keys were removed from this tab.');
  };

  return (
    <main className="app-shell min-h-screen bg-[#eaf4e8] text-[#27322d]">
      <BrandNav active="setup" />
      <section className="mx-auto max-w-[1120px] px-4 py-10 sm:px-6 lg:px-10 lg:py-16">
        <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
          <div className="rounded-[32px] border border-[#27322d]/10 bg-[#fffefa] p-5 shadow-[0_24px_70px_rgba(39,50,45,.08)] sm:p-8">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <div className="mb-4 flex items-center gap-2">
                  <Badge className="rounded-full bg-[#ddd0ff] px-3 py-1.5 text-[#27322d]">
                    <FlaskConical className="mr-1 size-3.5" /> DEMO MODE
                  </Badge>
                  <span className="text-xs font-bold text-[#27322d]/45">
                    {count}/3 READY
                  </span>
                </div>
                <h1 className="text-4xl font-black tracking-[-.05em] sm:text-5xl">
                  Connect your demo APIs
                </h1>
                <p className="mt-4 max-w-2xl text-base leading-7 text-[#27322d]/65">
                  Use your own temporary keys on any interview device. Keys stay
                  in this browser tab and disappear when the tab session ends.
                </p>
              </div>
            </div>

            <div className="mt-8 space-y-4">
              {fields.map((field, index) => {
                const ready = Boolean(credentials[field.key].trim());
                return (
                  <div
                    key={field.key}
                    className="block rounded-[22px] border border-[#27322d]/10 bg-white p-4 sm:p-5"
                  >
                    <span className="flex items-start justify-between gap-4">
                      <span className="flex gap-3">
                        <span
                          className={`grid size-9 shrink-0 place-items-center rounded-full text-sm font-black ${ready ? 'bg-[#aee8c5]' : 'bg-[#f1efea]'}`}
                        >
                          {ready ? (
                            <Check className="size-4" />
                          ) : (
                            `0${index + 1}`
                          )}
                        </span>
                        <span>
                          <label
                            htmlFor={`demo-${field.key}`}
                            className="block text-sm font-bold"
                          >
                            {field.label}
                          </label>
                          <span className="mt-1 block text-xs leading-5 text-[#27322d]/55">
                            {field.note}
                          </span>
                        </span>
                      </span>
                      <Badge
                        className={`shrink-0 rounded-full ${ready ? 'bg-[#aee8c5] text-[#27322d]' : 'bg-[#f1efea] text-[#27322d]/55'}`}
                      >
                        {ready ? 'Ready' : 'Missing'}
                      </Badge>
                    </span>
                    <span className="relative mt-4 block">
                      <Input
                        id={`demo-${field.key}`}
                        type={visible[field.key] ? 'text' : 'password'}
                        value={credentials[field.key]}
                        onChange={(event) => {
                          setCredentials((current) => ({
                            ...current,
                            [field.key]: event.target.value,
                          }));
                          setMessage('');
                        }}
                        placeholder={field.placeholder}
                        autoComplete="off"
                        spellCheck={false}
                        className="h-12 rounded-[14px] border-[#27322d]/15 bg-[#f8faf6] pr-12 font-mono text-sm text-[#27322d] placeholder:text-[#27322d]/25"
                      />
                      <button
                        type="button"
                        aria-label={
                          visible[field.key] ? 'Hide key' : 'Show key'
                        }
                        onClick={() =>
                          setVisible((current) => ({
                            ...current,
                            [field.key]: !current[field.key],
                          }))
                        }
                        className="absolute right-3 top-1/2 grid size-8 -translate-y-1/2 place-items-center rounded-full text-[#27322d]/45 hover:bg-[#27322d]/5 hover:text-[#27322d]"
                      >
                        {visible[field.key] ? (
                          <EyeOff className="size-4" />
                        ) : (
                          <Eye className="size-4" />
                        )}
                      </button>
                    </span>
                  </div>
                );
              })}
            </div>

            <div className="mt-6 flex flex-col gap-3 sm:flex-row">
              <Button
                type="button"
                onClick={save}
                disabled={!count}
                className="h-12 flex-1 rounded-full bg-[#ff7768] font-black text-[#27322d] hover:bg-[#ff8b7f]"
              >
                <KeyRound className="size-4" /> Save for this tab
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={reset}
                disabled={!count}
                className="h-12 rounded-full border-[#27322d]/15 bg-white px-5 font-bold text-[#27322d]"
              >
                <RotateCcw className="size-4" /> Clear keys
              </Button>
            </div>
            {message ? (
              <output className="mt-4 block rounded-[14px] bg-[#aee8c5]/55 px-4 py-3 text-sm font-bold">
                {message}
              </output>
            ) : null}
          </div>

          <aside className="space-y-4">
            <article className="rounded-[28px] bg-[#27322d] p-6 text-white">
              <ShieldCheck className="size-6 text-[#aee8c5]" />
              <h2 className="mt-5 text-2xl font-black tracking-[-.04em]">
                Safe for a temporary demo
              </h2>
              <ul className="mt-5 space-y-4 text-sm leading-6 text-white/70">
                <li>• Nothing is written into the project or public page.</li>
                <li>• Keys are sent only to the feature you run.</li>
                <li>• Closing the browser session removes them.</li>
              </ul>
            </article>
            <article className="rounded-[28px] bg-[#ddd0ff] p-6">
              <p className="text-xs font-black uppercase tracking-[.14em] text-[#27322d]/45">
                Interview flow
              </p>
              <ol className="mt-4 space-y-3 text-sm font-bold leading-6">
                <li>1. Add the three temporary keys.</li>
                <li>2. Open Generator and collect a creator.</li>
                <li>3. Match products and show the outreach result.</li>
              </ol>
              <Link
                href="/"
                className="mt-6 inline-flex h-11 w-full items-center justify-center gap-2 rounded-full bg-[#27322d] px-4 text-sm font-bold text-white"
              >
                <ArrowLeft className="size-4" /> Back to Generator
              </Link>
            </article>
            <p className="px-2 text-xs leading-5 text-[#27322d]/50">
              Gmail OAuth remains separate because it requires a fixed Google
              callback configuration. You can still preview and copy every DM or
              HTML email without connecting Gmail.
            </p>
          </aside>
        </div>
      </section>
    </main>
  );
}
