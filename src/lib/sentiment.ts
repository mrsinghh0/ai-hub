const POSITIVE_WORDS = [
  'happy', 'great', 'awesome', 'love', 'excellent', 'wonderful', 'amazing', 'fantastic',
  'good', 'nice', 'thanks', 'thank you', 'perfect', 'brilliant', 'helpful', 'appreciate',
  'glad', 'excited', 'enjoy', 'beautiful', 'best', 'pleased', 'delighted', 'superb',
  'outstanding', 'impressive', 'cool', 'sweet', 'amazing', 'rock', 'nailed', 'exactly',
  'yes', 'agree', 'correct', 'right', 'awesome', 'yay', 'woohoo', 'haha', 'lol',
  '😊', '👍', '❤️', '🎉', '💪', '👏', '🌟', '✨', '💯', '🥳',
];

const NEGATIVE_WORDS = [
  'angry', 'frustrated', 'terrible', 'awful', 'hate', 'bad', 'worst', 'annoyed',
  'disappointed', 'upset', 'confused', 'stuck', 'broken', 'error', 'fail', 'ugly',
  'horrible', 'disgusting', 'stupid', 'useless', 'sick', 'tired', 'depressed', 'sad',
  'unhappy', 'wrong', 'no', 'not working', 'doesn\'t work', 'cant', "can't", 'doesn\'t',
  'problem', 'issue', 'bug', 'crash', 'slow', 'pain', 'sorry', 'help', 'please fix',
  '😞', '😡', '😭', '😤', '👎', '💔', '🤦', '😤', '😠',
];

export interface SentimentResult {
  label: 'positive' | 'negative' | 'neutral';
  score: number;
  emoji: string;
  tone: string;
}

export function analyzeSentiment(text: string): SentimentResult {
  const lower = text.toLowerCase();
  const words = lower.split(/\s+/);

  let posScore = 0;
  let negScore = 0;

  for (const word of POSITIVE_WORDS) {
    if (lower.includes(word)) posScore += 1;
  }

  for (const word of NEGATIVE_WORDS) {
    if (lower.includes(word)) negScore += 1;
  }

  // Boost for exclamation marks
  const exclamations = (text.match(/!/g) || []).length;
  if (exclamations > 1) {
    if (posScore > negScore) posScore += exclamations * 0.5;
    else if (negScore > posScore) negScore += exclamations * 0.5;
  }

  // Boost for question marks (uncertainty)
  const questions = (text.match(/\?/g) || []).length;
  if (questions > 1) negScore += questions * 0.2;

  // Caps lock (shouting)
  const capsRatio = (text.replace(/[^A-Z]/g, '').length) / Math.max(text.length, 1);
  if (capsRatio > 0.4 && text.length > 5) {
    negScore += 1;
  }

  const total = posScore + negScore;
  if (total === 0) {
    return { label: 'neutral', score: 0, emoji: '😐', tone: 'balanced' };
  }

  const ratio = posScore / total;
  if (ratio > 0.6) {
    return { label: 'positive', score: Math.min(ratio, 1), emoji: '😊', tone: 'positive' };
  } else if (ratio < 0.4) {
    return { label: 'negative', score: Math.min(1 - ratio, 1), emoji: '😞', tone: 'negative' };
  }

  return { label: 'neutral', score: 0.5, emoji: '😐', tone: 'balanced' };
}

export function getMoodAdaptivePrompt(sentiment: string): string {
  switch (sentiment) {
    case 'positive':
      return '\n\n[Context: The user seems happy and positive. Match their upbeat energy while remaining helpful.]';
    case 'negative':
      return '\n\n[Context: The user may be frustrated or upset. Be extra patient, empathetic, and supportive. Acknowledge their feelings before providing solutions. Use a calming, reassuring tone.]';
    default:
      return '';
  }
}

export function getSentimentColor(label: string): string {
  switch (label) {
    case 'positive': return 'text-emerald-500';
    case 'negative': return 'text-red-500';
    default: return 'text-muted-foreground';
  }
}
