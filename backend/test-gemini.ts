import { GoogleGenAI } from '@google/genai';
import * as dotenv from 'dotenv';
dotenv.config();

const test = async () => {
    try {
        console.log("Using API Key:", process.env.GEMINI_API_KEY?.substring(0, 5) + "...");
        const ai = new GoogleGenAI({});
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: "Say hello",
        });
        console.log("Response:", response.text);
    } catch (e) {
        console.error("Error:", e);
    }
}

test();
