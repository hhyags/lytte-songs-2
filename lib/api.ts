import { GoogleGenAI } from "@google/genai";

// The API key is assumed to be set in the environment variables.
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY as string });

/**
 * Sends a prompt to the Gemini API to generate a description for an album.
 * @param title The title of the album.
 * @param artist The artist of the album.
 * @returns A string with the AI's generated description.
 */
export async function generateAlbumDescription(title: string, artist: string): Promise<string> {
  try {
    const prompt = `Generate a short, moody, one-sentence description for an electronic music album titled "${title}" by "${artist}". Focus on the feeling or vibe.`;
    
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
    });
    
    return response.text;

  } catch (error) {
    console.error("Error calling Gemini API:", error);
    return "Could not generate a vibe for this album. Please try again.";
  }
}
