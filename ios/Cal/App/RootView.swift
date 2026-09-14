import SwiftUI
import ClerkKit
import ClerkKitUI

struct RootView: View {
    @Environment(Clerk.self) private var clerk
    @State private var authIsPresented = false

    var body: some View {
        Group {
            if clerk.user != nil {
                HomeView()
            } else {
                VStack(spacing: 16) {
                    Text("Cal")
                        .font(.largeTitle.bold())
                    Text("Describe your schedule. Get a calendar.")
                        .foregroundStyle(.secondary)
                        .multilineTextAlignment(.center)
                        .padding(.horizontal, 32)
                    Button("Sign in") { authIsPresented = true }
                        .buttonStyle(.borderedProminent)
                }
            }
        }
        .sheet(isPresented: $authIsPresented) {
            AuthView()
        }
    }
}
