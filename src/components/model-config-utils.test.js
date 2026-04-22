import test from "node:test"
import assert from "node:assert/strict"

import {
  buildModelConfigState,
  buildSelectableModelOptions,
  getPrimaryModelConfig,
} from "./model-config-utils.js"

test("buildModelConfigState groups provider credentials into provider cards", () => {
  const state = buildModelConfigState({
    OPENAI_API_KEY: {
      is_set: true,
      redacted_value: "sk-***",
      description: "OpenAI key",
      url: "https://platform.openai.com/api-keys",
      category: "provider",
      is_password: true,
      tools: [],
      advanced: false,
    },
    OPENAI_BASE_URL: {
      is_set: false,
      redacted_value: null,
      description: "Base URL",
      url: null,
      category: "provider",
      is_password: false,
      tools: [],
      advanced: true,
    },
    OPENROUTER_API_KEY: {
      is_set: false,
      redacted_value: null,
      description: "OpenRouter key",
      url: "https://openrouter.ai/keys",
      category: "provider",
      is_password: true,
      tools: [],
      advanced: false,
    },
  })

  assert.equal(state.providers.length, 2)
  assert.equal(state.providers[0].id, "openai")
  assert.equal(state.providers[0].configured, true)
  assert.equal(state.providers[1].id, "openrouter")
  assert.equal(state.providers[1].configured, false)
})

test("buildModelConfigState surfaces default model and parameter draft values", () => {
  const state = buildModelConfigState({
    OPENAI_API_KEY: {
      is_set: true,
      redacted_value: "sk-***",
      description: "OpenAI key",
      url: null,
      category: "provider",
      is_password: true,
      tools: [],
      advanced: false,
    },
    OPENAI_DEFAULT_MODEL: {
      is_set: true,
      redacted_value: null,
      description: "Default model",
      url: null,
      category: "provider",
      is_password: false,
      tools: [],
      advanced: false,
      value: "gpt-4.1",
    },
    OPENAI_TEMPERATURE: {
      is_set: true,
      redacted_value: null,
      description: "Temperature",
      url: null,
      category: "provider",
      is_password: false,
      tools: [],
      advanced: true,
      value: "0.2",
    },
  })

  const provider = state.providers[0]
  assert.equal(provider.defaultModelKey, "OPENAI_DEFAULT_MODEL")
  assert.equal(provider.parameterKeys.includes("OPENAI_TEMPERATURE"), true)
})

test("getPrimaryModelConfig normalizes flattened and nested Hermes model settings", () => {
  const primary = getPrimaryModelConfig({
    model: {
      default: "gpt-4.1",
      provider: "custom",
      base_url: "https://example.com/v1",
      api_key: "secret-key",
    },
    model_context_length: 128000,
  })

  assert.deepEqual(primary, {
    model: "gpt-4.1",
    provider: "custom",
    baseUrl: "https://example.com/v1",
    apiKey: "secret-key",
    contextLength: "128000",
  })
})

test("buildModelConfigState adds special entries for custom and local model access", () => {
  const state = buildModelConfigState(
    {
      OPENAI_API_KEY: {
        is_set: true,
        redacted_value: "sk-***",
        description: "OpenAI key",
        url: null,
        category: "provider",
        is_password: true,
        tools: [],
        advanced: false,
      },
    },
    {
      model: "qwen2.5:14b",
      provider: "custom",
      base_url: "http://127.0.0.1:11434/v1",
      api_key: "",
      model_context_length: 32768,
    }
  )

  const customEntry = state.specialEntries.find((entry) => entry.id === "custom-endpoint")
  const localEntry = state.specialEntries.find((entry) => entry.id === "local-model")

  assert.equal(state.defaultModelLabel, "qwen2.5:14b")
  assert.equal(customEntry?.configured, false)
  assert.equal(customEntry?.ownsCurrentConfig, false)
  assert.equal(localEntry?.configured, true)
  assert.equal(localEntry?.ownsCurrentConfig, true)
  assert.equal(customEntry?.defaultModelValue, "")
  assert.equal(customEntry?.baseUrlValue, "")
  assert.equal(localEntry?.presetId, "ollama")
  assert.equal(localEntry?.baseUrlValue, "http://127.0.0.1:11434/v1")
})

test("buildModelConfigState keeps local entry empty when current config belongs to hosted custom endpoint", () => {
  const state = buildModelConfigState(
    {},
    {
      model: "gpt-4.1",
      provider: "custom",
      base_url: "https://gateway.example.com/v1",
      api_key: "remote-key",
      model_context_length: 128000,
    }
  )

  const customEntry = state.specialEntries.find((entry) => entry.id === "custom-endpoint")
  const localEntry = state.specialEntries.find((entry) => entry.id === "local-model")

  assert.equal(customEntry?.configured, true)
  assert.equal(customEntry?.ownsCurrentConfig, true)
  assert.equal(customEntry?.defaultModelValue, "gpt-4.1")
  assert.equal(localEntry?.configured, false)
  assert.equal(localEntry?.ownsCurrentConfig, false)
  assert.equal(localEntry?.defaultModelValue, "")
  assert.equal(localEntry?.baseUrlValue, "")
})

test("buildSelectableModelOptions collects configured provider and special models without duplicates", () => {
  const options = buildSelectableModelOptions(
    {
      OPENAI_DEFAULT_MODEL: {
        is_set: true,
        redacted_value: null,
        description: "Default model",
        url: null,
        category: "provider",
        is_password: false,
        tools: [],
        advanced: false,
        value: "gpt-4.1",
      },
      OPENROUTER_DEFAULT_MODEL: {
        is_set: true,
        redacted_value: null,
        description: "Default model",
        url: null,
        category: "provider",
        is_password: false,
        tools: [],
        advanced: false,
        value: "gpt-4.1",
      },
      DEEPSEEK_DEFAULT_MODEL: {
        is_set: true,
        redacted_value: null,
        description: "Default model",
        url: null,
        category: "provider",
        is_password: false,
        tools: [],
        advanced: false,
        value: "deepseek-chat",
      },
    },
    {
      model: "qwen2.5:14b",
      provider: "custom",
      base_url: "http://127.0.0.1:11434/v1",
      api_key: "",
      model_context_length: 32768,
    },
    ["claude-sonnet-4-20250514", "gpt-4.1"]
  )

  assert.deepEqual(
    options.map((option) => option.value),
    ["gpt-4.1", "deepseek-chat", "qwen2.5:14b", "claude-sonnet-4-20250514"]
  )
  assert.equal(options[0].source, "provider")
  assert.equal(options[2].source, "local")
  assert.equal(options[3].source, "session")
})
