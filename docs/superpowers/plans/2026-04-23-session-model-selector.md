# Session Model Selector Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a per-conversation model selector in chat so each session can store and use its own model without changing the global default model.

**Architecture:** Persist a `model` field on desktop sessions, thread that value through the Tauri session APIs, and send the selected model with each Responses API request. Expose the model picker in the chat header and show lightweight model badges in the session list using configured model candidates from the model configuration page.

**Tech Stack:** React 19, Vite, Tauri 2, Rust, rusqlite, Hermes local gateway

---

### Task 1: Validate the model-routing path and capture implementation boundaries

**Files:**
- Modify: `/Users/zhangxingyu/AI/hermes-workspace/hermes-desktop-lite/docs/superpowers/plans/2026-04-23-session-model-selector.md`
- Inspect: `/Users/zhangxingyu/AI/hermes-workspace/hermes-desktop-lite/src/api.js`
- Inspect: `/Users/zhangxingyu/AI/hermes-workspace/hermes-desktop-lite/src/App.jsx`
- Inspect: `/Users/zhangxingyu/AI/hermes-workspace/hermes-desktop-lite/src-tauri/src/commands.rs`

- [ ] **Step 1: Confirm current send path uses a fixed model identifier**

Run: `rg -n 'model: .hermes-agent.|"model": "hermes-agent"' src/api.js src-tauri/src/commands.rs`
Expected: current browser and Tauri send paths are hardcoded to `hermes-agent`.

- [ ] **Step 2: Confirm sessions DB and API do not yet persist per-session model**

Run: `rg -n 'CREATE TABLE IF NOT EXISTS sessions|create_session|get_sessions|update_session' src-tauri/src/commands.rs`
Expected: sessions table and APIs do not yet expose a `model` column or `update_session_model`.

- [ ] **Step 3: Use direct model override instead of hidden /model switching**

Implementation note:

```text
Prefer sending the selected session model directly in the Responses API request body.
Do not inject hidden slash-command messages into the visible transcript unless a direct model override is proven impossible.
Keep `hermes-agent` as the fallback when the session model is empty.
```

- [ ] **Step 4: Proceed only after the direct override path is confirmed in code**

Run: `sed -n '480,560p' src/api.js && sed -n '330,460p' src-tauri/src/commands.rs`
Expected: there is a single request body shape we can extend with a `model` value.

### Task 2: Persist `session.model` in the desktop session layer

**Files:**
- Modify: `/Users/zhangxingyu/AI/hermes-workspace/hermes-desktop-lite/src-tauri/src/commands.rs`
- Modify: `/Users/zhangxingyu/AI/hermes-workspace/hermes-desktop-lite/src-tauri/src/lib.rs`

- [ ] **Step 1: Write failing Rust tests for session model persistence helpers**

Add tests that expect:

```rust
// create_session stores model
// get_sessions returns model
// update_session_model updates only the target session and bumps updated_at
```

- [ ] **Step 2: Run the focused Rust test to see it fail**

Run: `cargo test session_model --manifest-path src-tauri/Cargo.toml`
Expected: fail because session model storage/update code is missing.

- [ ] **Step 3: Add `model` to the sessions table and session DTO**

Implementation note:

```rust
let _ = conn.execute("ALTER TABLE sessions ADD COLUMN model TEXT", []);

pub struct Session {
    pub id: String,
    pub title: String,
    pub pinned: bool,
    pub workspace_path: Option<String>,
    pub updated_at: String,
    pub preview: Option<String>,
    pub model: Option<String>,
}
```

- [ ] **Step 4: Extend `get_sessions` and `create_session` to read/write `model`**

Implementation note:

```rust
SELECT s.id, s.title, s.pinned, s.workspace_path, s.updated_at, ..., s.model

INSERT INTO sessions (..., model)
VALUES (..., ?6)
```

- [ ] **Step 5: Add `update_session_model` Tauri command**

Implementation note:

```rust
#[tauri::command]
pub fn update_session_model(app: tauri::AppHandle, id: String, model: Option<String>) -> Result<(), String> {
    let conn = open_sessions_db(&app)?;
    conn.execute(
        "UPDATE sessions SET model = ?1, updated_at = ?2 WHERE id = ?3",
        params![model, now_rfc3339(), id],
    ).map_err(|e| e.to_string())?;
    Ok(())
}
```

- [ ] **Step 6: Register the new command in Tauri**

Run: `rg -n 'generate_handler' src-tauri/src/lib.rs`
Expected: `update_session_model` is included in the generated handler list.

- [ ] **Step 7: Re-run the focused Rust test**

Run: `cargo test session_model --manifest-path src-tauri/Cargo.toml`
Expected: PASS.

### Task 3: Make the desktop chat request model-aware

**Files:**
- Modify: `/Users/zhangxingyu/AI/hermes-workspace/hermes-desktop-lite/src-tauri/src/commands.rs`
- Modify: `/Users/zhangxingyu/AI/hermes-workspace/hermes-desktop-lite/src/api.js`

- [ ] **Step 1: Write failing tests for request model fallback behavior**

Add tests that expect:

```rust
// explicit session model wins
// empty session model falls back to "hermes-agent"
```

- [ ] **Step 2: Run the focused request-model test to verify failure**

Run: `cargo test response_request_model --manifest-path src-tauri/Cargo.toml`
Expected: fail because request body still hardcodes `hermes-agent`.

- [ ] **Step 3: Extend `chat` and `chat_stream` to accept an optional model**

Implementation note:

```rust
pub async fn chat(app: AppHandle, messages: Vec<ChatMessage>, model: Option<String>) -> Result<ChatResponse, String>
pub async fn chat_stream(app: AppHandle, messages: Vec<ChatMessage>, previous_response_id: Option<String>, replay_history: bool, model: Option<String>) -> Result<Option<String>, String>
```

- [ ] **Step 4: Centralize model fallback**

Implementation note:

```rust
fn resolve_chat_request_model(model: Option<String>) -> String {
    model.filter(|value| !value.trim().is_empty())
        .unwrap_or_else(|| "hermes-agent".to_string())
}
```

- [ ] **Step 5: Send the resolved model in the request body**

Implementation note:

```rust
"model": resolve_chat_request_model(model),
```

- [ ] **Step 6: Thread the optional model through the JS API wrappers**

Implementation note:

```js
export async function sendChatStream(messages, options = {}) {
  const { previousResponseId = null, replayHistory = true, model = null } = options
  return await invoke('chat_stream', { messages, previousResponseId, replayHistory, model })
}
```

- [ ] **Step 7: Re-run the focused Rust test**

Run: `cargo test response_request_model --manifest-path src-tauri/Cargo.toml`
Expected: PASS.

### Task 4: Expose session model APIs and candidate models in the frontend

**Files:**
- Modify: `/Users/zhangxingyu/AI/hermes-workspace/hermes-desktop-lite/src/api.js`
- Modify: `/Users/zhangxingyu/AI/hermes-workspace/hermes-desktop-lite/src/components/model-config-utils.js`
- Modify: `/Users/zhangxingyu/AI/hermes-workspace/hermes-desktop-lite/src/components/model-config-utils.test.js`

- [ ] **Step 1: Write failing JS tests for candidate model extraction**

Add tests that expect:

```js
// configured provider defaults are included
// active custom/local model is included
// duplicates are removed
```

- [ ] **Step 2: Run the JS test to verify failure**

Run: `node --test src/components/model-config-utils.test.js`
Expected: fail because there is no normalized session-model candidate list yet.

- [ ] **Step 3: Add a helper that returns deduplicated candidate model options**

Implementation note:

```js
export function buildSelectableModelOptions(envVars, dashboardConfig) {
  // returns [{ value, label, source }]
}
```

- [ ] **Step 4: Extend `createSession` and add `updateSessionModel` client API wrappers**

Implementation note:

```js
export async function createSession(title, agentId, workspacePath = null, model = null)
export async function updateSessionModel(sessionId, model = null)
```

- [ ] **Step 5: Re-run the JS test**

Run: `node --test src/components/model-config-utils.test.js`
Expected: PASS.

### Task 5: Add the chat header model selector

**Files:**
- Modify: `/Users/zhangxingyu/AI/hermes-workspace/hermes-desktop-lite/src/App.jsx`
- Modify: `/Users/zhangxingyu/AI/hermes-workspace/hermes-desktop-lite/src/locales/zh.json`
- Modify: `/Users/zhangxingyu/AI/hermes-workspace/hermes-desktop-lite/src/locales/en.json`
- Modify: `/Users/zhangxingyu/AI/hermes-workspace/hermes-desktop-lite/src/locales/zh-tw.json`

- [ ] **Step 1: Add state for pending model selection and active session model**

Implementation note:

```js
const [pendingConversationModel, setPendingConversationModel] = useState("")
const activeSessionModel = sessions.find((session) => session.id === activeSessionId)?.model || ""
```

- [ ] **Step 2: Load candidate options from configured models**

Implementation note:

```js
const selectableModels = useMemo(
  () => buildSelectableModelOptions(envVarsForModelsPage, primaryModelConfig),
  [envVarsForModelsPage, primaryModelConfig]
)
```

- [ ] **Step 3: Render a dropdown beside the New Chat button**

Use existing dropdown primitives and show:

```text
有活动会话: 当前会话模型
无活动会话: 下一条新对话模型
```

- [ ] **Step 4: Save the selected model to the active session immediately**

Implementation note:

```js
if (activeSessionId) {
  await updateSessionModel(activeSessionId, nextModel || null)
  refresh sessions list
} else {
  setPendingConversationModel(nextModel)
}
```

- [ ] **Step 5: Create a new session with the pending model**

Implementation note:

```js
const createdSession = await createSession(title, agent, currentWorkspace?.path, pendingConversationModel || null)
```

- [ ] **Step 6: Pass the session model into `sendChatStream`**

Implementation note:

```js
const responseId = await sendChatStream(messagesToSend, {
  previousResponseId,
  replayHistory: !previousResponseId,
  model: currentSessionModel || pendingConversationModel || null,
})
```

- [ ] **Step 7: Reset pending model only when starting a clean new conversation**

Implementation note:

```js
setPendingConversationModel("")
```

### Task 6: Show the model on session cards

**Files:**
- Modify: `/Users/zhangxingyu/AI/hermes-workspace/hermes-desktop-lite/src/SessionsView.jsx`

- [ ] **Step 1: Render a lightweight model badge for sessions with a model**

Implementation note:

```jsx
{session.model ? (
  <Badge variant="outline" className="rounded-full px-2 py-0.5 text-[10px]">
    {session.model}
  </Badge>
) : null}
```

- [ ] **Step 2: Keep the current layout readable on narrow widths**

Verify the badge wraps with title/meta instead of forcing overflow.

### Task 7: Verify end-to-end behavior

**Files:**
- Verify: `/Users/zhangxingyu/AI/hermes-workspace/hermes-desktop-lite/src/App.jsx`
- Verify: `/Users/zhangxingyu/AI/hermes-workspace/hermes-desktop-lite/src/SessionsView.jsx`
- Verify: `/Users/zhangxingyu/AI/hermes-workspace/hermes-desktop-lite/src-tauri/src/commands.rs`

- [ ] **Step 1: Run frontend unit tests**

Run: `node --test src/components/model-config-utils.test.js`
Expected: PASS.

- [ ] **Step 2: Run focused Rust tests**

Run: `cargo test session_model --manifest-path src-tauri/Cargo.toml && cargo test response_request_model --manifest-path src-tauri/Cargo.toml`
Expected: PASS.

- [ ] **Step 3: Run lint**

Run: `npm run lint`
Expected: PASS with no warnings.

- [ ] **Step 4: Run production build**

Run: `npm run build`
Expected: PASS.

- [ ] **Step 5: Smoke-check chat flow**

Manual verification checklist:

```text
1. Open chat view
2. Confirm model selector appears next to New Chat
3. Pick a model before the first message
4. Send a message and verify the new session stores the model
5. Switch to another model inside the same session
6. Send another message and verify the session badge updates
7. Open another session and confirm its model remains unchanged
```
