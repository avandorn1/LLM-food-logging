import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { startOfDay } from "date-fns";

const MessageSchema = z.object({
  message: z.string().min(1),
  userId: z.number().optional(),
  day: z.string().datetime().optional(),
  conversationHistory: z.array(z.object({
    role: z.enum(["user", "assistant"]),
    content: z.string(),
  })).optional(),
});

const ParsedLogSchema = z.object({
  item: z.string(),
  mealType: z.string().optional(),
  quantity: z.number().optional(),
  unit: z.string().optional(),
  calories: z.number().optional(),
  protein: z.number().optional(),
  carbs: z.number().optional(),
  fat: z.number().optional(),
  fiber: z.number().optional(),
  sugar: z.number().optional(),
  sodium: z.number().optional(),
  notes: z.string().optional(),
});

const ParsedGoalsSchema = z.object({
  targetCalories: z.number().int().optional(),
  targetProtein: z.number().int().optional(),
  targetCarbs: z.number().int().optional(),
  targetFat: z.number().int().optional(),
}).partial();

const ModelOutputSchema = z.object({
  action: z.enum(["log", "set_goals", "chat", "mixed", "remove", "confirm"]).optional(),
  day: z.string().optional(),
  logs: z.array(ParsedLogSchema).optional(),
  goals: ParsedGoalsSchema.optional(),
  itemsToRemove: z.array(z.object({
    id: z.number().optional(),
    item: z.string(),
    mealType: z.string().optional(),
  })).optional(),
  needsConfirmation: z.boolean().optional(),
  reply: z.string().optional(),
});

function extractFirstJson(text: string): unknown | null {
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start === -1 || end === -1 || end <= start) return null;
  const jsonStr = text.slice(start, end + 1);
  try {
    return JSON.parse(jsonStr);
  } catch {
    return null;
  }
}

function getOpenAIClient() {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error("OPENAI_API_KEY is not set");
  }
  return new OpenAI({ apiKey });
}

function getErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  try {
    return String(error);
  } catch {
    return "Unexpected error";
  }
}

// Build 2-3 food suggestions aligned to remaining macros/calories
function buildSuggestions(
  remaining: { calories: number; protein: number; carbs: number; fat: number },
  goals?: { targetCalories?: number; targetProtein?: number; targetCarbs?: number; targetFat?: number },
  excludeTitles?: Set<string>,
  preference?: string
) {
  const caloriesLeft = remaining.calories;
  const proteinLeft = remaining.protein;
  const carbsLeft = remaining.carbs;
  const fatLeft = remaining.fat;

  const s = (title: string, c: number, p: number, carb: number, f: number) => ({ title, c, p, carb, f });

  const lowCal = [
    s("Greek yogurt (3/4 cup) + berries (1/2 cup)", 150, 15, 15, 2),
    s("Egg whites scramble (6 egg whites) + spinach", 140, 24, 3, 1),
    s("Cottage cheese (1/2 cup) + cucumber", 120, 14, 6, 3),
  ];
  const highProtein = [
    s("Grilled chicken (4 oz) + baby carrots", 220, 32, 10, 5),
    s("Tuna packet + whole-grain crackers (6)", 230, 22, 18, 7),
    s("Egg white omelet (3 whites) + salsa", 170, 18, 4, 6),
    s("Greek yogurt (1 cup) + protein granola (1/4 cup)", 280, 28, 28, 6),
  ];
  const highCarb = [
    s("Banana + 2 tbsp peanut butter", 280, 8, 35, 13),
    s("Oatmeal (1/2 cup dry) + whey (1/2 scoop)", 260, 14, 38, 5),
    s("Whole-grain toast (2) + jam", 220, 6, 42, 3),
  ];
  const highFat = [
    s("Avocado toast (1 slice, 1/2 avocado)", 240, 5, 22, 15),
    s("Trail mix (1/4 cup)", 180, 5, 14, 12),
    s("Cheese (1 oz) + apple", 180, 7, 19, 9),
  ];
  const balanced = [
    s("Turkey wrap (3 oz turkey, tortilla, greens)", 300, 24, 28, 9),
    s("Chicken salad (4 oz chicken, greens, vinaigrette)", 350, 32, 10, 18),
    s("Quinoa bowl (1 cup quinoa, veggies)", 400, 14, 70, 8),
    s("Greek yogurt parfait (yogurt, berries, granola)", 310, 24, 40, 10),
  ];

  // Tuna-specific options
  const tunaOptions = [
    s("Tuna salad sandwich (tuna, mayo, celery, bread)", 320, 28, 30, 12),
    s("Tuna melt (tuna, cheese, bread, grilled)", 380, 32, 28, 18),
    s("Tuna pasta salad (tuna, pasta, veggies, light dressing)", 420, 26, 52, 14),
    s("Tuna and crackers (tuna packet + 8 crackers)", 280, 24, 24, 10),
    s("Tuna lettuce wraps (tuna, lettuce, avocado)", 260, 26, 8, 16),
  ];

  // Chicken-specific options
  const chickenOptions = [
    s("Chicken breast with rice (4 oz chicken, 1/2 cup rice)", 380, 36, 45, 8),
    s("Chicken stir-fry (4 oz chicken, mixed veggies, soy sauce)", 320, 32, 20, 12),
    s("Chicken soup (chicken, broth, veggies, noodles)", 280, 24, 32, 8),
    s("Chicken sandwich (4 oz chicken, bread, lettuce, tomato)", 340, 32, 36, 10),
    s("Chicken and sweet potato (4 oz chicken, 1 medium potato)", 420, 36, 52, 12),
  ];

  // Fish-specific options
  const fishOptions = [
    s("Salmon fillet (4 oz) + steamed broccoli", 320, 28, 8, 20),
    s("Cod with quinoa (4 oz cod, 1/2 cup quinoa)", 340, 32, 42, 8),
    s("Shrimp stir-fry (4 oz shrimp, mixed veggies)", 240, 24, 16, 8),
    s("Fish tacos (4 oz white fish, tortillas, slaw)", 360, 28, 32, 16),
  ];

  // Vegetarian options
  const vegOptions = [
    s("Hummus and pita (1/2 cup hummus, 2 pitas)", 380, 16, 52, 16),
    s("Bean burrito (beans, rice, tortilla, cheese)", 420, 18, 68, 12),
    s("Lentil soup (1 cup lentils, broth, veggies)", 280, 18, 48, 4),
    s("Tofu stir-fry (4 oz tofu, mixed veggies, soy sauce)", 240, 16, 20, 12),
  ];

  // Light options
  const lightOptions = [
    s("Cucumber and hummus (1/2 cup hummus, 1 cucumber)", 180, 8, 20, 8),
    s("Celery and peanut butter (2 tbsp pb, 4 stalks)", 200, 8, 12, 16),
    s("Apple with cheese (1 apple, 1 oz cheese)", 180, 6, 22, 8),
    s("Carrot sticks and ranch (1 cup carrots, 2 tbsp ranch)", 120, 2, 12, 8),
  ];

  // Build a pool based on preference and gaps
  let pool = [] as Array<ReturnType<typeof s>>;
  
  if (preference) {
    const pref = preference.toLowerCase();
    // Yogurt-specific options
    if (pref.includes("yogurt")) {
      pool = [
        s("Greek yogurt parfait (yogurt, berries, granola)", 310, 24, 40, 10),
        s("Greek yogurt (1 cup) + protein granola (1/4 cup)", 280, 28, 28, 6),
        s("Greek yogurt (3/4 cup) + berries (1/2 cup)", 150, 15, 15, 2),
        s("Yogurt smoothie (yogurt, banana, protein powder)", 320, 26, 42, 8),
        s("Yogurt bowl (yogurt, honey, nuts, fruit)", 280, 18, 32, 12),
      ];
    }
    // Other specific food preferences
    else if (pref.includes("tuna")) pool = [...tunaOptions];
    else if (pref.includes("chicken")) pool = [...chickenOptions];
    else if (pref.includes("fish") || pref.includes("salmon") || pref.includes("cod")) pool = [...fishOptions];
    else if (pref.includes("veg") || pref.includes("vegetarian") || pref.includes("bean") || pref.includes("tofu")) pool = [...vegOptions, ...balanced];
    else if (pref.includes("light") || pref.includes("small") || pref.includes("snack")) pool = [...lightOptions, ...lowCal];
    else if (pref.includes("protein") || pref.includes("meat")) pool = [...highProtein, ...chickenOptions, ...fishOptions];
    else if (pref.includes("carb") || pref.includes("bread") || pref.includes("pasta")) pool = [...highCarb, ...balanced];
    else if (pref.includes("fat") || pref.includes("avocado") || pref.includes("cheese")) pool = [...highFat, ...balanced];
    // For any other food preference, use a more flexible approach
    else {
      // Try to match the preference with any food category
      const allOptions = [...highProtein, ...highCarb, ...highFat, ...balanced, ...lowCal, ...tunaOptions, ...chickenOptions, ...fishOptions, ...vegOptions, ...lightOptions];
      pool = allOptions.filter(option => 
        option.title.toLowerCase().includes(pref) || 
        pref.includes(option.title.toLowerCase().split(' ')[0])
      );
      // If no direct matches, fall back to balanced options
      if (pool.length === 0) pool = [...balanced, ...highProtein];
    }
  }

  // If no preference or preference didn't match, use gap-based logic
  if (pool.length === 0) {
    if (caloriesLeft <= 0) {
      pool = [...lowCal, ...highProtein];
    } else {
      const biggestGap = Math.max(proteinLeft, carbsLeft, fatLeft);
      if (biggestGap === proteinLeft) pool = [...highProtein, ...balanced, ...lowCal];
      else if (biggestGap === carbsLeft) pool = [...highCarb, ...balanced, ...highProtein];
      else pool = [...highFat, ...balanced, ...highProtein];
    }
  }
  
  // If we have a preference but the pool is still empty, create a minimal pool from the preference
  if (pool.length === 0 && preference) {
    const pref = preference.toLowerCase();
    if (pref.includes("tuna")) pool = [...tunaOptions];
    else if (pref.includes("chicken")) pool = [...chickenOptions];
    else if (pref.includes("fish") || pref.includes("salmon") || pref.includes("cod")) pool = [...fishOptions];
    else if (pref.includes("veg") || pref.includes("vegetarian")) pool = [...vegOptions];
    else if (pref.includes("light") || pref.includes("small") || pref.includes("snack")) pool = [...lightOptions];
    else if (pref.includes("yogurt")) pool = [
      s("Greek yogurt parfait (yogurt, berries, granola)", 310, 24, 40, 10),
      s("Greek yogurt (1 cup) + protein granola (1/4 cup)", 280, 28, 28, 6),
      s("Greek yogurt (3/4 cup) + berries (1/2 cup)", 150, 15, 15, 2),
      s("Yogurt smoothie (yogurt, banana, protein powder)", 320, 26, 42, 8),
      s("Yogurt bowl (yogurt, honey, nuts, fruit)", 280, 18, 32, 12),
    ];
  }

  // Filter excludes and shuffle
  const excludes = excludeTitles || new Set<string>();
  const filtered = pool.filter(item => !excludes.has(item.title));
  for (let i = filtered.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [filtered[i], filtered[j]] = [filtered[j], filtered[i]];
  }
  const picked = filtered.slice(0, 3);
  
  // For preference-based requests, don't backfill - just return what we have
  // This prevents repeating suggestions when we've exhausted all unique options
  
  // Only if we still don't have enough and no preference, use general pools
  if (picked.length < 3 && !preference) {
    const anyPool = [...lowCal, ...highProtein, ...highCarb, ...highFat, ...balanced, ...tunaOptions, ...chickenOptions, ...fishOptions, ...vegOptions, ...lightOptions].filter(
      x => !excludes.has(x.title) && !picked.find(p => p.title === x.title)
    );
    for (const x of anyPool) {
      if (picked.length >= 3) break;
      picked.push(x);
    }
  }
  
  // If we have a preference but still don't have enough items, don't repeat - just return what we have
  // This prevents repeating suggestions when we've exhausted all unique options

  // If we have no suggestions and this is a preference request, inform the user
  if (picked.length === 0 && preference) {
    return `I've shown you all the ${preference} options I have! Would you like me to suggest some other types of meals instead?`;
  }
  
  // If we have fewer than 3 suggestions and this is a preference request, it means we've exhausted unique options
  if (picked.length < 3 && preference) {
    // Count how many tuna options have been shown in the conversation history
    const tunaOptionsShown = excludes.size;
    console.log("Tuna options shown:", tunaOptionsShown);
    console.log("Excludes:", Array.from(excludes));
    if (tunaOptionsShown >= 5) {
      return `I've shown you all the ${preference} options I have! Would you like me to suggest some other types of meals instead?`;
    }
  }

  const header = goals?.targetCalories
    ? `Based on today's remaining (${Math.max(0, caloriesLeft)} cal, ${Math.max(0, proteinLeft)}g protein, ${Math.max(0, carbsLeft)}g carbs, ${Math.max(0, fatLeft)}g fat), here are some options:`
    : `Here are a few options that generally fit most goals:`;

  const lines = picked.map(x => `- ${x.title} (≈ ${x.c} cal, ${x.p}g protein, ${x.carb}g carbs, ${x.f}g fat)`);
  return `${header}\n${lines.join("\n")}`;
}

function extractPreviousSuggestionTitles(messages: Array<{ role: string; content: string }>): Set<string> {
  const titles = new Set<string>();
  for (const msg of messages || []) {
    if (msg.role !== "assistant") continue;
    const lines = msg.content.split(/\n+/);
    for (const line of lines) {
      // Match both formats: "- Item name (≈ ...)" and "- Item name: ..."
      const m = line.match(/^\-\s+([^\(:]+?)\s*[\(:]/);
      if (m && m[1]) {
        titles.add(m[1].trim());
      }
    }
  }
  return titles;
}

function extractPreferenceFromMessage(message: string): string | undefined {
  const lowerMessage = message.toLowerCase();
  
  // Extract any food-related preference from the message
  const foodKeywords = [
    'yogurt', 'tuna', 'chicken', 'fish', 'salmon', 'cod', 'shrimp',
    'beef', 'pork', 'turkey', 'eggs', 'cheese', 'milk', 'bread',
    'pasta', 'rice', 'quinoa', 'oatmeal', 'cereal', 'fruit',
    'vegetables', 'salad', 'soup', 'sandwich', 'wrap', 'burrito',
    'pizza', 'burger', 'steak', 'smoothie', 'shake', 'protein',
    'vegetarian', 'vegan', 'light', 'small', 'snack', 'dessert',
    'sweet', 'savory', 'spicy', 'cold', 'hot', 'warm'
  ];
  
  for (const keyword of foodKeywords) {
    if (lowerMessage.includes(keyword)) {
      return keyword;
    }
  }
  
  return undefined;
}

function extractPreferenceFromConversationHistory(conversationHistory: Array<{ role: string; content: string }>): string | undefined {
  // Look through recent user messages to find the original preference
  for (let i = conversationHistory.length - 1; i >= 0; i--) {
    const msg = conversationHistory[i];
    if (msg.role === "user") {
      const preference = extractPreferenceFromMessage(msg.content);
      if (preference) {
        return preference;
      }
    }
  }
  return undefined;
}

async function generatePreferenceSuggestions(
  preference: string,
  remaining: { calories: number; protein: number; carbs: number; fat: number },
  goals?: { targetCalories?: number; targetProtein?: number; targetCarbs?: number; targetFat?: number },
  excludes?: Set<string>
): Promise<string> {
  const client = getOpenAIClient();
  const excludeList = Array.from(excludes || new Set<string>());
  const header = goals?.targetCalories
    ? `Based on today's remaining (${Math.max(0, remaining.calories)} cal, ${Math.max(0, remaining.protein)}g protein, ${Math.max(0, remaining.carbs)}g carbs, ${Math.max(0, remaining.fat)}g fat)`
    : `Here are a few options that generally fit most goals`;

  const system = `You create concise meal/snack suggestions.
Rules:
- Return exactly 3 bullet points.
- Every suggestion MUST include the ingredient: ${preference}.
- Align roughly to the user's remaining macros if provided.
- Do NOT repeat any previously suggested titles: ${excludeList.length > 0 ? excludeList.join(", ") : "(none)"}.
- Make each title distinct (different form/prep/combination).
- Include approximate macros in the format: (≈ X cal, Yg protein, Zg carbs, Wg fat).`;

  const user = `${header}. Provide 3 NEW ${preference} options now.`;

  const completion = await client.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      { role: "system", content: system },
      { role: "user", content: user },
    ],
    temperature: 0.6,
    top_p: 0.9,
  });

  const text = completion.choices?.[0]?.message?.content?.trim();
  if (!text) {
    return `${header}, here are some ${preference} options:`;
  }
  return text;
}

export async function POST(req: NextRequest) {
  try {
    const json = await req.json();
    const { message, userId: providedUserId, day, conversationHistory = [] } = MessageSchema.parse(json);

    // Ensure user exists (single-user fallback: id=1)
    const user = await prisma.user.upsert({
      where: { id: providedUserId ?? 1 },
      update: {},
      create: { id: providedUserId ?? 1 },
    });

    const dayDate = startOfDay(day ? new Date(day) : new Date());

    // Get user's goals
    const goals = await prisma.goal.findUnique({
      where: { userId: user.id },
    });

    // Get today's food logs for progress tracking
    const todayLogs = await prisma.foodLog.findMany({
      where: {
        userId: user.id,
        loggedAt: {
          gte: dayDate,
          lt: new Date(dayDate.getTime() + 24 * 60 * 60 * 1000),
        },
      },
      orderBy: { loggedAt: "asc" },
    });

    // Calculate today's totals
    const todayTotals = todayLogs.reduce(
      (acc, log) => ({
        calories: acc.calories + (log.calories || 0),
        protein: acc.protein + (log.protein || 0),
        carbs: acc.carbs + (log.carbs || 0),
        fat: acc.fat + (log.fat || 0),
      }),
      { calories: 0, protein: 0, carbs: 0, fat: 0 }
    );

    // Calculate remaining macros
    const remaining = {
      calories: (goals?.targetCalories || 0) - todayTotals.calories,
      protein: (goals?.targetProtein || 0) - todayTotals.protein,
      carbs: (goals?.targetCarbs || 0) - todayTotals.carbs,
      fat: (goals?.targetFat || 0) - todayTotals.fat,
    };

    const client = getOpenAIClient();
    const system = `You are a nutrition logging assistant. Log food when users mention what they ate.

USER'S GOALS: ${goals ? `${goals.targetCalories || 'Not set'} kcal, ${goals.targetProtein || 'Not set'}g protein, ${goals.targetCarbs || 'Not set'}g carbs, ${goals.targetFat || 'Not set'}g fat` : 'No goals set yet'}

TODAY'S PROGRESS: ${todayTotals.calories} calories, ${todayTotals.protein}g protein, ${todayTotals.carbs}g carbs, ${todayTotals.fat}g fat

TODAY'S FOOD: ${todayLogs.length > 0 ? todayLogs.map(log => `${log.item} (${log.calories || 0} cal)`).join(', ') : 'None logged yet'}

IMPORTANT: Always respond with valid JSON. If the user asks for food suggestions or mentions preferences, provide specific meal ideas with calories and macros.

Output only valid JSON with this shape:
{
  "action": "log" | "set_goals" | "chat" | "remove" | "confirm",
  "day"?: string,
  "logs"?: [
    {"item": string, "mealType"?: string, "quantity"?: number, "unit"?: string, "calories"?: number, "protein"?: number, "carbs"?: number, "fat"?: number, "fiber"?: number, "sugar"?: number, "sodium"?: number, "notes"?: string}
  ],
  "goals"?: {"targetCalories"?: number, "targetProtein"?: number, "targetCarbs"?: number, "targetFat"?: number},
  "itemsToRemove"?: [{"id"?: number, "item": string, "mealType"?: string}],
  "needsConfirmation"?: boolean,
  "reply"?: string
}

Rules:
- If the user mentions food they ate, set action to "log", add food to logs, and set needsConfirmation to true
- If the user wants to remove food, set action to "remove", add items to itemsToRemove, and set needsConfirmation to true
- If the user confirms, set action to "confirm"
- If the user asks for meal ideas or general advice, set action to "chat" and provide 2-3 specific suggestions with approximate calories and macros, aligned to remaining goals
- If the user asks for "more" suggestions, "other options", "share some more", "more please", "additional ideas", "more options", "show me more", "give me more", "share some more please", or similar phrases, provide additional meal ideas
- IMPORTANT: When the user asks for "more" or "additional" suggestions, always provide new meal ideas regardless of conversation context
- When the user asks for specific food preferences (e.g., "more yogurt options", "chicken-based meals", "vegetarian options", "light snacks"), provide meal suggestions that specifically match their request
- CRITICAL: If the user asks for a specific food type (e.g., "tuna options", "yogurt meals", "chicken dishes"), ALL suggested meals must contain that specific food ingredient
- Do NOT suggest meals that don't contain the requested food type when the user asks for specific food preferences
- When needsConfirmation is true, leave reply empty (it will be auto-filled)
- Otherwise, provide a helpful reply in the "reply" field

CLARIFYING QUESTIONS:
- If the user mentions vague food items (e.g., "protein shake", "smoothie", "salad", "sandwich", "pasta", "chicken dish"), ask specific clarifying questions before logging
- For protein shakes/smoothies: Ask about ingredients (protein powder type, milk/liquid base, fruits, vegetables, add-ins like peanut butter, yogurt, etc.)
- For salads: Ask about ingredients (greens type, vegetables, protein, dressing, toppings)
- For sandwiches: Ask about bread type, fillings, condiments
- For pasta dishes: Ask about pasta type, sauce, protein, vegetables
- For generic dishes: Ask about specific ingredients, preparation method, portion size
- Set action to "chat" and provide specific questions in the reply field
- Only log food after getting sufficient details to provide accurate nutritional estimates

FOLLOW-UP RESPONSES:
- When the user responds to clarifying questions with more details, evaluate if you have enough information to log the food
- If you have sufficient details (ingredients, quantities, preparation method), set action to "log", add the food to logs, and set needsConfirmation to true
- If you still need more details, continue asking specific follow-up questions with action "chat"
- Do NOT give generic responses like "I'm here to help" when the user is providing food details
- Always try to log the food once you have enough information, even if some details are estimated
- IMPORTANT: If the user mentions specific food ingredients or details, immediately try to log the food rather than giving generic responses
- When in doubt about quantities, use reasonable estimates (e.g., 1 scoop protein powder = 25g protein, 1 medium banana = 100 calories, 1 tbsp peanut butter = 90 calories)

CONVERSATION CONTEXT:
- If the user responds to a suggestion request (e.g., "What kind of food are you in the mood for?"), provide specific meal suggestions based on their response
- If the user mentions food preferences (e.g., "chicken", "light", "protein", "carbs"), suggest meals that match those preferences
- Always maintain conversation context and avoid generic responses when the user is engaging with suggestions`;

    const completion = await client.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: system },
        ...conversationHistory.slice(-10), // Include last 10 messages for context
        { role: "user", content: message },
      ],
      temperature: 0.2,
    });

    const text = completion.choices?.[0]?.message?.content ?? "{}";
    const parsed = extractFirstJson(text) ?? {};
    const modelOut = ModelOutputSchema.safeParse(parsed);

    // Check if user is asking for suggestions or responding to suggestions
    const lower = message.toLowerCase();
    const wantsSuggestions =
      lower.includes("still hungry") ||
      lower.includes("what else could i eat") ||
      lower.includes("what should i eat") ||
      lower.includes("suggest") ||
      lower.includes("ideas") ||
      lower.includes("recommend") ||
      lower.includes("snack suggestions") ||
      lower.includes("more food") ||
      lower.includes("help me hit my macros") ||
      lower.includes("hungry");

    // Check if this is a follow-up response to a suggestion request
    const isFollowUpToSuggestion = conversationHistory.some(msg => 
      msg.role === "assistant" && 
      (msg.content.includes("What kind of food") || 
       msg.content.includes("suggest") || 
       msg.content.includes("meal ideas") ||
       msg.content.includes("preferences"))
    );

    // Check if user is responding with food preferences
    const isFoodPreference = 
      lower.includes("chicken") ||
      lower.includes("protein") ||
      lower.includes("light") ||
      lower.includes("heavy") ||
      lower.includes("salad") ||
      lower.includes("soup") ||
      lower.includes("sandwich") ||
      lower.includes("pasta") ||
      lower.includes("fish") ||
      lower.includes("beef") ||
      lower.includes("vegetarian") ||
      lower.includes("vegan") ||
      lower.includes("something") ||
      lower.includes("anything");

    // If this is a short response (likely a preference), treat it as a suggestion request
    const isShortPreferenceResponse = message.length < 20 && (isFoodPreference || isFollowUpToSuggestion);

    // Suggestion requests: let AI handle preference-specific for variety; fallback to server for general
    // But prioritize food logging if user mentions specific food items
    if (wantsSuggestions) {
      // Check if user is mentioning specific food items (likely logging, not asking for suggestions)
      const specificFoodKeywords = ['had', 'ate', 'drank', 'consumed', 'finished', 'just had', 'just ate', 'just drank'];
      const isLoggingFood = specificFoodKeywords.some(keyword => message.toLowerCase().includes(keyword));
      
      if (isLoggingFood) {
        // Let the AI handle this as a food logging request instead
        // Continue to the normal AI processing below
      } else {
        const excludes = extractPreviousSuggestionTitles(conversationHistory as any);
        const goalsNorm = goals
          ? {
              targetCalories: goals.targetCalories || undefined,
              targetProtein: goals.targetProtein || undefined,
              targetCarbs: goals.targetCarbs || undefined,
              targetFat: goals.targetFat || undefined,
            }
          : undefined;
        const preference = extractPreferenceFromMessage(message) || extractPreferenceFromConversationHistory(conversationHistory);
        if (preference) {
          const replyText = await generatePreferenceSuggestions(preference, remaining, goalsNorm, excludes);
          return NextResponse.json({ action: "chat", reply: replyText, logs: [], goals: {}, itemsToRemove: [], needsConfirmation: false });
        }
        const suggestionText = buildSuggestions(remaining, goalsNorm, excludes);
        return NextResponse.json({ action: "chat", reply: suggestionText, logs: [], goals: {}, itemsToRemove: [], needsConfirmation: false });
      }
    }

    if (!modelOut.success) {
      // Return a fallback response instead of error
      return NextResponse.json({
        action: "chat",
        reply: "I understand you mentioned food. Could you please be more specific about what you'd like me to log or help you with?",
        logs: [],
        goals: {},
        itemsToRemove: [],
        needsConfirmation: false,
      });
    }

    const { action, logs = [], goals: newGoals, itemsToRemove = [], needsConfirmation = false, reply } = modelOut.data;

    // Handle different actions
    if (action === "remove" && itemsToRemove.length > 0) {
      // For removal requests, just return the confirmation message
      // The actual removal will happen when user confirms
      const lines = itemsToRemove.map((item) => `- ${item.item}${item.mealType ? ` (${item.mealType})` : ""}${item.id ? ` [id ${item.id}]` : ""}`).join("\n");
      return NextResponse.json({
        action: "remove",
        itemsToRemove,
        needsConfirmation: true,
        reply:
          reply ||
          `Please confirm removing the following ${itemsToRemove.length} item(s):\n${lines}\n\nReply with "yes" to confirm or "no" to cancel.`,
      });
    }

    if (action === "confirm") {
      // Handle confirmation - check if we have pending logs or removals
      if (logs.length > 0) {
        // Confirm adding logs
        await prisma.$transaction(
          logs.map((l) =>
            prisma.foodLog.create({
              data: {
                userId: user.id,
                day: dayDate,
                item: l.item,
                mealType: l.mealType,
                quantity: l.quantity,
                unit: l.unit,
                calories: l.calories ? Math.round(l.calories) : null,
                protein: l.protein ?? null,
                carbs: l.carbs ?? null,
                fat: l.fat ?? null,
                fiber: l.fiber ?? null,
                sugar: l.sugar ?? null,
                sodium: l.sodium ?? null,
                notes: l.notes ?? null,
              },
            })
          )
        );
        return NextResponse.json({
          action: "confirm",
          logs,
          reply: reply || `Confirmed! Added ${logs.length} item(s) to your food log.`,
        });
      }
      
      if (itemsToRemove.length > 0) {
        // Confirm removing items
        const removePromises = itemsToRemove.map(async (item) => {
          if (item.id) {
            // Remove by ID if available
            return prisma.foodLog.deleteMany({
              where: {
                id: item.id,
                userId: user.id,
              },
            });
          } else {
            // Remove by item name and meal type
            return prisma.foodLog.deleteMany({
              where: {
                userId: user.id,
                item: item.item,
                mealType: item.mealType,
                loggedAt: {
                  gte: dayDate,
                  lt: new Date(dayDate.getTime() + 24 * 60 * 60 * 1000),
                },
              },
            });
          }
        });
        
        await Promise.all(removePromises);
        return NextResponse.json({
          action: "confirm",
          itemsToRemove,
          reply: reply || `Confirmed! Removed ${itemsToRemove.length} item(s) from your food log.`,
        });
      }
    }

    // Persist logs (for immediate logging without confirmation)
    if (logs.length > 0 && !needsConfirmation) {
      await prisma.$transaction(
        logs.map((l) =>
          prisma.foodLog.create({
            data: {
              userId: user.id,
              day: dayDate,
              item: l.item,
              mealType: l.mealType,
              quantity: l.quantity,
              unit: l.unit,
              calories: l.calories ? Math.round(l.calories) : null,
              protein: l.protein ?? null,
              carbs: l.carbs ?? null,
              fat: l.fat ?? null,
              fiber: l.fiber ?? null,
              sugar: l.sugar ?? null,
              sodium: l.sodium ?? null,
              notes: l.notes ?? null,
            },
          })
        )
      );
    }

    // Ensure we always have a reply
    let finalReply = reply;
    
    // Check if user is asking for more meal suggestions
    const moreRequestPatterns = [
      'more', 'additional', 'other', 'share some more', 'more please', 
      'more options', 'show me more', 'give me more', 'more suggestions'
    ];
    const isMoreRequest = moreRequestPatterns.some(pattern => 
      message.toLowerCase().includes(pattern.toLowerCase())
    );
    
    // "More" requests: prefer AI for preference-specific (infinite variations), otherwise use server fallback
    if (isMoreRequest) {
      const originalPreference = extractPreferenceFromConversationHistory(conversationHistory);
      const excludes = extractPreviousSuggestionTitles(conversationHistory as any);
      const goalsNorm = goals
        ? {
            targetCalories: goals.targetCalories || undefined,
            targetProtein: goals.targetProtein || undefined,
            targetCarbs: goals.targetCarbs || undefined,
            targetFat: goals.targetFat || undefined,
          }
        : undefined;
      if (originalPreference) {
        finalReply = await generatePreferenceSuggestions(originalPreference, remaining, goalsNorm, excludes);
      } else {
        finalReply = buildSuggestions(remaining, goalsNorm, excludes);
      }
    }
    
    // If we need confirmation for adds, list the items with their macros and totals
    if (!finalReply && needsConfirmation && action === "log" && logs.length > 0) {
      const lines = logs
        .map(
          (l) =>
            `- ${l.item}: ${Math.round(l.calories ?? 0)} cal, ${Math.round(
              l.protein ?? 0
            )}g protein, ${Math.round(l.carbs ?? 0)}g carbs, ${Math.round(l.fat ?? 0)}g fat`
        )
        .join("\n");
      
      if (logs.length === 1) {
        finalReply = `Please confirm adding:\n${lines}\n\nReply with "yes" to confirm or "no" to cancel.`;
      } else {
        const totals = logs.reduce(
          (acc, l) => ({
            calories: acc.calories + (l.calories || 0),
            protein: acc.protein + (l.protein || 0),
            carbs: acc.carbs + (l.carbs || 0),
            fat: acc.fat + (l.fat || 0),
          }),
          { calories: 0, protein: 0, carbs: 0, fat: 0 }
        );
        finalReply = `Please confirm adding the following ${logs.length} item(s):\n${lines}\n\nTotals: ${Math.round(
          totals.calories
        )} cal, ${Math.round(totals.protein)}g protein, ${Math.round(totals.carbs)}g carbs, ${Math.round(
          totals.fat
        )}g fat\n\nReply with "yes" to confirm or "no" to cancel.`;
      }
    }
    if (!finalReply && logs.length > 0) {
      const itemNames = logs.map(log => log.item).join(", ");
      finalReply = `Logged ${logs.length} item(s): ${itemNames}.`;
    }
    if (!finalReply && action === "chat") {
      // If the user asked for suggestions, generate aligned options
      if (/hungry|what else|suggest|ideas|recommend/i.test(message)) {
        const excludes = extractPreviousSuggestionTitles(conversationHistory as any);
        const preference = extractPreferenceFromMessage(message);
        if (preference) {
          // Let the AI handle specific preferences
          finalReply = "I understand. How else can I help you with your nutrition tracking?";
        } else {
          finalReply = buildSuggestions(remaining, goals ? { targetCalories: goals.targetCalories || undefined, targetProtein: goals.targetProtein || undefined, targetCarbs: goals.targetCarbs || undefined, targetFat: goals.targetFat || undefined } : undefined, excludes);
        }
      } else {
        finalReply = "I understand. How else can I help you with your nutrition tracking?";
      }
    }
    if (!finalReply && action === "remove") {
      finalReply = "I can help you remove items from your food log. Please specify which items you'd like to remove.";
    }
    if (!finalReply) {
      finalReply = "I'm here to help with your nutrition tracking. You can ask me to log food, remove items, or get advice about your goals.";
    }

    // Upsert goals
    if (newGoals && Object.keys(newGoals).length > 0) {
      await prisma.goal.upsert({
        where: { userId: user.id },
        update: newGoals,
        create: { userId: user.id, ...newGoals },
      });
    }

    return NextResponse.json({
      action,
      reply: finalReply ?? (logs.length > 0 ? `Logged ${logs.length} entr${logs.length === 1 ? "y" : "ies"}.` : ""),
      logs,
      goals: newGoals,
      itemsToRemove,
      needsConfirmation,
    });
  } catch (err: unknown) {
    return NextResponse.json({ error: getErrorMessage(err) }, { status: 500 });
  }
}


