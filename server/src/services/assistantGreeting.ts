// Shared with the client so saved greetings and new replies use the same rules.
export function greetingReply(message: string) {
  const greeting = /^(?:(?:hi|hello|hey)(?:\s+there)?|good\s+(?:morning|afternoon|evening)|(?:hi|hello|hey)[,!]?\s+how are you|how are you)[\s.!?]*$/i;
  return greeting.test(message.trim())
    ? 'Hi! I can help you compare supplier prices, track purchase order spend, or find items in your catalog. What would you like to look up?'
    : undefined;
}
