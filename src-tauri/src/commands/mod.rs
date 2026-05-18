// Copyright (c) 2026 MeeJoy

// commands module - modular reorganization
// Structure:
// - types.rs: Shared type definitions and helper functions
// - legacy.rs: Original monolithic implementation (to be gradually migrated)
// - memory.rs, task.rs, session.rs, etc.: Future module homes (currently empty skeletons)

pub mod types;
pub mod legacy; // Original 4523-line implementation (to be split)
pub mod memory; // Future: memory commands (currently empty skeleton)
pub mod task;   // Future: task commands (currently empty skeleton)
pub mod session; // Future: session + message commands (currently empty skeleton)
pub mod config; // Future: config commands (currently empty skeleton)
pub mod gateway; // Future: gateway commands (currently empty skeleton)
pub mod agent; // Future: agent/skill/toolset commands (currently empty skeleton)
pub mod misc; // Future: misc commands (cron, files, terminal, workspace) (currently empty skeleton)
pub mod channels;
pub mod notebook;

// Re-export everything from legacy for backward compatibility
// This keeps the existing API surface intact while we gradually migrate
// functions into their respective modules.
//
// Migration order (priority):
// 1. memory.rs (6 functions + migration)
// 2. task.rs (5 functions + migration)
// 3. session.rs (sessions + messages)
// 4. config.rs (get_config, set_config)
// 5. gateway.rs (chat, gateway comms)
// 6. agent.rs (skills/agents)
// 7. misc.rs (everything else)
//
// To migrate a function:
// 1. Copy implementation from legacy.rs to target module
// 2. Update imports to use types from commands::types
// 3. Remove from legacy.rs
// 4. Add to this re-export list from the new module
pub use legacy::*;
pub use misc::*;
pub use channels::*;
pub use notebook::*;
