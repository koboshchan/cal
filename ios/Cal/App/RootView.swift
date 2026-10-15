import SwiftUI
import ClerkKit
import ClerkKitUI

struct RootView: View {
    @Environment(Clerk.self) private var clerk
    @State private var authIsPresented = false

    var body: some View {
        Group {
            #if DEBUG
            if let screen = UITestSupport.screen {
                UITestHost(screen: screen)
            } else {
                authenticatedContent
            }
            #else
            authenticatedContent
            #endif
        }
        .sheet(isPresented: $authIsPresented) { AuthView() }
    }

    private var authenticatedContent: some View {
        Group {
            if clerk.user != nil {
                HomeView()
            } else {
                WelcomeView { authIsPresented = true }
            }
        }
    }
}
