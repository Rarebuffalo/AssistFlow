import { GoogleGenerativeAI } from '@google/generative-ai';
import dotenv from 'dotenv';
import path from 'path';

// Load env variables
dotenv.config({ path: path.join(__dirname, '../.env') });

const apiKey = process.env.GEMINI_API_KEY;
if (!apiKey) {
  console.error('No GEMINI_API_KEY found in .env file.');
  process.exit(1);
}

const genAI = new GoogleGenerativeAI(apiKey);

async function run() {
  try {
    console.log('Fetching available models using API key...');
    // We call the listModels method on the client
    const response = await (genAI as any).listModels();
    console.log('Models returned successfully:');
    if (response && response.models) {
      for (const model of response.models) {
        console.log(`- Name: ${model.name}, Display: ${model.displayName}, Methods: ${model.supportedGenerationMethods.join(', ')}`);
      }
    } else {
      console.log('No models block in response:', response);
    }
  } catch (error) {
    console.error('Error fetching models:', error);
  }
}

run();
