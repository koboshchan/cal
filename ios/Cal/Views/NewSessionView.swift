import SwiftUI
import PhotosUI
import UniformTypeIdentifiers
import UIKit

struct NewSessionView: View {
    @Environment(\.dismiss) private var dismiss

    @State private var textPrompt = ""
    @State private var photoItems: [PhotosPickerItem] = []
    @State private var imageDatas: [Data] = []
    @State private var showingFileImporter = false
    @State private var icsData: Data?
    @State private var icsFilename: String?
    @State private var submitting = false
    @State private var errorMessage: String?
    @State private var createdSession: SessionDetail?
    @State private var showingCreatedSession = false

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
                PhotosPicker("Photos of a schedule", selection: $photoItems, matching: .images)
                if !imageDatas.isEmpty {
                    Label(
                        "\(imageDatas.count) image\(imageDatas.count == 1 ? "" : "s") attached",
                        systemImage: "checkmark.circle.fill"
                    )
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
        .onChange(of: photoItems) { _, newItems in
            Task {
                var converted: [Data] = []
                for item in newItems {
                    guard let raw = try? await item.loadTransferable(type: Data.self),
                          let uiImage = UIImage(data: raw),
                          // The Photos library commonly hands back HEIC, at
                          // full camera resolution; downscale and re-encode
                          // as JPEG on-device so HEIC is never sent, and so
                          // a handful of photos doesn't blow past the
                          // server's request size limit.
                          let jpeg = resizedJPEGData(from: uiImage)
                    else { continue }
                    converted.append(jpeg)
                }
                imageDatas = converted
            }
        }
        .fileImporter(isPresented: $showingFileImporter, allowedContentTypes: [icsContentType]) { result in
            guard case .success(let url) = result else { return }
            loadIcs(from: url)
        }
        .navigationDestination(isPresented: $showingCreatedSession) {
            // onDone: dismiss THIS view's own sheet, not just pop back to
            // the form — SessionDetailView is pushed inside this sheet's
            // NavigationStack, so its own dismiss() would only do the latter.
            // initialSession: we already have the full session (title,
            // description, ...) from creating it — show it immediately
            // instead of a blank screen until the first /continue call.
            if let createdSession {
                SessionDetailView(sessionId: createdSession.id, initialSession: createdSession, onDone: { dismiss() })
            }
        }
    }

    private var icsContentType: UTType {
        UTType(filenameExtension: "ics") ?? .data
    }

    /// Downscales to at most 1600px on the long side (plenty for the vision
    /// model to read a schedule/timetable) before JPEG-encoding, so photos
    /// straight from the camera don't multiply into a huge multipart body.
    private func resizedJPEGData(from image: UIImage, maxDimension: CGFloat = 1600, quality: CGFloat = 0.8) -> Data? {
        let size = image.size
        let scale = min(1, maxDimension / max(size.width, size.height))
        guard scale < 1 else { return image.jpegData(compressionQuality: quality) }
        let newSize = CGSize(width: size.width * scale, height: size.height * scale)
        let resized = UIGraphicsImageRenderer(size: newSize).image { _ in
            image.draw(in: CGRect(origin: .zero, size: newSize))
        }
        return resized.jpegData(compressionQuality: quality)
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
                    imageDatas: imageDatas
                )
                createdSession = session
                showingCreatedSession = true
            } catch {
                errorMessage = error.localizedDescription
            }
            submitting = false
        }
    }
}
