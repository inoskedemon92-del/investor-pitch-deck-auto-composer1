import { GoogleGenAI, Type } from "@google/genai";

const SYSTEM_INSTRUCTION = `Role and Objective: You are an advanced AI Research Agent working within an application titled "Investor pitch deck auto composer". Your sole purpose is to act as the first step in a workflow: ingesting raw, unstructured ideas from a user and converting them into a comprehensive, structured research document based on the Business Model Canvas framework. Your output will be used by subsequent AI agents to generate investor-ready slides.

Input Data: You will receive a combination of unstructured inputs regarding a business idea. These inputs may include:
- Raw ideas provided via text prompts.
- Content extracted from URLs or DOCX documents.
- Specific statistics provided by the user.
- Founder biographies.
- Funding status and goals.

Task Definition: Your task is to synthesize all provided user input and perform deep, critical research to fill out a detailed Business Model Canvas. You must analyze the input to extract relevant facts and, where necessary, infer logical market assumptions to create a complete picture for investors.

You must conduct comprehensive research on the following 10 distinct parameters exactly as defined below:
1. Value Proposition: Analyze what specific problem the user's idea is solving. Determine what underlying need the idea is satisfying. Identify the Unique Selling Proposition (USP) of the product and service. Articulate clearly why customers would spend money on this idea.
2. Target Customer Segment: Define who the ideal customers are.
3. Channels: Determine how the business will connect to its target customer segments.
4. Customer Relations: Analyze how the business will retain customers. Specify if the strategy is automated, personal assistance, or community-based.
5. Revenue Streams: Identify what the business could get paid for and estimate the customer's willingness to pay.
6. Key Resources: List the essential assets and tools required to deliver the value proposition.
7. Key Activities and Timeline: Outline the critical actions the business must take and provide a high-level timeline.
8. Key Partners: Identify who the business can partner up with to leverage success.
9. Cost Structure: Detail the costs involved, breaking them down into fixed costs and variable costs.
10. Competitive Advantage: Analyze if the business has a "cost competitor win" or another specific type of "win" over incumbents.

Output Format: Your final output MUST be a strictly formatted JSON object. Do not provide any conversational text, markdown formatting outside the JSON block, or explanations.`;

const RESPONSE_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    research_output: {
      type: Type.OBJECT,
      properties: {
        business_model_canvas: {
          type: Type.OBJECT,
          properties: {
            "1_value_proposition": {
              type: Type.OBJECT,
              properties: {
                problem_solved: { type: Type.STRING },
                needs_satisfied: { type: Type.STRING },
                usp: { type: Type.STRING },
                reason_to_spend: { type: Type.STRING }
              },
              required: ["problem_solved", "needs_satisfied", "usp", "reason_to_spend"]
            },
            "2_target_customer_segment": { type: Type.STRING },
            "3_channels": { type: Type.STRING },
            "4_customer_relations": {
              type: Type.OBJECT,
              properties: {
                retention_strategy: { type: Type.STRING },
                type: { type: Type.STRING }
              },
              required: ["retention_strategy", "type"]
            },
            "5_revenue_streams": {
              type: Type.OBJECT,
              properties: {
                sources: { type: Type.STRING },
                willingness_to_pay: { type: Type.STRING }
              },
              required: ["sources", "willingness_to_pay"]
            },
            "6_key_resources": { type: Type.STRING },
            "7_key_activities_and_timeline": {
              type: Type.OBJECT,
              properties: {
                activities: { type: Type.STRING },
                estimated_timeline: { type: Type.STRING }
              },
              required: ["activities", "estimated_timeline"]
            },
            "8_key_partners": { type: Type.STRING },
            "9_cost_structure": {
              type: Type.OBJECT,
              properties: {
                breakdown_narrative: { type: Type.STRING },
                fixed_costs: { type: Type.STRING },
                variable_costs: { type: Type.STRING }
              },
              required: ["breakdown_narrative", "fixed_costs", "variable_costs"]
            },
            "10_competitive_advantage": {
              type: Type.OBJECT,
              properties: {
                advantage_narrative: { type: Type.STRING },
                win_type: { type: Type.STRING }
              },
              required: ["advantage_narrative", "win_type"]
            }
          },
          required: [
            "1_value_proposition",
            "2_target_customer_segment",
            "3_channels",
            "4_customer_relations",
            "5_revenue_streams",
            "6_key_resources",
            "7_key_activities_and_timeline",
            "8_key_partners",
            "9_cost_structure",
            "10_competitive_advantage"
          ]
        },
        meta_data: {
          type: Type.OBJECT,
          properties: {
            input_sources_processed: {
              type: Type.ARRAY,
              items: { type: Type.STRING }
            },
            research_confidence_score: { type: Type.STRING }
          },
          required: ["input_sources_processed", "research_confidence_score"]
        }
      },
      required: ["business_model_canvas", "meta_data"]
    }
  },
  required: ["research_output"]
};

const SLIDE_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    slides: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          title: { type: Type.STRING },
          content: { type: Type.STRING },
          bullet_points: {
            type: Type.ARRAY,
            items: { type: Type.STRING }
          },
          visual_suggestion: { type: Type.STRING },
          stats: {
            type: Type.ARRAY,
            items: { type: Type.STRING }
          }
        },
        required: ["title", "content", "bullet_points", "visual_suggestion"]
      }
    }
  },
  required: ["slides"]
};

export async function composeResearch(input: string, urls: string[]) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY is not set");
  }

  const ai = new GoogleGenAI({ apiKey });
  
  const prompt = `
    User Input: ${input}
    
    Please synthesize the provided information and perform deep research using the provided URLs and Google Search to generate a comprehensive Business Model Canvas JSON.
    Analyze the market, competitors, and potential risks to provide a high-confidence research output.
    
    Context URLs: ${urls.join(", ")}
  `;

  const result = await ai.models.generateContent({
    model: "gemini-3.1-pro-preview",
    contents: [{ role: "user", parts: [{ text: prompt }] }],
    config: {
      systemInstruction: SYSTEM_INSTRUCTION,
      responseMimeType: "application/json",
      responseSchema: RESPONSE_SCHEMA,
      tools: [
        { googleSearch: {} },
        { urlContext: {} }
      ]
    },
  });

  if (!result.text) {
    throw new Error("No research data generated. Please try again with more details.");
  }

  try {
    return JSON.parse(result.text);
  } catch (e) {
    console.error("Failed to parse research JSON:", result.text);
    throw new Error("The AI returned an invalid research format. Please try again.");
  }
}

export async function generateSlides(researchData: any) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY is not set");
  }

  const ai = new GoogleGenAI({ apiKey });
  
  const prompt = `
    Based on the following Business Model Canvas research, generate a professional, high-impact investor pitch deck consisting of 10-15 slides.
    
    Research Data: ${JSON.stringify(researchData)}
    
    Guidelines for each slide:
    - Title: Punchy, results-oriented (e.g., "Capturing a $10B Market" instead of "Market Size").
    - Content: A single sentence that captures the "so what" of the slide.
    - Bullet Points: 3-5 concise points. Use strong verbs. Focus on benefits and traction.
    - Visual Suggestion: Describe a specific chart, diagram, or image that would reinforce the slide's message.
    - Stats: Include 2-3 relevant data points or metrics (e.g., "30% MoM growth", "85% retention rate").
    
    Standard Investor Pitch Flow:
    1. Title Slide: Company name and vision.
    2. The Problem: The pain point being solved.
    3. The Solution: How the product solves the problem.
    4. Value Proposition: Why this solution is unique and valuable.
    5. Market Opportunity: TAM, SAM, SOM and growth trends.
    6. Business Model: How you make money.
    7. Product/Technology: The "secret sauce" or moat.
    8. Go-to-Market Strategy: How you acquire customers.
    9. Competitive Landscape: Comparison with incumbents and startups.
    10. Traction/Roadmap: What has been achieved and what's next.
    11. The Team: Why you are the right people (infer from bios if available).
    12. Financial Projections: High-level growth expectations.
    13. Funding Ask: How much you need and what it will be used for.
    14. Closing/Contact: Call to action.
  `;

  const result = await ai.models.generateContent({
    model: "gemini-3.1-pro-preview",
    contents: [{ role: "user", parts: [{ text: prompt }] }],
    config: {
      systemInstruction: "You are an expert pitch deck consultant. Your goal is to transform research into compelling, high-impact slides for investors.",
      responseMimeType: "application/json",
      responseSchema: SLIDE_SCHEMA,
    },
  });

  return JSON.parse(result.text || '{"slides": []}');
}
