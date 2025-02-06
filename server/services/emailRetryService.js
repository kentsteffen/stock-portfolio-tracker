import { setTimeout } from 'timers/promises';

const MAX_RETRIES = 3;
const INITIAL_RETRY_DELAY = 1000; // 1 second

export class EmailError extends Error {
  constructor(message, originalError) {
    super(message);
    this.name = 'EmailError';
    this.originalError = originalError;
  }
}

export const withRetry = async (operation, retries = MAX_RETRIES, delay = INITIAL_RETRY_DELAY) => {
  try {
    return await operation();
  } catch (error) {
    if (retries === 0) {
      throw new EmailError('Max retries reached', error);
    }

    console.log(`Email operation failed, retrying... (${retries} attempts remaining)`);
    await setTimeout(delay);
    
    // Exponential backoff
    return withRetry(operation, retries - 1, delay * 2);
  }
}; 