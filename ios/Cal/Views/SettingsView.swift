import SwiftUI

struct SettingsView: View {
    @Environment(\.dismiss) private var dismiss
    @Environment(\.openURL) private var openURL

    @State private var loading = false
    @State private var errorMessage: String?

    var body: some View {
        NavigationStack {
            Form {
                Section {
                    Text(
                        "Subscribing adds a live calendar to Apple Calendar that stays in sync — " +
                        "every finished schedule you generate shows up automatically, no re-importing needed."
                    )
                    .foregroundStyle(.secondary)
                }

                Section {
                    Button(loading ? "Opening…" : "Add to Calendar") { subscribe() }
                        .disabled(loading)
                    if let errorMessage {
                        Text(errorMessage).foregroundStyle(.red)
                    }
                }
            }
            .navigationTitle("Settings")
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Done") { dismiss() }
                }
            }
        }
    }

    private func subscribe() {
        loading = true
        errorMessage = nil
        Task {
            do {
                let feed = try await APIClient.getCalendarFeed()
                guard let webcalURL = webcalURL(for: feed.path) else {
                    throw APIError.server("Couldn't build a calendar subscription URL")
                }
                openURL(webcalURL)
            } catch {
                errorMessage = error.localizedDescription
            }
            loading = false
        }
    }

    /// `webcal://`/`webcals://` tell the OS to hand the URL to Calendar as a
    /// live subscription rather than fetching it as a plain download.
    private func webcalURL(for path: String) -> URL? {
        var components = URLComponents(url: AppConfig.baseURL, resolvingAgainstBaseURL: false)
        components?.scheme = AppConfig.baseURL.scheme == "https" ? "webcals" : "webcal"
        components?.path = path
        return components?.url
    }
}
