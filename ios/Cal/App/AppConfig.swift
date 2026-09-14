import Foundation

/// Points the app at the Cal backend (the Next.js REST API from `web/`).
///
/// iOS's App Transport Security exempts loopback addresses, so plain
/// `http://` works for the Simulator talking to `docker compose` on the
/// same Mac. For a physical device, point this at your Mac's LAN IP
/// instead of `localhost` (the device isn't the Mac), e.g.
/// `http://192.168.1.23:3001`. For a real deployment, point it at your
/// server's `https://` URL.
enum AppConfig {
    // Swift 6 strict concurrency requires global mutable state to opt out
    // of its data-race checks explicitly; this is a config value set once
    // (here, or by editing this file) and only ever read afterwards.
    nonisolated(unsafe) static var baseURL = URL(string: "http://localhost:3001")!
}
