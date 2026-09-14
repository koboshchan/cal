import SwiftUI

struct SessionDetailView: View {
    let sessionId: String

    @State private var session: SessionDetail?
    @State private var loadError: String?
    @State private var answerText = ""
    @State private var answering = false
    @State private var refineText = ""
    @State private var refining = false
    @State private var icsFileURL: URL?
    @State private var downloadError: String?

    var body: some View {
        List {
            if let loadError {
                Text(loadError).foregroundStyle(.red)
            }

            if let session {
                Section {
                    Text(session.title).font(.headline)
                    if let description = session.description, !description.isEmpty {
                        Text(description).font(.subheadline).foregroundStyle(.secondary)
                    }
                    Text(session.status.replacingOccurrences(of: "_", with: " "))
                        .font(.caption)
                        .foregroundStyle(.secondary)
                }

                if session.status == "running" {
                    Section { HStack { ProgressView(); Text("Working on it…") } }
                }

                if session.status == "error", let error = session.error {
                    Section { Text(error).foregroundStyle(.red) }
                }

                if session.status == "awaiting_input", let question = session.pendingQuestion {
                    Section(question.question) {
                        if question.type == "choice", let options = question.options {
                            ForEach(options, id: \.self) { option in
                                Button(option) { submitAnswer(option) }
                                    .disabled(answering)
                            }
                        } else {
                            TextField(question.placeholder ?? "Your answer", text: $answerText)
                            Button("Send") { submitAnswer(answerText) }
                                .disabled(answering || answerText.trimmingCharacters(in: .whitespaces).isEmpty)
                        }
                    }
                }

                if session.status == "done", let events = session.resultEvents {
                    Section("Calendar (swipe to remove)") {
                        ForEach(Array(events.enumerated()), id: \.offset) { _, event in
                            VStack(alignment: .leading, spacing: 2) {
                                Text(event.title).font(.body)
                                if let start = event.startDate, let end = event.endDate {
                                    Text("\(start.formatted()) – \(end.formatted())")
                                        .font(.caption)
                                        .foregroundStyle(.secondary)
                                }
                                if let rrule = event.rrule {
                                    Text("Repeats: \(rrule)").font(.caption2).foregroundStyle(.secondary)
                                }
                                if let location = event.location, !location.isEmpty {
                                    Text(location).font(.caption).foregroundStyle(.secondary)
                                }
                            }
                        }
                        .onDelete(perform: deleteEvents)
                    }

                    Section {
                        if let icsFileURL {
                            ShareLink("Share .ics", item: icsFileURL)
                        } else {
                            Button("Download .ics") { downloadIcs() }
                        }
                        if let downloadError {
                            Text(downloadError).foregroundStyle(.red)
                        }
                    }
                }

                if session.status == "done" || session.status == "error" {
                    Section("Ask for a change") {
                        TextField("e.g. \"move gym to 6am\"", text: $refineText)
                        Button(refining ? "Working…" : "Send") { submitRefine() }
                            .disabled(refining || refineText.trimmingCharacters(in: .whitespaces).isEmpty)
                    }
                }
            }
        }
        .navigationTitle("Session")
        .task { await pollUntilSettled() }
    }

    private func pollUntilSettled() async {
        while !Task.isCancelled {
            do {
                let latest = try await APIClient.session(id: sessionId)
                session = latest
                loadError = nil
                if latest.status != "running" { return }
            } catch {
                loadError = error.localizedDescription
                return
            }
            try? await Task.sleep(for: .seconds(2))
        }
    }

    private func submitAnswer(_ answer: String) {
        answering = true
        Task {
            do {
                session = try await APIClient.answer(sessionId: sessionId, answer: answer)
                answerText = ""
                answering = false
                if session?.status == "running" {
                    await pollUntilSettled()
                }
            } catch {
                loadError = error.localizedDescription
                answering = false
            }
        }
    }

    private func submitRefine() {
        let prompt = refineText.trimmingCharacters(in: .whitespaces)
        guard !prompt.isEmpty else { return }
        refining = true
        Task {
            do {
                session = try await APIClient.refine(sessionId: sessionId, prompt: prompt)
                refineText = ""
                icsFileURL = nil
                refining = false
                if session?.status == "running" {
                    await pollUntilSettled()
                }
            } catch {
                loadError = error.localizedDescription
                refining = false
            }
        }
    }

    private func deleteEvents(at offsets: IndexSet) {
        guard let index = offsets.first else { return }
        Task {
            do {
                session = try await APIClient.deleteEvent(sessionId: sessionId, eventIndex: index)
                icsFileURL = nil
            } catch {
                loadError = error.localizedDescription
            }
        }
    }

    private func downloadIcs() {
        downloadError = nil
        Task {
            do {
                icsFileURL = try await APIClient.downloadIcs(sessionId: sessionId)
            } catch {
                downloadError = error.localizedDescription
            }
        }
    }
}
