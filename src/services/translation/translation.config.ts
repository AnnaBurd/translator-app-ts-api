export const modelSettings = {
  model: "gpt-35-turbo",
  temperature: 0.35,
  top_p: 0.95,
  frequency_penalty: 0.0,
  presence_penalty: 0.0,
};

// Soft limits for the lenght of the prompt to the API
export const promptSettings = {
  maxPromptLength: 30000, // Total length of the prompt (in characters)
  maxExamplesLength: 10000, // Length of the prompt that is reserved for the examples from vector store (in characters)
  maxHistoryLength: 10000, // Length of the prompt that is reserved for the history of messages (in characters)
  maxInputLength: 5000, // Length of the prompt that is reserved for the user input (in characters)
};
