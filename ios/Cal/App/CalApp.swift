import SwiftUI
import ClerkKit

@main
struct CalApp: App {
    init() {
        Clerk.configure(publishableKey: "pk_test_bW9kZWwtZG9nZmlzaC0zODAzLmNsZXJrLmFjY291bnRzLmRldiQ")
    }

    var body: some Scene {
        WindowGroup {
            RootView()
                .environment(Clerk.shared)
        }
    }
}
