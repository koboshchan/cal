import SwiftUI
import PhotosUI
import UniformTypeIdentifiers

struct NewSessionView: View {
    @Environment(\.dismiss) private var dismiss

    @State private var textPrompt = ""
    @State private var photoItem: PhotosPickerItem?
    @State private var imageData: Data?
    @State private var showingFileImporter = false
    @State private var icsData: Data?
    @State private var icsFilename: String?
    @State private var submitting = false
    @State private var errorMessage: String?
    @State private var createdSessionId: String?

    var body: some View {
        Form {
            Section("Describe your schedule") {
                TextField(
                    "e.g. Gym every weekday at 7am for the next month",
                    text: $textPrompt,
                    axis: .vertical
                )
                .lineLimit(4...8)
            }

            Section("Optional attachments") {
                PhotosPicker("Photo of a schedule", selection: $photoItem, matching: .images)
                if imageData != nil {
                    Label("Image attached", systemImage: "checkmark.circle.fill")
                        .foregroundStyle(.green)
                }

                Button("Existing calendar (.ics)") { showingFileImporter = true }
                if let icsFilename {
                    Label(icsFilename, systemImage: "checkmark.circle.fill")
                        .foregroundStyle(.green)
                }
            }

            if let errorMessage {
                Text(errorMessage).foregroundStyle(.red)
            }
        }
        .navigationTitle("New schedule")
        .toolbar {
            ToolbarItem(placement: .cancellationAction) {
                Button("Cancel") { dismiss() }
            }
            ToolbarItem(placement: .confirmationAction) {
                Button(submitting ? "Generating…" : "Generate") { submit() }
                    .disabled(submitting || (textPrompt.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty && icsData == nil))
            }
        }
        .onChange(of: photoItem) { _, newValue in
            Task { imageData = try? await newValue?.loadTransferable(type: Data.self) }
        }
        .fileImporter(isPresented: $showingFileImporter, allowedContentTypes: [icsContentType]) { result in
            guard case .success(let url) = result else { return }
            loadIcs(from: url)
        }
        .navigationDestination(item: $createdSessionId) { sessionId in
            SessionDetailView(sessionId: sessionId)
        }
    }

    private var icsContentType: UTType {
        UTType(filenameExtension: "ics") ?? .data
    }

    private func loadIcs(from url: URL) {
        let accessed = url.startAccessingSecurityScopedResource()
        defer { if accessed { url.stopAccessingSecurityScopedResource() } }
        icsData = try? Data(contentsOf: url)
        icsFilename = url.lastPathComponent
    }

    private func submit() {
        submitting = true
        errorMessage = nil
        Task {
            do {
                let session = try await APIClient.createSession(
                    textPrompt: textPrompt.trimmingCharacters(in: .whitespacesAndNewlines),
                    icsData: icsData,
                    imageData: imageData
                )
                createdSessionId = session.id
            } catch {
                errorMessage = error.localizedDescription
            }
            submitting = false
        }
    }
}
