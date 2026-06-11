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

const modelsToTest = [
  'gemini-1.5-flash',
  'gemini-1.5-pro',
  'gemini-2.5-flash',
  'gemini-2.5-pro',
  'gemini-pro',
  'gemini-1.0-pro'
];

async function run() {
  console.log('Testing models against the API key...');
  
  for (const modelName of modelsToTest) {
    try {
      console.log(`\nTesting model: "${modelName}"...`);
      const model = genAI.getGenerativeModel({ model: modelName });
      const response = await model.generateContent('Hi');
      const text = response.response.text();
      console.log(`✅ Success for "${modelName}"! Response: "${text.trim().slice(0, 50)}..."`);
    } catch (error: any) {
      console.log(`❌ Failed for "${modelName}": ${error.message || error}`);
    }
  }
}

run();
