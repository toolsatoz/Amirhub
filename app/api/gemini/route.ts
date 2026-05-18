import { GoogleGenerativeAI, SchemaType } from "@google/generative-ai";
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const { prompt, image, mimeType } = await req.json();
    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
      return NextResponse.json({ error: "Gemini API key not configured on server" }, { status: 500 });
    }

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ 
      model: "gemini-1.5-flash-latest",
      generationConfig: {
        responseMimeType: "application/json",
        responseSchema: {
          type: SchemaType.OBJECT,
          properties: {
            title: { type: SchemaType.STRING },
            description: { type: SchemaType.STRING },
            keywords: { 
              type: SchemaType.ARRAY,
              items: { type: SchemaType.STRING }
            },
            categories: { 
              type: SchemaType.ARRAY,
              items: { type: SchemaType.STRING }
            }
          },
          required: ["title", "description", "keywords", "categories"]
        }
      }
    });

    let result;
    if (image) {
      result = await model.generateContent([
        prompt,
        {
          inlineData: {
            data: image,
            mimeType: mimeType || "image/jpeg",
          },
        },
      ]);
    } else {
      result = await model.generateContent(prompt);
    }

    const responseText = result.response.text();
    return NextResponse.json(JSON.parse(responseText));
  } catch (error: any) {
    console.error("Gemini AI error:", error);
    return NextResponse.json({ error: error.message || "Failed to generate metadata" }, { status: 500 });
  }
}
