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
  { id: 'cloudlayer', name: 'CloudLayer Jacket', description: 'Lightweight everyday rain protection without the stiff shell look.', features: ['Waterproof', 'Lightweight', 'Oversized fit', 'Pink colorway'], matchKeywords: ['rainy weather', 'Seattle', 'outfit styling'], commission: '15%', freeSample: true },
  { id: 'softcloud', name: 'SoftCloud Hoodie', description: 'Brushed cotton oversized hoodie for cozy daily styling.', features: ['Soft-touch', 'Oversized', '6 colors'], matchKeywords: ['cozy routine', 'loungewear', 'casual outfits'], commission: '12%', freeSample: true },
  { id: 'daylight', name: 'Daylight Tote', description: 'A structured carryall for commute, coffee and content days.', features: ['Water-resistant', 'Laptop sleeve', 'Vegan leather'], matchKeywords: ['coffee runs', 'commute', 'workday', 'laptop'], commission: '18%', freeSample: false },
];

const concepts = [
  { label: 'rainy-day content', creator: ['rain', 'rainy', 'storm', 'weather', 'seattle', 'wet', 'waterproof'], product: ['rain', 'waterproof', 'water-resistant', 'jacket', 'shell'] },
  { label: 'fashion and styling', creator: ['outfit', 'fit', 'style', 'fashion', 'cute', 'look', 'wear'], product: ['outfit', 'fit', 'style', 'fashion', 'oversized', 'color', 'jacket', 'hoodie', 'leather'] },
  { label: 'comfort and cozy routines', creator: ['cozy', 'comfort', 'soft', 'home', 'lounge', 'chill'], product: ['cozy', 'comfort', 'soft', 'cotton', 'hoodie', 'brushed'] },
  { label: 'commute and coffee routines', creator: ['coffee', 'commute', 'office', 'school', 'laptop', 'carry', 'bag'], product: ['coffee', 'commute', 'laptop', 'carry', 'tote', 'bag', 'sleeve'] },
  { label: 'fitness content', creator: ['gym', 'workout', 'fitness', 'run', 'training', 'yoga'], product: ['gym', 'workout', 'fitness', 'sport', 'training', 'active'] },
  { label: 'beauty content', creator: ['beauty', 'makeup', 'skin', 'routine', 'glow', 'hair'], product: ['beauty', 'makeup', 'skin', 'serum', 'cosmetic', 'hair'] },
  { label: 'food content', creator: ['food', 'recipe', 'cook', 'kitchen', 'snack', 'drink'], product: ['food', 'recipe', 'cook', 'kitchen', 'snack', 'drink'] },
  { label: 'tech and creator workflow', creator: ['tech', 'camera', 'phone', 'desk', 'setup', 'edit'], product: ['tech', 'camera', 'phone', 'desk', 'charger', 'creator'] },
];

const words = (value: string) => value.toLowerCase().match(/[a-z0-9]+(?:-[a-z0-9]+)?/g) || [];
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

  return products.map((product) => {
    const productText = `${product.name} ${product.description} ${product.features.join(' ')} ${(product.matchKeywords || []).join(' ')}`.toLowerCase();
    const productWords = new Set(words(productText));
    const activeConcepts = concepts.filter((concept) => concept.creator.some((term) => creatorText.includes(term)) && concept.product.some((term) => productText.includes(term)));
    const directOverlap = [...creatorWords].filter((word) => word.length > 3 && productWords.has(word));
    const matchedFeatures = product.features.filter((feature) => {
      const featureText = feature.toLowerCase();
      return words(featureText).some((word) => creatorWords.has(word)) || activeConcepts.some((concept) => concept.product.some((term) => featureText.includes(term)));
    });
    const conflicts = negativeConstraints.filter((constraint) => {
      const meaningfulWords = words(constraint).filter((word) => word.length > 3);
      return meaningfulWords.some((word) => productWords.has(word));
    });
    const displayFeatures = [...new Set([...matchedFeatures, ...product.features])].slice(0, 3);
    const positiveScore = 34 + activeConcepts.length * 10 + Math.min(25, directOverlap.length * 5) + Math.min(6, matchedFeatures.length * 2) + (product.freeSample ? 2 : 0);
    const score = Math.max(1, Math.min(96, positiveScore - Math.min(45, conflicts.length * 18)));
    const evidenceIndex = transcripts.findIndex((transcript) => activeConcepts.some((concept) => concept.creator.some((term) => transcript.toLowerCase().includes(term))));
    const sourceIndex = evidenceIndex >= 0 ? evidenceIndex : transcripts.findIndex((item) => item.trim());
    const evidence = excerpt(transcripts[sourceIndex >= 0 ? sourceIndex : 0] || bio);
    const theme = activeConcepts.length ? activeConcepts.slice(0, 2).map((item) => item.label).join(' + ') : 'the creator’s recent themes';
    const featureText = displayFeatures.length ? displayFeatures.join(', ') : product.description;
    return {
      product,
      score,
      matchedFeatures: displayFeatures,
      reason: conflicts.length
        ? `${theme} connects with ${featureText}, but review this constraint: ${conflicts[0]}.`
        : `${theme} connects naturally with ${featureText}.`,
      evidence,
      source: sourceIndex >= 0 ? `Video ${sourceIndex + 1}` : 'Creator bio',
    };
  }).sort((a, b) => b.score - a.score || a.product.name.localeCompare(b.product.name));
}
