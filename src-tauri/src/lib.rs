mod commands;

use std::{
    net::{SocketAddr, TcpStream, ToSocketAddrs},
    time::Duration,
};

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_http::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .invoke_handler(tauri::generate_handler![
            commands::chat,
            commands::chat_stream,
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
        ])
        .setup(|app| {
            if let Some(window_config) = app.config().app.windows.first().cloned() {
                let mut window_config = window_config;
                window_config.url = resolve_start_url(app.handle());
                tauri::WebviewWindowBuilder::from_config(app.handle(), &window_config)?.build()?;
            }

            if cfg!(debug_assertions) {
                app.handle().plugin(
                    tauri_plugin_log::Builder::default()
                        .level(log::LevelFilter::Info)
                        .build(),
                )?;
            }
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

fn resolve_start_url(app: &tauri::AppHandle) -> tauri::WebviewUrl {
    if let Some(dev_url) = app.config().build.dev_url.as_ref() {
        if dev_server_is_reachable(dev_url) {
            log::info!("Opening desktop app with dev server: {}", dev_url);
            return tauri::WebviewUrl::External(dev_url.clone());
        }

        log::warn!(
            "Dev server {} is not reachable, falling back to bundled frontend assets",
            dev_url
        );
    }

    tauri::WebviewUrl::App("index.html".into())
}

fn dev_server_is_reachable(dev_url: &tauri::Url) -> bool {
    let Some(host) = dev_url.host_str() else {
        return false;
    };

    let Some(port) = dev_url.port_or_known_default() else {
        return false;
    };

    let Ok(addrs) = (host, port).to_socket_addrs() else {
        return false;
    };

    addrs.into_iter().any(can_connect)
}

fn can_connect(addr: SocketAddr) -> bool {
    TcpStream::connect_timeout(&addr, Duration::from_millis(350)).is_ok()
}
