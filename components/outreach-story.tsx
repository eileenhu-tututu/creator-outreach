'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import { Check, Mail, Send, Sparkles } from 'lucide-react';

const creatorImage = 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=600&h=760&fit=crop&auto=format';
const senderImage = 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=420&h=420&fit=crop&auto=format';

const phases = [
  { label: 'Creator signal', status: '3 videos read', icon: '👀' },
  { label: 'Human match', status: '94% product fit', icon: '🎯' },
  { label: 'Email ready', status: 'Personalized HTML', icon: '💌' },
] as const;

export function OutreachStory() {
  const [active, setActive] = useState(0);

  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const timer = window.setInterval(() => setActive((current) => (current + 1) % phases.length), 2400);
    return () => window.clearInterval(timer);
  }, []);

  return (
    <section id="product-story" className="outreach-story scroll-mt-24" aria-labelledby="outreach-story-title">
      <div className="outreach-story-head">
        <div><p className="eyebrow">LIVE PRODUCT STORY · AUTO PLAY</p><h2 id="outreach-story-title">From their voice to your inbox.</h2></div>
        <p>Watch the context travel. Creator content becomes a product reason, then a message your BD manager can review and send.</p>
      </div>

      <div className={`outreach-scene is-step-${active + 1}`}>
        <svg className="outreach-links" viewBox="0 0 1000 250" preserveAspectRatio="none" aria-hidden="true">
          <path className="link-base" d="M190 126 C300 30 380 30 475 126 S665 222 790 126" />
          <path className="link-live" d="M190 126 C300 30 380 30 475 126 S665 222 790 126" pathLength="100" />
          <circle className="travel-dot" r="9"><animateMotion dur="4.8s" repeatCount="indefinite" path="M190 126 C300 30 380 30 475 126 S665 222 790 126" /></circle>
        </svg>

        <button type="button" onClick={() => setActive(0)} className={`story-person story-creator ${active === 0 ? 'is-active' : ''}`} aria-pressed={active === 0}>
          <span className="person-image"><Image unoptimized src={creatorImage} alt="Creator Rachel" width={600} height={760} /></span>
          <span className="person-copy"><small>CREATOR · SEATTLE</small><strong>@rainydayrachel</strong><span>“Waterproof and cute?”</span></span>
          <i aria-hidden="true">👀</i>
        </button>

        <button type="button" onClick={() => setActive(1)} className={`story-person story-sender ${active === 1 ? 'is-active' : ''}`} aria-pressed={active === 1}>
          <span className="sender-avatar"><Image unoptimized src={senderImage} alt="BD sender Mia" width={420} height={420} /></span>
          <span className="person-copy"><small>BD MANAGER</small><strong>Mia · Northstar</strong><span><Check className="size-3" /> CloudLayer · 94%</span></span>
          <i aria-hidden="true">🎯</i>
        </button>

        <button type="button" onClick={() => setActive(2)} className={`story-email ${active === 2 ? 'is-active' : ''}`} aria-pressed={active === 2}>
          <span className="email-window-bar"><span><b /><b /><b /></span><Mail className="size-4" /></span>
          <span className="email-from"><Image unoptimized src={senderImage} alt="Mia" width={420} height={420} /><span><strong>Mia at Northstar</strong><small>to Rachel · just now</small></span></span>
          <span className="email-subject">Rainy-day style, made lighter ☔</span>
          <span className="email-copy">Your Seattle rain moment got us. We found a product that genuinely fits your everyday style…</span>
          <span className="email-cta">View creator offer <Send className="size-3" /></span>
          <i aria-hidden="true">💌</i>
        </button>
      </div>

      <div className="outreach-phase-tabs">
        {phases.map((phase, index) => <button key={phase.label} type="button" onClick={() => setActive(index)} className={active === index ? 'is-active' : ''} aria-pressed={active === index}><span>{phase.icon}</span><span><strong>{phase.label}</strong><small>{phase.status}</small></span><i /></button>)}
      </div>
      <p className="outreach-story-note"><Sparkles className="size-4" /> The coral pulse shows where the app is working. Click any character or stage to inspect the flow.</p>
    </section>
  );
}
