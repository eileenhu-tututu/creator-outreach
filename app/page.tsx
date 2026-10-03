'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowDown,
  ArrowRight,
  Check,
  Clapperboard,
  Clipboard,
  Code2,
  Copy,
  ExternalLink,
  FileText,
  Image as ImageIcon,
  Link2,
  Mail,
  MessageCircle,
  PackageSearch,
  PanelRightClose,
  PanelRightOpen,
  Plus,
  RefreshCw,
  ScanText,
  Send,
  ShieldCheck,
  Sparkles,
  Trash2,
  Upload,
  Video,
  WandSparkles,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import {
  defaultProducts,
  rankProducts,
  type Product,
  type ProductMatch,
} from '@/lib/products';
import {
  emailPlaceholders,
  renderEmailTemplate,
  starterEmailCss,
  starterEmailHtml,
} from '@/lib/email-template';
import {
  buildConversationAngles,
  type ConversationAngle,
} from '@/lib/conversation-angles';
import {
  creatorProfileText,
  hasCreatorProfileData,
  mergeCreatorProfiles,
  normalizeCreatorProfile,
  profileConversationAngles,
  type CreatorProfile,
} from '@/lib/creator-profile';
import { BrandNav } from '@/components/brand-nav';
import { DemoModeBanner } from '@/components/demo-mode-banner';
import { OutreachStory } from '@/components/outreach-story';
import { creatorIdHash, trackEvent } from '@/lib/analytics';
import { demoCredentialHeaders } from '@/lib/demo-credentials';
import {
  archiveCreatorWorkspace,
  readArchivedWorkspace,
  readCurrentWorkspace,
  writeCurrentWorkspace,
  type CollectedVideo,
  type CollectionSource,
  type CreatorWorkspaceSnapshot,
  type OutreachResult,
} from '@/lib/creator-workspace';
import {
  readOutreachHistory,
  updateOutreachHistoryItem,
  writeOutreachHistory,
  type OutreachChannel,
} from '@/lib/outreach-history';

const creatorImages = [
  'https://images.unsplash.com/photo-1620396748669-46bd3128ccce?w=720&h=1280&fit=crop&auto=format',
  'https://images.unsplash.com/photo-1645848810652-44c3f68606e3?w=720&h=1280&fit=crop&auto=format',
  'https://images.unsplash.com/photo-1645848810560-1c6acf9ba847?w=720&h=1280&fit=crop&auto=format',
];
const productImage =
  'https://images.unsplash.com/photo-1576188973526-0e5d7047b0cf?w=900&h=700&fit=crop&auto=format';
const initialTranscripts = [''];
const minimumProductMatchScore = 75;

type Result = OutreachResult;
type InlineEmailImage = {
  dataUrl: string;
  data: string;
  mimeType: string;
  filename: string;
  cid: string;
};
const cleanHandle = (value: string) =>
  value.trim().replace(/^@/, '') || 'creator';
const isYouTubeVideoInput = (value: string) =>
  /(?:youtube\.com\/(?:shorts\/|watch\?v=)|youtu\.be\/)[\w-]{11}/i.test(
    value.trim(),
  );
const escapeHtml = (value: string) =>
  value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');

const analyticsErrorCode = (error: unknown, fallback: string) => {
  const message = error instanceof Error ? error.message.toLowerCase() : '';
  if (/credential|api key|unauthorized|forbidden/.test(message))
    return 'CREDENTIAL_ERROR';
  if (/quota|rate limit|too many requests/.test(message)) return 'RATE_LIMIT';
  if (/timeout|timed out/.test(message)) return 'TIMEOUT';
  if (/transcript|caption/.test(message)) return 'TRANSCRIPT_UNAVAILABLE';
  return fallback;
};

const normalizedEditRatio = (original: string, edited: string) => {
  if (original === edited) return 0;
  if (!original.length || !edited.length) return 1;
  const previous = Array.from(
    { length: edited.length + 1 },
    (_, index) => index,
  );
  for (
    let originalIndex = 1;
    originalIndex <= original.length;
    originalIndex += 1
  ) {
    let diagonal = previous[0];
    previous[0] = originalIndex;
    for (let editedIndex = 1; editedIndex <= edited.length; editedIndex += 1) {
      const above = previous[editedIndex];
      previous[editedIndex] =
        original[originalIndex - 1] === edited[editedIndex - 1]
          ? diagonal
          : Math.min(diagonal, above, previous[editedIndex - 1]) + 1;
      diagonal = above;
    }
  }
  return Number(
    (
      previous[edited.length] / Math.max(original.length, edited.length)
    ).toFixed(3),
  );
};
const safeHttpUrl = (value: string) => {
  try {
    const input = value.trim();
    if (!input) return '';
    const url = new URL(
      /^https?:\/\//i.test(input) ? input : `https://${input}`,
    );
    return url.protocol === 'https:' || url.protocol === 'http:'
      ? escapeHtml(url.toString())
      : '';
  } catch {
    return '';
  }
};

const videoScript = (video: CollectedVideo) => {
  const spoken = video.transcript?.trim();
  const visual = video.visualText?.filter(Boolean) || [];
  return [
    spoken ? `[Spoken transcript]\n${spoken}` : '',
    visual.length ? `[On-screen text]\n${visual.join('\n')}` : '',
  ]
    .filter(Boolean)
    .join('\n\n');
};
const visualFailureUpdater =
  (videoId: string, failureMessage: string) => (videos: CollectedVideo[]) =>
    videos.map((item) =>
      item.id === videoId
        ? {
            ...item,
            visualStatus: 'failed' as const,
            visualError: failureMessage,
          }
        : item,
    );

const transcriptQuality = (video: CollectedVideo, transcript: string) => {
  const words = transcript.split(/\s+/).filter(Boolean).length;
  const base = video.qualityScore || 20;
  const score = Math.min(
    100,
    Math.max(base, words >= 80 ? 72 : words >= 35 ? 58 : words >= 15 ? 42 : 24),
  );
  return {
    qualityScore: score,
    qualityLabel:
      score >= 65
        ? ('strong' as const)
        : score >= 38
          ? ('review' as const)
          : ('skip' as const),
    qualityReason:
      words >= 35
        ? 'Transcript contains enough spoken context for matching.'
        : 'Limited spoken context. Review it or read the on-screen text.',
  };
};

export default function Home() {
  const [username, setUsername] = useState('');
  const [bio, setBio] = useState('');
  const [transcripts, setTranscripts] = useState(initialTranscripts);
  const [activeVideo, setActiveVideo] = useState(0);
  const [conversationAngles, setConversationAngles] = useState<
    ConversationAngle[]
  >([]);
  const [selectedAngleId, setSelectedAngleId] = useState('');
  const [angleSignature, setAngleSignature] = useState('');
  const [product, setProduct] = useState('CloudLayer Jacket');
  const [description, setDescription] = useState(
    'A lightweight everyday rain jacket designed to stay cute in bad weather.',
  );
  const [features, setFeatures] = useState([
    'Waterproof',
    'Lightweight',
    'Oversized fit',
    'Pink colorway',
  ]);
  const [commission, setCommission] = useState('15%');
  const [freeSample, setFreeSample] = useState(true);
  const [productLibrary, setProductLibrary] =
    useState<Product[]>(defaultProducts);
  const [productMatches, setProductMatches] = useState<ProductMatch[]>([]);
  const [selectedProductId, setSelectedProductId] = useState<string | null>(
    null,
  );
  const [matchingProducts, setMatchingProducts] = useState(false);
  const [matchSignature, setMatchSignature] = useState('');
  const [result, setResult] = useState<Result | null>(null);
  const [resultEdited, setResultEdited] = useState(false);
  const [activeRunId, setActiveRunId] = useState<string | null>(null);
  const generatedResultRef = useRef<Result | null>(null);
  const trackedEditedMessageIdsRef = useRef(new Set<string>());
  const [workflowOpen, setWorkflowOpen] = useState(false);
  const [visibleWorkflowAnchor, setVisibleWorkflowAnchor] =
    useState('generator');
  const [activeHistoryId, setActiveHistoryId] = useState<string | null>(null);
  const [activeSentAt, setActiveSentAt] = useState<string | null>(null);
  const [outreachChannel, setOutreachChannel] =
    useState<OutreachChannel>('TikTok DM');
  const [generating, setGenerating] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);
  const [collectionSource, setCollectionSource] =
    useState<CollectionSource>('youtube-shorts');
  const [collectionInput, setCollectionInput] = useState('');
  const [collectedVideos, setCollectedVideos] = useState<CollectedVideo[]>([]);
  const [selectedVideoIds, setSelectedVideoIds] = useState<string[]>([]);
  const [checkingTranscriptIds, setCheckingTranscriptIds] = useState<string[]>(
    [],
  );
  const [analyzingVideoIds, setAnalyzingVideoIds] = useState<string[]>([]);
  const [structuringVideoIds, setStructuringVideoIds] = useState<string[]>([]);
  const [collecting, setCollecting] = useState(false);
  const [collectionMessage, setCollectionMessage] = useState('');
  const [workspaceHydrated, setWorkspaceHydrated] = useState(false);
  const [emailRecipient, setEmailRecipient] = useState('');
  const [showHtml, setShowHtml] = useState(true);
  const [emailImageUrl, setEmailImageUrl] = useState('');
  const [emailImageFile, setEmailImageFile] = useState<InlineEmailImage | null>(
    null,
  );
  const [emailImageError, setEmailImageError] = useState('');
  const [emailImageAlt, setEmailImageAlt] = useState('Product image');
  const [emailImagePosition, setEmailImagePosition] = useState<
    'top' | 'after-intro' | 'bottom'
  >('after-intro');
  const [emailImageWidth, setEmailImageWidth] = useState<'full' | 'medium'>(
    'full',
  );
  const [ctaText, setCtaText] = useState('View collaboration details');
  const [ctaUrl, setCtaUrl] = useState('');
  const [includeOffer, setIncludeOffer] = useState(true);
  const [emailEditorMode, setEmailEditorMode] = useState<'visual' | 'code'>(
    'visual',
  );
  const [customEmailHtml, setCustomEmailHtml] = useState(starterEmailHtml);
  const [customEmailCss, setCustomEmailCss] = useState(starterEmailCss);
  const [templateMessage, setTemplateMessage] = useState('');
  const [activeShowcase, setActiveShowcase] = useState(0);
  const [celebration, setCelebration] = useState<'match' | 'message' | null>(
    null,
  );
  const [gmailStatus, setGmailStatus] = useState({
    connected: false,
    configured: false,
  });
  const [sending, setSending] = useState(false);
  const [sendMessage, setSendMessage] = useState('');
  const filledVideos = useMemo(
    () => transcripts.filter((item) => item.trim()).length,
    [transcripts],
  );
  const structuredCreatorProfile = useMemo(
    () =>
      mergeCreatorProfiles(
        selectedVideoIds
          .map(
            (id) =>
              collectedVideos.find((video) => video.id === id)
                ?.structuredProfile,
          )
          .filter((profile): profile is CreatorProfile => Boolean(profile)),
      ),
    [collectedVideos, selectedVideoIds],
  );
  const analyzedSelectedCount = selectedVideoIds.filter((id) =>
    collectedVideos.find(
      (video) => video.id === id && Boolean(video.structuredProfile),
    ),
  ).length;
  const allSelectedVideosAnalyzed =
    selectedVideoIds.length === 0 ||
    analyzedSelectedCount === selectedVideoIds.length;
  const hasStructuredProfile = hasCreatorProfileData(structuredCreatorProfile);
  const currentAngleSignature = useMemo(
    () => JSON.stringify([bio, transcripts, structuredCreatorProfile]),
    [bio, transcripts, structuredCreatorProfile],
  );
  const anglesFresh =
    conversationAngles.length > 0 && angleSignature === currentAngleSignature;
  const selectedAngle = anglesFresh
    ? conversationAngles.find(
        (angle) =>
          angle.id === selectedAngleId &&
          angle.title.trim() &&
          angle.dmLead.trim(),
      ) || null
    : null;
  const creatorSignature = useMemo(
    () =>
      JSON.stringify([
        username,
        bio,
        transcripts,
        selectedAngleId,
        productLibrary,
      ]),
    [username, bio, transcripts, selectedAngleId, productLibrary],
  );
  const matchesFresh =
    productMatches.length > 0 && matchSignature === creatorSignature;
  const selectedMatch =
    productMatches.find((item) => item.product.id === selectedProductId) ||
    null;
  const selectedMatchEligible = Boolean(
    selectedMatch && selectedMatch.score >= minimumProductMatchScore,
  );
  const activeHistoryItem = useMemo(
    () =>
      activeHistoryId
        ? readOutreachHistory().find((item) => item.id === activeHistoryId)
        : undefined,
    [activeHistoryId],
  );
  const replyRecorded = Boolean(
    activeHistoryItem?.replyStatus &&
    activeHistoryItem.replyStatus !== 'pending',
  );
  const workflowSteps = [
    {
      label: 'Submit Creator',
      href: '#generator',
      complete: Boolean(collectionInput.trim() || username.trim()),
    },
    {
      label: 'Transcript + screen text',
      href: '#generator',
      complete:
        collectedVideos.some((video) => Boolean(videoScript(video))) ||
        transcripts.some((script) => Boolean(script.trim())),
    },
    {
      label: 'Generate Creator insights',
      href: '#creator-insights',
      complete: hasStructuredProfile,
    },
    {
      label: 'Confirm talking point',
      href: '#conversation-angles',
      complete: Boolean(selectedAngle),
    },
    {
      label: 'Match product',
      href: '#product-match',
      complete: Boolean(selectedMatchEligible && matchesFresh),
    },
    {
      label: 'Generate personalized copy',
      href: '#results',
      complete: Boolean(result),
    },
    {
      label: 'Edit or copy',
      href: '#results',
      complete: Boolean(result && resultEdited),
    },
    {
      label: 'Mark as sent',
      href: '#results',
      complete: Boolean(activeSentAt),
    },
    {
      label: 'Record reply result',
      href: '/history',
      complete: replyRecorded,
    },
    {
      label: 'Analyze winning patterns',
      href: '/history',
      complete: Boolean(
        activeHistoryItem?.replyStatus === 'positive' ||
        activeHistoryItem?.replyStatus === 'collaboration_started',
      ),
    },
  ];
  const firstIncompleteWorkflowStep = workflowSteps.findIndex(
    (step) => !step.complete,
  );
  const currentWorkflowStep =
    firstIncompleteWorkflowStep === -1
      ? workflowSteps.length - 1
      : firstIncompleteWorkflowStep;
  const visibleWorkflowStep =
    {
      generator: Math.min(currentWorkflowStep, 1),
      'creator-insights': 2,
      'conversation-angles': 3,
      'product-match': 4,
      results: Math.min(7, Math.max(5, currentWorkflowStep)),
    }[visibleWorkflowAnchor] ?? currentWorkflowStep;
  const currentWorkspaceSnapshot = useMemo<CreatorWorkspaceSnapshot>(
    () => ({
      version: 1,
      savedAt: new Date().toISOString(),
      username,
      bio,
      collectionSource,
      collectionInput,
      collectedVideos,
      selectedVideoIds,
      transcripts,
      conversationAngles,
      selectedAngleId,
      angleSignature,
      productMatches,
      selectedProductId,
      matchSignature,
      product,
      description,
      features,
      commission,
      freeSample,
      result,
      activeRunId,
      activeHistoryId,
      activeSentAt,
    }),
    [
      activeHistoryId,
      activeRunId,
      activeSentAt,
      angleSignature,
      bio,
      collectedVideos,
      collectionInput,
      collectionSource,
      commission,
      conversationAngles,
      description,
      features,
      freeSample,
      matchSignature,
      product,
      productMatches,
      result,
      selectedAngleId,
      selectedProductId,
      selectedVideoIds,
      transcripts,
      username,
    ],
  );
  const emailHtml = useMemo(() => {
    if (!result) return { preview: '', send: '' };
    const handle = cleanHandle(username);
    const creatorName =
      handle
        .replace(/[^a-zA-Z]/g, '')
        .replace(/^(.)/, (letter) => letter.toUpperCase()) || 'there';
    const buttonUrl = safeHttpUrl(ctaUrl);
    const templateValues = (imageSource: string) => ({
      subject: result.subject,
      creatorName,
      creatorHandle: `@${handle}`,
      emailBody: result.email,
      productName: product,
      productDescription: description,
      productFeatures: features,
      commission,
      imageSource,
      imageAlt: emailImageAlt,
      ctaText,
      ctaUrl: buttonUrl,
      includeOffer,
    });
    const remoteImage = safeHttpUrl(emailImageUrl);
    if (emailEditorMode === 'code') {
      return {
        preview: renderEmailTemplate(
          customEmailHtml,
          customEmailCss,
          templateValues(emailImageFile?.dataUrl || remoteImage),
        ),
        send: renderEmailTemplate(
          customEmailHtml,
          customEmailCss,
          templateValues(
            emailImageFile ? `cid:${emailImageFile.cid}` : remoteImage,
          ),
        ),
      };
    }
    const paragraphs = result.email
      .split('\n\n')
      .map(
        (paragraph) =>
          `<p style="margin:0 0 18px;line-height:1.65;color:#202020">${escapeHtml(paragraph).replace(/\n/g, '<br>')}</p>`,
      );
    const safeProduct = escapeHtml(product);
    const safeOffer = escapeHtml(commission || 'Creator collaboration');
    const offerBlock = includeOffer
      ? `<div style="margin-top:26px;padding:18px 20px;background:#ff5400;border-radius:14px;font-weight:700;color:#111111">${safeProduct} · ${safeOffer}</div>`
      : '';
    const buttonLabel = escapeHtml(ctaText.trim());
    const buttonStyle =
      'display:inline-block;background:#111111;color:#ffffff;text-decoration:none;padding:13px 20px;border-radius:999px;font-weight:700';
    const ctaBlock = buttonLabel
      ? `<div style="margin-top:24px">${buttonUrl ? `<a href="${buttonUrl}" target="_blank" style="${buttonStyle}">${buttonLabel}</a>` : `<span style="${buttonStyle}">${buttonLabel}</span>`}</div>`
      : '';
    const build = (imageSource: string) => {
      const imageBlock = imageSource
        ? `<div style="margin:8px 0 24px;text-align:center"><img src="${imageSource}" alt="${escapeHtml(emailImageAlt)}" width="${emailImageWidth === 'full' ? '548' : '420'}" style="display:inline-block;width:${emailImageWidth === 'full' ? '100%' : '76%'};max-width:${emailImageWidth === 'full' ? '548px' : '420px'};height:auto;border:0;border-radius:16px;object-fit:cover" /></div>`
        : '';
      const body =
        emailImagePosition === 'after-intro' && imageBlock
          ? [paragraphs[0], imageBlock, ...paragraphs.slice(1)].join('')
          : paragraphs.join('');
      return `<div style="background:#f4f2ed;padding:32px;font-family:Arial,sans-serif"><div style="max-width:620px;margin:auto;background:#ffffff;border-radius:24px;padding:36px"><div style="font-weight:800;font-size:20px;margin-bottom:28px">Creator Outreach <span style="color:#ff5400">●</span></div>${emailImagePosition === 'top' ? imageBlock : ''}${body}${emailImagePosition === 'bottom' ? imageBlock : ''}${offerBlock}${ctaBlock}</div></div>`;
    };
    return {
      preview: build(emailImageFile?.dataUrl || remoteImage),
      send: build(emailImageFile ? `cid:${emailImageFile.cid}` : remoteImage),
    };
  }, [
    result,
    username,
    product,
    description,
    features,
    commission,
    emailImageUrl,
    emailImageFile,
    emailImageAlt,
    emailImagePosition,
    emailImageWidth,
    ctaText,
    ctaUrl,
    includeOffer,
    emailEditorMode,
    customEmailHtml,
    customEmailCss,
  ]);

  useEffect(() => {
    const restoreId = new URLSearchParams(window.location.search).get(
      'restore',
    );
    const historyItem = restoreId
      ? readOutreachHistory().find((item) => item.id === restoreId)
      : undefined;
    const saved = restoreId
      ? readArchivedWorkspace(historyItem?.workspaceId)
      : readCurrentWorkspace();

    if (saved) {
      setUsername(saved.username);
      setBio(saved.bio);
      setCollectionSource(saved.collectionSource);
      setCollectionInput(saved.collectionInput);
      setCollectedVideos(saved.collectedVideos);
      setSelectedVideoIds(saved.selectedVideoIds);
      setTranscripts(saved.transcripts.length ? saved.transcripts : ['']);
      setConversationAngles(saved.conversationAngles);
      setSelectedAngleId(saved.selectedAngleId);
      setAngleSignature(saved.angleSignature);
      setProductMatches(saved.productMatches);
      setSelectedProductId(saved.selectedProductId);
      setMatchSignature(saved.matchSignature);
      setProduct(saved.product);
      setDescription(saved.description);
      setFeatures(saved.features);
      setCommission(saved.commission);
      setFreeSample(saved.freeSample);
      const restoredResult = historyItem
        ? {
            score: historyItem.score,
            hook: historyItem.hook,
            source: saved.result?.source || 'Saved outreach history',
            evidence: saved.result?.evidence || '',
            reason: saved.result?.reason || '',
            dm: historyItem.dm,
            subject: historyItem.subject,
            email: historyItem.email,
            persona: saved.result?.persona || [],
          }
        : saved.result;
      setResult(restoredResult);
      generatedResultRef.current = restoredResult
        ? {
            ...restoredResult,
            dm: historyItem?.generatedDm || restoredResult.dm,
            subject: historyItem?.generatedSubject || restoredResult.subject,
            email: historyItem?.generatedEmail || restoredResult.email,
          }
        : null;
      setActiveRunId(historyItem?.runId || saved.activeRunId || null);
      setActiveHistoryId(historyItem?.id || saved.activeHistoryId);
      setActiveSentAt(historyItem?.sentAt || saved.activeSentAt);
      if (historyItem?.sentChannel) setOutreachChannel(historyItem.sentChannel);
      setCollectionMessage(
        restoreId
          ? 'Saved creator research restored. No API call was used.'
          : 'Your last creator research was restored from this device.',
      );
    } else if (historyItem) {
      setUsername(historyItem.username);
      setProduct(historyItem.product);
      const restoredResult: Result = {
        score: historyItem.score,
        hook: historyItem.hook,
        source: 'Saved outreach history',
        evidence: '',
        reason: '',
        dm: historyItem.dm,
        subject: historyItem.subject,
        email: historyItem.email,
        persona: [],
      };
      setResult(restoredResult);
      generatedResultRef.current = {
        ...restoredResult,
        dm: historyItem.generatedDm || restoredResult.dm,
        subject: historyItem.generatedSubject || restoredResult.subject,
        email: historyItem.generatedEmail || restoredResult.email,
      };
      setActiveRunId(historyItem.runId || null);
      setActiveHistoryId(historyItem.id);
      setActiveSentAt(historyItem.sentAt || null);
      if (historyItem.sentChannel) setOutreachChannel(historyItem.sentChannel);
      setCollectionMessage(
        'The saved message was restored. This older record does not include its original video cache.',
      );
    }
    setWorkspaceHydrated(true);
  }, []);

  useEffect(() => {
    if (!workspaceHydrated) return;
    writeCurrentWorkspace(currentWorkspaceSnapshot);
  }, [currentWorkspaceSnapshot, workspaceHydrated]);

  useEffect(() => {
    const anchors = [
      'generator',
      'creator-insights',
      'conversation-angles',
      'product-match',
      'results',
    ];
    let frame = 0;
    const updateVisibleStep = () => {
      window.cancelAnimationFrame(frame);
      frame = window.requestAnimationFrame(() => {
        const readingLine = window.scrollY + Math.min(180, innerHeight * 0.28);
        let nextAnchor = anchors[0];
        for (const anchor of anchors) {
          const element = document.getElementById(anchor);
          const elementTop = element
            ? element.getBoundingClientRect().top + window.scrollY
            : Number.POSITIVE_INFINITY;
          if (elementTop <= readingLine) nextAnchor = anchor;
        }
        setVisibleWorkflowAnchor((current) =>
          current === nextAnchor ? current : nextAnchor,
        );
      });
    };
    updateVisibleStep();
    window.addEventListener('scroll', updateVisibleStep, { passive: true });
    window.addEventListener('resize', updateVisibleStep);
    return () => {
      window.cancelAnimationFrame(frame);
      window.removeEventListener('scroll', updateVisibleStep);
      window.removeEventListener('resize', updateVisibleStep);
    };
  }, []);

  useEffect(() => {
    let nextProducts = defaultProducts;
    const savedProducts = window.localStorage.getItem(
      'creator-outreach-products',
    );
    if (savedProducts) {
      try {
        const parsed = JSON.parse(savedProducts) as Product[];
        if (Array.isArray(parsed) && parsed.length) nextProducts = parsed;
      } catch {
        /* Ignore invalid local data. */
      }
    }
    const selected = window.localStorage.getItem(
      'creator-outreach-selected-product',
    );
    if (selected) {
      try {
        const item = JSON.parse(selected) as Product;
        if (
          item.id &&
          !nextProducts.some((productItem) => productItem.id === item.id)
        )
          nextProducts = [item, ...nextProducts];
        window.localStorage.removeItem('creator-outreach-selected-product');
      } catch {
        /* Ignore invalid local data. */
      }
    }
    setProductLibrary(nextProducts);
    const refreshGmailStatus = async () => {
      try {
        const response = await fetch('/api/gmail/status');
        const status = (await response.json()) as {
          connected: boolean;
          configured: boolean;
        };
        setGmailStatus(status);
      } catch {
        /* Keep the last known Gmail state when the status request fails. */
      }
    };
    const handleOauthMessage = (event: MessageEvent) => {
      if (
        event.origin === window.location.origin &&
        event.data?.type === 'gmail-connected'
      ) {
        void refreshGmailStatus();
        setSendMessage('Gmail connected. Your work stayed right here.');
      }
    };
    void refreshGmailStatus();
    window.addEventListener('message', handleOauthMessage);
    return () => window.removeEventListener('message', handleOauthMessage);
  }, []);

  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const timer = window.setInterval(
      () => setActiveShowcase((current) => (current + 1) % 3),
      3800,
    );
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    const savedTemplate = window.localStorage.getItem(
      'creator-outreach-email-template',
    );
    if (!savedTemplate) return;
    try {
      const parsed = JSON.parse(savedTemplate) as {
        html?: string;
        css?: string;
      };
      if (parsed.html) setCustomEmailHtml(parsed.html);
      if (parsed.css) setCustomEmailCss(parsed.css);
    } catch {
      /* Ignore invalid local template data. */
    }
  }, []);

  const saveCustomTemplate = () => {
    window.localStorage.setItem(
      'creator-outreach-email-template',
      JSON.stringify({ html: customEmailHtml, css: customEmailCss }),
    );
    setTemplateMessage('Template saved on this device.');
    window.setTimeout(() => setTemplateMessage(''), 1800);
  };

  const resetCustomTemplate = () => {
    setCustomEmailHtml(starterEmailHtml);
    setCustomEmailCss(starterEmailCss);
    setTemplateMessage('Starter template restored.');
  };

  const findConversationAngles = () => {
    if (!allSelectedVideosAnalyzed) return;
    const structuredAngles = profileConversationAngles(
      structuredCreatorProfile,
    );
    const nextAngles = structuredAngles.length
      ? structuredAngles
      : buildConversationAngles(transcripts, bio);
    const customAngles = conversationAngles.filter((angle) =>
      angle.id.startsWith('custom-angle-'),
    );
    setConversationAngles([...customAngles, ...nextAngles]);
    if (!customAngles.some((angle) => angle.id === selectedAngleId)) {
      setSelectedAngleId('');
    }
    setAngleSignature(currentAngleSignature);
    setProductMatches([]);
    setSelectedProductId(null);
    setResult(null);
  };

  const resetAfterAngleChange = () => {
    setProductMatches([]);
    setSelectedProductId(null);
    setResult(null);
  };

  const addConversationAngle = () => {
    if (!filledVideos) return;
    const id = `custom-angle-${crypto.randomUUID()}`;
    setConversationAngles((current) => [
      ...(anglesFresh ? current : []),
      {
        id,
        title: '',
        dmLead: '',
        summary: '',
        whyItWorks: 'Added and reviewed by you.',
        sourceCount: 0,
      },
    ]);
    setSelectedAngleId('');
    setAngleSignature(currentAngleSignature);
    resetAfterAngleChange();
    window.setTimeout(
      () =>
        document
          .getElementById(`talking-point-${id}`)
          ?.scrollIntoView({ behavior: 'smooth', block: 'center' }),
      40,
    );
  };

  const updateConversationAngle = (
    id: string,
    field: 'title' | 'summary' | 'dmLead',
    value: string,
  ) => {
    setConversationAngles((current) =>
      current.map((angle) =>
        angle.id === id ? { ...angle, [field]: value } : angle,
      ),
    );
    resetAfterAngleChange();
  };

  const removeConversationAngle = (id: string) => {
    setConversationAngles((current) =>
      current.filter((angle) => angle.id !== id),
    );
    if (selectedAngleId === id) setSelectedAngleId('');
    resetAfterAngleChange();
  };

  const buildResult = (
    tone: 'default' | 'shorter' | 'casual' | 'soft' = 'default',
  ): Result => {
    const handle = cleanHandle(username);
    const name =
      handle
        .replace(/[^a-zA-Z]/g, '')
        .replace(/^(.)/, (letter) => letter.toUpperCase()) || 'there';
    const match = selectedMatch || productMatches[0];
    const feature =
      match?.matchedFeatures[0] || features[0] || 'everyday design';
    const angle = selectedAngle || {
      title: 'Their creator perspective',
      dmLead: 'the personal perspective you bring to your content',
      summary:
        'Acknowledge the creator’s point of view without repeating their transcript.',
      whyItWorks: 'Keeps the opener personal without forcing a quote.',
    };
    const creatorContext =
      `${creatorProfileText(structuredCreatorProfile)} ${bio} ${transcripts.join(' ')}`.toLowerCase();
    const audienceNeed =
      structuredCreatorProfile.pain_points[0] ||
      structuredCreatorProfile.preferences[0] ||
      'practical ideas that feel useful in real life';
    const topic = angle.title.replace(/[.!?]+$/, '').toLowerCase();
    const contentScene = /diy|craft|wood|tool|market/.test(creatorContext)
      ? 'outdoor projects, market days, or shoots where you bring tools and a laptop'
      : /food|drink|coffee|recipe|kitchen/.test(creatorContext)
        ? 'recipe shoots, market days, or creator outings where you carry ingredients and filming gear'
        : /beauty|makeup|skin|hair/.test(creatorContext)
          ? 'tutorial shoots, creator events, or days when you carry products and filming gear'
          : /fashion|outfit|style|wear/.test(creatorContext)
            ? 'styling videos, day trips, or creator event days'
            : /travel|camp|outdoor|road/.test(creatorContext)
              ? 'outdoor shoots, road trips, or days spent carrying creator essentials'
              : 'the real-life routines and content formats your audience already follows';
    const productFunctions = features.slice(0, 2).join(' and ').toLowerCase();
    const sampleOffer = freeSample
      ? 'We’d be happy to send one for you to try, with full creative control.'
      : 'We’d be happy to share the details, with full creative control.';
    const commissionLine = commission
      ? `If it feels relevant, the collaboration includes ${commission} affiliate commission.`
      : 'If it feels relevant, we’d be happy to share the collaboration details.';
    let dm = `I’ve been enjoying your content on ${topic}, especially ${angle.dmLead}. It feels like your audience values ${audienceNeed.toLowerCase()}. ${product}’s ${productFunctions} could fit naturally into ${contentScene}, giving you a useful way to feature it without changing the style of your content. ${sampleOffer} Would you be open to checking it out? ${commissionLine}`;
    let email = `Hi ${name},\n\nI’ve been enjoying your content on ${topic}, especially ${angle.dmLead}. It feels like your audience values ${audienceNeed.toLowerCase()}.\n\n${product}’s ${productFunctions} could fit naturally into ${contentScene}. That gives you a clear, useful product moment inside the formats your audience already watches, without forcing a separate sponsor-style segment.\n\n${sampleOffer} Would you be open to taking a look?\n\n${commissionLine}\n\n— Partnerships team`;
    if (tone === 'shorter') {
      dm = `I’ve been enjoying your ${topic} content, especially ${angle.dmLead}. Since your audience values ${audienceNeed.toLowerCase()}, ${product}’s ${feature.toLowerCase()} could fit naturally into ${contentScene}. Open to taking a look? ${commissionLine}`;
      email = `Hi ${name},\n\nI’ve been enjoying your ${topic} content, especially ${angle.dmLead}. Since your audience values ${audienceNeed.toLowerCase()}, ${product}’s ${productFunctions} could fit naturally into ${contentScene}.\n\nOpen to taking a look? ${commissionLine}\n\n— Partnerships team`;
    } else if (tone === 'casual') {
      dm = `Really enjoying your ${topic} content—especially ${angle.dmLead}. Your audience seems to value ${audienceNeed.toLowerCase()}, and ${product}’s ${feature.toLowerCase()} could work naturally for ${contentScene}. Want to take a look? ${commissionLine}`;
    } else if (tone === 'soft') {
      dm = `I’ve been enjoying your content on ${topic}, especially ${angle.dmLead}. ${product}’s ${productFunctions} may fit naturally into ${contentScene}. Happy to share more if it feels relevant—no pressure at all. ${commissionLine}`;
      email = `Hi ${name},\n\nI’ve been enjoying your content on ${topic}, especially ${angle.dmLead}. ${product}’s ${productFunctions} may fit naturally into ${contentScene}.\n\nHappy to share more if it feels relevant—no pressure at all. ${commissionLine}\n\n— Partnerships team`;
    }
    return {
      score: Math.max(1, Math.round((match?.score || 70) / 10)),
      hook: angle.title,
      source: 'Confirmed conversation angle',
      evidence: angle.summary,
      reason:
        match?.reason ||
        `${feature} creates a natural product bridge from the creator’s recent content.`,
      dm,
      subject: `A creator-first collab idea — ${product} × @${handle}`,
      email,
      persona: /fashion|outfit|fit|style|wear/i.test(
        `${bio} ${transcripts.join(' ')}`,
      )
        ? ['Fashion', 'Casual', 'Creator-led']
        : ['Lifestyle', 'Authentic', 'Creator-led'],
    };
  };

  const chooseProduct = (match: ProductMatch) => {
    if (match.score < minimumProductMatchScore) return;
    setSelectedProductId(match.product.id);
    setProduct(match.product.name);
    setDescription(match.product.description);
    setFeatures(match.product.features);
    setCommission(match.product.commission);
    setFreeSample(match.product.freeSample);
    setResult(null);
    setActiveHistoryId(null);
    setActiveSentAt(null);
  };

  const matchProducts = () => {
    if (!filledVideos || !productLibrary.length || !selectedAngle) return;
    setMatchingProducts(true);
    window.setTimeout(() => {
      const matchingSignals = hasStructuredProfile
        ? [
            creatorProfileText(structuredCreatorProfile),
            selectedAngle.summary,
            selectedAngle.dmLead,
          ]
        : [...transcripts, selectedAngle.summary, selectedAngle.dmLead];
      const ranked = rankProducts(
        productLibrary,
        matchingSignals,
        bio,
        structuredCreatorProfile.negative_constraints,
      );
      setProductMatches(ranked);
      setMatchSignature(creatorSignature);
      if (ranked[0]?.score >= minimumProductMatchScore) {
        chooseProduct(ranked[0]);
        trackEvent('product_matched', {
          run_id: activeRunId,
          creator_id_hash: creatorIdHash(username || collectionInput),
          product_id: ranked[0].product.id,
          match_score: ranked[0].score,
        });
      } else {
        setSelectedProductId(null);
        setResult(null);
        setActiveHistoryId(null);
        setActiveSentAt(null);
        trackEvent('analysis_failed', {
          run_id: activeRunId,
          stage: 'product_match',
          error_code: 'NO_ELIGIBLE_PRODUCT',
        });
      }
      setMatchingProducts(false);
      setCelebration('match');
      window.setTimeout(() => setCelebration(null), 1800);
    }, 550);
  };

  const generate = (
    tone: 'default' | 'shorter' | 'casual' | 'soft' = 'default',
  ) => {
    if (!selectedMatch || selectedMatch.score < minimumProductMatchScore)
      return;
    const generationStartedAt = performance.now();
    setGenerating(true);
    window.setTimeout(() => {
      const nextResult = buildResult(tone);
      const historyId = crypto.randomUUID();
      const nextWorkspace: CreatorWorkspaceSnapshot = {
        ...currentWorkspaceSnapshot,
        savedAt: new Date().toISOString(),
        result: nextResult,
        activeHistoryId: historyId,
        activeSentAt: null,
      };
      const workspaceId = archiveCreatorWorkspace(nextWorkspace);
      writeCurrentWorkspace(nextWorkspace);
      setResult(nextResult);
      generatedResultRef.current = nextResult;
      trackedEditedMessageIdsRef.current.delete(historyId);
      setResultEdited(false);
      setActiveHistoryId(historyId);
      setActiveSentAt(null);
      setOutreachChannel('TikTok DM');
      setGenerating(false);
      setCelebration('message');
      trackEvent('message_generated', {
        run_id: activeRunId,
        message_id: historyId,
        creator_id_hash: creatorIdHash(username || collectionInput),
        product_id: selectedMatch.product.id,
        duration_ms: Math.round(performance.now() - generationStartedAt),
      });
      window.setTimeout(() => setCelebration(null), 1800);
      writeOutreachHistory(
        [
          {
            id: historyId,
            runId: activeRunId || undefined,
            productId: selectedMatch.product.id,
            createdAt: new Date().toISOString(),
            username: cleanHandle(username),
            product,
            workspaceId: workspaceId || undefined,
            generatedDm: nextResult.dm,
            generatedSubject: nextResult.subject,
            generatedEmail: nextResult.email,
            ...nextResult,
          },
          ...readOutreachHistory(),
        ].slice(0, 50),
      );
      window.setTimeout(
        () =>
          document
            .querySelector('#results')
            ?.scrollIntoView({ behavior: 'smooth' }),
        40,
      );
    }, 650);
  };

  const updateResultCopy = (
    field: 'dm' | 'subject' | 'email',
    value: string,
  ) => {
    setResultEdited(true);
    setResult((current) =>
      current ? { ...current, [field]: value } : current,
    );
    if (activeHistoryId) {
      updateOutreachHistoryItem(activeHistoryId, { [field]: value });
    }
  };

  const rewriteCurrentDm = (tone: 'shorter' | 'casual' | 'soft') => {
    if (!result) return;
    const rewrittenDm = buildResult(tone).dm;
    updateResultCopy('dm', rewrittenDm);
    setCopied(null);
  };

  const trackMessageEditIfNeeded = () => {
    if (!result || !activeHistoryId) return;
    if (trackedEditedMessageIdsRef.current.has(activeHistoryId)) return;
    const generated = generatedResultRef.current;
    if (!generated) return;
    const editRatio = normalizedEditRatio(
      `${generated.dm}\n${generated.subject}\n${generated.email}`,
      `${result.dm}\n${result.subject}\n${result.email}`,
    );
    if (editRatio <= 0) return;
    trackEvent('message_edited', {
      run_id: activeRunId,
      message_id: activeHistoryId,
      product_id: selectedProductId,
      edit_ratio: editRatio,
    });
    trackedEditedMessageIdsRef.current.add(activeHistoryId);
  };

  const markCurrentAsSent = (
    channel: OutreachChannel = outreachChannel,
    sendMethod: 'manual_mark' | 'gmail' = 'manual_mark',
  ) => {
    if (!result || !activeHistoryId || activeSentAt) return;
    const sentAt = new Date().toISOString();
    updateOutreachHistoryItem(activeHistoryId, {
      score: result.score,
      hook: result.hook,
      dm: result.dm,
      subject: result.subject,
      email: result.email,
      sentAt,
      sentChannel: channel,
      replyStatus: 'pending',
      replyRecordedAt: undefined,
    });
    setActiveSentAt(sentAt);
    setOutreachChannel(channel);
    trackMessageEditIfNeeded();
    trackEvent('outreach_sent', {
      run_id: activeRunId,
      message_id: activeHistoryId,
      creator_id_hash: creatorIdHash(username || collectionInput),
      product_id: selectedProductId,
      channel: channel.toLowerCase().replaceAll(' ', '_'),
      send_method: sendMethod,
    });
    setSendMessage(
      `Marked as sent via ${channel}. Reply tracking is ready in History.`,
    );
  };

  const copyText = async (key: string, value: string) => {
    await navigator.clipboard.writeText(value);
    trackMessageEditIfNeeded();
    trackEvent('message_copied', {
      run_id: activeRunId,
      message_id: activeHistoryId,
      creator_id_hash: creatorIdHash(username || collectionInput),
      message_type: key,
    });
    setCopied(key);
    window.setTimeout(() => setCopied(null), 1400);
  };

  const toggleVideoSelection = (video: CollectedVideo) => {
    if (!videoScript(video)) return;
    const next = selectedVideoIds.includes(video.id)
      ? selectedVideoIds.filter((id) => id !== video.id)
      : [...selectedVideoIds, video.id].slice(0, 8);
    setSelectedVideoIds(next);
    const nextScripts = next
      .map((id) =>
        videoScript(
          collectedVideos.find((candidate) => candidate.id === id) || video,
        ),
      )
      .filter(Boolean);
    setTranscripts(nextScripts.length ? nextScripts : ['']);
    setActiveVideo(0);
  };

  const pollTranscript = async (video: CollectedVideo) => {
    if (!video.jobId) return;
    setCheckingTranscriptIds((current) =>
      current.includes(video.id) ? current : [...current, video.id],
    );
    try {
      for (let attempt = 0; attempt < 14; attempt += 1) {
        await new Promise((resolve) => window.setTimeout(resolve, 1500));
        const response = await fetch('/api/transcript-status', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...demoCredentialHeaders(),
          },
          body: JSON.stringify({ jobId: video.jobId }),
        });
        const data = (await response.json()) as {
          status?: 'ready' | 'processing' | 'failed';
          transcript?: string;
        };
        if (!response.ok) {
          trackEvent('analysis_failed', {
            run_id: activeRunId,
            stage: 'transcript',
            error_code: 'TRANSCRIPT_STATUS_FAILED',
          });
          return;
        }
        if (data.status === 'processing') continue;
        if (data.status === 'ready' && data.transcript) {
          const readyVideo: CollectedVideo = {
            ...video,
            transcript: data.transcript,
            spokenTranscriptProvider: 'supadata',
            spokenTranscriptStatus: 'ready',
            status: 'ready',
            ...transcriptQuality(video, data.transcript),
          };
          setCollectedVideos((current) =>
            current.map((item) =>
              item.id === video.id ? { ...item, ...readyVideo } : item,
            ),
          );
          if (selectedVideoIds.includes(video.id)) {
            const selectedIndex = selectedVideoIds.indexOf(video.id);
            setTranscripts((current) =>
              current.map((script, index) =>
                index === selectedIndex ? videoScript(readyVideo) : script,
              ),
            );
          }
          setCollectionMessage(
            'The script is ready. Select “Use script” to add it to the workspace.',
          );
        } else {
          setCollectedVideos((current) =>
            current.map((item) =>
              item.id === video.id
                ? {
                    ...item,
                    status: videoScript(item) ? 'ready' : 'failed',
                    spokenTranscriptStatus: 'not_found',
                    jobId: undefined,
                  }
                : item,
            ),
          );
        }
        return;
      }
    } catch (error) {
      trackEvent('analysis_failed', {
        run_id: activeRunId,
        stage: 'transcript',
        error_code: analyticsErrorCode(error, 'TRANSCRIPT_STATUS_FAILED'),
      });
      setCollectionMessage(
        'The script status could not be checked. Try “Check transcript” again.',
      );
    } finally {
      setCheckingTranscriptIds((current) =>
        current.filter((id) => id !== video.id),
      );
    }
  };

  const analyzeVisualText = async (
    video: CollectedVideo,
    file?: File,
    background = false,
  ) => {
    setAnalyzingVideoIds((current) =>
      current.includes(video.id) ? current : [...current, video.id],
    );
    const finish = () =>
      setAnalyzingVideoIds((current) =>
        current.filter((id) => id !== video.id),
      );
    if (!background) {
      setCollectionMessage(
        file
          ? `Uploading ${file.name} and reading its visible text…`
          : 'Reading the video script and visible text with Gemini…',
      );
    }
    setCollectedVideos((current) =>
      current.map((item) =>
        item.id === video.id
          ? { ...item, visualStatus: 'processing', visualError: undefined }
          : item,
      ),
    );
    try {
      const requestBody = file
        ? (() => {
            const formData = new FormData();
            formData.append('video', file);
            return formData;
          })()
        : JSON.stringify({ url: video.url });
      const response = await fetch('/api/analyze-video', {
        method: 'POST',
        headers: {
          ...demoCredentialHeaders(),
          ...(file ? {} : { 'Content-Type': 'application/json' }),
        },
        body: requestBody,
      });
      const data = (await response.json()) as {
        error?: string;
        status?: 'ready' | 'processing' | 'failed';
        spokenTranscript?: string;
        spokenTranscriptProvider?: 'gemini' | 'supadata' | 'none';
        spokenTranscriptStatus?:
          | 'ready'
          | 'processing'
          | 'not_found'
          | 'failed';
        transcriptJobId?: string;
        geminiStatus?: 'ready' | 'ready_no_speech' | 'failed';
        geminiError?: string;
        visualText?: string[];
        creatorSignals?: string[];
        contentType?: string;
        qualityScore?: number;
        isDanceOnly?: boolean;
        qualityReason?: string;
      };
      if (!response.ok || data.status !== 'ready') {
        throw new Error(data.error || 'Gemini screen-text analysis failed.');
      }

      const score = data.qualityScore ?? video.qualityScore;
      const spokenTranscript =
        data.spokenTranscript?.trim() || video.transcript || '';
      const updated: CollectedVideo = {
        ...video,
        transcript: spokenTranscript,
        spokenTranscriptProvider: data.spokenTranscriptProvider || 'none',
        spokenTranscriptStatus:
          data.spokenTranscriptStatus ||
          (spokenTranscript ? 'ready' : 'not_found'),
        geminiStatus: data.geminiStatus || 'ready',
        status: 'ready',
        jobId: data.transcriptJobId,
        visualJobId: undefined,
        visualStatus: 'ready',
        visualError: undefined,
        visualText: data.visualText || [],
        creatorSignals: data.creatorSignals || [],
        contentType: data.contentType || '',
        qualityScore: score,
        qualityLabel:
          data.isDanceOnly || score < 38
            ? 'skip'
            : score >= 65
              ? 'strong'
              : 'review',
        qualityReason: data.qualityReason || video.qualityReason,
      };
      setCollectedVideos((current) =>
        current.map((item) =>
          item.id === video.id ? { ...item, ...updated } : item,
        ),
      );
      if (selectedVideoIds.includes(video.id)) {
        const index = selectedVideoIds.indexOf(video.id);
        setTranscripts((current) =>
          current.map((script, scriptIndex) =>
            scriptIndex === index ? videoScript(updated) : script,
          ),
        );
      }
      if (data.transcriptJobId) {
        void pollTranscript(updated);
      }
      if (!background) {
        setCollectionMessage(
          spokenTranscript
            ? `Spoken transcript ready via ${data.spokenTranscriptProvider === 'supadata' ? 'Supadata fallback' : 'Gemini'}, with Gemini screen text preserved.`
            : data.transcriptJobId
              ? 'Gemini read the visuals. Supadata is still preparing the spoken transcript.'
              : data.visualText?.length
                ? 'Gemini found screen text but no reliable speech. Supadata found no public transcript.'
                : 'Gemini finished reviewing the video. No meaningful speech or visible text was found.',
        );
      }
      return true;
    } catch (error) {
      const failureMessage =
        error instanceof Error ? error.message : 'Screen-text analysis failed.';
      trackEvent('analysis_failed', {
        run_id: activeRunId,
        stage: 'screen_text',
        error_code: analyticsErrorCode(error, 'SCREEN_TEXT_FAILED'),
      });
      setCollectedVideos(visualFailureUpdater(video.id, failureMessage));
      if (!background) setCollectionMessage(failureMessage);
      return false;
    } finally {
      finish();
    }
  };

  const analyzeVideoStructure = async (video: CollectedVideo) => {
    setStructuringVideoIds((current) =>
      current.includes(video.id) ? current : [...current, video.id],
    );
    const finish = () =>
      setStructuringVideoIds((current) =>
        current.filter((id) => id !== video.id),
      );
    try {
      setCollectedVideos((current) =>
        current.map((item) =>
          item.id === video.id
            ? { ...item, structureStatus: 'processing' }
            : item,
        ),
      );
      const response = await fetch('/api/structure-video', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...demoCredentialHeaders(),
        },
        body: JSON.stringify({
          title: video.title,
          description: video.description,
          transcript: video.transcript,
          visualText: video.visualText || [],
        }),
      });
      const data = (await response.json()) as {
        error?: string;
        status?: 'ready' | 'failed';
        profile?: CreatorProfile;
      };
      if (!response.ok || data.status !== 'ready') {
        throw new Error(data.error || 'Structured analysis failed.');
      }

      const profile = normalizeCreatorProfile(data.profile);
      setCollectedVideos((current) =>
        current.map((item) =>
          item.id === video.id
            ? {
                ...item,
                structureJobId: undefined,
                structureStatus: 'ready',
                structuredProfile: profile,
              }
            : item,
        ),
      );
      setCollectionMessage(
        'Gemini structured the existing script and screen text without changing either source.',
      );
      return true;
    } catch (error) {
      trackEvent('analysis_failed', {
        run_id: activeRunId,
        stage: 'creator_insight',
        error_code: analyticsErrorCode(error, 'CREATOR_INSIGHT_FAILED'),
      });
      setCollectedVideos((current) =>
        current.map((item) =>
          item.id === video.id ? { ...item, structureStatus: 'failed' } : item,
        ),
      );
      setCollectionMessage(
        error instanceof Error ? error.message : 'Structured analysis failed.',
      );
      return false;
    } finally {
      finish();
    }
  };

  const analyzeSelectedStructures = async () => {
    const startedAt = performance.now();
    const selectedVideos = selectedVideoIds
      .map((id) => collectedVideos.find((video) => video.id === id))
      .filter((video): video is CollectedVideo => Boolean(video));
    const outcomes = await Promise.all(
      selectedVideos.map((video) => analyzeVideoStructure(video)),
    );
    const successful = outcomes.filter(Boolean).length;
    if (successful > 0) {
      trackEvent('creator_insight_generated', {
        run_id: activeRunId,
        creator_id_hash: creatorIdHash(username || collectionInput),
        duration_ms: Math.round(performance.now() - startedAt),
        video_count: successful,
      });
    }
  };

  const collectCreatorContent = async () => {
    if (!collectionInput.trim()) return;
    const runId = crypto.randomUUID();
    const collectionStartedAt = performance.now();
    const creatorHash = creatorIdHash(collectionInput);
    let transcriptEventSent = false;
    const trackTranscriptCompleted = (videoCount: number) => {
      if (transcriptEventSent || videoCount < 1) return;
      transcriptEventSent = true;
      trackEvent('transcript_completed', {
        run_id: runId,
        creator_id_hash: creatorHash,
        source: collectionSource,
        duration_ms: Math.round(performance.now() - collectionStartedAt),
        video_count: videoCount,
      });
    };
    setActiveRunId(runId);
    trackEvent('creator_url_submitted', {
      run_id: runId,
      creator_id_hash: creatorHash,
      source: collectionSource,
    });
    setCollecting(true);
    setCollectionMessage(
      collectionSource === 'youtube-shorts'
        ? isYouTubeVideoInput(collectionInput)
          ? 'Reading this Short with Gemini…'
          : 'Finding the creator’s latest 7 Shorts…'
        : 'Reading public TikTok videos…',
    );
    try {
      trackEvent('analysis_started', {
        run_id: runId,
        creator_id_hash: creatorHash,
        source: collectionSource,
      });
      const response = await fetch('/api/collect', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...demoCredentialHeaders(),
        },
        body: JSON.stringify({
          source: collectionSource,
          input: collectionInput,
          maxVideos: collectionSource === 'youtube-shorts' ? 7 : 8,
        }),
      });
      const data = (await response.json()) as {
        error?: string;
        message?: string;
        channel?: { title?: string };
        videos?: CollectedVideo[];
      };
      if (!response.ok)
        throw new Error(data.message || data.error || 'Collection failed.');
      const videos = (data.videos || []).slice(0, 8);
      const ready = videos
        .filter((video) => video.status === 'ready' && videoScript(video))
        .filter((video) => video.qualityLabel !== 'skip');
      trackTranscriptCompleted(ready.length);
      const mergedMap = new Map(
        (collectionSource === 'tiktok' ? collectedVideos : []).map(
          (video) => [video.id, video] as const,
        ),
      );
      videos.forEach((video) => {
        const previous = mergedMap.get(video.id);
        mergedMap.set(video.id, {
          ...previous,
          ...video,
          visualText: previous?.visualText ?? video.visualText,
          creatorSignals: previous?.creatorSignals ?? video.creatorSignals,
          contentType: previous?.contentType ?? video.contentType,
          structuredProfile:
            previous?.structuredProfile ?? video.structuredProfile,
          visualStatus: previous?.visualStatus ?? video.visualStatus,
          visualJobId: previous?.visualJobId ?? video.visualJobId,
          visualError: previous?.visualError ?? video.visualError,
          structureStatus: previous?.structureStatus ?? video.structureStatus,
          structureJobId: previous?.structureJobId ?? video.structureJobId,
        });
      });
      const merged = Array.from(mergedMap.values()).slice(-8);
      const availableIds = new Set(merged.map((video) => video.id));
      const nextSelected = selectedVideoIds
        .filter((id) => availableIds.has(id))
        .filter((id, index, ids) => ids.indexOf(id) === index)
        .slice(0, 8);
      setCollectedVideos(merged);
      setSelectedVideoIds(nextSelected);
      const nextTranscripts = nextSelected
        .map((id) => videoScript(merged.find((video) => video.id === id)!))
        .filter(Boolean);
      setTranscripts(nextTranscripts.length ? nextTranscripts : ['']);
      setActiveVideo(0);
      setUsername(data.channel?.title || collectionInput);
      videos
        .filter((video) => video.status === 'processing' && video.jobId)
        .forEach((video) => void pollTranscript(video));
      if (!videos.length) {
        setCollectionMessage(
          data.message || 'No matching recent videos were found.',
        );
      } else if (collectionSource === 'youtube-shorts') {
        const pending = merged.filter(
          (video) => video.platform === 'youtube-shorts' && !videoScript(video),
        );
        setCollectionMessage(
          `${videos.length} Shorts found. Reading scripts now — results will appear one by one.`,
        );
        void (async () => {
          let completed = 0;
          let successful = 0;
          for (let index = 0; index < pending.length; index += 2) {
            const batch = pending.slice(index, index + 2);
            const outcomes = await Promise.all(
              batch.map((video) => analyzeVisualText(video, undefined, true)),
            );
            completed += batch.length;
            successful += outcomes.filter(Boolean).length;
            trackTranscriptCompleted(successful);
            setCollectionMessage(
              `Reading Shorts: ${completed}/${pending.length} finished · ${successful} usable so far.`,
            );
          }
          setCollectionMessage(
            successful
              ? `${successful}/${pending.length} Shorts produced usable scripts or screen text. You can select them now.`
              : 'The videos were found, but Gemini could not extract usable speech or screen text. Review the errors on each card.',
          );
        })();
      } else if (!ready.length) {
        setCollectionMessage(
          'Videos found. Scripts are still loading; select them only after they become ready.',
        );
      } else {
        setCollectionMessage(
          `${ready.length} TikTok scripts are ready. Choose “Use script” on the ones you want.`,
        );
      }
    } catch (error) {
      trackEvent('analysis_failed', {
        run_id: runId,
        stage: 'collection',
        error_code: analyticsErrorCode(error, 'COLLECTION_FAILED'),
      });
      setCollectionMessage(
        error instanceof Error ? error.message : 'Collection failed.',
      );
    } finally {
      setCollecting(false);
    }
  };

  const uploadEmailImage = (file?: File) => {
    if (!file) return;
    setEmailImageError('');
    if (!/^image\/(png|jpeg|gif|webp)$/.test(file.type)) {
      setEmailImageError('Use a PNG, JPG, GIF or WebP image.');
      return;
    }
    if (file.size > 3 * 1024 * 1024) {
      setEmailImageError('Image must be smaller than 3 MB.');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = typeof reader.result === 'string' ? reader.result : '';
      const data = dataUrl.split(',')[1] || '';
      if (!data) {
        setEmailImageError('Could not read this image.');
        return;
      }
      setEmailImageFile({
        dataUrl,
        data,
        mimeType: file.type,
        filename: file.name.replace(/[\r\n"]/g, '_'),
        cid: 'outreach-product-image',
      });
      setEmailImageUrl('');
      setEmailImageAlt(file.name.replace(/\.[^.]+$/, '') || 'Product image');
      setShowHtml(true);
    };
    reader.onerror = () => setEmailImageError('Could not read this image.');
    reader.readAsDataURL(file);
  };

  const sendEmail = async () => {
    if (!result || !emailRecipient.trim()) return;
    setSending(true);
    setSendMessage('');
    try {
      const response = await fetch('/api/gmail/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: emailRecipient.trim(),
          subject: result.subject.trim(),
          html: emailHtml.send,
          text: result.email,
          inlineImage: emailImageFile
            ? {
                data: emailImageFile.data,
                mimeType: emailImageFile.mimeType,
                filename: emailImageFile.filename,
                cid: emailImageFile.cid,
              }
            : undefined,
        }),
      });
      const data = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(data.error || 'Send failed.');
      markCurrentAsSent('Email', 'gmail');
      setSendMessage(
        'Email sent successfully. Reply tracking is ready in History.',
      );
    } catch (error) {
      setSendMessage(error instanceof Error ? error.message : 'Send failed.');
    } finally {
      setSending(false);
    }
  };

  const connectGmail = () => {
    setSendMessage('');
    const popup = window.open(
      '/api/gmail/connect',
      'gmail-oauth',
      'popup=yes,width=540,height=720',
    );
    if (!popup)
      setSendMessage(
        'Pop-up blocked. Allow pop-ups for this site and try again.',
      );
  };

  const customConversationAngles = conversationAngles.filter((angle) =>
    angle.id.startsWith('custom-angle-'),
  );
  const suggestedConversationAngles = conversationAngles.filter(
    (angle) => !angle.id.startsWith('custom-angle-'),
  );
  const renderConversationAngleCard = (angle: ConversationAngle) => {
    const selected = anglesFresh && selectedAngleId === angle.id;
    const complete = Boolean(angle.title.trim() && angle.dmLead.trim());
    return (
      <article
        id={`talking-point-${angle.id}`}
        key={angle.id}
        className={`scroll-mt-28 rounded-[18px] border p-4 text-[#27322d] transition ${selected ? 'border-[#ff5400] bg-[#ffb1a8] shadow-[0_12px_30px_rgba(255,84,0,.14)]' : 'border-black/10 bg-white'} ${anglesFresh ? '' : 'opacity-55'}`}
      >
        <div className="flex items-start justify-between gap-3">
          <Badge
            className={`rounded-full ${angle.id.startsWith('custom-angle-') ? 'bg-[#27322d] text-white' : 'bg-[#ddd0ff] text-[#27322d]'}`}
          >
            {angle.id.startsWith('custom-angle-') ? 'Your point' : 'Suggested'}
          </Badge>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            aria-label="Delete talking point"
            onClick={() => removeConversationAngle(angle.id)}
            className="size-8 rounded-full text-[#27322d]/55 hover:bg-black/5 hover:text-[#27322d]"
          >
            <Trash2 className="size-4" />
          </Button>
        </div>

        <label className="mt-3 block text-sm font-bold">
          Topic label
          <Input
            value={angle.title}
            disabled={!anglesFresh}
            onChange={(event) =>
              updateConversationAngle(angle.id, 'title', event.target.value)
            }
            placeholder="e.g. Their clear teaching style"
            className="mt-1.5 h-10 border-black/10 bg-[#f4f5ef] text-[#27322d] placeholder:text-[#27322d]/35 focus-visible:border-[#ff5400] focus-visible:ring-[#ff5400]/20"
          />
        </label>
        <label className="mt-3 block text-sm font-bold">
          What you noticed
          <Textarea
            value={angle.summary}
            disabled={!anglesFresh}
            onChange={(event) =>
              updateConversationAngle(angle.id, 'summary', event.target.value)
            }
            placeholder="Write the detail or insight you want to reference."
            className="mt-1.5 min-h-[78px] resize-y border-black/10 bg-[#f4f5ef] text-[#27322d] placeholder:text-[#27322d]/35 focus-visible:border-[#ff5400] focus-visible:ring-[#ff5400]/20"
          />
        </label>
        <label className="mt-3 block text-sm font-bold">
          Natural DM wording
          <Textarea
            value={angle.dmLead}
            disabled={!anglesFresh}
            onChange={(event) =>
              updateConversationAngle(angle.id, 'dmLead', event.target.value)
            }
            placeholder="e.g. how clearly you make a technical process easy to follow"
            className="mt-1.5 min-h-[78px] resize-y border-black/10 bg-[#f4f5ef] text-[#27322d] placeholder:text-[#27322d]/35 focus-visible:border-[#ff5400] focus-visible:ring-[#ff5400]/20"
          />
        </label>
        <Button
          type="button"
          aria-pressed={selected}
          disabled={!anglesFresh || !complete}
          onClick={() => {
            if (selectedAngleId !== angle.id) {
              trackEvent('conversation_angle_selected', {
                run_id: activeRunId,
                angle_source: angle.id.startsWith('custom-angle-')
                  ? 'custom'
                  : 'system',
              });
            }
            setSelectedAngleId(angle.id);
            resetAfterAngleChange();
          }}
          className={`mt-4 w-full rounded-full font-black ${selected ? 'bg-[#27322d] text-white hover:bg-[#27322d]' : 'bg-[#ff5400] text-black hover:bg-[#ff6a1a]'}`}
        >
          {selected ? (
            <>
              <Check /> Confirmed
            </>
          ) : (
            'Use this talking point'
          )}
        </Button>
      </article>
    );
  };

  return (
    <main className="app-shell min-h-screen bg-background text-foreground">
      <BrandNav active="generator" />
      <DemoModeBanner />
      <aside
        aria-label="Creator outreach workflow"
        className={`fixed right-3 top-24 z-40 hidden max-h-[calc(100vh-7rem)] w-[210px] overflow-y-auto rounded-[20px] border border-black/10 bg-white/94 p-3 shadow-[0_16px_48px_rgba(39,50,45,.14)] backdrop-blur-xl transition-transform duration-300 xl:block ${workflowOpen ? 'translate-x-0' : 'translate-x-[158px]'}`}
      >
        <button
          type="button"
          aria-label={workflowOpen ? 'Collapse workflow' : 'Open workflow'}
          aria-expanded={workflowOpen}
          onClick={() => setWorkflowOpen((current) => !current)}
          className="absolute left-1.5 top-2.5 z-20 grid size-9 place-items-center rounded-full border border-black/10 bg-[#27322d] text-white shadow-md transition hover:bg-[#ff7768] hover:text-[#27322d]"
        >
          {workflowOpen ? (
            <PanelRightClose className="size-4" />
          ) : (
            <PanelRightOpen className="size-4" />
          )}
        </button>
        <div className="mb-3 flex items-center justify-between gap-3">
          <div className="min-w-0 pl-11">
            <p className="text-[9px] font-black uppercase tracking-[.13em] text-black/40">
              Your workflow
            </p>
            <p className="mt-0.5 text-xs font-black text-[#27322d]">
              Step {currentWorkflowStep + 1} of {workflowSteps.length}
            </p>
          </div>
        </div>
        <ol className="space-y-0.5">
          {workflowSteps.map((step, index) => {
            const current = index === visibleWorkflowStep;
            return (
              <li key={step.label} className="relative">
                {index < workflowSteps.length - 1 ? (
                  <span
                    aria-hidden="true"
                    className={`absolute left-[13px] top-7 h-[18px] w-px ${step.complete ? 'bg-[#71a77c]' : 'bg-black/10'}`}
                  />
                ) : null}
                <a
                  href={step.href}
                  aria-current={current ? 'step' : undefined}
                  onClick={(event) => {
                    if (!step.href.startsWith('#')) return;
                    event.preventDefault();
                    const anchor = step.href.slice(1);
                    const target = document.getElementById(anchor);
                    if (!target) return;
                    const top =
                      target.getBoundingClientRect().top + window.scrollY - 92;
                    window.scrollTo({ top, behavior: 'smooth' });
                    setVisibleWorkflowAnchor(anchor);
                  }}
                  className={`flex min-h-8 items-center gap-2 rounded-lg px-1 py-1 text-[10px] font-bold transition ${current ? 'bg-[#eef5eb] text-[#27322d] ring-1 ring-[#71a77c]/25' : 'text-[#27322d]/55 hover:bg-black/[.035] hover:text-[#27322d]'}`}
                >
                  <span
                    className={`relative z-10 grid size-6 shrink-0 place-items-center rounded-full border text-[9px] font-black ${step.complete ? 'border-[#71a77c] bg-[#dff3df] text-[#32633c]' : current ? 'border-[#ff7768] bg-[#ffe0db] text-[#9e392f]' : 'border-black/10 bg-white text-black/35'}`}
                  >
                    {step.complete ? <Check className="size-3" /> : index + 1}
                  </span>
                  <span className="leading-4">{step.label}</span>
                </a>
              </li>
            );
          })}
        </ol>
      </aside>
      {celebration && (
        <output className="celebration-toast" aria-live="polite">
          <span aria-hidden="true">
            {celebration === 'match' ? '🎯' : '💌'}
          </span>
          <div>
            <strong>
              {celebration === 'match'
                ? 'Best match found!'
                : 'Personalized message ready!'}
            </strong>
            <small>
              {celebration === 'match'
                ? 'Review the ranked products below.'
                : 'Edit, preview, or send when it feels right.'}
            </small>
          </div>
          <span aria-hidden="true">✨</span>
        </output>
      )}

      <section className="mx-auto max-w-[1440px] px-4 pb-8 pt-6 sm:px-5 lg:px-10 lg:pt-10">
        <div className="hero-studio">
          <div className="relative z-10 max-w-[670px]">
            <div className="mb-6 flex flex-wrap items-center gap-2">
              <Badge className="rounded-full bg-[#27322d] px-3 py-1.5 text-[#eef5eb]">
                TIKTOK SHOP · CREATOR BD
              </Badge>
              <span className="micro-note">
                01 SIGNALS · 02 MATCH · 03 OUTREACH
              </span>
            </div>
            <h1 className="hero-title">
              Find the fit.
              <br />
              <span>Write the pitch.</span>
            </h1>
            <p className="mt-6 max-w-[590px] text-[17px] leading-7 text-[#27322d]/65">
              Collect recent scripts, match the right product, and build a
              send-ready email—with every creator detail traceable.
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-3">
              <Button
                onClick={() =>
                  document
                    .querySelector('#generator')
                    ?.scrollIntoView({ behavior: 'smooth' })
                }
                className="h-12 rounded-full bg-[#27322d] px-6 font-bold text-white hover:bg-[#39463f]"
              >
                Start creator scan <ArrowDown className="ml-1 size-4" />
              </Button>
              <span className="micro-note">
                Session-only API keys · editable at every step
              </span>
            </div>
          </div>
          <div className="showcase-wrap" aria-label="Product workflow preview">
            <div className="showcase-live" aria-live="polite">
              <span>
                <i /> LIVE WORKFLOW
              </span>
              <strong>
                {
                  [
                    'Reading creator videos',
                    'Ranking the product catalog',
                    'Building the email preview',
                  ][activeShowcase]
                }
              </strong>
            </div>
            <span className="float-emoji emoji-one" aria-hidden="true">
              ✨
            </span>
            <span className="float-emoji emoji-two" aria-hidden="true">
              🫶
            </span>
            <span className="float-emoji emoji-three" aria-hidden="true">
              💌
            </span>
            <div className="showcase-stage">
              <article
                className={`showcase-phone phone-sage ${activeShowcase === 0 ? 'is-active' : ''}`}
              >
                <div className="phone-bar">
                  <span>9:41</span>
                  <span>● ●</span>
                </div>
                <div className="phone-progress">
                  <i style={{ width: '33%' }} />
                </div>
                <p className="screen-kicker">CREATOR SCAN · 01</p>
                <div className="flex items-center gap-3">
                  <img
                    src={creatorImages[1]}
                    alt="Creator profile"
                    className="size-14 rounded-[18px] object-cover"
                  />
                  <div>
                    <h3>@rainydayrachel</h3>
                    <p className="screen-note">3 scripts ready · lifestyle</p>
                  </div>
                </div>
                <div className="mt-5 rounded-[18px] bg-white/75 p-4">
                  <p className="screen-note">STRONGEST SIGNAL</p>
                  <p className="mt-2 text-sm font-bold leading-5">
                    “Waterproof and cute at the same time?”
                  </p>
                </div>
                <div className="screen-feedback">🥳 Context found!</div>
              </article>
              <article
                className={`showcase-phone phone-coral ${activeShowcase === 1 ? 'is-active' : ''}`}
              >
                <div className="phone-bar">
                  <span>9:41</span>
                  <span>● ●</span>
                </div>
                <div className="phone-progress">
                  <i style={{ width: '66%' }} />
                </div>
                <p className="screen-kicker">PRODUCT MATCH · 02</p>
                <div className="score-orb">
                  94<span>%</span>
                </div>
                <h3 className="text-center">CloudLayer Jacket</h3>
                <p className="mt-1 text-center text-xs text-[#27322d]/55">
                  Best fit across your catalog
                </p>
                <div className="mt-5 flex flex-wrap justify-center gap-1.5">
                  <span className="screen-chip">Waterproof</span>
                  <span className="screen-chip">Cute fit</span>
                  <span className="screen-chip">Seattle</span>
                </div>
                <div className="screen-feedback">🎯 Match locked!</div>
              </article>
              <article
                className={`showcase-phone phone-lilac ${activeShowcase === 2 ? 'is-active' : ''}`}
              >
                <div className="phone-bar">
                  <span>9:41</span>
                  <span>● ●</span>
                </div>
                <div className="phone-progress">
                  <i style={{ width: '100%' }} />
                </div>
                <p className="screen-kicker">OUTREACH · 03</p>
                <div className="message-bubble">
                  <p className="screen-note">SUBJECT</p>
                  <p className="mt-1 font-bold">A rainy-day collab idea ☔</p>
                </div>
                <div className="mt-3 rounded-[18px] bg-white p-4 text-xs leading-5 text-[#27322d]/70">
                  Your Seattle rain moment got us. This jacket feels genuinely
                  aligned with your audience…
                </div>
                <button
                  type="button"
                  onClick={() =>
                    document
                      .querySelector('#results')
                      ?.scrollIntoView({ behavior: 'smooth' })
                  }
                  className="mini-send"
                >
                  Review message <Send className="size-3.5" />
                </button>
                <div className="screen-feedback">💬 Ready to send!</div>
              </article>
            </div>
            <div className="showcase-dots">
              {['Creator scan', 'Product match', 'Outreach ready'].map(
                (label, index) => (
                  <button
                    type="button"
                    key={label}
                    onClick={() => setActiveShowcase(index)}
                    aria-label={`Show ${label}`}
                    aria-pressed={activeShowcase === index}
                    className={activeShowcase === index ? 'is-active' : ''}
                  >
                    <span>{String(index + 1).padStart(2, '0')}</span>
                    {label}
                  </button>
                ),
              )}
            </div>
          </div>
        </div>
        <OutreachStory />
        <div className="process-rail">
          <a href="#generator">
            <span>01</span>
            <strong>Understand</strong>
            <small>Recent creator signals</small>
          </a>
          <i>→</i>
          <a href="#product-match">
            <span>02</span>
            <strong>Match</strong>
            <small>Best product first</small>
          </a>
          <i>→</i>
          <a href="#results">
            <span>03</span>
            <strong>Write + send</strong>
            <small>Editable HTML email</small>
          </a>
        </div>
      </section>

      <section
        id="generator"
        className="mx-auto max-w-[1440px] scroll-mt-24 px-5 py-10 lg:px-10"
      >
        <div className="mb-5 flex items-end justify-between">
          <div>
            <p className="eyebrow">01 / CREATOR CONTENT</p>
            <h2 className="section-title">Understand the creator</h2>
          </div>
          <div className="hidden items-center gap-2 text-xs text-white/40 sm:flex">
            <FileText className="size-4" /> {filledVideos} useful scripts ready
          </div>
        </div>
        <div>
          <article className="light-card p-5 sm:p-7">
            <div className="grid gap-4 sm:grid-cols-[.8fr_1.2fr]">
              <label className="field-label">
                Username
                <Input
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="@creator"
                  className="light-input mt-2"
                />
              </label>
              <label className="field-label">
                Short bio
                <Input
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  placeholder="Short creator bio (optional)"
                  className="light-input mt-2"
                />
              </label>
            </div>
            <div className="mt-6 rounded-[18px] bg-black p-4 text-white">
              <div className="mb-4 flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
                <div className="flex flex-wrap items-center gap-2 text-sm font-bold">
                  <Video className="size-4 text-[#ff5400]" /> Multi-channel
                  collection
                  <span className="inline-flex items-center gap-1 rounded-full bg-white/8 px-2 py-1 text-[10px] font-semibold text-white/55">
                    <ShieldCheck className="size-3" /> Auto-saved on this device
                  </span>
                </div>
                <fieldset className="flex w-fit rounded-full bg-white/8 p-1">
                  <legend className="sr-only">Collection source</legend>
                  <button
                    type="button"
                    onClick={() => {
                      setCollectionSource('youtube-shorts');
                      setCollectionInput('');
                      setCollectionMessage('');
                    }}
                    aria-pressed={collectionSource === 'youtube-shorts'}
                    className={`inline-flex items-center gap-1.5 rounded-full px-3 py-2 text-xs font-bold transition ${collectionSource === 'youtube-shorts' ? 'bg-white text-black' : 'text-white/55 hover:text-white'}`}
                  >
                    <Video className="size-3.5" /> YouTube Shorts
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setCollectionSource('tiktok');
                      setCollectionInput('');
                      setCollectionMessage('');
                    }}
                    aria-pressed={collectionSource === 'tiktok'}
                    className={`inline-flex items-center gap-1.5 rounded-full px-3 py-2 text-xs font-bold transition ${collectionSource === 'tiktok' ? 'bg-[#ff5400] text-black' : 'text-white/55 hover:text-white'}`}
                  >
                    <Clapperboard className="size-3.5" /> TikTok
                  </button>
                </fieldset>
              </div>
              <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
                {collectionSource === 'youtube-shorts' ? (
                  <div className="flex-1 text-xs font-semibold text-white/55">
                    YouTube channel, handle, or Shorts URL
                    <Input
                      aria-label="YouTube channel, handle, or Shorts URL"
                      value={collectionInput}
                      onChange={(event) =>
                        setCollectionInput(event.target.value)
                      }
                      placeholder="@creator, channel URL, or Shorts URL"
                      className="mt-2 h-10 border-white/15 bg-white/8 text-white placeholder:text-white/35 focus-visible:border-[#ff5400] focus-visible:ring-0"
                    />
                  </div>
                ) : (
                  <div className="flex-1 text-xs font-semibold text-white/55">
                    Public TikTok video links
                    <Textarea
                      aria-label="Public TikTok video links"
                      value={collectionInput}
                      onChange={(event) =>
                        setCollectionInput(event.target.value)
                      }
                      placeholder={
                        'Paste up to 8 links, one per line\nhttps://www.tiktok.com/@creator/video/…'
                      }
                      className="mt-2 min-h-[88px] resize-y border-white/15 bg-white/8 text-white placeholder:text-white/30 focus-visible:border-[#ff5400] focus-visible:ring-0"
                    />
                  </div>
                )}
                <Button
                  onClick={collectCreatorContent}
                  disabled={collecting || !collectionInput.trim()}
                  className="h-10 shrink-0 rounded-full bg-[#ff5400] px-5 font-bold text-black hover:bg-[#ff6a1a]"
                >
                  {collecting ? (
                    <RefreshCw className="animate-spin" />
                  ) : collectionSource === 'youtube-shorts' ? (
                    <Video />
                  ) : (
                    <Clapperboard />
                  )}{' '}
                  {collectionSource === 'youtube-shorts'
                    ? isYouTubeVideoInput(collectionInput)
                      ? 'Analyze this Short'
                      : 'Collect latest 7'
                    : 'Build candidate pool'}
                </Button>
              </div>
              <p className="mt-3 text-xs leading-5 text-white/40">
                {collectionSource === 'youtube-shorts'
                  ? 'Enter a channel name, @handle, channel URL, or one Shorts URL. Channels return the latest 7 Shorts; a video URL analyzes that Short only.'
                  : 'Paste up to 8 public links. Spoken scripts load first; upload the saved video to Gemini when the visuals carry important text.'}
              </p>
              {collectionMessage && (
                <p
                  className="mt-3 rounded-[12px] bg-white/8 px-3 py-2 text-xs leading-5 text-white/65"
                  aria-live="polite"
                >
                  {collectionMessage}
                </p>
              )}
            </div>
            {collectedVideos.length ? (
              <div className="mt-7">
                <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                  <p className="text-sm font-black">Candidate pool</p>
                  <p className="text-xs text-black/45">
                    {collectionSource === 'youtube-shorts' &&
                    isYouTubeVideoInput(collectionInput)
                      ? '1 Short ready for review'
                      : `${selectedVideoIds.length} selected · aim for 5–${collectionSource === 'youtube-shorts' ? '7' : '8'} useful samples`}
                  </p>
                </div>
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                  {collectedVideos.map((video) => {
                    const selected = selectedVideoIds.includes(video.id);
                    const selectedIndex = selectedVideoIds.indexOf(video.id);
                    const analyzing = analyzingVideoIds.includes(video.id);
                    const checkingTranscript = checkingTranscriptIds.includes(
                      video.id,
                    );
                    return (
                      <article
                        key={video.id}
                        className={`overflow-hidden rounded-[18px] border bg-white transition ${selected ? 'border-[#ff5400] shadow-[0_10px_30px_rgba(255,119,104,.18)]' : 'border-black/10'}`}
                      >
                        <div className="relative aspect-video overflow-hidden bg-[#e9eee7]">
                          {video.thumbnail ? (
                            <img
                              src={video.thumbnail}
                              alt=""
                              className="h-full w-full object-cover"
                            />
                          ) : (
                            <div className="grid h-full place-items-center text-black/25">
                              <Clapperboard className="size-8" />
                            </div>
                          )}
                          <label className="absolute left-2 top-2 flex items-center gap-2 rounded-full bg-white/95 px-2.5 py-1.5 text-[11px] font-black shadow-sm">
                            <Checkbox
                              checked={selected}
                              disabled={!videoScript(video)}
                              onCheckedChange={(checked) => {
                                if (Boolean(checked) !== selected)
                                  toggleVideoSelection(video);
                              }}
                            />
                            {videoScript(video)
                              ? 'Use script'
                              : 'Script loading'}
                          </label>
                          <a
                            href={video.url}
                            target="_blank"
                            rel="noreferrer"
                            aria-label={`Open ${video.title}`}
                            className="absolute right-2 top-2 grid size-7 place-items-center rounded-full bg-black/70 text-white"
                          >
                            <ExternalLink className="size-3.5" />
                          </a>
                        </div>
                        <div className="p-3">
                          <div className="flex items-center justify-between gap-2">
                            <Badge
                              className={
                                video.qualityLabel === 'strong'
                                  ? 'bg-[#dff2df] text-[#276b36]'
                                  : video.qualityLabel === 'review'
                                    ? 'bg-[#fff0c9] text-[#78580b]'
                                    : 'bg-[#ffe1dc] text-[#8b3026]'
                              }
                            >
                              {video.qualityScore}% ·{' '}
                              {video.qualityLabel === 'strong'
                                ? 'strong'
                                : video.qualityLabel === 'review'
                                  ? 'review'
                                  : 'skip'}
                            </Badge>
                            <span className="text-[10px] font-bold uppercase text-black/35">
                              {video.status === 'processing'
                                ? 'loading…'
                                : video.status}
                            </span>
                          </div>
                          <button
                            type="button"
                            onClick={() =>
                              selected
                                ? setActiveVideo(selectedIndex)
                                : toggleVideoSelection(video)
                            }
                            className="mt-2 line-clamp-2 min-h-10 text-left text-xs font-bold leading-5"
                          >
                            {video.title}
                          </button>
                          <p className="mt-1 line-clamp-2 min-h-8 text-[10px] leading-4 text-black/45">
                            {video.qualityReason}
                          </p>
                          {video.visualText?.length ? (
                            <div className="mt-2 rounded-[10px] bg-[#fff4d6] px-2.5 py-2 text-[10px] leading-4 text-black/70">
                              <p className="font-black uppercase tracking-[.08em] text-black/40">
                                On-screen text
                              </p>
                              <p className="mt-1">
                                {video.visualText.slice(0, 3).join(' · ')}
                              </p>
                            </div>
                          ) : null}
                          <div className="mt-2 rounded-[10px] bg-[#eef4ff] px-2.5 py-2 text-[10px] leading-4 text-black/65">
                            <p className="font-black uppercase tracking-[.08em] text-black/40">
                              Spoken transcript
                            </p>
                            <p className="mt-1 font-semibold">
                              {video.transcript
                                ? `Ready via ${video.spokenTranscriptProvider === 'supadata' ? 'Supadata fallback' : 'Gemini'}`
                                : video.spokenTranscriptStatus === 'processing'
                                  ? 'Supadata is preparing the transcript…'
                                  : video.geminiStatus === 'failed'
                                    ? 'Gemini failed · no fallback transcript yet'
                                    : 'No reliable speech found'}
                            </p>
                          </div>
                          {video.jobId &&
                          video.spokenTranscriptStatus === 'processing' ? (
                            <Button
                              type="button"
                              variant="outline"
                              onClick={() => void pollTranscript(video)}
                              disabled={checkingTranscript}
                              className="mt-3 h-8 w-full rounded-full text-[11px] font-bold"
                            >
                              {checkingTranscript ? (
                                <RefreshCw className="animate-spin" />
                              ) : (
                                <FileText />
                              )}
                              {checkingTranscript
                                ? 'Reading script…'
                                : 'Check transcript'}
                            </Button>
                          ) : null}
                          {video.platform === 'tiktok' ? (
                            <label
                              className={`mt-2 inline-flex h-8 w-full cursor-pointer items-center justify-center gap-2 rounded-full border border-black/15 bg-white px-3 text-[11px] font-bold transition hover:bg-black/[.04] ${analyzing ? 'pointer-events-none opacity-50' : ''}`}
                            >
                              {analyzing ? (
                                <RefreshCw className="size-4 animate-spin" />
                              ) : (
                                <Upload className="size-4" />
                              )}
                              {analyzing
                                ? 'Gemini is reading video…'
                                : video.visualStatus === 'ready'
                                  ? 'Upload again for screen text'
                                  : 'Upload video for screen text'}
                              <input
                                type="file"
                                accept="video/mp4,video/quicktime,video/webm,video/*"
                                className="sr-only"
                                disabled={analyzing}
                                onChange={(event) => {
                                  const file = event.currentTarget.files?.[0];
                                  if (file) void analyzeVisualText(video, file);
                                  event.currentTarget.value = '';
                                }}
                              />
                            </label>
                          ) : (
                            <Button
                              type="button"
                              variant="outline"
                              onClick={() => void analyzeVisualText(video)}
                              disabled={analyzing}
                              className="mt-2 h-8 w-full rounded-full text-[11px] font-bold"
                            >
                              {analyzing ? (
                                <RefreshCw className="animate-spin" />
                              ) : (
                                <ScanText />
                              )}
                              {analyzing
                                ? 'Gemini is reading video…'
                                : video.visualStatus === 'ready'
                                  ? 'Re-read screen text'
                                  : 'Read screen text'}
                            </Button>
                          )}
                          {video.visualError ? (
                            <p
                              className="mt-2 rounded-[10px] bg-[#ffe1dc] px-2.5 py-2 text-[11px] font-semibold leading-4 text-[#8b3026]"
                              role="alert"
                            >
                              {video.visualError}
                            </p>
                          ) : null}
                        </div>
                      </article>
                    );
                  })}
                </div>
              </div>
            ) : (
              <div className="mt-7 rounded-[18px] border border-dashed border-black/15 bg-[#f1f0ed] px-5 py-8 text-center">
                <Clapperboard className="mx-auto size-8 text-black/25" />
                <p className="mt-3 text-sm font-black text-black/70">
                  No videos collected yet
                </p>
                <p className="mt-1 text-xs text-black/40">
                  Search a YouTube Shorts creator or paste public TikTok links
                  above. Real scripts will appear only after collection.
                </p>
              </div>
            )}
            <section className="mt-5" aria-labelledby="selected-transcripts">
              <div className="mb-3 flex flex-wrap items-end justify-between gap-2">
                <div>
                  <p
                    id="selected-transcripts"
                    className="text-sm font-black text-black"
                  >
                    Selected transcripts
                  </p>
                  <p className="mt-1 text-xs text-black/45">
                    Every selected script appears below and is included in
                    product matching.
                  </p>
                </div>
                <Badge className="rounded-full bg-[#27322d] text-white">
                  {filledVideos} script{filledVideos === 1 ? '' : 's'}
                </Badge>
              </div>
              <div className="grid gap-3 lg:grid-cols-2">
                {transcripts.map((script, index) => {
                  const sourceId = selectedVideoIds[index];
                  const sourceVideo = sourceId
                    ? collectedVideos.find((video) => video.id === sourceId)
                    : undefined;
                  return (
                    <article
                      key={sourceId || `manual-${index}`}
                      className={`rounded-[18px] border p-4 transition ${activeVideo === index ? 'border-[#ff5400] bg-[#fff7f3]' : 'border-black/8 bg-[#f1f0ed]'}`}
                    >
                      <div className="mb-2 flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="text-[11px] font-black uppercase tracking-[.1em] text-black/45">
                            Script {index + 1}
                            {sourceVideo
                              ? ` · ${sourceVideo.platform === 'tiktok' ? 'TikTok' : 'Short'}`
                              : ' · Manual'}
                          </p>
                          {sourceVideo && (
                            <p className="mt-1 truncate text-xs font-bold text-black/75">
                              {sourceVideo.title}
                            </p>
                          )}
                        </div>
                        <span className="shrink-0 text-[10px] font-bold text-black/35">
                          {script.length} chars
                        </span>
                      </div>
                      <Textarea
                        aria-label={`Script ${index + 1}${sourceVideo ? ` from ${sourceVideo.title}` : ''}`}
                        value={script}
                        placeholder="Paste a transcript here, or collect and select a real video above. No script has been parsed yet."
                        onFocus={() => setActiveVideo(index)}
                        onChange={(event) =>
                          setTranscripts((current) =>
                            current.map((item, scriptIndex) =>
                              scriptIndex === index ? event.target.value : item,
                            ),
                          )
                        }
                        className="min-h-[150px] resize-y border-0 bg-transparent p-0 text-[15px] leading-6 text-black shadow-none focus-visible:ring-0"
                      />
                    </article>
                  );
                })}
              </div>
              <div className="mt-3 flex items-center gap-2 rounded-[14px] bg-[#f1f0ed] px-4 py-3 text-[11px] text-black/40">
                <Upload className="size-3.5" /> Edit any script here · spoken
                and on-screen text stay intact before structured analysis
              </div>
            </section>
            <section
              id="creator-insights"
              className="mt-6 scroll-mt-28 rounded-[20px] border border-black/10 bg-[#f1ecff] p-5 sm:p-6"
              aria-labelledby="structured-profile-title"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="flex items-start gap-3">
                  <span className="grid size-10 shrink-0 place-items-center rounded-[14px] bg-white text-[#27322d] shadow-sm">
                    <Code2 className="size-4" />
                  </span>
                  <div>
                    <p className="eyebrow text-black/40">STRUCTURED OUTPUT</p>
                    <h3
                      id="structured-profile-title"
                      className="text-lg font-black text-[#27322d]"
                    >
                      Creator Profile JSON
                    </h3>
                    <p className="mt-1 max-w-2xl text-xs leading-5 text-black/50">
                      Second step only: selected videos are summarized after
                      their scripts are ready. This step never changes or
                      replaces spoken transcripts or on-screen text.
                    </p>
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <Badge className="rounded-full bg-white text-[#27322d]">
                    {analyzedSelectedCount}/{selectedVideoIds.length} analyzed
                  </Badge>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => void analyzeSelectedStructures()}
                    disabled={
                      selectedVideoIds.length === 0 ||
                      structuringVideoIds.length > 0
                    }
                    className="h-9 rounded-full border-[#6d5a94]/25 bg-white px-4 text-xs font-black text-[#27322d]"
                  >
                    {structuringVideoIds.length ? (
                      <RefreshCw className="animate-spin" />
                    ) : (
                      <WandSparkles />
                    )}
                    {structuringVideoIds.length
                      ? 'Building profile…'
                      : 'Build structured profile'}
                  </Button>
                </div>
              </div>
              <pre className="mt-4 max-h-[360px] overflow-auto rounded-[16px] bg-[#27322d] p-4 text-[12px] leading-5 text-[#dff2df]">
                {JSON.stringify(structuredCreatorProfile, null, 2)}
              </pre>
              {!hasStructuredProfile && (
                <p className="mt-3 text-xs font-semibold text-[#6d5a94]">
                  First select real scripts above. Then build the structured
                  profile as a separate second step.
                </p>
              )}
            </section>
            <section
              id="conversation-angles"
              className="mt-6 scroll-mt-28 rounded-[22px] border border-[#27322d]/10 bg-[#dff2df] p-5 text-[#27322d] sm:p-6"
              aria-labelledby="conversation-angles-title"
            >
              <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
                <div className="flex items-start gap-3">
                  <span className="grid size-11 shrink-0 place-items-center rounded-[15px] bg-[#ff7768] text-[#27322d]">
                    <MessageCircle className="size-5" />
                  </span>
                  <div>
                    <p className="eyebrow text-[#27322d]/45">
                      1.5 / TALKING POINT
                    </p>
                    <h3
                      id="conversation-angles-title"
                      className="text-xl font-black"
                    >
                      Choose what to talk about
                    </h3>
                    <p className="mt-1 max-w-2xl text-sm leading-6 text-[#27322d]/60">
                      Review up to 8 suggestions, edit any detail, or write your
                      own talking points. The final DM uses only the point you
                      confirm and never copies the transcript.
                    </p>
                  </div>
                </div>
                <div className="flex shrink-0 flex-wrap gap-2">
                  <Button
                    type="button"
                    onClick={addConversationAngle}
                    disabled={!filledVideos}
                    className="h-10 rounded-full bg-[#ff5400] px-4 font-black text-black hover:bg-[#ff6a1a]"
                  >
                    <Plus /> Write my own point
                  </Button>
                  <Button
                    type="button"
                    onClick={findConversationAngles}
                    disabled={!filledVideos || !allSelectedVideosAnalyzed}
                    className="h-10 rounded-full bg-[#27322d] px-4 font-black text-white hover:bg-[#39463f]"
                  >
                    <Sparkles />
                    {conversationAngles.some(
                      (angle) => !angle.id.startsWith('custom-angle-'),
                    )
                      ? 'Refresh suggestions'
                      : 'Generate suggestions'}
                  </Button>
                </div>
              </div>

              {!anglesFresh && conversationAngles.length > 0 && (
                <p className="mt-5 rounded-[12px] bg-[#ffb1a8] px-3 py-2 text-sm font-semibold text-[#70261e]">
                  Scripts changed. Refresh the suggestions or write a new point
                  before product matching.
                </p>
              )}

              <div
                id="custom-talking-points"
                className="mt-5 rounded-[20px] border border-[#ff5400]/25 bg-[#fff7f3] p-4 sm:p-5"
              >
                <div className="flex flex-wrap items-end justify-between gap-2">
                  <div>
                    <p className="text-base font-black">Your talking points</p>
                    <p className="mt-1 text-sm text-[#27322d]/55">
                      Your own analysis appears here first and stays separate
                      from system suggestions.
                    </p>
                  </div>
                  <span className="text-xs font-bold text-[#27322d]/40">
                    {customConversationAngles.length} added
                  </span>
                </div>
                {customConversationAngles.length ? (
                  <div className="mt-4 grid gap-3 md:grid-cols-2">
                    {customConversationAngles.map(renderConversationAngleCard)}
                  </div>
                ) : (
                  <div className="mt-4 rounded-[14px] border border-dashed border-[#ff5400]/30 bg-white px-4 py-5 text-center text-sm text-[#27322d]/55">
                    Click <strong>Write my own point</strong>. A visible editor
                    will open right here.
                  </div>
                )}
              </div>

              <div className="mt-4 rounded-[20px] border border-[#6d5a94]/15 bg-[#f4efff] p-4 sm:p-5">
                <div className="flex flex-wrap items-end justify-between gap-2">
                  <div>
                    <p className="text-base font-black">System suggestions</p>
                    <p className="mt-1 text-sm text-[#27322d]/55">
                      Optional starting points generated from the scripts. You
                      can edit or delete every suggestion.
                    </p>
                  </div>
                  <span className="text-xs font-bold text-[#27322d]/40">
                    {suggestedConversationAngles.length} suggestions
                  </span>
                </div>
                {suggestedConversationAngles.length ? (
                  <div className="mt-4 grid gap-3 md:grid-cols-2">
                    {suggestedConversationAngles.map(
                      renderConversationAngleCard,
                    )}
                  </div>
                ) : (
                  <div className="mt-4 rounded-[14px] border border-dashed border-[#6d5a94]/25 bg-white/70 px-4 py-5 text-center text-sm text-[#27322d]/50">
                    Generate suggestions only when you want a second opinion.
                  </div>
                )}
              </div>

              <p className="mt-4 text-sm font-semibold text-[#27322d]/55">
                {selectedAngle
                  ? `Confirmed: ${selectedAngle.title}`
                  : !filledVideos
                    ? 'Select at least one script before adding a talking point.'
                    : 'Confirm one complete talking point to continue to product matching.'}
              </p>
            </section>
          </article>
        </div>

        <div id="product-match" className="mt-12 scroll-mt-24">
          <div className="mb-5 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
            <div>
              <p className="eyebrow">02 / PRODUCT MATCH</p>
              <h2 className="section-title">Find the strongest fit</h2>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-xs text-white/40">
                {productLibrary.length} products in library
              </span>
              <a
                href="/products"
                className="text-sm font-bold text-[#ff5400] hover:text-[#ff6a1a]"
              >
                Manage products →
              </a>
            </div>
          </div>
          <article className="match-panel rounded-[28px] p-5 sm:p-7">
            <div className="flex flex-col justify-between gap-5 lg:flex-row lg:items-center">
              <div className="flex items-start gap-4">
                <span className="grid size-12 shrink-0 place-items-center rounded-full bg-[#ff5400] text-black">
                  <PackageSearch className="size-5" />
                </span>
                <div>
                  <h3 className="text-xl font-black">
                    Match creator signals to your catalog
                  </h3>
                  <p className="mt-1 max-w-2xl text-sm leading-6 text-[#27322d]/60">
                    Recent scripts and bio are compared with every product’s
                    description and selling points, guided by the conversation
                    angle you confirmed above.
                  </p>
                  {selectedAngle && (
                    <Badge className="mt-3 rounded-full bg-[#ddd0ff] text-[#27322d]">
                      Talking point · {selectedAngle.title}
                    </Badge>
                  )}
                </div>
              </div>
              <Button
                onClick={matchProducts}
                disabled={
                  matchingProducts ||
                  filledVideos === 0 ||
                  !selectedAngle ||
                  productLibrary.length === 0
                }
                className="match-primary-action h-12 shrink-0 rounded-full px-6 font-black"
              >
                {matchingProducts ? (
                  <>
                    <RefreshCw className="animate-spin" /> Matching catalog…
                  </>
                ) : (
                  <>
                    <PackageSearch />{' '}
                    {productMatches.length
                      ? 'Re-match products'
                      : 'Match products'}
                  </>
                )}
              </Button>
            </div>
            {!productLibrary.length ? (
              <div className="mt-6 rounded-[18px] border border-dashed border-black/15 p-6 text-center text-sm text-[#27322d]/55">
                Your product library is empty.{' '}
                <a href="/products" className="font-bold text-[#ff5400]">
                  Add products first
                </a>
                .
              </div>
            ) : !productMatches.length ? (
              <div className="mt-6 grid min-h-[150px] place-items-center rounded-[18px] border border-dashed border-black/12 bg-[#f4f8f1] text-center">
                <div>
                  <p className="font-bold">No match has been run yet.</p>
                  <p className="mt-1 text-sm text-[#27322d]/50">
                    {selectedAngle
                      ? `Your “${selectedAngle.title}” talking point is ready. Compare all ${productLibrary.length} products next.`
                      : 'Choose a talking point above before matching products.'}
                  </p>
                </div>
              </div>
            ) : (
              <div className="mt-7">
                <div className="grid gap-4 lg:grid-cols-3">
                  {productMatches.slice(0, 3).map((match, index) => {
                    const selected = selectedProductId === match.product.id;
                    const eligible = match.score >= minimumProductMatchScore;
                    return (
                      <button
                        key={match.product.id}
                        onClick={() => chooseProduct(match)}
                        disabled={!eligible}
                        className={`relative rounded-[22px] p-5 text-left transition ${selected ? 'bg-[#ff5400] text-black ring-2 ring-[#ff5400]' : eligible ? 'bg-[#f4f8f1] text-[#27322d] ring-1 ring-black/10 hover:bg-[#e8f1e5]' : 'cursor-not-allowed bg-[#f1f0ed] text-[#27322d]/55 ring-1 ring-black/8'}`}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            {index === 0 && (
                              <Badge className="mb-3 rounded-full bg-black text-white">
                                BEST MATCH
                              </Badge>
                            )}
                            <h4 className="text-xl font-black tracking-[-.03em]">
                              {match.product.name}
                            </h4>
                          </div>
                          <span
                            className={`grid size-14 shrink-0 place-items-center rounded-full text-lg font-black ${selected ? 'bg-black text-white' : 'bg-white text-black shadow-sm'}`}
                          >
                            {match.score}%
                          </span>
                        </div>
                        <p
                          className={`mt-3 text-sm leading-6 ${selected ? 'text-black/65' : 'text-[#27322d]/60'}`}
                        >
                          {match.reason}
                        </p>
                        <div className="mt-4 flex flex-wrap gap-2">
                          {match.matchedFeatures.map((feature) => (
                            <Badge
                              key={feature}
                              className={`rounded-full ${selected ? 'bg-black text-white' : 'bg-[#e2ece0] text-[#27322d]'}`}
                            >
                              {feature}
                            </Badge>
                          ))}
                        </div>
                        <div
                          className={`mt-5 flex items-center justify-between border-t pt-4 text-xs font-bold ${selected ? 'border-black/15' : 'border-black/10 text-[#27322d]/55'}`}
                        >
                          <span>
                            {match.product.commission} ·{' '}
                            {match.product.freeSample
                              ? 'Free sample'
                              : 'No sample'}
                          </span>
                          <span>
                            {selected
                              ? 'SELECTED ✓'
                              : eligible
                                ? 'SELECT'
                                : 'BELOW 75%'}
                          </span>
                        </div>
                      </button>
                    );
                  })}
                </div>
                {!matchesFresh && (
                  <p className="mt-4 text-sm font-semibold text-[#b54c42]">
                    Creator content or product library changed. Re-run matching
                    before generating outreach.
                  </p>
                )}
                {matchesFresh &&
                productMatches[0]?.score < minimumProductMatchScore ? (
                  <div className="mt-4 rounded-[16px] border border-[#b54c42]/25 bg-[#ffe8e3] px-4 py-3 text-sm text-[#7a3028]">
                    <strong>No suitable product found.</strong> The best match
                    is {productMatches[0].score}%, below the{' '}
                    {minimumProductMatchScore}% minimum. Add a more relevant
                    product or change the confirmed talking point before
                    generating outreach.
                  </div>
                ) : null}
              </div>
            )}
          </article>
        </div>

        <div className="match-action-bar mt-5 flex flex-col items-center justify-between gap-4 rounded-[24px] p-5 sm:flex-row sm:px-7">
          <div className="flex items-center gap-3 text-sm text-[#27322d]/60">
            <span className="grid size-10 place-items-center rounded-full bg-[#e6efe3]">
              <ShieldCheck className="size-4 text-[#ff5400]" />
            </span>
            <span>
              <strong className="block text-[#27322d]">
                {selectedMatch && selectedMatchEligible && matchesFresh
                  ? `${product} selected at ${selectedMatch.score}% match.`
                  : matchesFresh &&
                      productMatches[0]?.score < minimumProductMatchScore
                    ? `No product reached the ${minimumProductMatchScore}% minimum.`
                    : 'Match a product before writing.'}
              </strong>
              {selectedMatch && selectedMatchEligible && matchesFresh
                ? `${selectedAngle?.title}: ${selectedMatch.reason}`
                : matchesFresh &&
                    productMatches[0]?.score < minimumProductMatchScore
                  ? 'Outreach generation is paused to prevent a forced, low-confidence pitch.'
                  : 'Confirm a talking point, then match a product before writing.'}
            </span>
          </div>
          <Button
            onClick={() => generate()}
            disabled={
              generating ||
              !username.trim() ||
              !selectedAngle ||
              !matchesFresh ||
              !selectedMatchEligible
            }
            className="h-14 w-full rounded-full bg-[#ff5400] px-8 text-base font-black text-black hover:bg-[#ff6a1a] sm:w-auto"
          >
            {generating ? (
              <>
                <RefreshCw className="size-4 animate-spin" /> Writing outreach…
              </>
            ) : (
              <>
                <WandSparkles className="size-5" /> Generate with{' '}
                {selectedMatchEligible && matchesFresh
                  ? product
                  : 'eligible product'}
              </>
            )}
          </Button>
        </div>
      </section>

      <section
        id="results"
        className="mx-auto max-w-[1440px] scroll-mt-24 px-5 pb-24 pt-12 lg:px-10"
      >
        <div className="mb-5 flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="eyebrow">03 / OUTREACH</p>
            <h2 className="section-title">Personalized outreach</h2>
          </div>
          {result ? (
            <a
              href="/history"
              className="rounded-full border border-white/15 px-4 py-2 text-sm font-bold text-white/70 transition hover:bg-white hover:text-[#27322d]"
            >
              Open History
            </a>
          ) : null}
        </div>
        {!result ? (
          <div className="grid min-h-[330px] place-items-center rounded-[28px] border border-dashed border-white/15 bg-white/[.025] text-center">
            <div className="max-w-sm px-6">
              <span className="mx-auto mb-5 grid size-14 place-items-center rounded-full bg-white/7">
                <Sparkles className="size-5 text-[#ff5400]" />
              </span>
              <h3 className="text-xl font-bold">
                Match a product, then write.
              </h3>
              <p className="mt-2 text-sm leading-6 text-white/40">
                The selected product, evidence-backed angle, DM and email will
                appear here.
              </p>
            </div>
          </div>
        ) : (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
            <article className="mb-5 flex flex-col justify-between gap-4 rounded-[24px] bg-[#eaf4e8] p-5 text-[#27322d] sm:flex-row sm:items-center sm:p-6">
              <div className="max-w-xl">
                <div className="flex items-center gap-2">
                  <span className="grid size-9 place-items-center rounded-full bg-[#ddd0ff]">
                    <Send className="size-4" />
                  </span>
                  <div>
                    <p className="font-black">Outreach tracking</p>
                    <p className="text-xs leading-5 text-[#27322d]/55">
                      {activeSentAt
                        ? `Sent ${new Date(activeSentAt).toLocaleString()}. Reply status starts as Pending.`
                        : 'After sending outside this app, choose the channel and mark this message as sent.'}
                    </p>
                  </div>
                </div>
                {activeSentAt ? (
                  <p className="mt-3 text-xs font-bold text-[#27322d]/55">
                    “No reply” becomes available in History after the seven-day
                    observation window.
                  </p>
                ) : null}
              </div>
              <div className="flex flex-col gap-2 sm:min-w-[360px] sm:flex-row">
                <Select
                  value={outreachChannel}
                  onValueChange={(value) =>
                    setOutreachChannel(value as OutreachChannel)
                  }
                  disabled={Boolean(activeSentAt)}
                >
                  <SelectTrigger className="h-11 w-full rounded-full border-[#27322d]/15 bg-white px-4 text-[#27322d] sm:w-[170px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-white text-[#27322d]">
                    <SelectItem value="TikTok DM">TikTok DM</SelectItem>
                    <SelectItem value="Instagram DM">Instagram DM</SelectItem>
                    <SelectItem value="WhatsApp">WhatsApp</SelectItem>
                    <SelectItem value="Email">Email</SelectItem>
                    <SelectItem value="Other">Other</SelectItem>
                  </SelectContent>
                </Select>
                <Button
                  type="button"
                  onClick={() => markCurrentAsSent()}
                  disabled={Boolean(activeSentAt)}
                  className="h-11 flex-1 rounded-full bg-[#27322d] px-5 font-bold text-white hover:bg-[#39463f] disabled:bg-[#aee8c5] disabled:text-[#174b2a] disabled:opacity-100"
                >
                  {activeSentAt ? <Check /> : <Send />}
                  {activeSentAt ? 'Sent · Pending' : 'Mark as sent'}
                </Button>
              </div>
            </article>
            <article className="mb-5 grid overflow-hidden rounded-[28px] bg-white text-black lg:grid-cols-[1fr_80px_1fr_170px]">
              <div className="flex gap-4 p-5 sm:p-7">
                <img
                  src={creatorImages[0]}
                  alt="Creator context"
                  className="h-28 w-24 rounded-[16px] object-cover"
                />
                <div>
                  <p className="field-label">Confirmed conversation angle</p>
                  <p className="mt-3 text-[17px] font-bold leading-6">
                    {result.evidence}
                  </p>
                </div>
              </div>
              <div className="grid place-items-center bg-[#f2f0eb]">
                <ArrowRight className="size-5 rotate-90 text-black/35 lg:rotate-0" />
              </div>
              <div className="flex gap-4 p-5 sm:p-7">
                <img
                  src={productImage}
                  alt="Product"
                  className="h-28 w-24 rounded-[16px] object-cover"
                />
                <div>
                  <p className="field-label">Selected product</p>
                  <p className="mt-3 font-black">{product}</p>
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {features.slice(0, 3).map((feature) => (
                      <Badge
                        key={feature}
                        className="rounded-full bg-[#eceae5] text-black"
                      >
                        {feature}
                      </Badge>
                    ))}
                  </div>
                  <p className="mt-3 text-xs leading-5 text-black/45">
                    {result.reason}
                  </p>
                </div>
              </div>
              <div className="grid place-items-center bg-[#ff5400] p-6 text-center">
                <div>
                  <div className="text-5xl font-black tracking-[-.06em]">
                    {selectedMatch?.score || result.score * 10}
                    <span className="text-2xl">%</span>
                  </div>
                  <p className="mt-2 text-xs font-bold uppercase tracking-[.14em]">
                    Product match
                  </p>
                </div>
              </div>
            </article>
            <div className="grid gap-5 xl:grid-cols-[1.15fr_.85fr]">
              <article className="light-card p-5 sm:p-7">
                <div className="mb-6 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <MessageCircle className="size-4" />
                    <h3 className="font-black">TikTok / IG DM</h3>
                  </div>
                  <Button
                    onClick={() => copyText('dm', result.dm)}
                    variant="outline"
                    className="h-9 rounded-full border-black/10 bg-transparent text-black hover:bg-black hover:text-white"
                  >
                    {copied === 'dm' ? <Check /> : <Copy />}{' '}
                    {copied === 'dm' ? 'Copied' : 'Copy'}
                  </Button>
                </div>
                <Textarea
                  value={result.dm}
                  onChange={(e) => updateResultCopy('dm', e.target.value)}
                  aria-label="Editable TikTok or Instagram direct message"
                  className="min-h-[180px] resize-y rounded-[18px] border border-black/10 bg-[#f1f0ed] p-5 text-base leading-7 text-black focus-visible:border-[#ff5400] focus-visible:ring-2 focus-visible:ring-[#ff5400]/25"
                />
                <div className="mt-2 flex items-center justify-between gap-3 text-xs text-black/45">
                  <span>
                    Edit directly — your changes are saved automatically.
                  </span>
                  <span>{result.dm.length} characters</span>
                </div>
                <div className="mt-4 flex flex-wrap gap-2">
                  {[
                    ['Shorter', 'shorter'],
                    ['More casual', 'casual'],
                    ['Less salesy', 'soft'],
                  ].map(([label, tone]) => (
                    <Button
                      key={tone}
                      onClick={() =>
                        rewriteCurrentDm(tone as 'shorter' | 'casual' | 'soft')
                      }
                      variant="outline"
                      className="rounded-full border-black/10 bg-transparent text-black hover:bg-black hover:text-white"
                    >
                      {label}
                    </Button>
                  ))}
                  <Button
                    onClick={() => generate()}
                    variant="ghost"
                    className="ml-auto rounded-full text-black/50 hover:bg-black/5 hover:text-black"
                  >
                    <RefreshCw /> Regenerate
                  </Button>
                </div>
              </article>
              <article className="rounded-[28px] bg-[#ff5400] p-5 text-black sm:p-7">
                <div className="mb-7 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Sparkles className="size-4" />
                    <h3 className="font-black">Selected talking point</h3>
                  </div>
                  <Badge className="rounded-full bg-black text-white">
                    LOW RISK
                  </Badge>
                </div>
                <p className="text-[clamp(30px,4vw,48px)] font-black leading-[1.02] tracking-[-.05em]">
                  {result.hook}
                </p>
                <div className="mt-8 flex items-center justify-between border-t border-black/15 pt-4 text-xs font-bold">
                  <span>Human confirmed</span>
                  <span className="flex items-center gap-1">
                    <Clipboard className="size-3.5" /> {result.source}
                  </span>
                </div>
              </article>
              <article className="light-card p-5 sm:p-7 xl:col-span-2">
                <div className="mb-6 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Mail className="size-4" />
                    <h3 className="font-black">Email</h3>
                  </div>
                  <Button
                    onClick={() =>
                      copyText('email', `${result.subject}\n\n${result.email}`)
                    }
                    variant="outline"
                    className="h-9 rounded-full border-black/10 bg-transparent text-black hover:bg-black hover:text-white"
                  >
                    {copied === 'email' ? <Check /> : <Copy />}{' '}
                    {copied === 'email' ? 'Copied' : 'Copy all'}
                  </Button>
                </div>
                <label className="mb-4 block rounded-[18px] bg-[#f1f0ed] p-5">
                  <span className="field-label">Email subject · editable</span>
                  <Input
                    value={result.subject}
                    maxLength={200}
                    onChange={(e) =>
                      updateResultCopy('subject', e.target.value)
                    }
                    placeholder="Write a custom email subject"
                    className="mt-3 h-11 border-black/10 bg-white px-3 text-base font-bold text-black shadow-none focus-visible:border-[#ff5400] focus-visible:ring-2 focus-visible:ring-[#ff5400]/20"
                  />
                  <span className="mt-2 block text-xs text-black/40">
                    This exact subject will be UTF-8 encoded before Gmail sends
                    it.
                  </span>
                </label>
                <div className="grid gap-4 lg:grid-cols-[.72fr_1.28fr]">
                  <div className="rounded-[18px] bg-[#f1f0ed] p-5">
                    <p className="field-label">Creator tone</p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {result.persona.map((item) => (
                        <Badge
                          key={item}
                          className="rounded-full bg-white text-black"
                        >
                          {item}
                        </Badge>
                      ))}
                    </div>
                  </div>
                  <Textarea
                    value={result.email}
                    onChange={(e) => updateResultCopy('email', e.target.value)}
                    className="min-h-[260px] resize-none rounded-[18px] border-0 bg-[#f1f0ed] p-5 text-[15px] leading-7 text-black focus-visible:ring-2 focus-visible:ring-[#ff5400]"
                  />
                </div>
                <div className="mt-5 rounded-[18px] bg-black p-5 text-white">
                  <div className="grid gap-5 lg:grid-cols-[1fr_auto]">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <Send className="size-4 text-[#ff5400]" />
                        <p className="font-bold">HTML email delivery</p>
                        <Badge
                          className={`rounded-full ${gmailStatus.connected ? 'bg-[#dff6e4] text-[#216c34]' : 'bg-white/10 text-white/55'}`}
                        >
                          {gmailStatus.connected
                            ? 'GMAIL CONNECTED'
                            : gmailStatus.configured
                              ? 'READY TO CONNECT'
                              : 'SETUP REQUIRED'}
                        </Badge>
                      </div>
                      <Input
                        type="email"
                        value={emailRecipient}
                        onChange={(e) => setEmailRecipient(e.target.value)}
                        placeholder="creator@email.com"
                        className="mt-4 h-10 max-w-md border-white/15 bg-white/8 text-white placeholder:text-white/35 focus-visible:border-[#ff5400] focus-visible:ring-0"
                      />
                      {sendMessage && (
                        <p className="mt-2 text-xs text-white/55">
                          {sendMessage}
                        </p>
                      )}
                    </div>
                    <div className="flex flex-wrap items-end gap-2">
                      <Button
                        onClick={() => setShowHtml(!showHtml)}
                        variant="outline"
                        className="rounded-full border-white/15 bg-transparent text-white hover:bg-white hover:text-black"
                      >
                        <Code2 /> {showHtml ? 'Hide preview' : 'Preview HTML'}
                      </Button>
                      {!gmailStatus.connected ? (
                        <Button
                          onClick={connectGmail}
                          className="rounded-full bg-white px-4 font-bold text-black hover:bg-white/85"
                        >
                          Connect Gmail
                        </Button>
                      ) : (
                        <Button
                          onClick={sendEmail}
                          disabled={
                            sending ||
                            !emailRecipient.trim() ||
                            !result.subject.trim()
                          }
                          className="rounded-full bg-[#ff5400] px-5 font-bold text-black hover:bg-[#ff6a1a]"
                        >
                          {sending ? (
                            <RefreshCw className="animate-spin" />
                          ) : (
                            <Send />
                          )}{' '}
                          Send HTML
                        </Button>
                      )}
                    </div>
                  </div>
                  <div className="mt-5 border-t border-white/10 pt-5">
                    <div className="mb-4 flex items-center gap-2">
                      <ImageIcon className="size-4 text-[#ff5400]" />
                      <p className="text-xs font-bold uppercase tracking-[.12em] text-white/45">
                        Email content blocks
                      </p>
                    </div>
                    <div
                      className="mb-4 flex w-fit rounded-full bg-white/8 p-1"
                      role="group"
                      aria-label="Email template mode"
                    >
                      <button
                        type="button"
                        onClick={() => setEmailEditorMode('visual')}
                        className={`rounded-full px-4 py-2 text-sm font-bold transition ${emailEditorMode === 'visual' ? 'bg-white text-black' : 'text-white/55 hover:text-white'}`}
                      >
                        Visual builder
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setEmailEditorMode('code');
                          setShowHtml(true);
                        }}
                        className={`rounded-full px-4 py-2 text-sm font-bold transition ${emailEditorMode === 'code' ? 'bg-[#ff5400] text-black' : 'text-white/55 hover:text-white'}`}
                      >
                        <Code2 className="mr-1.5 inline size-4" />
                        Code editor
                      </button>
                    </div>
                    <div className="mb-4 grid gap-3 rounded-[16px] bg-white/7 p-4 md:grid-cols-[1fr_auto] md:items-center">
                      <div className="flex items-center gap-3">
                        {emailImageFile ? (
                          <img
                            src={emailImageFile.dataUrl}
                            alt={emailImageAlt}
                            className="size-16 rounded-[12px] object-cover"
                          />
                        ) : (
                          <span className="grid size-16 shrink-0 place-items-center rounded-[12px] border border-dashed border-white/20 text-white/35">
                            <ImageIcon className="size-5" />
                          </span>
                        )}
                        <div>
                          <p className="text-sm font-bold">
                            {emailImageFile
                              ? emailImageFile.filename
                              : 'Upload an inline email image'}
                          </p>
                          <p className="mt-1 text-xs leading-5 text-white/40">
                            PNG, JPG, GIF or WebP · max 3 MB. The image is
                            attached inside the email, not linked externally.
                          </p>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <label className="inline-flex h-9 cursor-pointer items-center gap-2 rounded-full bg-white px-4 text-sm font-bold text-black hover:bg-white/85">
                          <Upload className="size-4" />{' '}
                          {emailImageFile ? 'Replace' : 'Upload'}
                          <input
                            type="file"
                            accept="image/png,image/jpeg,image/gif,image/webp"
                            className="sr-only"
                            onChange={(event) => {
                              uploadEmailImage(event.target.files?.[0]);
                              event.currentTarget.value = '';
                            }}
                          />
                        </label>
                        {emailImageFile && (
                          <Button
                            type="button"
                            onClick={() => setEmailImageFile(null)}
                            variant="outline"
                            className="h-9 rounded-full border-white/15 bg-transparent text-white hover:bg-white hover:text-black"
                          >
                            Remove
                          </Button>
                        )}
                      </div>
                    </div>
                    {emailImageError && (
                      <p className="mb-4 text-xs font-semibold text-[#ffb18c]">
                        {emailImageError}
                      </p>
                    )}
                    <div className="grid gap-3 md:grid-cols-2">
                      <label className="text-xs font-semibold text-white/55">
                        Or use a public image URL
                        <Input
                          value={emailImageUrl}
                          onChange={(e) => {
                            setEmailImageUrl(e.target.value);
                            if (e.target.value) {
                              setEmailImageFile(null);
                              setShowHtml(true);
                            }
                          }}
                          placeholder="https://…/product.jpg"
                          className="mt-2 h-10 border-white/15 bg-white/8 text-white placeholder:text-white/25 focus-visible:border-[#ff5400] focus-visible:ring-0"
                        />
                      </label>
                      <label className="text-xs font-semibold text-white/55">
                        Image description
                        <Input
                          value={emailImageAlt}
                          onChange={(e) => setEmailImageAlt(e.target.value)}
                          placeholder="Product image"
                          className="mt-2 h-10 border-white/15 bg-white/8 text-white placeholder:text-white/25 focus-visible:border-[#ff5400] focus-visible:ring-0"
                        />
                      </label>
                      {emailEditorMode === 'visual' && (
                        <>
                          <label className="text-xs font-semibold text-white/55">
                            Image position
                            <Select
                              value={emailImagePosition}
                              onValueChange={(value) =>
                                value &&
                                setEmailImagePosition(
                                  value as 'top' | 'after-intro' | 'bottom',
                                )
                              }
                            >
                              <SelectTrigger className="mt-2 h-10 w-full border-white/15 bg-white/8 text-white">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent className="border border-white/15 bg-[#171717] text-white shadow-2xl">
                                <SelectItem
                                  className="bg-[#171717] text-white focus:bg-[#ff5400] focus:text-black data-selected:bg-[#ff5400] data-selected:text-black"
                                  value="top"
                                >
                                  Top of email
                                </SelectItem>
                                <SelectItem
                                  className="bg-[#171717] text-white focus:bg-[#ff5400] focus:text-black data-selected:bg-[#ff5400] data-selected:text-black"
                                  value="after-intro"
                                >
                                  After opening paragraph
                                </SelectItem>
                                <SelectItem
                                  className="bg-[#171717] text-white focus:bg-[#ff5400] focus:text-black data-selected:bg-[#ff5400] data-selected:text-black"
                                  value="bottom"
                                >
                                  After message
                                </SelectItem>
                              </SelectContent>
                            </Select>
                          </label>
                          <label className="text-xs font-semibold text-white/55">
                            Image width
                            <Select
                              value={emailImageWidth}
                              onValueChange={(value) =>
                                value &&
                                setEmailImageWidth(value as 'full' | 'medium')
                              }
                            >
                              <SelectTrigger className="mt-2 h-10 w-full border-white/15 bg-white/8 text-white">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent className="border border-white/15 bg-[#171717] text-white shadow-2xl">
                                <SelectItem
                                  className="bg-[#171717] text-white focus:bg-[#ff5400] focus:text-black data-selected:bg-[#ff5400] data-selected:text-black"
                                  value="full"
                                >
                                  Full width
                                </SelectItem>
                                <SelectItem
                                  className="bg-[#171717] text-white focus:bg-[#ff5400] focus:text-black data-selected:bg-[#ff5400] data-selected:text-black"
                                  value="medium"
                                >
                                  Medium, centered
                                </SelectItem>
                              </SelectContent>
                            </Select>
                          </label>
                        </>
                      )}
                      <label className="text-xs font-semibold text-white/55">
                        <span className="flex items-center gap-1.5">
                          <Link2 className="size-3.5" /> Button text
                        </span>
                        <Input
                          value={ctaText}
                          onChange={(e) => {
                            setCtaText(e.target.value);
                            setShowHtml(true);
                          }}
                          placeholder="View collaboration details"
                          className="mt-2 h-10 border-white/15 bg-white/8 text-white placeholder:text-white/25 focus-visible:border-[#ff5400] focus-visible:ring-0"
                        />
                      </label>
                      <label className="text-xs font-semibold text-white/55">
                        Button link
                        <Input
                          value={ctaUrl}
                          onChange={(e) => {
                            setCtaUrl(e.target.value);
                            setShowHtml(true);
                          }}
                          placeholder="brand.com/collab"
                          className="mt-2 h-10 border-white/15 bg-white/8 text-white placeholder:text-white/25 focus-visible:border-[#ff5400] focus-visible:ring-0"
                        />
                        <span className="mt-1.5 block text-[11px] leading-4 text-white/35">
                          Links without https:// are completed automatically.
                          With no link, the button is still shown as a visual
                          CTA.
                        </span>
                      </label>
                    </div>
                    {emailEditorMode === 'code' && (
                      <div className="mt-5 rounded-[18px] border border-white/12 bg-[#101010] p-4 sm:p-5">
                        <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-start">
                          <div>
                            <p className="font-bold">Custom HTML + CSS</p>
                            <p className="mt-1 max-w-2xl text-xs leading-5 text-white/40">
                              Move placeholders anywhere in the HTML. Inline
                              styles and the CSS panel are supported; unsafe
                              scripts, forms and event handlers are removed
                              before preview and sending.
                            </p>
                          </div>
                          <div className="flex shrink-0 gap-2">
                            <Button
                              type="button"
                              onClick={resetCustomTemplate}
                              variant="outline"
                              className="h-9 rounded-full border-white/15 bg-transparent text-white hover:bg-white hover:text-black"
                            >
                              Restore starter
                            </Button>
                            <Button
                              type="button"
                              onClick={saveCustomTemplate}
                              className="h-9 rounded-full bg-white px-4 font-bold text-black hover:bg-white/85"
                            >
                              Save locally
                            </Button>
                          </div>
                        </div>
                        {templateMessage && (
                          <p className="mt-3 text-xs font-semibold text-[#ff9a68]">
                            {templateMessage}
                          </p>
                        )}
                        <div className="mt-4">
                          <p className="mb-2 text-xs font-bold uppercase tracking-[.1em] text-white/40">
                            Insert placeholder
                          </p>
                          <div className="flex flex-wrap gap-2">
                            {emailPlaceholders.map((placeholder) => (
                              <button
                                type="button"
                                key={placeholder}
                                onClick={() =>
                                  setCustomEmailHtml(
                                    (value) => `${value}\n${placeholder}`,
                                  )
                                }
                                className="rounded-full border border-white/12 bg-white/6 px-2.5 py-1.5 font-mono text-[11px] text-white/65 transition hover:border-[#ff5400] hover:text-white"
                              >
                                {placeholder}
                              </button>
                            ))}
                          </div>
                        </div>
                        <div className="mt-4 grid gap-4 lg:grid-cols-[1.15fr_.85fr]">
                          <label className="text-xs font-semibold text-white/55">
                            HTML body
                            <Textarea
                              spellCheck={false}
                              value={customEmailHtml}
                              onChange={(event) => {
                                setCustomEmailHtml(event.target.value);
                                setShowHtml(true);
                              }}
                              className="mt-2 min-h-[360px] resize-y border-white/15 bg-[#080808] p-4 font-mono text-[12px] leading-5 text-[#f7f4ef] focus-visible:border-[#ff5400] focus-visible:ring-0"
                            />
                          </label>
                          <label className="text-xs font-semibold text-white/55">
                            CSS styles
                            <Textarea
                              spellCheck={false}
                              value={customEmailCss}
                              onChange={(event) => {
                                setCustomEmailCss(event.target.value);
                                setShowHtml(true);
                              }}
                              className="mt-2 min-h-[360px] resize-y border-white/15 bg-[#080808] p-4 font-mono text-[12px] leading-5 text-[#ffb28c] focus-visible:border-[#ff5400] focus-visible:ring-0"
                            />
                          </label>
                        </div>
                        <p className="mt-3 text-xs leading-5 text-white/35">
                          For the broadest Gmail and Outlook compatibility, use
                          tables for layout and inline style attributes for
                          critical formatting. JavaScript is not supported in
                          email.
                        </p>
                      </div>
                    )}
                    <label className="mt-4 flex items-center justify-between rounded-[14px] bg-white/7 px-4 py-3 text-sm font-semibold">
                      <span>Include matched product + commission block</span>
                      <Switch
                        checked={includeOffer}
                        onCheckedChange={setIncludeOffer}
                        className="data-checked:bg-[#ff5400]"
                      />
                    </label>
                    <p className="mt-3 text-xs leading-5 text-white/35">
                      The preview below and the delivered HTML are generated
                      from the same content. Uploaded images are embedded as
                      inline attachments for reliable Gmail display.
                    </p>
                  </div>
                </div>
                {showHtml && (
                  <div className="mt-4">
                    <div className="mb-2 flex items-center justify-between">
                      <p className="text-xs font-bold uppercase tracking-[.12em] text-black/40">
                        Final HTML preview
                      </p>
                      <p className="text-xs text-black/40">
                        {emailEditorMode === 'code'
                          ? 'Custom code · sanitized'
                          : 'Visual builder'}{' '}
                        · matches the sent email
                      </p>
                    </div>
                    <div className="mb-3 rounded-[14px] border border-black/10 bg-[#f1f0ed] px-4 py-3 text-sm text-black">
                      <span className="mr-2 text-xs font-bold uppercase tracking-[.1em] text-black/40">
                        Subject
                      </span>
                      <span className="font-semibold">
                        {result.subject || 'Add a subject before sending'}
                      </span>
                    </div>
                    <iframe
                      title="HTML email preview"
                      sandbox=""
                      srcDoc={emailHtml.preview}
                      className="h-[620px] w-full rounded-[18px] border border-black/10 bg-white"
                    />
                  </div>
                )}
              </article>
            </div>
          </div>
        )}
      </section>
      <footer className="border-t border-white/10 py-8 text-center text-xs text-white/30">
        Creator Outreach · Local-first MVP · Built for US TikTok Shop BD
      </footer>
    </main>
  );
}
