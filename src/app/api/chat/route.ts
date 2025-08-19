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
    const user = await prisma.user.upsert({
      where: { id: providedUserId ?? 1 },
      update: {},
      create: { id: providedUserId ?? 1 },
    });

    // Use Eastern Time for date calculations
    const now = new Date();
    const easternDate = new Date(now.toLocaleDateString("en-US", {timeZone: "America/New_York"}));
    const dayDate = startOfDay(day ? new Date(day) : easternDate);

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
    const system = `You are a nutrition logging assistant. Your job is to help users log their food intake accurately.

USER'S GOALS: ${goals ? `${goals.targetCalories || 'Not set'} kcal, ${goals.targetProtein || 'Not set'}g protein, ${goals.targetCarbs || 'Not set'}g carbs, ${goals.targetFat || 'Not set'}g fat` : 'No goals set yet'}

TODAY'S PROGRESS: ${todayTotals.calories} calories, ${todayTotals.protein}g protein, ${todayTotals.carbs}g carbs, ${todayTotals.fat}g fat

TODAY'S FOOD: ${todayLogs.length > 0 ? todayLogs.map(log => `${log.item} (${log.calories || 0} cal)`).join(', ') : 'None logged yet'}

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

Rules:
- If the user mentions food they ate (using words like "had", "ate", "drank", "consumed"), set action to "log", add the food to logs array, and set needsConfirmation to true
- If you have enough information to provide accurate nutrition estimates, include calories, protein, carbs, and fat in the log entry
- If you need more information to provide accurate estimates, set action to "chat" and ask specific clarifying questions in the reply field
- If the user wants to remove food, set action to "remove", add items to itemsToRemove, and set needsConfirmation to true

QUANTITY CLARIFICATION:
- If the user mentions a food item WITHOUT specifying a quantity (e.g., "I had peanuts", "I ate chicken", "I drank wine"), you MUST ask for the quantity before logging
- Set action to "chat" and put your clarification question in the "reply" field of the JSON response
- Ask specific questions like "How much roasted salted peanuts did you have? (e.g., 1 cup, 2 tablespoons, 1/4 cup, 1 handful)"
- Only proceed with logging when the user provides a clear quantity
- Examples that need clarification: "peanuts", "chicken", "wine", "bread", "rice", "salad", "soup", "yogurt", "fruit", "vegetables", "nuts", "cheese", "cereal", "milk", "juice", "coffee", "tea"
- Examples that DON'T need clarification: "a cup of peanuts", "2 eggs", "1 apple", "a glass of wine", "a slice of bread", "a bowl of soup", "a serving of pasta"

CLARIFICATION RESPONSES:
- When the user responds to a clarification question with a quantity (e.g., "1.5 cups", "2 tablespoons", "1/2 cup"), you MUST log the food item with that quantity
- Set action to "log", include the food item with the provided quantity, and set needsConfirmation to true
- Do NOT ask for more clarification if the user has provided a clear quantity
- Examples of clear quantities: "1.5 cups of rice", "2 tablespoons of peanut butter", "1/2 cup of yogurt", "1 apple", "2 eggs"

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
- When the user asks for meal suggestions, set action to "chat" and provide helpful suggestions in the reply field
- When needsConfirmation is true, leave reply empty (it will be auto-filled by the system)
- Otherwise, provide a helpful reply in the "reply" field

IMPORTANT: When confirming food items, you MUST include the exact same logs array that was previously shown for confirmation. Do not return empty logs when confirming.

CONFIRMATION MESSAGES:
- When needsConfirmation is true, leave the reply field empty - the system will auto-generate the confirmation message
- Do NOT put confirmation messages like "Please confirm adding..." in the reply field
- The system will automatically show the confirmation message with food details and totals

Use your nutrition knowledge to provide accurate estimates. If you're unsure about quantities or need more details, ask specific questions.`;

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
    console.log("DEBUG: AI Response:", text);
    const parsed = extractFirstJson(text) ?? {};
    console.log("DEBUG: Parsed JSON:", parsed);
    const modelOut = ModelOutputSchema.safeParse(parsed);
    console.log("DEBUG: Model output success:", modelOut.success);

    if (!modelOut.success) {
      // Return a fallback response instead of error
      return NextResponse.json({
        action: "chat",
        reply: "Sorry, I didn't quite understand that. You can:\n• Log food: \"I had 2 eggs for breakfast\"\n• Ask for suggestions: \"What should I eat?\"\n• Remove items: \"Remove the eggs from today\"\n• Get help: \"What can you do?\"",
        logs: [],
        goals: {},
        itemsToRemove: [],
        needsConfirmation: false,
      });
    }

    const { action, logs = [], goals: newGoals, itemsToRemove = [], needsConfirmation = false, reply } = modelOut.data;

    // Check if we got empty JSON or missing critical fields
    if (!action || (action === "chat" && !reply)) {
      // This is likely a clarification question that wasn't properly formatted
      // Try to extract the question from the AI's raw response
      const text = completion.choices?.[0]?.message?.content ?? "";
      console.log("DEBUG: Smart fallback triggered. Raw AI response:", text);
      console.log("DEBUG: Contains question mark:", text.includes("?"));
      console.log("DEBUG: Contains 'how much':", text.toLowerCase().includes("how much"));
      console.log("DEBUG: Contains 'quantity':", text.toLowerCase().includes("quantity"));
      
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
      
      // Otherwise, return fallback
      console.log("DEBUG: Returning generic fallback");
      return NextResponse.json({
        action: "chat",
        reply: "I'm sorry, I didn't get that. Let me try to help you with nutrition tracking:\n\n• Log food: \"I had 2 eggs for breakfast\"\n• Ask for suggestions: \"What should I eat?\"\n• Remove items: \"Remove the eggs from today\"\n• Get help: \"What can you do?\"\n\nCould you try rephrasing your request?",
        logs: [],
        goals: {},
        itemsToRemove: [],
        needsConfirmation: false,
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
    if (!finalReply && needsConfirmation && action === "log" && logs.length > 0) {
      const lines = logs
        .map(
          (l) => {
            const quantityText = l.quantity && l.unit ? ` (${l.quantity} ${l.unit})` : "";
            return `- ${l.item}${quantityText}: ${Math.round(l.calories ?? 0)} cal, ${Math.round(
              l.protein ?? 0
            )}g protein, ${Math.round(l.carbs ?? 0)}g carbs, ${Math.round(l.fat ?? 0)}g fat`;
          }
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
      finalReply = "I understand. How else can I help you with your nutrition tracking?";
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


