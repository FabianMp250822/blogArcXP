import {genkit} from 'genkit';
import {googleAI} from '@genkit-ai/googleai';

export const ai = genkit({
  plugins: [googleAI({apiKey: "AIzaSyA9CsZkkUMQadZIh7uIjrnwHXanxcubj9A"})],
  model: 'googleai/gemini-2.0-flash',
});
