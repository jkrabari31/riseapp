import { Request, Response } from 'express';
import { GoogleGenerativeAI } from '@google/generative-ai';

export const generateQuiz = async (req: Request, res: Response): Promise<void> => {
    try {
        const apiKey = process.env.GEMINI_API_KEY;
        console.log('--- AI Debug ---');
        console.log('API Key Found:', !!apiKey);
        console.log('API Key Length:', apiKey?.length || 0);
        
        if (!apiKey || apiKey === "PASTE_YOUR_GEMINI_API_KEY_HERE") {
            console.error('AI Configuration Error: Missing or placeholder API key.');
            res.status(500).json({ 
                success: false, 
                message: 'AI Service is not configured. Please add your actual GEMINI_API_KEY to the backend .env file and restart the server.' 
            });
            return;
        }

        const genAI = new GoogleGenerativeAI(apiKey as string);
        const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

        const { topic, difficulty, count, subject, focusing, language } = req.body;

        if (!topic || !subject) {
            res.status(400).json({ success: false, message: 'Subject and Topic are required.' });
            return;
        }

        const numQuestions = count || 5;
        const quizDifficulty = difficulty || 'medium';
        const quizFocus = focusing || 'General overview';
        const quizLang = language || 'English';

        const prompt = `
            You are an expert educator. Generate a multiple-choice quiz based on the following parameters:
            - Subject: ${subject}
            - Topic: ${topic}
            - Specific Focus: ${quizFocus}
            - Difficulty level: ${quizDifficulty}
            - Language: ${quizLang}
            
            Please provide exactly ${numQuestions} questions. Ensure the questions are accurate and appropriate for students. All text must be in ${quizLang}.
            
            Return the output STRICTLY as a JSON string with the following structure, and absolutely nothing else (do not wrap in markdown blocks like \`\`\`json):
            [
                {
                    "question": "The question text in ${quizLang}",
                    "options": ["Option A", "Option B", "Option C", "Option D"],
                    "correctAnswer": "The exact text of the correct option from the options array"
                }
            ]
        `;

        const result = await model.generateContent(prompt);
        const response = await result.response;
        const rawText = response.text() || "[]";

        let questions = [];
        try {
            // Sometimes Gen AI wraps json in markdown formatting despite instructions
            console.log("Gemini Raw Text:", rawText);
            const cleanedText = rawText.replace(/```json\n?|\n?```/g, '').trim();
            questions = JSON.parse(cleanedText);
        } catch (parseError) {
            console.error("Error parsing Gemini JSON response:", rawText);
            res.status(500).json({
                success: false,
                message: 'Failed to parse AI response into questions.',
                rawResponse: rawText
            });
            return;
        }

        res.status(200).json({
            success: true,
            data: questions
        });

    } catch (error) {
        console.error('Error generating AI quiz:', error);
        res.status(500).json({
            success: false,
            message: 'An error occurred while generating the quiz.',
            error: error instanceof Error ? error.message : String(error)
        });
    }
};
