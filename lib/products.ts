export type Product = {
  id: string;
  name: string;
  description: string;
  features: string[];
  matchKeywords?: string[];
  commission: string;
  freeSample: boolean;
};

export type ProductMatch = {
  product: Product;
  score: number;
  matchedFeatures: string[];
  reason: string;
  evidence: string;
  source: string;
};

export const defaultProducts: Product[] = [
  {
    id: 'kreg-k4-pocket-hole-jig-system',
    name: 'Kreg K4 Pocket-Hole Jig System',
    description:
      'Pocket-hole jig system for woodworking and DIY furniture projects.',
    features: [
      'Precise',
      'Easy to use',
      'Adjustable',
      'Woodworking essential',
      'DIY furniture-ready',
    ],
    matchKeywords: ['woodworking', 'DIY furniture', 'workshop', 'tools'],
    commission: '10%',
    freeSample: true,
  },
  {
    id: 'urban-decay-naked3-eyeshadow-palette',
    name: 'Urban Decay Naked3 Eyeshadow Palette',
    description:
      'Rose-toned eyeshadow palette for everyday and tutorial looks.',
    features: [
      '12 shades',
      'Rose tones',
      'Matte/shimmer',
      'Blendable',
      'Classic palette',
    ],
    matchKeywords: ['makeup tutorial', 'eyeshadow', 'beauty'],
    commission: '10%',
    freeSample: true,
  },
  {
    id: 'maybelline-super-stay-vinyl-ink-liquid-lipcolor',
    name: 'Maybelline Super Stay Vinyl Ink Liquid Lipcolor',
    description:
      'Long-wear liquid lipcolor for beauty looks and outfit styling.',
    features: [
      'Long-wear',
      'Transfer-resistant',
      'High pigment',
      'Many shades',
      'Affordable',
    ],
    matchKeywords: ['makeup', 'outfit', 'OOTD', 'beauty'],
    commission: '10%',
    freeSample: true,
  },
  {
    id: 'command-picture-hanging-strips',
    name: 'Command Picture Hanging Strips',
    description:
      'Damage-free hanging strips for affordable home decor and rental-friendly makeovers.',
    features: [
      'Damage-free',
      'No nails',
      'Strong hold',
      'Easy to use',
      'Budget-friendly',
    ],
    matchKeywords: [
      'budget DIY',
      'home decor',
      'money-saving',
      'rental friendly',
    ],
    commission: '10%',
    freeSample: true,
  },
  {
    id: 'ring-video-doorbell-4',
    name: 'Ring Video Doorbell 4',
    description: 'Smart doorbell for tech reviews and smart home setup.',
    features: [
      '1080p',
      'Two-way talk',
      'Motion detection',
      'Easy install',
      'Battery-powered',
    ],
    matchKeywords: ['tech review', 'smart home', 'gadget'],
    commission: '10%',
    freeSample: true,
  },
  {
    id: 'renogy-100w-solar-starter-kit',
    name: 'Renogy 100W Solar Starter Kit',
    description:
      'Off-grid solar starter kit with transparent cost and practical DIY setup.',
    features: [
      '100W',
      'Monocrystalline',
      'Charge controller',
      'Off-grid',
      'Value',
    ],
    matchKeywords: ['off-grid', 'solar', 'self-sufficient'],
    commission: '10%',
    freeSample: true,
  },
  {
    id: 'dewalt-20v-max-cordless-drill-combo-kit',
    name: 'DeWalt 20V MAX Cordless Drill Combo Kit',
    description:
      'Cordless power tool kit for DIY projects, farm renovation, and home upgrades.',
    features: [
      'Cordless',
      'Powerful',
      'Durable',
      'Multi-tool',
      'Farm/DIY-ready',
    ],
    matchKeywords: ['DIY project', 'farm renovation', 'home improvement'],
    commission: '10%',
    freeSample: true,
  },
  {
    id: 'coleman-sundome-4-person-tent',
    name: 'Coleman Sundome 4-Person Tent',
    description: 'Family camping tent for couples, kids, and weekend camping.',
    features: ['Easy setup', 'Rainfly', 'Spacious', 'Value', 'Family-friendly'],
    matchKeywords: ['camping', 'couple daily', 'parenting'],
    commission: '10%',
    freeSample: true,
  },
  {
    id: 'anker-nebula-capsule-portable-projector',
    name: 'Anker Nebula Capsule Portable Projector',
    description:
      'Portable smart projector for road trips, date nights, and daily entertainment.',
    features: [
      'Portable',
      '1080p',
      'Auto focus',
      'Built-in battery',
      'Outdoor-ready',
    ],
    matchKeywords: ['road trip', 'date night', 'travel vlog', 'product review'],
    commission: '10%',
    freeSample: true,
  },
  {
    id: 'camp-string-lights',
    name: 'Camp String Lights',
    description: '',
    features: [],
    matchKeywords: [],
    commission: '15%',
    freeSample: true,
  },
];

const legacyDefaultProductIds = new Set([
  'cloudlayer',
  'softcloud',
  'daylight',
]);

const productNameKey = (name: string) => name.trim().toLowerCase();

export function mergeSavedProducts(savedProducts: Product[]) {
  const saved = savedProducts.filter(
    (product) => !legacyDefaultProductIds.has(product.id),
  );
  const savedByName = new Map(
    saved.map((product) => [productNameKey(product.name), product]),
  );
  const mergedDefaults = defaultProducts.map(
    (product) => savedByName.get(productNameKey(product.name)) || product,
  );
  const defaultNames = new Set(
    defaultProducts.map((product) => productNameKey(product.name)),
  );
  return [
    ...mergedDefaults,
    ...saved.filter(
      (product) => !defaultNames.has(productNameKey(product.name)),
    ),
  ];
}

const concepts = [
  {
    label: 'DIY, craft and maker projects',
    creator: [
      'diy',
      'craft',
      'maker',
      'woodwork',
      'build',
      'renovation',
      'home improvement',
      'paint',
      'art',
      'workshop',
      'tools',
      'furniture',
      'upcycle',
    ],
    product: [
      'diy',
      'craft',
      'maker',
      'tool',
      'paint',
      'acrylic',
      'coating',
      'sealant',
      'varnish',
      'remover',
      'cleaner',
      'adhesive',
      'wood',
      'repair',
      'protective',
      'workshop',
    ],
  },
  {
    label: 'rainy-day content',
    creator: [
      'rain',
      'rainy',
      'storm',
      'weather',
      'seattle',
      'wet',
      'waterproof',
    ],
    product: ['rain', 'waterproof', 'water-resistant', 'jacket', 'shell'],
  },
  {
    label: 'fashion and styling',
    creator: ['outfit', 'fit', 'style', 'fashion', 'cute', 'look', 'wear'],
    product: [
      'outfit',
      'fit',
      'style',
      'fashion',
      'oversized',
      'color',
      'jacket',
      'hoodie',
      'leather',
    ],
  },
  {
    label: 'comfort and cozy routines',
    creator: ['cozy', 'comfort', 'soft', 'home', 'lounge', 'chill'],
    product: ['cozy', 'comfort', 'soft', 'cotton', 'hoodie', 'brushed'],
  },
  {
    label: 'commute and coffee routines',
    creator: [
      'coffee',
      'commute',
      'office',
      'school',
      'laptop',
      'carry',
      'bag',
    ],
    product: ['coffee', 'commute', 'laptop', 'carry', 'tote', 'bag', 'sleeve'],
  },
  {
    label: 'fitness content',
    creator: ['gym', 'workout', 'fitness', 'run', 'training', 'yoga'],
    product: ['gym', 'workout', 'fitness', 'sport', 'training', 'active'],
  },
  {
    label: 'beauty content',
    creator: ['beauty', 'makeup', 'skin', 'routine', 'glow', 'hair'],
    product: ['beauty', 'makeup', 'skin', 'serum', 'cosmetic', 'hair'],
  },
  {
    label: 'food content',
    creator: ['food', 'recipe', 'cook', 'kitchen', 'snack', 'drink'],
    product: ['food', 'recipe', 'cook', 'kitchen', 'snack', 'drink'],
  },
  {
    label: 'tech and creator workflow',
    creator: ['tech', 'camera', 'phone', 'desk', 'setup', 'edit'],
    product: ['tech', 'camera', 'phone', 'desk', 'charger', 'creator'],
  },
];

const words = (value: string) =>
  value.toLowerCase().match(/[a-z0-9]+(?:-[a-z0-9]+)?/g) || [];
const excerpt = (value: string) => {
  const sentence = value.trim().split(/(?<=[.!?])\s+/)[0] || value.trim();
  return sentence.length > 150 ? `${sentence.slice(0, 147)}…` : sentence;
};

export function rankProducts(
  products: Product[],
  transcripts: string[],
  bio: string,
  negativeConstraints: string[] = [],
): ProductMatch[] {
  const creatorText = `${bio} ${transcripts.join(' ')}`.toLowerCase();
  const creatorWords = new Set(words(creatorText));

  return products
    .map((product) => {
      const productText =
        `${product.name} ${product.description} ${product.features.join(' ')} ${(product.matchKeywords || []).join(' ')}`.toLowerCase();
      const productWords = new Set(words(productText));
      const creatorConcepts = concepts.filter((concept) =>
        concept.creator.some((term) => creatorText.includes(term)),
      );
      const activeConcepts = creatorConcepts.filter((concept) =>
        concept.product.some((term) => productText.includes(term)),
      );
      const directOverlap = [...creatorWords].filter(
        (word) => word.length > 3 && productWords.has(word),
      );
      const matchedFeatures = product.features.filter((feature) => {
        const featureText = feature.toLowerCase();
        return (
          words(featureText).some((word) => creatorWords.has(word)) ||
          activeConcepts.some((concept) =>
            concept.product.some((term) => featureText.includes(term)),
          )
        );
      });
      const conflicts = negativeConstraints.filter((constraint) => {
        const meaningfulWords = words(constraint).filter(
          (word) => word.length > 3,
        );
        return meaningfulWords.some((word) => productWords.has(word));
      });
      const displayFeatures = [
        ...new Set([...matchedFeatures, ...product.features]),
      ].slice(0, 3);
      // A compatible use scene is stronger evidence than exact word overlap.
      // This lets broad niches such as DIY match adjacent supplies (paint,
      // coatings, cleaners, tools) even when the latest video names a different
      // project. Exact terms still improve ordering inside the same scene.
      const sceneCompatibilityScore = activeConcepts.length
        ? 42 + Math.min(16, (activeConcepts.length - 1) * 8)
        : 0;
      const personaContextScore = creatorConcepts.length ? 5 : 0;
      const positiveScore =
        28 +
        sceneCompatibilityScore +
        personaContextScore +
        Math.min(18, directOverlap.length * 3) +
        Math.min(8, matchedFeatures.length * 2) +
        (product.freeSample ? 2 : 0);
      const score = Math.max(
        1,
        Math.min(96, positiveScore - Math.min(45, conflicts.length * 18)),
      );
      const evidenceIndex = transcripts.findIndex((transcript) =>
        activeConcepts.some((concept) =>
          concept.creator.some((term) =>
            transcript.toLowerCase().includes(term),
          ),
        ),
      );
      const sourceIndex =
        evidenceIndex >= 0
          ? evidenceIndex
          : transcripts.findIndex((item) => item.trim());
      const evidence = excerpt(
        transcripts[sourceIndex >= 0 ? sourceIndex : 0] || bio,
      );
      const theme = activeConcepts.length
        ? activeConcepts
            .slice(0, 2)
            .map((item) => item.label)
            .join(' + ')
        : creatorConcepts.length
          ? `${creatorConcepts[0].label}, but without a clear product-use scene yet`
          : 'the creator’s recent themes';
      const featureText = displayFeatures.length
        ? displayFeatures.join(', ')
        : product.description;
      return {
        product,
        score,
        matchedFeatures: displayFeatures,
        reason: conflicts.length
          ? `${theme} connects with ${featureText}, but review this constraint: ${conflicts[0]}.`
          : activeConcepts.length
            ? `${theme} fits the creator’s audience profile and gives ${featureText} a natural role in an existing content scene.`
            : `${theme} has limited scene-level support for ${featureText}.`,
        evidence,
        source: sourceIndex >= 0 ? `Video ${sourceIndex + 1}` : 'Creator bio',
      };
    })
    .sort(
      (a, b) =>
        b.score - a.score || a.product.name.localeCompare(b.product.name),
    );
}
