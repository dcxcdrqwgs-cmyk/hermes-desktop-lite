// Copyright (c) 2026 MeeJoy

#![allow(unused)]
#![allow(dead_code)]

mod commands;

use tauri::async_runtime;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_http::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .invoke_handler(tauri::generate_handler![
            commands::chat,
            commands::chat_stream,
            commands::cancel_chat_stream,
            commands::get_memories,
            commands::add_memory,
            commands::update_memory,
            commands::delete_memory,
            commands::compact_memories,
            commands::get_tasks,
            commands::create_task,
            commands::update_task,
            commands::delete_task,
            commands::get_config,
            commands::set_config,
            // 会话相关
            commands::get_sessions,
            commands::create_session,
            commands::delete_session,
            commands::toggle_pin_session,
            commands::update_session_model,
            commands::update_session_title,
            commands::get_session_response_id,
            commands::set_session_response_id,
            // 消息相关
            commands::get_messages,
            commands::add_message,
            commands::save_pasted_attachment,
            commands::import_attachment_from_path,
            // 工作区相关
            commands::get_workspaces,
            commands::create_workspace,
            commands::update_workspace,
            commands::delete_workspace,
            commands::set_workspace,
            commands::get_current_workspace,
            commands::create_terminal_session,
            commands::write_terminal_input,
            commands::resize_terminal_session,
            commands::close_terminal_session,
            // 智能体相关
            commands::get_agents,
            commands::get_skills,
            commands::get_skill_detail,
            commands::toggle_skill,
            commands::get_toolsets,
            commands::get_market_skills,
            commands::install_skill,
            commands::uninstall_skill,
            commands::check_skill_updates,
            commands::update_skill,
            commands::inspect_market_skill,
            commands::get_cron_jobs,
            commands::create_cron_job,
            commands::check_cron_python_dependency,
            commands::install_cron_python_dependency,
            commands::restart_hermes_dashboard,
            commands::check_dashboard_running,
            commands::restart_hermes_gateway,
            commands::check_gateway_running,
            commands::stop_hermes_gateway,
            commands::stop_hermes_dashboard,
            commands::read_file_content,
            commands::write_file_content,
            commands::create_directory_if_not_exists,
            commands::get_weixin_qrcode,
            commands::check_weixin_qrcode_status,
            commands::get_qqbot_qrcode,
            commands::check_qqbot_qrcode_status,
            commands::get_whatsapp_qrcode,
            commands::pause_cron_job,
            commands::resume_cron_job,
            commands::trigger_cron_job,
            commands::delete_cron_job,
            commands::get_dashboard_logs,
            commands::get_dashboard_primary_model_config,
            commands::get_model_options,
            commands::get_configured_model_candidates,
            commands::save_dashboard_primary_model_config,
            commands::set_default_model,
            commands::get_dashboard_env_vars,
            commands::set_dashboard_env_var,
            commands::delete_dashboard_env_var,
            commands::reveal_dashboard_env_var,
            commands::test_gateway_connection,
            commands::get_gateway_info,
            commands::get_hermes_version_info,
            commands::update_hermes_agent,
            // 文件操作相关
            commands::list_directory,
            commands::read_file,
            commands::get_file_preview,
            commands::open_file_external,
            commands::write_file,
            commands::delete_file,
            commands::create_directory,
            // notebook
            commands::list_notebook_tree,
            commands::create_notebook_folder,
            commands::rename_notebook_folder,
            commands::delete_notebook_folder,
            commands::create_notebook_note,
            commands::rename_notebook_note,
            commands::delete_notebook_note,
            commands::get_notebook_note,
            commands::update_notebook_note,
            commands::search_notebook_notes,
            commands::move_notebook_folder,
            commands::move_notebook_note,
            // 数据迁移相关
            commands::migrate_memories_to_db,
            commands::migrate_tasks_to_db,
            commands::needs_migration,
        ])
        .setup(|app| {
            // Window is auto-created from tauri.conf.json (create: true)
            if cfg!(debug_assertions) {
                app.handle().plugin(
                    tauri_plugin_log::Builder::default()
                        .level(log::LevelFilter::Info)
                        .build(),
                )?;
            }

            // 初始化应用数据库（ memories + tasks 表）
            let _ = commands::open_app_db(&app.handle())
                .map_err(|e| {
                    eprintln!("Failed to initialize app db: {}", e);
                    e
                })?;

            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
