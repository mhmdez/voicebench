/**
 * Seed Prompts
 *
 * 100+ diverse prompts for testing voice AI capabilities.
 * Minimum 20 prompts per category.
 */

import type { categoryValues } from '../schema/prompts';

type Category = (typeof categoryValues)[number];

export interface SeedPrompt {
  id: string;
  category: Category;
  text: string;
  language: string;
}

/**
 * General prompts - everyday conversations and queries
 */
const generalPrompts: SeedPrompt[] = [
  { id: 'gen-001', category: 'general', text: 'What time is it in Tokyo right now?', language: 'en' },
  { id: 'gen-002', category: 'general', text: 'Can you tell me about the weather forecast for tomorrow?', language: 'en' },
  { id: 'gen-003', category: 'general', text: 'Set a reminder for my dentist appointment at 3pm.', language: 'en' },
  { id: 'gen-004', category: 'general', text: 'How do I convert Celsius to Fahrenheit?', language: 'en' },
  { id: 'gen-005', category: 'general', text: 'What are some good restaurants near me?', language: 'en' },
  { id: 'gen-006', category: 'general', text: 'Play some relaxing music.', language: 'en' },
  { id: 'gen-007', category: 'general', text: 'What is the capital of Australia?', language: 'en' },
  { id: 'gen-008', category: 'general', text: 'How long does it take to fly from New York to London?', language: 'en' },
  { id: 'gen-009', category: 'general', text: 'Tell me a joke.', language: 'en' },
  { id: 'gen-010', category: 'general', text: 'What is the meaning of the word serendipity?', language: 'en' },
  { id: 'gen-011', category: 'general', text: 'How many cups are in a gallon?', language: 'en' },
  { id: 'gen-012', category: 'general', text: 'What movies are playing this weekend?', language: 'en' },
  { id: 'gen-013', category: 'general', text: 'Can you recommend a good book to read?', language: 'en' },
  { id: 'gen-014', category: 'general', text: 'What year did World War 2 end?', language: 'en' },
  { id: 'gen-015', category: 'general', text: 'How do I tie a bow tie?', language: 'en' },
  { id: 'gen-016', category: 'general', text: 'What is the population of Japan?', language: 'en' },
  { id: 'gen-017', category: 'general', text: 'Can you help me calculate a 20% tip on $85?', language: 'en' },
  { id: 'gen-018', category: 'general', text: 'What are the opening hours of the library?', language: 'en' },
  { id: 'gen-019', category: 'general', text: 'How do I change a flat tire?', language: 'en' },
  { id: 'gen-020', category: 'general', text: 'What is the difference between affect and effect?', language: 'en' },
  { id: 'gen-021', category: 'general', text: 'Can you explain how solar panels work?', language: 'en' },
  { id: 'gen-022', category: 'general', text: 'What are some healthy breakfast ideas?', language: 'en' },
  { id: 'gen-023', category: 'general', text: 'How do I reset my wifi router?', language: 'en' },
  { id: 'gen-024', category: 'general', text: 'What is the speed of light?', language: 'en' },
  { id: 'gen-025', category: 'general', text: 'Tell me something interesting about octopuses.', language: 'en' },
];

/**
 * Customer support prompts - service inquiries and complaints
 */
const customerSupportPrompts: SeedPrompt[] = [
  { id: 'cs-001', category: 'customer-support', text: 'I need to return an item I purchased last week.', language: 'en' },
  { id: 'cs-002', category: 'customer-support', text: 'My order hasn\'t arrived yet. Can you help me track it?', language: 'en' },
  { id: 'cs-003', category: 'customer-support', text: 'I was charged twice for the same purchase.', language: 'en' },
  { id: 'cs-004', category: 'customer-support', text: 'How do I cancel my subscription?', language: 'en' },
  { id: 'cs-005', category: 'customer-support', text: 'I forgot my password and can\'t reset it.', language: 'en' },
  { id: 'cs-006', category: 'customer-support', text: 'The product I received is damaged. What should I do?', language: 'en' },
  { id: 'cs-007', category: 'customer-support', text: 'Can I change the shipping address for my order?', language: 'en' },
  { id: 'cs-008', category: 'customer-support', text: 'I need to speak to a manager about my complaint.', language: 'en' },
  { id: 'cs-009', category: 'customer-support', text: 'What is your refund policy?', language: 'en' },
  { id: 'cs-010', category: 'customer-support', text: 'My coupon code isn\'t working at checkout.', language: 'en' },
  { id: 'cs-011', category: 'customer-support', text: 'How long does standard shipping usually take?', language: 'en' },
  { id: 'cs-012', category: 'customer-support', text: 'I want to file a warranty claim for my device.', language: 'en' },
  { id: 'cs-013', category: 'customer-support', text: 'Can you help me update my billing information?', language: 'en' },
  { id: 'cs-014', category: 'customer-support', text: 'The feature I need isn\'t working in the app.', language: 'en' },
  { id: 'cs-015', category: 'customer-support', text: 'I accidentally deleted my account. Can you recover it?', language: 'en' },
  { id: 'cs-016', category: 'customer-support', text: 'What payment methods do you accept?', language: 'en' },
  { id: 'cs-017', category: 'customer-support', text: 'I received the wrong item in my order.', language: 'en' },
  { id: 'cs-018', category: 'customer-support', text: 'How do I upgrade my plan to premium?', language: 'en' },
  { id: 'cs-019', category: 'customer-support', text: 'My internet connection keeps dropping. Can you help?', language: 'en' },
  { id: 'cs-020', category: 'customer-support', text: 'I\'d like to provide feedback about my experience.', language: 'en' },
  { id: 'cs-021', category: 'customer-support', text: 'Is there a way to expedite my shipment?', language: 'en' },
  { id: 'cs-022', category: 'customer-support', text: 'I need help setting up my new device.', language: 'en' },
];

/**
 * Information retrieval prompts - fact-finding and research queries
 */
const informationRetrievalPrompts: SeedPrompt[] = [
  { id: 'ir-001', category: 'information-retrieval', text: 'What are the symptoms of vitamin D deficiency?', language: 'en' },
  { id: 'ir-002', category: 'information-retrieval', text: 'Explain quantum computing in simple terms.', language: 'en' },
  { id: 'ir-003', category: 'information-retrieval', text: 'What caused the 2008 financial crisis?', language: 'en' },
  { id: 'ir-004', category: 'information-retrieval', text: 'How does the immune system fight viruses?', language: 'en' },
  { id: 'ir-005', category: 'information-retrieval', text: 'What are the main differences between capitalism and socialism?', language: 'en' },
  { id: 'ir-006', category: 'information-retrieval', text: 'Explain how blockchain technology works.', language: 'en' },
  { id: 'ir-007', category: 'information-retrieval', text: 'What is the greenhouse effect and why is it important?', language: 'en' },
  { id: 'ir-008', category: 'information-retrieval', text: 'How do vaccines work to protect against diseases?', language: 'en' },
  { id: 'ir-009', category: 'information-retrieval', text: 'What were the main achievements of the Renaissance?', language: 'en' },
  { id: 'ir-010', category: 'information-retrieval', text: 'Explain the theory of relativity in layman\'s terms.', language: 'en' },
  { id: 'ir-011', category: 'information-retrieval', text: 'What are the different types of renewable energy sources?', language: 'en' },
  { id: 'ir-012', category: 'information-retrieval', text: 'How does GPS technology work?', language: 'en' },
  { id: 'ir-013', category: 'information-retrieval', text: 'What is the difference between weather and climate?', language: 'en' },
  { id: 'ir-014', category: 'information-retrieval', text: 'Explain how the stock market works.', language: 'en' },
  { id: 'ir-015', category: 'information-retrieval', text: 'What are the health benefits of intermittent fasting?', language: 'en' },
  { id: 'ir-016', category: 'information-retrieval', text: 'How did the internet transform communication?', language: 'en' },
  { id: 'ir-017', category: 'information-retrieval', text: 'What is machine learning and how is it used?', language: 'en' },
  { id: 'ir-018', category: 'information-retrieval', text: 'Explain the process of photosynthesis.', language: 'en' },
  { id: 'ir-019', category: 'information-retrieval', text: 'What are the major causes of climate change?', language: 'en' },
  { id: 'ir-020', category: 'information-retrieval', text: 'How does the electoral college work in the US?', language: 'en' },
  { id: 'ir-021', category: 'information-retrieval', text: 'What is CRISPR and why is it revolutionary?', language: 'en' },
  { id: 'ir-022', category: 'information-retrieval', text: 'Explain how inflation affects the economy.', language: 'en' },
];

/**
 * Creative prompts - storytelling, brainstorming, and creative tasks
 */
const creativePrompts: SeedPrompt[] = [
  { id: 'cr-001', category: 'creative', text: 'Write a short poem about the ocean.', language: 'en' },
  { id: 'cr-002', category: 'creative', text: 'Tell me a bedtime story about a brave little mouse.', language: 'en' },
  { id: 'cr-003', category: 'creative', text: 'Come up with five creative names for a coffee shop.', language: 'en' },
  { id: 'cr-004', category: 'creative', text: 'Describe a sunset in a way I\'ve never heard before.', language: 'en' },
  { id: 'cr-005', category: 'creative', text: 'Write a haiku about autumn leaves.', language: 'en' },
  { id: 'cr-006', category: 'creative', text: 'Create a short story about a time traveler who gets stuck.', language: 'en' },
  { id: 'cr-007', category: 'creative', text: 'What would a conversation between the sun and moon sound like?', language: 'en' },
  { id: 'cr-008', category: 'creative', text: 'Write a limerick about a clumsy chef.', language: 'en' },
  { id: 'cr-009', category: 'creative', text: 'Describe what happiness tastes like.', language: 'en' },
  { id: 'cr-010', category: 'creative', text: 'Create a superhero with an unusual power and backstory.', language: 'en' },
  { id: 'cr-011', category: 'creative', text: 'Write an opening line for a mystery novel.', language: 'en' },
  { id: 'cr-012', category: 'creative', text: 'Imagine you\'re a raindrop. Describe your journey.', language: 'en' },
  { id: 'cr-013', category: 'creative', text: 'Come up with a creative excuse for being late to work.', language: 'en' },
  { id: 'cr-014', category: 'creative', text: 'Write a love letter from a robot to a toaster.', language: 'en' },
  { id: 'cr-015', category: 'creative', text: 'Describe a color to someone who has never seen it.', language: 'en' },
  { id: 'cr-016', category: 'creative', text: 'Create a tongue twister about purple penguins.', language: 'en' },
  { id: 'cr-017', category: 'creative', text: 'Write a recipe for the perfect lazy Sunday.', language: 'en' },
  { id: 'cr-018', category: 'creative', text: 'Describe what silence sounds like in the desert.', language: 'en' },
  { id: 'cr-019', category: 'creative', text: 'Create a dialogue between a cat and a dog who are roommates.', language: 'en' },
  { id: 'cr-020', category: 'creative', text: 'Write an acceptance speech for winning the award of Best Napper.', language: 'en' },
  { id: 'cr-021', category: 'creative', text: 'Describe your dream vacation destination that doesn\'t exist.', language: 'en' },
  { id: 'cr-022', category: 'creative', text: 'Write a motivational speech from a houseplant\'s perspective.', language: 'en' },
];

/**
 * Multilingual prompts - various languages for testing language support
 */
const multilingualPrompts: SeedPrompt[] = [
  // Spanish
  { id: 'ml-001', category: 'multilingual', text: '¿Cuál es la mejor manera de aprender un nuevo idioma?', language: 'es' },
  { id: 'ml-002', category: 'multilingual', text: '¿Puedes recomendarme un buen restaurante en Madrid?', language: 'es' },
  { id: 'ml-003', category: 'multilingual', text: '¿Qué hora es en Buenos Aires ahora mismo?', language: 'es' },
  { id: 'ml-004', category: 'multilingual', text: 'Cuéntame sobre la historia de México.', language: 'es' },
  // French
  { id: 'ml-005', category: 'multilingual', text: 'Quelle est la météo prévue pour demain à Paris?', language: 'fr' },
  { id: 'ml-006', category: 'multilingual', text: 'Pouvez-vous m\'expliquer comment faire une crêpe?', language: 'fr' },
  { id: 'ml-007', category: 'multilingual', text: 'Quels sont les meilleurs musées à visiter en France?', language: 'fr' },
  { id: 'ml-008', category: 'multilingual', text: 'Comment dit-on bonjour en différentes langues?', language: 'fr' },
  // German
  { id: 'ml-009', category: 'multilingual', text: 'Wie funktioniert das deutsche Bildungssystem?', language: 'de' },
  { id: 'ml-010', category: 'multilingual', text: 'Kannst du mir bei meinen Deutschhausaufgaben helfen?', language: 'de' },
  { id: 'ml-011', category: 'multilingual', text: 'Was sind die beliebtesten deutschen Gerichte?', language: 'de' },
  { id: 'ml-012', category: 'multilingual', text: 'Erzähl mir etwas über die Geschichte Berlins.', language: 'de' },
  // Arabic
  { id: 'ml-013', category: 'multilingual', text: 'ما هي أفضل الأماكن السياحية في دبي؟', language: 'ar' },
  { id: 'ml-014', category: 'multilingual', text: 'كيف يمكنني تعلم اللغة العربية بسرعة؟', language: 'ar' },
  { id: 'ml-015', category: 'multilingual', text: 'أخبرني عن تاريخ الحضارة الإسلامية.', language: 'ar' },
  { id: 'ml-016', category: 'multilingual', text: 'ما هو الطقس المتوقع في الرياض غداً؟', language: 'ar' },
  // Japanese
  { id: 'ml-017', category: 'multilingual', text: '東京でおすすめの観光スポットはどこですか？', language: 'ja' },
  { id: 'ml-018', category: 'multilingual', text: '日本の伝統文化について教えてください。', language: 'ja' },
  { id: 'ml-019', category: 'multilingual', text: '今日の天気はどうですか？', language: 'ja' },
  { id: 'ml-020', category: 'multilingual', text: '簡単な日本料理のレシピを教えてください。', language: 'ja' },
  // Portuguese
  { id: 'ml-021', category: 'multilingual', text: 'Qual é a diferença entre português brasileiro e europeu?', language: 'pt' },
  { id: 'ml-022', category: 'multilingual', text: 'Pode me contar sobre o carnaval do Rio de Janeiro?', language: 'pt' },
  // Chinese
  { id: 'ml-023', category: 'multilingual', text: '你能告诉我关于中国春节的传统吗？', language: 'zh' },
  { id: 'ml-024', category: 'multilingual', text: '北京有哪些著名的旅游景点？', language: 'zh' },
  // Italian
  { id: 'ml-025', category: 'multilingual', text: 'Qual è la ricetta tradizionale della pasta carbonara?', language: 'it' },
  { id: 'ml-026', category: 'multilingual', text: 'Puoi raccontarmi la storia del Colosseo?', language: 'it' },
  // Hindi
  { id: 'ml-027', category: 'multilingual', text: 'भारत की सबसे लोकप्रिय त्योहार कौन से हैं?', language: 'hi' },
  { id: 'ml-028', category: 'multilingual', text: 'क्या आप मुझे ताजमहल के बारे में बता सकते हैं?', language: 'hi' },
];

/**
 * All seed prompts combined
 */
export const seedPrompts: SeedPrompt[] = [
  ...generalPrompts,
  ...customerSupportPrompts,
  ...informationRetrievalPrompts,
  ...creativePrompts,
  ...multilingualPrompts,
];

/**
 * Get prompts by category
 */
export function getPromptsByCategory(category: Category): SeedPrompt[] {
  return seedPrompts.filter((p) => p.category === category);
}

/**
 * Summary of prompts
 */
export const promptSummary = {
  total: seedPrompts.length,
  general: generalPrompts.length,
  customerSupport: customerSupportPrompts.length,
  informationRetrieval: informationRetrievalPrompts.length,
  creative: creativePrompts.length,
  multilingual: multilingualPrompts.length,
};
