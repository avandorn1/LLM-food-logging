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
  } catch (error) {
    console.error("Failed to parse JSON:", error);
    console.error("Original JSON string:", jsonStr);
    
    // Try to fix common JSON issues
    let fixedJson = jsonStr;
    
    // Replace single quotes with double quotes
    fixedJson = fixedJson.replace(/'/g, '"');
    
    // Fix unquoted property names (but be careful not to break valid JSON)
    fixedJson = fixedJson.replace(/(\w+):/g, '"$1":');
    
    // Remove any trailing commas
    fixedJson = fixedJson.replace(/,(\s*[}\]])/g, '$1');
    
    try {
      const parsed = JSON.parse(fixedJson);
      console.log("Successfully parsed after fixing JSON:", parsed);
      return parsed;
    } catch (secondError) {
      console.error("Still failed to parse after fixing JSON:", secondError);
      console.error("Fixed JSON string:", fixedJson);
      return null;
    }
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

// Build food suggestions using OpenAI instead of hardcoded data
function buildSuggestions(
  remaining: { calories: number; protein: number; carbs: number; fat: number },
  goals?: { targetCalories?: number; targetProtein?: number; targetCarbs?: number; targetFat?: number },
  excludeTitles?: Set<string>,
  preference?: string
) {
  // This function is now a fallback - OpenAI should handle suggestions directly
  // Return empty array to let OpenAI generate suggestions
  return [];
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
  // Look for the most recent user message that contains a food preference
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
  excludeTitles?: Set<string>
): Promise<string> {
  // This function is no longer needed - OpenAI handles suggestions directly
  return "I understand you'd like suggestions. How else can I help you with your nutrition tracking?";
}

export async function POST(req: NextRequest) {
  try {
    const json = await req.json();
    const { message, userId: providedUserId, day, conversationHistory = [] } = MessageSchema.parse(json);

    // Ensure user exists (single-user fallback: id=1)
    let user;
    try {
      user = await prisma.user.upsert({
        where: { id: providedUserId ?? 1 },
        update: {},
        create: { id: providedUserId ?? 1 },
      });
    } catch (dbError) {
      console.error("Database connection failed:", dbError);
      return NextResponse.json({
        action: "chat",
        reply: "I'm having trouble connecting to your data right now. This might be a temporary issue. Please try again in a moment, or check your internet connection.\n\nYou can still try:\n• Logging food: \"I had 2 eggs for breakfast\"\n• Asking for help: \"What can you do?\"",
        logs: [],
        goals: {},
        itemsToRemove: [],
        needsConfirmation: false,
        error: true,
        errorType: "database"
      });
    }

    // Check if this is a quantity response to a clarification question
    const lowerMessage = message.toLowerCase();
    const quantityKeywords = [
      'tbsp', 'tablespoon', 'tbs', 'tbspn',
      'cup', 'cups', 
      'oz', 'ounce', 'ounces',
      'gram', 'grams', 'g',
      'handful', 'slice', 'piece', 'serving',
      '1tbsp', '2tbsp', '1tbs', '2tbs',
      '1cup', '2cup', '1cups', '2cups',
      '1oz', '2oz', '1ounce', '2ounce'
    ];
    const hasQuantity = quantityKeywords.some(keyword => {
      // Use word boundaries to avoid false matches like "fish" containing "gram"
      const regex = new RegExp(`\\b${keyword}\\b`, 'i');
      return regex.test(lowerMessage);
    });
    
    // Check if the previous message was asking for clarification
    const previousMessage = conversationHistory[conversationHistory.length - 1];
    const wasClarificationQuestion = previousMessage && 
      previousMessage.role === "assistant" && 
      (previousMessage.content.toLowerCase().includes("how much") ||
       previousMessage.content.toLowerCase().includes("rough amount") ||
       previousMessage.content.toLowerCase().includes("roughly how much") ||
       previousMessage.content.toLowerCase().includes("about how much"));
    
    console.log("DEBUG: Pre-AI check analysis:");
    console.log("DEBUG: User message:", message);
    console.log("DEBUG: Has quantity keywords:", hasQuantity);
    console.log("DEBUG: Previous message:", previousMessage?.content);
    console.log("DEBUG: Was clarification question:", wasClarificationQuestion);
    console.log("DEBUG: Message length:", message.length);
    console.log("DEBUG: Contains 'i had':", message.toLowerCase().includes("i had"));
    
    // Check if the message contains a complete food item description (not just a quantity)
    const containsCompleteFoodItem = message.toLowerCase().includes("i had") || 
                                    message.toLowerCase().includes("i ate") || 
                                    message.toLowerCase().includes("i drank") ||
                                    message.toLowerCase().includes("ipa") ||
                                    message.toLowerCase().includes("beer") ||
                                    message.toLowerCase().includes("wine") ||
                                    message.toLowerCase().includes("cocktail") ||
                                    message.toLowerCase().includes("coffee") ||
                                    message.toLowerCase().includes("tea") ||
                                    message.toLowerCase().includes("juice") ||
                                    message.toLowerCase().includes("soda") ||
                                    message.toLowerCase().includes("water") ||
                                    message.toLowerCase().includes("yogurt") ||
                                    message.toLowerCase().includes("rice") ||
                                    message.toLowerCase().includes("tofu") ||
                                    message.toLowerCase().includes("noodles") ||
                                    message.toLowerCase().includes("sauce");
    
    // Only trigger if this is a short response (likely a quantity) to a clarification question
    // AND the message doesn't contain a complete food item description
    const isShortQuantityResponse = hasQuantity && 
      wasClarificationQuestion && 
      message.length < 50 && 
      !containsCompleteFoodItem;
    
    console.log("DEBUG: Is short quantity response:", isShortQuantityResponse);
    
    // Temporarily disabled hardcoded quantity response handling - let LLM handle context
    if (false && isShortQuantityResponse) {
      console.log("DEBUG: Detected quantity response to clarification question");
      console.log("DEBUG: User message:", message);
      console.log("DEBUG: Previous message was clarification:", wasClarificationQuestion);
      
      // Extract the food item from the previous clarification question
      const prevContent = previousMessage.content.toLowerCase();
      let foodItem = "food item";
      
      // If we can't identify the food item, ask for clarification instead of using generic placeholder
      const canIdentifyFoodItem = prevContent.includes("yogurt") || 
                                 prevContent.includes("sauce") || 
                                 prevContent.includes("rice") || 
                                 prevContent.includes("tofu") || 
                                 prevContent.includes("noodles") || 
                                 prevContent.includes("peppers") || 
                                 prevContent.includes("mushrooms") ||
                                 prevContent.includes("milk") ||
                                 prevContent.includes("fish") ||
                                 prevContent.includes("taco") ||
                                 prevContent.includes("spinach") ||
                                 prevContent.includes("eggs") ||
                                 prevContent.includes("bread") ||
                                 prevContent.includes("chicken") ||
                                 prevContent.includes("beef") ||
                                 prevContent.includes("salmon") ||
                                 prevContent.includes("apple") ||
                                 prevContent.includes("banana") ||
                                 prevContent.includes("orange") ||
                                 prevContent.includes("cheese") ||
                                 prevContent.includes("pasta") ||
                                 prevContent.includes("soup") ||
                                 prevContent.includes("salad") ||
                                 prevContent.includes("sandwich") ||
                                 prevContent.includes("pizza") ||
                                 prevContent.includes("pancakes") ||
                                 prevContent.includes("waffles") ||
                                 prevContent.includes("cereal") ||
                                 prevContent.includes("ipa") || 
                                 prevContent.includes("beer") ||
                                 prevContent.includes("wine") ||
                                 prevContent.includes("cocktail") ||
                                 prevContent.includes("coffee") ||
                                 prevContent.includes("tea") ||
                                 prevContent.includes("juice") ||
                                 prevContent.includes("soda") ||
                                 prevContent.includes("water");
      
      if (!canIdentifyFoodItem) {
        console.log("DEBUG: Cannot identify food item from previous message, asking for clarification");
        return NextResponse.json({
          action: "chat",
          reply: "I'm not sure what food item you're referring to. Could you please tell me what you had?",
          logs: [],
          goals: {},
          itemsToRemove: [],
          needsConfirmation: false,
        });
      }
      
      if (prevContent.includes("yogurt")) foodItem = "yogurt";
      else if (prevContent.includes("sauce")) foodItem = "sauce";
      else if (prevContent.includes("rice")) foodItem = "rice";
      else if (prevContent.includes("tofu")) foodItem = "tofu";
      else if (prevContent.includes("noodles")) foodItem = "noodles";
      else if (prevContent.includes("peppers")) foodItem = "peppers";
      else if (prevContent.includes("mushrooms")) foodItem = "mushrooms";
      else if (prevContent.includes("milk")) foodItem = "milk";
      else if (prevContent.includes("fish")) foodItem = "fish";
      else if (prevContent.includes("taco")) foodItem = "taco";
      else if (prevContent.includes("spinach")) foodItem = "spinach";
      else if (prevContent.includes("eggs")) foodItem = "eggs";
      else if (prevContent.includes("bread")) foodItem = "bread";
      else if (prevContent.includes("chicken")) foodItem = "chicken";
      else if (prevContent.includes("beef")) foodItem = "beef";
      else if (prevContent.includes("salmon")) foodItem = "salmon";
      else if (prevContent.includes("apple")) foodItem = "apple";
      else if (prevContent.includes("banana")) foodItem = "banana";
      else if (prevContent.includes("orange")) foodItem = "orange";
      else if (prevContent.includes("cheese")) foodItem = "cheese";
      else if (prevContent.includes("pasta")) foodItem = "pasta";
      else if (prevContent.includes("soup")) foodItem = "soup";
      else if (prevContent.includes("salad")) foodItem = "salad";
      else if (prevContent.includes("sandwich")) foodItem = "sandwich";
      else if (prevContent.includes("pizza")) foodItem = "pizza";
      else if (prevContent.includes("pancakes")) foodItem = "pancakes";
      else if (prevContent.includes("waffles")) foodItem = "waffles";
      else if (prevContent.includes("cereal")) foodItem = "cereal";
      else if (prevContent.includes("ipa") || prevContent.includes("beer")) foodItem = "beer";
      else if (prevContent.includes("wine")) foodItem = "wine";
      else if (prevContent.includes("cocktail")) foodItem = "cocktail";
      else if (prevContent.includes("coffee")) foodItem = "coffee";
      else if (prevContent.includes("tea")) foodItem = "tea";
      else if (prevContent.includes("juice")) foodItem = "juice";
      else if (prevContent.includes("soda")) foodItem = "soda";
      else if (prevContent.includes("water")) foodItem = "water";
      
      // Create a log entry with the quantity response
      const logEntry = {
        item: foodItem,
        quantity: 1,
        unit: "serving",
        calories: undefined as number | undefined,
        protein: undefined as number | undefined,
        carbs: undefined as number | undefined,
        fat: undefined as number | undefined
      };
      
      // Try to extract more specific quantity info
      if (lowerMessage.includes("tbsp") || lowerMessage.includes("tablespoon")) {
        logEntry.unit = "tablespoon";
        // Try multiple patterns to catch different formats
        const patterns = [
          /(\d+)\s*(tbsp|tablespoon)/,
          /(\d+)\s*(tbs|tbspn)/,
          /^(\d+)\s*tablespoon$/,
          /^(\d+)\s*tbsp$/
        ];
        
        for (const pattern of patterns) {
          const match = lowerMessage.match(pattern);
          if (match) {
            logEntry.quantity = parseInt(match[1]);
            break;
          }
        }
        
        // If no pattern matched, try to extract just the number
        if (!logEntry.quantity) {
          const numberMatch = lowerMessage.match(/(\d+)/);
          if (numberMatch) {
            logEntry.quantity = parseInt(numberMatch[1]);
          }
        }
        
        // Add nutrition estimates for common items
        if (foodItem === "sauce") {
          logEntry.calories = 30;
          logEntry.protein = 0;
          logEntry.carbs = 7;
          logEntry.fat = 0;
        } else if (foodItem === "yogurt") {
          logEntry.calories = 15;
          logEntry.protein = 1;
          logEntry.carbs = 2;
          logEntry.fat = 0;
        }
      } else if (lowerMessage.includes("cup")) {
        logEntry.unit = "cup";
        const match = lowerMessage.match(/(\d+(?:\.\d+)?)\s*cup/);
        if (match) logEntry.quantity = parseFloat(match[1]);
        
        // Add nutrition estimates for common items
        if (foodItem === "rice") {
          logEntry.calories = 200;
          logEntry.protein = 4;
          logEntry.carbs = 45;
          logEntry.fat = 0;
        } else if (foodItem === "tofu") {
          logEntry.calories = 180;
          logEntry.protein = 20;
          logEntry.carbs = 3;
          logEntry.fat = 10;
        } else if (foodItem === "milk") {
          logEntry.calories = 150;
          logEntry.protein = 8;
          logEntry.carbs = 12;
          logEntry.fat = 8;
        }
      } else if (lowerMessage.includes("oz")) {
        logEntry.unit = "oz";
        const match = lowerMessage.match(/(\d+(?:\.\d+)?)\s*oz/);
        if (match) logEntry.quantity = parseFloat(match[1]);
        
        // Add nutrition estimates for common items
        if (foodItem === "tofu") {
          logEntry.calories = 60;
          logEntry.protein = 7;
          logEntry.carbs = 1;
          logEntry.fat = 3;
        }
      }
      
      console.log("DEBUG: Created log entry:", logEntry);
      console.log("DEBUG: Quantity extraction - original message:", message);
      console.log("DEBUG: Quantity extraction - lower message:", lowerMessage);
      console.log("DEBUG: Quantity extraction - extracted quantity:", logEntry.quantity);
      console.log("DEBUG: Quantity extraction - extracted unit:", logEntry.unit);
      
      // Use Eastern Time for date calculations (same as later in the code)
      const now = new Date();
      const easternDate = new Date(now.toLocaleDateString("en-US", {timeZone: "America/New_York"}));
      const dayDate = startOfDay(day ? new Date(day) : easternDate);
      
      // Get today's food logs to show complete list
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

      // Look for pending items in the conversation history
      const pendingItems: Array<{
        item: string;
        quantity: number;
        unit: string;
        calories: number;
        protein: number;
        carbs: number;
        fat: number;
      }> = [];
      
      // Check if there are any pending items from previous messages in this conversation
      // Look for messages that contain "Please confirm adding" but haven't been confirmed yet
      for (let i = conversationHistory.length - 1; i >= 0; i--) {
        const msg = conversationHistory[i];
        if (msg.role === "assistant" && msg.content.includes("Please confirm adding")) {
          // Extract items from this confirmation message
          const lines = msg.content.split('\n').filter(line => line.trim().startsWith('-'));
          for (const line of lines) {
            // Parse lines like "- item name (quantity unit): calories cal, protein g protein, carbs g carbs, fat g fat"
            const match = line.match(/^-\s+([^(]+?)\s*\(([^)]+)\):\s*(\d+)\s*cal,\s*(\d+)g\s*protein,\s*(\d+)g\s*carbs,\s*(\d+)g\s*fat/);
            if (match) {
              const [, item, quantityUnit, calories, protein, carbs, fat] = match;
              const [quantity, unit] = quantityUnit.trim().split(' ');
              
              pendingItems.push({
                item: item.trim(),
                quantity: parseFloat(quantity),
                unit: unit,
                calories: parseInt(calories),
                protein: parseInt(protein),
                carbs: parseInt(carbs),
                fat: parseInt(fat)
              });
            }
          }
          break; // Stop at the first confirmation message we find
        }
      }
      
      // Create complete list including pending items plus the new one
      const allItems = [...pendingItems, {
        item: logEntry.item,
        quantity: logEntry.quantity,
        unit: logEntry.unit,
        calories: logEntry.calories,
        protein: logEntry.protein,
        carbs: logEntry.carbs,
        fat: logEntry.fat
      }];

      // Generate detailed confirmation message with complete list
      const lines = allItems
        .map((item) => {
          const quantityText = item.quantity && item.unit ? ` (${item.quantity} ${item.unit})` : "";
          const hasNutritionData = item.calories !== null && item.calories !== undefined || 
                                  item.protein !== null && item.protein !== undefined || 
                                  item.carbs !== null && item.carbs !== undefined || 
                                  item.fat !== null && item.fat !== undefined;
          
          if (hasNutritionData) {
            return `- ${item.item}${quantityText}: ${Math.round(item.calories ?? 0)} cal, ${Math.round(item.protein ?? 0)}g protein, ${Math.round(item.carbs ?? 0)}g carbs, ${Math.round(item.fat ?? 0)}g fat`;
          } else {
            return `- ${item.item}${quantityText} (nutrition data not available)`;
          }
        })
        .join("\n");

      const totals = allItems.reduce(
        (acc, item) => ({
          calories: acc.calories + (item.calories || 0),
          protein: acc.protein + (item.protein || 0),
          carbs: acc.carbs + (item.carbs || 0),
          fat: acc.fat + (item.fat || 0),
        }),
        { calories: 0, protein: 0, carbs: 0, fat: 0 }
      );

      let confirmationMessage = "";
      if (allItems.length === 1) {
        confirmationMessage = `Please confirm adding:\n${lines}\n\nReply with "yes" to confirm or "no" to cancel.`;
      } else {
        confirmationMessage = `Please confirm adding the following ${allItems.length} item(s):\n${lines}\n\nTotals: ${Math.round(totals.calories)} cal, ${Math.round(totals.protein)}g protein, ${Math.round(totals.carbs)}g carbs, ${Math.round(totals.fat)}g fat\n\nReply with "yes" to confirm or "no" to cancel.`;
      }
      
      return NextResponse.json({
        action: "log",
        logs: allItems,
        needsConfirmation: true,
        reply: confirmationMessage,
        goals: {},
        itemsToRemove: []
      });
    }

    // Use Eastern Time for date calculations
    const now = new Date();
    const easternDate = new Date(now.toLocaleDateString("en-US", {timeZone: "America/New_York"}));
    const dayDate = startOfDay(day ? new Date(day) : easternDate);

    // Get user's goals and today's logs with error handling
    let goals: any = null;
    let todayLogs: any[] = [];
    try {
      goals = await prisma.goal.findUnique({
        where: { userId: user.id },
      });

      todayLogs = await prisma.foodLog.findMany({
        where: {
          userId: user.id,
          loggedAt: {
            gte: dayDate,
            lt: new Date(dayDate.getTime() + 24 * 60 * 60 * 1000),
          },
        },
        orderBy: { loggedAt: "asc" },
      });
    } catch (dbError) {
      console.error("Database query failed:", dbError);
      // Continue with empty data rather than failing completely
      goals = null;
      todayLogs = [];
    }

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
    const system = `You are a nutrition logging assistant. Your job is to help users log their food intake accurately.

CRITICAL: You MUST respond with ONLY valid JSON. No plain text, no explanations outside the JSON structure. Your response must start with { and end with }.

CRITICAL: NEVER write confirmation messages like "Please confirm if this works for you!" or "Here's what I have so far:" in plain text. ALWAYS use the JSON structure with "needsConfirmation": true and leave the reply field empty.

WRONG (plain text): "I'll log 1 lb of rigatoni. For the marinara sauce, I'll estimate it as about 1 cup. Here's what I have so far: - Rigatoni: 1 lb - Marinara sauce: 1 cup Please confirm if this works for you!"

CORRECT (JSON): {"action": "log", "logs": [{"item": "rigatoni", "quantity": 1, "unit": "lb", "calories": 1600, "protein": 56, "carbs": 320, "fat": 8}, {"item": "marinara sauce", "quantity": 1, "unit": "cup", "calories": 120, "protein": 4, "carbs": 20, "fat": 4}], "needsConfirmation": true}

USER'S GOALS: ${goals ? `${goals.targetCalories || 'Not set'} kcal, ${goals.targetProtein || 'Not set'}g protein, ${goals.targetCarbs || 'Not set'}g carbs, ${goals.targetFat || 'Not set'}g fat` : 'No goals set yet'}

TODAY'S PROGRESS: ${todayTotals.calories} calories, ${todayTotals.protein}g protein, ${todayTotals.carbs}g carbs, ${todayTotals.fat}g fat

TODAY'S FOOD: ${todayLogs.length > 0 ? todayLogs.map(log => `${log.item} (${log.calories || 0} cal)`).join(', ') : 'None logged yet'}

CONVERSATION CONTEXT: When the user mentions multiple food items in a conversation, you should accumulate them and show the complete list when asking for confirmation. If the user mentions 4 items and then adds a 5th before confirming, show all 5 items in the confirmation message.

FOOD LOGGING INTENT: Be very liberal in detecting food logging intent. If the user mentions any food item, treat it as a food logging request. Common patterns include:
- "I had [food item]" - log the food
- "also [food item]" - add to current list
- "and [food item]" - add to current list  
- "[food item] too" - add to current list
- "plus [food item]" - add to current list
- "Oh I also had [food item]" - add to current list
- Just mentioning a food item when already logging - add to current list

CRITICAL: If the user mentions any food item (like "sauce", "yaki soba", "eggs", "toast", etc.), ALWAYS treat it as food logging intent. Do not return generic "I'm here to help" responses for food items.

IMPORTANT: NEVER log generic items like "food item", "item", "food", etc. If you cannot identify the specific food item, ask for clarification instead of logging a generic placeholder.

BEVERAGE LOGGING: Alcoholic and non-alcoholic beverages are also food items that should be logged. Common beverage patterns include:
- "I had a [beverage]" - log the beverage
- "I drank [beverage]" - log the beverage  
- "[beverage] too" - add to current list
- "also [beverage]" - add to current list
- Examples: "IPA", "beer", "wine", "cocktail", "coffee", "tea", "juice", "soda", "water"

When in doubt, treat it as food logging and let the user confirm or deny at the end.

IMPORTANT: Always respond with valid JSON. You have access to comprehensive nutrition databases and can provide accurate calorie and macro estimates for most foods.

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

EXAMPLES: 

For simple, single items (direct logging):
{
  "action": "log",
  "logs": [
    {"item": "apple", "quantity": 1, "unit": "medium", "calories": 95, "protein": 0, "carbs": 25, "fat": 0}
  ],
  "needsConfirmation": true,
  "reply": ""
}

For multiple items (confirmation required):
{
  "action": "log",
  "logs": [
    {"item": "soba noodles", "quantity": 1.5, "unit": "cups", "calories": 210, "protein": 8, "carbs": 45, "fat": 1},
    {"item": "tofu", "quantity": 4, "unit": "oz", "calories": 80, "protein": 10, "carbs": 2, "fat": 4}
  ],
  "needsConfirmation": true,
  "reply": ""
}

For nutrition feedback (update and confirm):
{
  "action": "log",
  "logs": [
    {"item": "bread", "quantity": 2, "unit": "pieces", "calories": 26.5, "protein": 4, "carbs": 20, "fat": 8}
  ],
  "needsConfirmation": true,
  "reply": ""
}

Rules:
- If the user mentions food they ate (using words like "had", "ate", "drank", "consumed"), set action to "log", add the food to logs array
- For ALL food items, set needsConfirmation to true to require user confirmation
- For multiple items or complex meals, set needsConfirmation to true to show the complete list
- If you have enough information to provide accurate nutrition estimates, include calories, protein, carbs, and fat in the log entry
- If you need more information to provide accurate estimates, set action to "chat" and ask specific clarifying questions in the reply field
- If the user wants to remove food, set action to "remove", add items to itemsToRemove, and set needsConfirmation to true

CRITICAL: When needsConfirmation is true, you MUST leave the reply field completely empty. The system will auto-generate the confirmation message and show confirmation buttons.

LOGGING ACTIONS:
- When logging ANY food items, set action to "log", include the logs array, and set needsConfirmation to true to require user confirmation
- When logging multiple items or complex meals, set action to "log", include the logs array, and set needsConfirmation to true to show the complete list
- When needsConfirmation is true, leave reply field completely empty
- ALL food logging requires confirmation - never set needsConfirmation to false
- The system will automatically generate detailed confirmation messages when needsConfirmation is true
- IMPORTANT: If the user mentions multiple food items in the conversation before confirming, accumulate ALL items and show the complete list in the confirmation message
- For example: If user says "I had eggs and toast" then adds "and coffee", show all 3 items (eggs, toast, coffee) in the confirmation

CRITICAL JSON FORMAT:
- ALWAYS return valid JSON with the exact structure shown above
- NEVER return plain text confirmation messages
- NEVER put confirmation text in the reply field when needsConfirmation is true
- The system will handle generating confirmation messages automatically
- CRITICAL: Your response MUST start with { and end with } - no exceptions
- CRITICAL: Do not include any text before or after the JSON object
- CRITICAL: If you need to log food, use the exact JSON structure shown in the examples
- CRITICAL: If you need to ask a question, use {"action": "chat", "reply": "your question"}
- CRITICAL: If you need to log food with confirmation, use {"action": "log", "logs": [...], "needsConfirmation": true}

QUANTITY CLARIFICATION:
- Ask for clarification when you cannot reasonably estimate calories due to lack of specific details
- Use your judgment to determine when you have enough information to provide accurate calorie estimates
- Ask for specific details (type, preparation, ingredients) when the food item could have widely varying calorie content
- Set action to "chat" and put your clarification question in the "reply" field of the JSON response when details are unclear
- When asking for clarification, use casual language and ask for "rough" amounts (e.g., "How much roughly?", "About how much?", "Roughly how much?")
- Keep clarification questions simple and casual - avoid formal, detailed questions
- Ask about ONE item at a time - do not ask about multiple items in the same question
- Examples of good clarification questions: "Roughly how much rice?", "About how much tofu?", "How much roughly?"
- Examples of bad clarification questions: "What specific veggies will you include, and how much of each?", "Please provide these details", "How much of each are you planning to use?"
- Examples that typically need clarification: "some food", "a bit of food", "food" (with no context), "sauce" (could be 20-200+ cal), "meat" (type matters for calories), "vegetables" (which ones?), "salad" (what's in it?), "soup" (type matters), "sandwich" (what's in it?), "pizza" (toppings matter), "burger" (what's on it?), "smoothie" (what's in it?), "shake" (type matters), "cereal" (type matters), "yogurt" (type matters), "cheese" (type matters), "bread" (type matters), "rice" (type matters), "fish" (type matters), "dessert" (type matters)
- Examples that DON'T need clarification: "2 eggs", "1 apple", "20 oz IPA", "12 oz beer", "5 oz wine", "1 cocktail", "16 oz coffee"

USE INTUITION FOR MOST QUANTITIES:
- Use your judgment to determine when you can make reasonable calorie estimates
- Make assumptions for clear, specific quantities where calorie content is predictable
- "2 eggs" = 2 eggs (predictable calories)
- "1 apple" = 1 medium apple (predictable calories)
- "20 oz IPA" = 20 oz (predictable calories)
- "12 oz beer" = 12 oz (predictable calories)
- "5 oz wine" = 5 oz (predictable calories)
- "1 cocktail" = approximately 8-10 oz (predictable calories)
- Ask for clarification when calorie content could vary significantly based on type, preparation, or ingredients
- Examples requiring clarification: "sauce" (could be 20-200+ cal), "meat" (type matters), "vegetables" (which ones?), "salad" (what's in it?), "bread" (type matters), "rice" (type matters), "fish" (type matters)

CLARIFICATION RESPONSES:
- When the user responds to a clarification question with a quantity (e.g., "1.5 cups", "2 tablespoons", "1/2 cup", "a tablespoon", "1 cup", "2 eggs", "idk a tbsp", "maybe a tbsp", "like a tbsp"), you MUST log the food item with that quantity
- Set action to "log", include the food item with the provided quantity, and set needsConfirmation to true
- Do NOT ask for more clarification if the user has provided a clear quantity
- Examples of clear quantities: "1.5 cups of rice", "2 tablespoons of peanut butter", "1/2 cup of yogurt", "1 apple", "2 eggs", "a tablespoon", "1 cup", "a handful", "a slice", "idk a tbsp", "maybe a tbsp", "like a tbsp", "a tbsp", "20 oz IPA", "12 oz beer", "5 oz wine", "1 cocktail"
- If the user provides a quantity in response to your clarification question, immediately log the food with that quantity

MULTI-PART CLARIFICATION:
- When you ask about multiple items (e.g., "How much chicken and what vegetables?"), and the user only responds with one item, continue asking about the remaining items
- Example: If you asked "How much chicken and what vegetables?" and user says "1lb of chicken", ask "What vegetables did you include?"
- Example: If you asked "How much rice and what protein?" and user says "1 cup rice", ask "What protein did you have?"
- Do NOT log partial information until you have details for all items you asked about
- Keep track of what you've already asked about and what the user has provided

UNCERTAIN RESPONSES:
- When the user responds with uncertainty (e.g., "idk", "I don't know", "normal amount", "regular amount"), make a reasonable assumption based on context
- "Normal amount for a bowl" = approximately 1.5 cups
- "Regular serving" = approximately 1 cup
- "Normal portion" = approximately 1 serving
- When asked about multiple items and user gives a general response, split the amount reasonably:
  - "Normal amount for a single bowl" = approximately 1/2 cup each for multiple vegetables
  - "Regular amount" = approximately 1/2 cup each for multiple items
  - "Normal portion" = approximately 1/2 cup each for multiple ingredients
- Log the food with your reasonable estimate and set needsConfirmation to true
- If the estimate is unclear, ask for a more specific quantity (e.g., "Could you give me a rough amount? Like 1 cup, 2 cups, etc.?")

IMPORTANT: The fallback response should only be used for completely unrecognizable or non-food-related messages. If the user mentions any food items, either log them (if quantity is clear) or ask for clarification (if quantity is unclear). Always put your response message in the "reply" field of the JSON.

CRITICAL JSON RULES:
- NEVER return empty JSON {} - always include at least "action" and "reply" fields
- For clarification questions: {"action": "chat", "reply": "your question here"}
- For logging: {"action": "log", "logs": [...], "needsConfirmation": true}
- For confirmations: {"action": "confirm", "logs": [...]} - MUST include the logs array that was previously confirmed
- For denials: {"action": "chat", "reply": "No problem, I won't log that. What else can I help you with?"}

CONFIRMATION HANDLING:
- When the user responds in the affirmative (e.g., "yes", "confirm", "ok", "sure", "yep", "yeah", "correct", "right", "that's right", "add it", "log it"), set action to "confirm" and leave reply empty
- When the user responds in the negative (e.g., "no", "cancel", "don't", "nope", "nah", "wrong", "incorrect", "remove it", "delete it"), set action to "chat" and provide a helpful response like "No problem, I won't log that. What else can I help you with?"
- When the user provides nutrition feedback (e.g., "it says 26.5 cal for 2 pieces 4g protein 20g carb 8g fat"), set action to "log", update the nutrition data with their feedback, and set needsConfirmation to false for direct logging
- When the user asks for meal suggestions, set action to "chat" and provide helpful suggestions in the reply field
- When needsConfirmation is true, leave reply empty (it will be auto-filled by the system)
- Otherwise, provide a helpful reply in the "reply" field

QUANTITY CORRECTIONS DURING CONFIRMATION:
- When the user says "no I had two of those" or similar quantity corrections during confirmation, update the existing item's quantity
- Do NOT add new items - modify the existing item's quantity
- Examples: "no I had two of those" → update quantity to 2, "actually I had 3" → update quantity to 3, "make it 2" → update quantity to 2
- Set action to "log" with the corrected quantity and set needsConfirmation to true to show the updated confirmation
- Keep the same item name and nutrition data, only change the quantity

RECIPE SUGGESTIONS:
- When providing recipe ideas, always give different suggestions each time
- Vary the cooking methods (grilled, baked, sautéed, roasted, slow-cooked, etc.)
- Include different cuisines (Italian, Asian, Mexican, Mediterranean, etc.)
- Suggest different preparation styles (quick meals, elaborate dishes, healthy options, comfort food, etc.)
- Provide 5-7 different recipe ideas with variety in ingredients, techniques, and flavors
- Avoid repeating the same recipes in consecutive responses

NUTRITION FEEDBACK HANDLING:
- When users provide nutrition feedback (e.g., "it says 26.5 cal for 2 pieces 4g protein 20g carb 8g fat"), parse their feedback and update the nutrition data
- Extract calories, protein, carbs, fat, and quantity from their feedback
- Update the log entry with their corrected nutrition data
- Set needsConfirmation to true to show the updated nutrition data for confirmation
- Leave reply empty - the system will auto-generate the confirmation message with updated data

IMPORTANT: When confirming food items, you MUST include the exact same logs array that was previously shown for confirmation. Do not return empty logs when confirming.

CONFIRMATION MESSAGES:
- When needsConfirmation is true, leave the reply field empty - the system will auto-generate the confirmation message
- Do NOT put confirmation messages like "Please confirm adding..." in the reply field
- The system will automatically show the confirmation message with food details and totals

Use your nutrition knowledge to provide accurate estimates. If you're unsure about quantities or need more details, ask specific questions.`;

    console.log("DEBUG: About to call OpenAI API...");
    console.log("DEBUG: Message to send:", message);
    console.log("DEBUG: Conversation history length:", conversationHistory.length);
    
    let completion;
    try {
      completion = await client.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: system },
          ...conversationHistory.slice(-10), // Include last 10 messages for context
          { role: "user", content: message },
        ],
        temperature: 0.7,
      });
      console.log("DEBUG: OpenAI API call successful");
    } catch (error) {
      console.error("DEBUG: OpenAI API call failed:", error);
      throw error;
    }

    const text = completion.choices?.[0]?.message?.content ?? "{}";
    console.log("DEBUG: AI Response:", text);
    const parsed = extractFirstJson(text) ?? {};
    console.log("DEBUG: Parsed JSON:", parsed);
    const modelOut = ModelOutputSchema.safeParse(parsed);
    console.log("DEBUG: Model output success:", modelOut.success);
    console.log("DEBUG: Model output data:", modelOut.success ? modelOut.data : "N/A");

    if (!modelOut.success) {
      console.error("AI Response Parsing Failed:", {
        originalText: text,
        parsed: parsed,
        errors: modelOut.error?.errors || []
      });
      
      // Let the LLM handle food recognition - no hardcoded lists needed
      
      // Return a fallback response instead of error
      return NextResponse.json({
        action: "chat",
        reply: "I'm having trouble understanding that right now. You can:\n• Log food: \"I had 2 eggs for breakfast\"\n• Ask for suggestions: \"What should I eat?\"\n• Remove items: \"Remove the eggs from today\"\n• Get help: \"What can you do?\"",
        logs: [],
        goals: {},
        itemsToRemove: [],
        needsConfirmation: false,
        error: true,
        errorType: "parsing"
      });
    }

    const data = modelOut.data;
    let action = data.action;
    let logs = data.logs || [];
    const newGoals = data.goals;
    const itemsToRemove = data.itemsToRemove || [];
    let needsConfirmation = data.needsConfirmation || false;
    let reply = data.reply;

    console.log("DEBUG: Parsed action:", action);
    console.log("DEBUG: Parsed reply:", reply);
    console.log("DEBUG: Parsed needsConfirmation:", needsConfirmation);
    console.log("DEBUG: Parsed logs length:", logs.length);
    console.log("DEBUG: Original message:", message);
    console.log("DEBUG: Message contains 'had':", message.toLowerCase().includes("had"));
    console.log("DEBUG: Message contains 'also':", message.toLowerCase().includes("also"));

    // Validate that no generic food items are being logged
    const genericFoodItems = ['food item', 'item', 'food', 'unknown item', 'unknown food'];
    const hasGenericItems = logs.some(log => 
      genericFoodItems.some(generic => 
        log.item.toLowerCase().includes(generic.toLowerCase())
      )
    );
    
    if (hasGenericItems) {
      console.error("CRITICAL: AI attempted to log generic food items:", logs);
      return NextResponse.json({
        action: "chat",
        reply: "I'm having trouble identifying what food item you're referring to. Could you please be more specific? For example: \"I had a 20 oz IPA\" or \"I ate 2 eggs\"",
        logs: [],
        goals: {},
        itemsToRemove: [],
        needsConfirmation: false,
        error: true,
        errorType: "generic_item"
      });
    }

    // Check if the AI returned valid JSON but didn't handle a quantity response properly
    if (action === "chat" && reply && reply.toLowerCase().includes("i'm here to help") && 
        (message.toLowerCase().includes("tbsp") || message.toLowerCase().includes("tablespoon") || 
         message.toLowerCase().includes("cup") || message.toLowerCase().includes("oz"))) {
      console.log("DEBUG: AI returned generic response for quantity input, handling as quantity response");
      // Treat this as a quantity response that needs to be logged
      action = "log";
      logs = [{
        item: message.trim(),
        quantity: 1,
        unit: "serving",
        calories: undefined,
        protein: undefined,
        carbs: undefined,
        fat: undefined
      }];
      needsConfirmation = true;
      reply = "";
    }

    // Check if the AI returned a generic response when it should have detected food logging
    if (action === "chat" && reply && (
        reply.toLowerCase().includes("i'm here to help") || 
        reply.toLowerCase().includes("didn't quite understand") ||
        reply.toLowerCase().includes("you can ask me")
      ) && (
        message.toLowerCase().includes("had") || 
        message.toLowerCase().includes("also") ||
        message.toLowerCase().includes("sauce") ||
        message.toLowerCase().includes("yaki soba")
      )) {
      console.log("DEBUG: AI returned generic response for food logging input, handling as food logging request");
      // Treat this as a food logging request that needs quantity clarification
      action = "chat";
      logs = [];
      needsConfirmation = true; // Always require confirmation for food logging
      reply = "I see you want to log some food. Could you tell me roughly how much you had? For example: \"1 cup\", \"2 tablespoons\", \"a handful\", etc.";
    }

    // Check if we got empty JSON or missing critical fields
    if (!action || (action === "chat" && !reply)) {
      // Check if the message contains food items that should be logged
      const commonFoodItems = [
        'oats', 'protein', 'almond', 'yogurt', 'strawberries', 'chia', 'peanut', 'butter',
        'rice', 'pasta', 'bread', 'eggs', 'chicken', 'beef', 'fish', 'salmon', 'tofu',
        'vegetables', 'fruits', 'apple', 'banana', 'orange', 'milk', 'cheese', 'sauce',
        'soup', 'salad', 'sandwich', 'pizza', 'noodles', 'pancakes', 'waffles', 'cereal',
        'ipa', 'beer', 'ale', 'lager', 'stout', 'wine', 'cocktail', 'drink', 'beverage',
        'whiskey', 'vodka', 'gin', 'rum', 'tequila', 'bourbon', 'scotch', 'brandy'
      ];
      
      const containsFoodItems = commonFoodItems.some(keyword => 
        message.toLowerCase().includes(keyword)
      );
      
      if (containsFoodItems) {
        console.log("DEBUG: Detected food items in message, treating as food logging request");
        
        // Check if the message already contains quantities
        const quantityPatterns = [
          /\d+\/\d+\s*(cup|cups|tbsp|tablespoon|tablespoons|scoop|scoops|oz|ounce|ounces)/i,
          /\d+\.\d+\s*(cup|cups|tbsp|tablespoon|tablespoons|scoop|scoops|oz|ounce|ounces)/i,
          /\d+\s*(cup|cups|tbsp|tablespoon|tablespoons|scoop|scoops|oz|ounce|ounces)/i
        ];
        
        const hasQuantities = quantityPatterns.some(pattern => pattern.test(message));
        
        // Don't interfere with AI processing - let it handle the message normally
        // The fallback below will catch any issues
      }
      // This is likely a clarification question that wasn't properly formatted
      // Try to extract the question from the AI's raw response
      const text = completion.choices?.[0]?.message?.content ?? "";
      console.log("DEBUG: Smart fallback triggered. Raw AI response:", text);
      console.log("DEBUG: Contains question mark:", text.includes("?"));
      console.log("DEBUG: Contains 'how much':", text.toLowerCase().includes("how much"));
      console.log("DEBUG: Contains 'quantity':", text.toLowerCase().includes("quantity"));
      
      // Check if this looks like a confirmation message with nutrition data
      if (text.includes("Please confirm adding") && text.includes("cal,") && text.includes("g protein")) {
        console.log("DEBUG: Detected confirmation message with nutrition data, extracting...");
        
        // Try to extract nutrition data from the confirmation message
        const lines = text.split('\n').filter(line => line.trim().startsWith('-'));
        const extractedLogs = [];
        
        for (const line of lines) {
          // Parse lines like "- soba noodles (1.5 cups): 210 cal, 8g protein, 45g carbs, 1g fat"
          const match = line.match(/^-\s+([^(]+?)\s*\(([^)]+)\):\s*(\d+)\s*cal,\s*(\d+)g\s*protein,\s*(\d+)g\s*carbs,\s*(\d+)g\s*fat/);
          if (match) {
            const [, item, quantityUnit, calories, protein, carbs, fat] = match;
            const [quantity, unit] = quantityUnit.trim().split(' ');
            
            extractedLogs.push({
              item: item.trim(),
              quantity: parseFloat(quantity),
              unit: unit,
              calories: parseInt(calories),
              protein: parseInt(protein),
              carbs: parseInt(carbs),
              fat: parseInt(fat)
            });
          }
        }
        
        if (extractedLogs.length > 0) {
          console.log("DEBUG: Successfully extracted logs:", extractedLogs);
          // Return the confirmation message directly
          return NextResponse.json({
            action: "log",
            logs: extractedLogs,
            needsConfirmation: true,
            reply: text.trim(),
            goals: {},
            itemsToRemove: []
          });
        }
      }
      
      // Check if this looks like nutrition feedback
      const nutritionFeedbackPattern = /(\d+(?:\.\d+)?)\s*cal.*?(\d+(?:\.\d+)?)\s*g\s*protein.*?(\d+(?:\.\d+)?)\s*g\s*carbs.*?(\d+(?:\.\d+)?)\s*g\s*fat/i;
      const feedbackMatch = text.match(nutritionFeedbackPattern);
      
      if (feedbackMatch) {
        console.log("DEBUG: Detected nutrition feedback, parsing...");
        const [, calories, protein, carbs, fat] = feedbackMatch;
        
        // Try to extract quantity and item from the message
        const quantityMatch = text.match(/(\d+(?:\.\d+)?)\s*(pieces?|slices?|cups?|tbsp|tablespoons?|oz|ounces?|grams?|g)/i);
        const quantity = quantityMatch ? parseFloat(quantityMatch[1]) : 1;
        const unit = quantityMatch ? quantityMatch[2] : "serving";
        
        // Try to extract the food item from the previous conversation
        const previousMessage = conversationHistory[conversationHistory.length - 1];
        let foodItem = "food item";
        if (previousMessage && previousMessage.role === "assistant" && previousMessage.content.includes("cal,")) {
          // Extract item name from the previous confirmation message
          const itemMatch = previousMessage.content.match(/^-\s+([^(]+?)\s*\(/);
          if (itemMatch) {
            foodItem = itemMatch[1].trim();
          }
        }
        
        return NextResponse.json({
          action: "log",
          logs: [{
            item: foodItem,
            quantity: quantity,
            unit: unit,
            calories: parseFloat(calories),
            protein: parseFloat(protein),
            carbs: parseFloat(carbs),
            fat: parseFloat(fat)
          }],
          needsConfirmation: true,
          reply: "",
          goals: {},
          itemsToRemove: []
        });
      }
      
      // Check if this looks like a confirmation response
      if (text.toLowerCase().includes("confirmed") || text.toLowerCase().includes("added") || text.toLowerCase().includes("logged")) {
        console.log("DEBUG: Detected confirmation response, returning as chat");
        return NextResponse.json({
          action: "chat",
          reply: text.trim(),
          logs: [],
          goals: {},
          itemsToRemove: [],
          needsConfirmation: false,
        });
      }
      
      if (text.includes("?") || text.toLowerCase().includes("how much") || text.toLowerCase().includes("quantity")) {
        // This looks like a clarification question, return it properly
        console.log("DEBUG: Returning clarification question as proper response");
        return NextResponse.json({
          action: "chat",
          reply: text.trim(),
          logs: [],
          goals: {},
          itemsToRemove: [],
          needsConfirmation: false,
        });
      }
      
      // Check if this looks like a quantity response that should be logged
      const lowerText = text.toLowerCase();
      const quantityKeywords = [
        'tbsp', 'tablespoon', 'tbs', 'tbspn',
        'cup', 'cups', 
        'oz', 'ounce', 'ounces',
        'gram', 'grams', 'g',
        'handful', 'slice', 'piece', 'serving',
        '1tbsp', '2tbsp', '1tbs', '2tbs',
        '1cup', '2cup', '1cups', '2cups',
        '1oz', '2oz', '1ounce', '2ounce'
      ];
      const hasQuantity = quantityKeywords.some(keyword => lowerText.includes(keyword));
      
      // Check for quantity-like responses that might not have exact keywords
      const quantityLikePatterns = [
        'like a', 'about a', 'maybe a', 'roughly a', 'around a',
        'like 1', 'about 1', 'maybe 1', 'roughly 1', 'around 1',
        'like 2', 'about 2', 'maybe 2', 'roughly 2', 'around 2'
      ];
      const hasQuantityLikePattern = quantityLikePatterns.some(pattern => lowerText.includes(pattern));
      
      console.log("DEBUG: Smart fallback analysis:");
      console.log("DEBUG: Text:", text);
      console.log("DEBUG: Lower text:", lowerText);
      console.log("DEBUG: Has quantity:", hasQuantity);
      console.log("DEBUG: Has quantity like pattern:", hasQuantityLikePattern);
      console.log("DEBUG: Quantity keywords found:", quantityKeywords.filter(keyword => lowerText.includes(keyword)));
      console.log("DEBUG: Quantity like patterns found:", quantityLikePatterns.filter(pattern => lowerText.includes(pattern)));
      
      // Check if this looks like a complete food logging request
      const foodKeywords = ['of', 'with', 'and', 'too', 'also', 'plus', 'add', 'had', 'ate', 'drank'];
      const hasFoodContext = foodKeywords.some(keyword => lowerText.includes(keyword));
      
      // Check if we're in a food logging conversation context
      const isInFoodLoggingContext = conversationHistory.some(msg => 
        msg.role === "assistant" && (
          msg.content.includes("Please confirm adding") ||
          msg.content.includes("How much") ||
          msg.content.includes("roughly how much") ||
          msg.content.includes("about how much")
        )
      );
      
      // Also check for food items that might not have the context keywords
      const foodItems = ['yogurt', 'rice', 'tofu', 'chicken', 'beef', 'fish', 'pasta', 'bread', 'soup', 'salad', 'fruit', 'vegetables', 'nuts', 'cheese', 'milk', 'juice', 'sauce', 'dressing', 'yaki soba', 'soba', 'noodles', 'peanut butter', 'honey', 'syrup', 'ketchup', 'mayo', 'mustard'];
      const hasFoodItem = foodItems.some(item => lowerText.includes(item));
      
      // Check if this looks like an AI response (contains confirmation language)
      const aiResponseKeywords = [
        'please confirm', 'reply with', 'totals:', 'cal,', 'g protein', 'g carbs', 'g fat',
        'i\'ll log', 'i\'ll estimate', 'here\'s what', 'let me log', 'i\'m logging',
        'i detected', 'i see you', 'could you tell me', 'how much', 'roughly how much',
        'about how much', 'i need to know', 'i\'m here to help', 'you can ask me',
        'i understand', 'no problem', 'i won\'t log', 'what else can i help',
        'please let me know', 'which entry', 'what changes', 'edit', 'modify', 'update',
        'remove', 'delete', 'change', 'adjust', 'correct', 'confirmed', 'added', 'logged'
      ];
      const isAiResponse = aiResponseKeywords.some(keyword => lowerText.includes(keyword));
      
      // Additional check: if the text is longer than 50 characters and contains multiple sentences, it's likely an AI response
      const isLongResponse = text.length > 50 && (text.includes('.') || text.includes('!') || text.includes('?'));
      const isLikelyAiResponse = isAiResponse || isLongResponse;
      
      console.log("DEBUG: Is AI response:", isAiResponse);
      console.log("DEBUG: Is long response:", isLongResponse);
      console.log("DEBUG: Is likely AI response:", isLikelyAiResponse);
      console.log("DEBUG: AI response keywords found:", aiResponseKeywords.filter(keyword => lowerText.includes(keyword)));
      
      if (hasQuantity && (hasFoodContext || hasFoodItem) && !isLikelyAiResponse) {
        // This looks like a complete food logging request with quantity, try to extract and log it
        console.log("DEBUG: Detected complete food logging request with quantity, attempting to log");
        return NextResponse.json({
          action: "log",
          logs: [{
            item: text.trim(),
            quantity: 1,
            unit: "serving",
            calories: undefined,
            protein: undefined,
            carbs: undefined,
            fat: undefined
          }],
          needsConfirmation: true,
          reply: `I detected you want to log: "${text.trim()}". I don't have nutrition data for this item, but I can log it for you. You can edit the nutrition details later if needed.`,
          goals: {},
          itemsToRemove: []
        });
      } else if (isInFoodLoggingContext && hasFoodItem && !isLikelyAiResponse) {
        // If we're in a food logging context and user mentions a food item, treat it as food logging
        console.log("DEBUG: Detected food item in food logging context, asking for quantity");
        console.log("DEBUG: In food logging context:", isInFoodLoggingContext);
        console.log("DEBUG: Has food item:", hasFoodItem);
        return NextResponse.json({
          action: "chat",
          reply: "I see you want to log some food. Could you tell me roughly how much you had? For example: \"1 cup\", \"2 tablespoons\", \"a handful\", etc.",
          logs: [],
          goals: {},
          itemsToRemove: [],
          needsConfirmation: false,
        });
      } else if (hasFoodContext && hasFoodItem && !isLikelyAiResponse) {
        // This looks like a food logging request without quantity, ask for quantity
        console.log("DEBUG: Detected food logging request without quantity, asking for quantity");
        console.log("DEBUG: Has food context:", hasFoodContext);
        console.log("DEBUG: Has food item:", hasFoodItem);
        return NextResponse.json({
          action: "chat",
          reply: "I see you want to log some food. Could you tell me roughly how much you had? For example: \"1 cup\", \"2 tablespoons\", \"a handful\", etc.",
          logs: [],
          goals: {},
          itemsToRemove: [],
          needsConfirmation: false,
        });
      } else if ((hasQuantity || hasQuantityLikePattern) && !isLikelyAiResponse) {
        // This looks like a quantity response, ask for clarification about what food item
        console.log("DEBUG: Detected quantity response, asking for food item");
        return NextResponse.json({
          action: "chat",
          reply: "I see you mentioned a quantity, but I need to know what food item you're referring to. Could you tell me what food you had?",
          logs: [],
          goals: {},
          itemsToRemove: [],
          needsConfirmation: false,
        });
      }
      
      // If we get here, the response wasn't recognized - ask for clarification instead of generic fallback
      console.log("DEBUG: Response not recognized, asking for clarification");
      return NextResponse.json({
        action: "chat",
        reply: "I didn't quite understand that response. Could you rephrase it? For example:\n• \"1 tablespoon\"\n• \"about a cup\"\n• \"half a serving\"\n• \"I don't know, maybe 2 tablespoons\"",
        logs: [],
        goals: {},
        itemsToRemove: [],
        needsConfirmation: false,
        debug: {
          llmResponse: text,
          parsedJson: parsed,
          modelOutputSuccess: false,
          modelOutputData: "JSON parsing failed - fallback to hardcoded logic",
          finalReply: "I didn't quite understand that response. Could you rephrase it? For example:\n• \"1 tablespoon\"\n• \"about a cup\"\n• \"half a serving\"\n• \"I don't know, maybe 2 tablespoons\"",
          action: "chat",
          needsConfirmation: false,
          logsLength: 0,
          originalMessage: message,
          conversationHistoryLength: conversationHistory.length
        }
      });
    }

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
      
      // If no logs in the response but this is a confirmation, check if the previous message was asking for confirmation
      const previousMessage = conversationHistory[conversationHistory.length - 1];
      if (previousMessage && previousMessage.role === "assistant" && 
          (previousMessage.content.includes("Please confirm adding") || 
           previousMessage.content.includes("Reply with \"yes\" to confirm"))) {
        // This is likely a confirmation of previously logged items
        // We can't recover the exact logs, but we can acknowledge the confirmation
        return NextResponse.json({
          action: "confirm",
          logs: [],
          reply: "I understand you want to confirm, but I couldn't retrieve the specific items. Could you please try logging your food again?",
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
    
    // Check if user is done logging for the day
    const doneLoggingPatterns = [
      'done', 'finished', 'complete', 'that\'s all', 'that\'s it', 'all done',
      'done for today', 'finished logging', 'complete for today', 'done eating',
      'finished eating', 'no more', 'that\'s everything', 'all set'
    ];
    const isDoneLogging = doneLoggingPatterns.some(pattern => 
      message.toLowerCase().includes(pattern.toLowerCase())
    );
    
    // Handle "done logging" requests
    if (isDoneLogging) {
      const todaySummary = `Great! Here's your summary for today:\n\n` +
        `📊 **Daily Totals:**\n` +
        `• Calories: ~${Math.round(todayTotals.calories)} / ${goals?.targetCalories || 'N/A'}\n` +
        `• Protein: ${Math.round(todayTotals.protein)}g / ${goals?.targetProtein || 'N/A'}g\n` +
        `• Carbs: ${Math.round(todayTotals.carbs)}g / ${goals?.targetCarbs || 'N/A'}g\n` +
        `• Fat: ${Math.round(todayTotals.fat)}g / ${goals?.targetFat || 'N/A'}g\n\n` +
        `🎯 **Remaining:**\n` +
        `• Calories: ~${Math.max(0, remaining.calories)}\n` +
        `• Protein: ${Math.max(0, remaining.protein)}g\n` +
        `• Carbs: ${Math.max(0, remaining.carbs)}g\n` +
        `• Fat: ${Math.max(0, remaining.fat)}g\n\n` +
        `Have a great rest of your day! 🌟`;
      
      finalReply = todaySummary;
    }
    
    // If we need confirmation for adds, list the items with their macros and totals
    if ((!finalReply || finalReply === "") && needsConfirmation && action === "log" && logs.length > 0) {
      console.log("DEBUG: Generating confirmation message");
      console.log("DEBUG: finalReply:", finalReply);
      console.log("DEBUG: needsConfirmation:", needsConfirmation);
      console.log("DEBUG: action:", action);
      console.log("DEBUG: logs length:", logs.length);
      
      // Look for pending items in the conversation history
      const pendingItems: Array<{
        item: string;
        quantity: number;
        unit: string;
        calories: number;
        protein: number;
        carbs: number;
        fat: number;
      }> = [];
      
      // Check if there are any pending items from previous messages in this conversation
      // Look for messages that contain "Please confirm adding" but haven't been confirmed yet
      for (let i = conversationHistory.length - 1; i >= 0; i--) {
        const msg = conversationHistory[i];
        if (msg.role === "assistant" && msg.content.includes("Please confirm adding")) {
          // Extract items from this confirmation message
          const lines = msg.content.split('\n').filter(line => line.trim().startsWith('-'));
          for (const line of lines) {
            // Parse lines like "- item name (quantity unit): calories cal, protein g protein, carbs g carbs, fat g fat"
            const match = line.match(/^-\s+([^(]+?)\s*\(([^)]+)\):\s*(\d+)\s*cal,\s*(\d+)g\s*protein,\s*(\d+)g\s*carbs,\s*(\d+)g\s*fat/);
            if (match) {
              const [, item, quantityUnit, calories, protein, carbs, fat] = match;
              const [quantity, unit] = quantityUnit.trim().split(' ');
              
              pendingItems.push({
                item: item.trim(),
                quantity: parseFloat(quantity),
                unit: unit,
                calories: parseInt(calories),
                protein: parseInt(protein),
                carbs: parseInt(carbs),
                fat: parseInt(fat)
              });
            }
          }
          break; // Stop at the first confirmation message we find
        }
      }
      
      // Combine pending items with current logs
      const allItems = [...pendingItems, ...logs];
      
      const lines = allItems
        .map(
          (l) => {
            const quantityText = l.quantity && l.unit ? ` (${l.quantity} ${l.unit})` : "";
            const hasNutritionData = l.calories !== null && l.calories !== undefined || 
                                    l.protein !== null && l.protein !== undefined || 
                                    l.carbs !== null && l.carbs !== undefined || 
                                    l.fat !== null && l.fat !== undefined;
            
            if (hasNutritionData) {
              return `- ${l.item}${quantityText}: ${Math.round(l.calories ?? 0)} cal, ${Math.round(
                l.protein ?? 0
              )}g protein, ${Math.round(l.carbs ?? 0)}g carbs, ${Math.round(l.fat ?? 0)}g fat`;
            } else {
              return `- ${l.item}${quantityText} (nutrition data not available)`;
            }
          }
        )
        .join("\n");
      
      if (allItems.length === 1) {
        finalReply = `Please confirm adding:\n${lines}\n\nReply with "yes" to confirm or "no" to cancel.`;
      } else {
        const totals = allItems.reduce(
          (acc, l) => ({
            calories: acc.calories + (l.calories || 0),
            protein: acc.protein + (l.protein || 0),
            carbs: acc.carbs + (l.carbs || 0),
            fat: acc.fat + (l.fat || 0),
          }),
          { calories: 0, protein: 0, carbs: 0, fat: 0 }
        );
        finalReply = `Please confirm adding the following ${allItems.length} item(s):\n${lines}\n\nTotals: ${Math.round(
          totals.calories
        )} cal, ${Math.round(totals.protein)}g protein, ${Math.round(totals.carbs)}g carbs, ${Math.round(
          totals.fat
        )}g fat\n\nReply with "yes" to confirm or "no" to cancel.`;
      }
      console.log("DEBUG: Generated finalReply:", finalReply);
      console.log("DEBUG: Pending items found:", pendingItems.length);
      console.log("DEBUG: Total items in confirmation:", allItems.length);
    }
    // REMOVED: Auto-logging without confirmation - this was a critical bug
    // All food logging should require explicit confirmation
    
    // If we have logs to confirm but no finalReply, generate a confirmation message
    if (!finalReply && action === "log" && logs.length > 0) {
      console.log("DEBUG: Generating confirmation message for logs:", logs);
      const lines = logs
        .map((log) => {
          const quantityText = log.quantity && log.unit ? ` (${log.quantity} ${log.unit})` : "";
          const hasNutritionData = log.calories !== null && log.calories !== undefined || 
                                  log.protein !== null && log.protein !== undefined || 
                                  log.carbs !== null && log.carbs !== undefined || 
                                  log.fat !== null && log.fat !== undefined;
          
          if (hasNutritionData) {
            return `- ${log.item}${quantityText}: ${Math.round(log.calories ?? 0)} cal, ${Math.round(log.protein ?? 0)}g protein, ${Math.round(log.carbs ?? 0)}g carbs, ${Math.round(log.fat ?? 0)}g fat`;
          } else {
            return `- ${log.item}${quantityText} (nutrition data not available)`;
          }
        })
        .join("\n");
      
      if (logs.length === 1) {
        finalReply = `Please confirm adding:\n${lines}\n\nReply with "yes" to confirm or "no" to cancel.`;
      } else {
        const totals = logs.reduce(
          (acc, log) => ({
            calories: acc.calories + (log.calories || 0),
            protein: acc.protein + (log.protein || 0),
            carbs: acc.carbs + (log.carbs || 0),
            fat: acc.fat + (log.fat || 0),
          }),
          { calories: 0, protein: 0, carbs: 0, fat: 0 }
        );
        finalReply = `Please confirm adding the following ${logs.length} item(s):\n${lines}\n\nTotals: ${Math.round(totals.calories)} cal, ${Math.round(totals.protein)}g protein, ${Math.round(totals.carbs)}g carbs, ${Math.round(totals.fat)}g fat\n\nReply with "yes" to confirm or "no" to cancel.`;
      }
    }
    
    if (!finalReply && action === "chat") {
      // Let the LLM handle food recognition - no hardcoded lists needed
      finalReply = "I understand. How else can I help you with your nutrition tracking?";
    }
    if (!finalReply && action === "remove") {
      finalReply = "I can help you remove items from your food log. Please specify which items you'd like to remove.";
    }
    if (!finalReply) {
      console.warn("No finalReply generated, using fallback message");
      finalReply = "I'm here to help with your nutrition tracking. You can ask me to log food, remove items, or get advice about your goals.";
    }
    
    // Final safety check - ensure we never return an empty reply
    if (!finalReply || finalReply.trim() === "") {
      console.error("CRITICAL: Empty finalReply detected, using emergency fallback");
      finalReply = "I'm having trouble responding right now. Please try again or rephrase your message.";
    }

    // Upsert goals
    if (newGoals && Object.keys(newGoals).length > 0) {
      await prisma.goal.upsert({
        where: { userId: user.id },
        update: newGoals,
        create: { userId: user.id, ...newGoals },
      });
    }

    console.log("DEBUG: Final response values:");
    console.log("DEBUG: action:", action);
    console.log("DEBUG: finalReply:", finalReply);
    console.log("DEBUG: needsConfirmation:", needsConfirmation);
    console.log("DEBUG: logs:", logs);

    // Include debug information in development
    const response: {
      action: string;
      reply: string;
      logs: any[];
      goals?: any;
      itemsToRemove?: any[];
      needsConfirmation: boolean;
      debug?: any;
    } = {
      action,
      reply: finalReply ?? "I'm here to help with your nutrition tracking. You can ask me to log food, remove items, or get advice about your goals.",
      logs,
      goals: newGoals,
      itemsToRemove,
      needsConfirmation,
    };

    // Always add debug information (for production debugging)
    response.debug = {
      llmResponse: text,
      parsedJson: parsed,
      modelOutputSuccess: modelOut.success,
      modelOutputData: modelOut.success ? modelOut.data : (modelOut as { error: unknown }).error,
      finalReply,
      action,
      needsConfirmation,
      logsLength: logs.length,
      originalMessage: message,
      conversationHistoryLength: conversationHistory.length
    };

    console.log("DEBUG: Response object being returned:", JSON.stringify(response, null, 2));
    console.log("DEBUG: Deployment test - this should show in logs");
    console.log("DEBUG: LLM Response Text:", text);
    console.log("DEBUG: Model Output Success:", modelOut.success);
    console.log("DEBUG: Model Output Data:", modelOut.success ? modelOut.data : (modelOut as { error: unknown }).error);

    return NextResponse.json(response);
  } catch (err: unknown) {
    console.error("Chat API Error:", err);
    
    // Provide user-friendly error messages based on the error type
    let errorMessage = "I'm having trouble processing your request right now.";
    let isDatabaseError = false;
    
    if (err instanceof Error) {
      const errorStr = err.message.toLowerCase();
      
      // Database connection errors
      if (errorStr.includes("can't reach database") || 
          errorStr.includes("database server") ||
          errorStr.includes("connection") ||
          errorStr.includes("timeout")) {
        errorMessage = "I'm having trouble connecting to your data right now. Please try again in a moment, or check your internet connection.";
        isDatabaseError = true;
      }
      
      // OpenAI API errors
      else if (errorStr.includes("openai") || 
               errorStr.includes("api key") ||
               errorStr.includes("rate limit")) {
        errorMessage = "I'm having trouble processing your request. Please try again in a moment.";
      }
      
      // Network errors
      else if (errorStr.includes("network") || 
               errorStr.includes("fetch") ||
               errorStr.includes("timeout")) {
        errorMessage = "I'm having trouble connecting to my services. Please check your internet connection and try again.";
      }
      
      // JSON parsing errors
      else if (errorStr.includes("json") || 
               errorStr.includes("parse") ||
               errorStr.includes("syntax")) {
        errorMessage = "I received an unexpected response. Please try rephrasing your message.";
      }
    }
    
    // Return a structured error response that the frontend can handle
    return NextResponse.json({
      action: "chat",
      reply: errorMessage + "\n\nYou can still try:\n• Logging food: \"I had 2 eggs for breakfast\"\n• Asking for help: \"What can you do?\"",
      logs: [],
      goals: {},
      itemsToRemove: [],
      needsConfirmation: false,
      error: true,
      errorType: isDatabaseError ? "database" : "general"
    }, { status: 200 }); // Return 200 instead of 500 so frontend can handle it gracefully
  }
}


