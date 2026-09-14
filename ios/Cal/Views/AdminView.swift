import SwiftUI

struct AdminView: View {
    @State private var baseURL = "https://api.openai.com/v1"
    @State private var apiKey = ""
    @State private var model = "gpt-4o-mini"
    @State private var visionModel = ""
    @State private var maskedKey: String?
    @State private var loading = true
    @State private var status: String?
    @State private var errorMessage: String?

    var body: some View {
        Form {
            Section("OpenAI-compatible provider") {
                TextField("Base URL", text: $baseURL)
                    .textInputAutocapitalization(.never)
                    .autocorrectionDisabled()
                SecureField(maskedKey.map { "API key (current: \($0))" } ?? "API key", text: $apiKey)
                TextField("Model", text: $model)
                    .textInputAutocapitalization(.never)
                    .autocorrectionDisabled()
                TextField("Vision model (optional)", text: $visionModel)
                    .textInputAutocapitalization(.never)
                    .autocorrectionDisabled()
            }

            if let errorMessage {
                Text(errorMessage).foregroundStyle(.red)
            }
            if let status {
                Text(status).foregroundStyle(.green)
            }

            Button("Save") { save() }
        }
        .navigationTitle("Admin")
        .disabled(loading)
        .task { await load() }
    }

    private func load() async {
        do {
            let settings = try await APIClient.getSettings()
            if settings.configured {
                baseURL = settings.baseURL ?? baseURL
                model = settings.model ?? model
                visionModel = settings.visionModel ?? ""
                maskedKey = settings.apiKey
            }
        } catch {
            errorMessage = error.localizedDescription
        }
        loading = false
    }

    private func save() {
        errorMessage = nil
        status = nil
        Task {
            do {
                try await APIClient.putSettings(
                    baseURL: baseURL,
                    apiKey: apiKey.isEmpty ? nil : apiKey,
                    model: model,
                    visionModel: visionModel.isEmpty ? nil : visionModel
                )
                apiKey = ""
                status = "Saved."
                let refreshed = try await APIClient.getSettings()
                maskedKey = refreshed.apiKey
            } catch {
                errorMessage = error.localizedDescription
            }
        }
    }
}
