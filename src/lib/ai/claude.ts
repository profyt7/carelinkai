import Anthropic from '@anthropic-ai/sdk';

const DUMMY_KEY = 'sk-ant-dummy-key-for-build-only';

let client: Anthropic | null = null;

export function getAnthropicClient(): Anthropic {
  if (!client) {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      if (process.env.NODE_ENV === 'production') {
        console.warn('WARNING: ANTHROPIC_API_KEY is missing in production. AI features will fail at runtime.');
      }
      client = new Anthropic({ apiKey: DUMMY_KEY });
    } else {
      client = new Anthropic({ apiKey });
    }
  }
  return client;
}

export function requireAnthropicKey(): void {
  if (!process.env.ANTHROPIC_API_KEY) {
    throw new Error(
      'ANTHROPIC_API_KEY environment variable is not set. AI features require a valid Anthropic API key.'
    );
  }
}
