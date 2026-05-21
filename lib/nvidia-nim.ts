/**
 * NVIDIA NIM API Client
 * Uses the OpenAI-compatible REST API at https://integrate.api.nvidia.com/v1
 * All NIM models (Llama, DeepSeek, Mistral, Qwen, Nemotron) go through this client.
 */

const NIM_BASE_URL = "https://integrate.api.nvidia.com/v1";

interface NimChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

interface NimChatResponse {
  choices: {
    message: {
      content: string;
    };
    finish_reason: string;
  }[];
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

/**
 * Call NVIDIA NIM chat completions endpoint.
 * This is OpenAI-compatible, so we use the standard /v1/chat/completions format.
 */
export async function nimChatCompletion(
  apiKey: string,
  modelId: string,
  messages: NimChatMessage[],
  options: {
    temperature?: number;
    maxTokens?: number;
    topP?: number;
  } = {}
): Promise<{ text: string; usage?: { promptTokens: number; completionTokens: number; totalTokens: number } }> {
  const { temperature = 0.7, maxTokens = 2048, topP = 0.9 } = options;

  const response = await fetch(`${NIM_BASE_URL}/chat/completions`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: modelId,
      messages,
      temperature,
      max_tokens: maxTokens,
      top_p: topP,
      stream: false,
    }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    const errorMsg =
      errorData?.error?.message ||
      errorData?.detail ||
      `HTTP ${response.status}: ${response.statusText}`;
    throw new Error(`NVIDIA NIM API error: ${errorMsg}`);
  }

  const data: NimChatResponse = await response.json();

  if (!data.choices || data.choices.length === 0) {
    throw new Error("NVIDIA NIM returned no choices");
  }

  const text = data.choices[0].message.content.trim();
  const usage = data.usage
    ? {
        promptTokens: data.usage.prompt_tokens || 0,
        completionTokens: data.usage.completion_tokens || 0,
        totalTokens: data.usage.total_tokens || 0,
      }
    : undefined;

  return { text, usage };
}

/**
 * Validate an NVIDIA NIM API key by calling the /v1/models endpoint.
 * This is a metadata-only call — costs zero tokens.
 */
export async function validateNimApiKey(apiKey: string): Promise<boolean> {
  const response = await fetch(`${NIM_BASE_URL}/models`, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      Accept: "application/json",
    },
  });

  return response.ok;
}
