#[cfg(target_os = "macos")]
use swift_rs::SwiftLinker;

#[cfg(target_os = "macos")]
fn link_macos_swift_runtime_rpaths() {
    println!("cargo:rustc-link-arg=-Wl,-rpath,/usr/lib/swift");
}

fn main() {
    println!("cargo:rerun-if-changed=build.rs");

    let target_is_macos = std::env::var("CARGO_CFG_TARGET_OS").as_deref() == Ok("macos");
    let macos_private_api_enabled = std::env::var_os("CARGO_FEATURE_MACOS_PRIVATE_API").is_some();
    let macos_private_api = target_is_macos && macos_private_api_enabled;
    let tauri_config = format!(
        r#"{{"app":{{"macOSPrivateApi":{}}}}}"#,
        if macos_private_api { "true" } else { "false" }
    );
    std::env::set_var("TAURI_CONFIG", tauri_config);

    #[cfg(target_os = "macos")]
    {
        SwiftLinker::new("12.0")
            .with_package("MacosNativeMenuSwift", "native/macos-native-menu")
            .link();
        link_macos_swift_runtime_rpaths();
    }

    tauri_build::build()
}
