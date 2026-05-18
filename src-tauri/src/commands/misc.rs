// Copyright (c) 2026 MeeJoy

// Miscellaneous commands
// Handles: cron, file operations, workspace, terminal, model candidates

use crate::commands::types::*;
use std::path::PathBuf;
use tauri::AppHandle;

#[tauri::command]
pub fn read_file_content(path: String) -> Result<String, String> {
    let target = PathBuf::from(&path);
    std::fs::read_to_string(&target)
        .map_err(|error| format!("Failed to read file {}: {}", target.display(), error))
}

#[tauri::command]
pub fn write_file_content(path: String, content: String) -> Result<(), String> {
    let target = PathBuf::from(&path);

    if let Some(parent) = target.parent() {
        std::fs::create_dir_all(parent)
            .map_err(|error| format!("Failed to create directory {}: {}", parent.display(), error))?;
    }

    std::fs::write(&target, content)
        .map_err(|error| format!("Failed to write file {}: {}", target.display(), error))
}

#[tauri::command]
pub fn create_directory_if_not_exists(path: String) -> Result<(), String> {
    let target = PathBuf::from(&path);

    if !target.exists() {
        std::fs::create_dir_all(&target)
            .map_err(|error| format!("Failed to create directory {}: {}", target.display(), error))?;
    }

    Ok(())
}

// TODO: Extract full implementations from original commands.rs
// Functions to implement:
// - check_cron_python_dependency, install_cron_python_dependency, restart_hermes_dashboard
// - get_configured_model_candidates
// - list_directory, read_file, get_file_preview, open_file_external, write_file, delete_file, create_directory
// - create_terminal_session, write_terminal_input, resize_terminal_session, close_terminal_session
// - get_workspaces, create_workspace, update_workspace, delete_workspace, set_workspace, get_current_workspace
