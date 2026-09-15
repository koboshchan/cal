import SwiftUI
import ClerkKit

@main
struct CalApp: App {
    init() {
        Clerk.configure(publishableKey: "pk_live_Y2xlcmsuY2FsLmtvYm9zaC5jb20k")
    }

    var body: some Scene {
        WindowGroup {
            RootView()
                .environment(Clerk.shared)
        }
    }
}
