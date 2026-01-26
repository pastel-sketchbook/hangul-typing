use tauri::Manager;
use tracing::info;
use tracing_subscriber::{EnvFilter, fmt, prelude::*};

mod commands;
mod copilot;

#[tauri::command]
fn close_splash(window: tauri::Window) {
    if let Some(splash) = window.get_webview_window("splash") {
        let _ = splash.close();
    }
    if let Some(main) = window.get_webview_window("main") {
        let _ = main.show();
        let _ = main.set_focus();
    }
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tracing_subscriber::registry()
        .with(fmt::layer())
        .with(EnvFilter::from_default_env().add_directive(tracing::Level::INFO.into()))
        .init();

    info!("Starting Hangul Typing");

    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![
            close_splash,
            commands::copilot_check,
            commands::copilot_init,
            commands::copilot_status,
            commands::copilot_ask,
            commands::copilot_hint,
            commands::copilot_explain,
            commands::copilot_analyze_mistake,
            commands::copilot_shutdown,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
