use std::sync::atomic::{AtomicBool, Ordering};

use crate::config::get_config;
use crate::ocr::ocr;
use crate::windows::{
    set_translator_window_always_on_top, show_settings_window, show_updater_window,
};
use crate::{ALWAYS_ON_TOP, UPDATE_RESULT};

use serde::{Deserialize, Serialize};
use serde_json::json;
use tauri::{
    menu::{Menu, MenuItem, PredefinedMenuItem},
    tray::ClickType,
    Manager, Runtime,
};

#[derive(Debug, Serialize, Deserialize, Clone)]
pub(crate) struct PinnedEventPayload {
    pinned: bool,
}

pub static TRAY_EVENT_REGISTERED: AtomicBool = AtomicBool::new(false);

pub fn create_tray<R: Runtime>(app: &tauri::AppHandle<R>) -> tauri::Result<()> {
    let config = get_config().unwrap();
    let check_for_updates_i = MenuItem::with_id(
        app,
        "check_for_updates",
        t!("CheckForUpdates"),
        true,
        None::<String>,
    )?;
    if let Some(Some(_)) = *UPDATE_RESULT.lock() {
        check_for_updates_i
            .set_text(t!("NewVersionAvailable"))
            .unwrap();
    }
    let settings_i = MenuItem::with_id(app, "settings", t!("Settings"), true, Some("CmdOrCtrl+,"))?;
    let ocr_i = MenuItem::with_id(app, "ocr", t!("OCR"), true, config.ocr_hotkey)?;
    let show_i = MenuItem::with_id(app, "show", t!("Show"), true, config.display_window_hotkey)?;
    let hide_i = PredefinedMenuItem::hide(app, Some(t!("Hide").as_ref())).unwrap();
    let pin_i = MenuItem::with_id(app, "pin", t!("Pin"), true, None::<String>)?;
    if ALWAYS_ON_TOP.load(Ordering::Acquire) {
        pin_i.set_text(t!("Unpin")).unwrap();
    }
    let separator_i = PredefinedMenuItem::separator(app).unwrap();
    let quit_i = PredefinedMenuItem::quit(app, Some(t!("Quit").as_ref())).unwrap();

    let menu = Menu::with_items(
        app,
        &[
            &check_for_updates_i,
            &separator_i,
            &settings_i,
            &ocr_i,
            &show_i,
            &hide_i,
            &pin_i,
            &separator_i,
            &quit_i,
        ],
    )?;

    let tray = app.tray_by_id("tray").unwrap();
    tray.set_menu(Some(menu.clone()))?;
    if TRAY_EVENT_REGISTERED.load(Ordering::Acquire) {
        return Ok(());
    }
    TRAY_EVENT_REGISTERED.store(true, Ordering::Release);
    tray.on_menu_event(move |app, event| match event.id.as_ref() {
        "check_for_updates" => {
            show_updater_window();
        }
        "settings" => {
            show_settings_window();
        }
        "ocr" => {
            ocr();
        }
        "show" => {
            crate::windows::show_translator_window(false, false, true);
        }
        "pin" => {
            let pinned = set_translator_window_always_on_top();
            let handle = app.app_handle();
            handle
                .emit("pinned-from-tray", json!({ "pinned": pinned }))
                .unwrap_or_default();
            create_tray(app).unwrap();
        }
        "quit" => app.exit(0),
        _ => {}
    });
    tray.on_tray_icon_event(|_tray, event| {
        if event.click_type == ClickType::Left {
            crate::windows::show_translator_window(false, false, true);
        }
    });
    tray.set_show_menu_on_left_click(false)?;
    let app_handle = app.app_handle();
    let app_handle_clone = app.app_handle().clone();
    app_handle.listen_any("pinned-from-window", move |msg| {
        let payload: PinnedEventPayload = serde_json::from_str(&msg.payload()).unwrap();
        ALWAYS_ON_TOP.store(payload.pinned, Ordering::Release);
        create_tray(&app_handle_clone).unwrap();
    });

    let app_handle_clone_0 = app.app_handle().clone();
    app_handle.listen_any("refresh_menu", move |_event| {
        create_tray(&app_handle_clone_0).unwrap();
    });
    Ok(())
}
