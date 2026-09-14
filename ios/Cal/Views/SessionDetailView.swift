import SwiftUI

private struct EditingEvent: Identifiable {
    let index: Int
    let event: NormalizedEvent
    var id: Int { index }
}

struct SessionDetailView: View {
    let sessionId: String
    /// When this view is pushed inside another sheet's own NavigationStack
    /// (the "New schedule" flow), the local `dismiss()` only pops back to
    /// that form — it doesn't close the sheet itself. Pass the enclosing
    /// sheet's dismiss action here so "Done" closes the whole popup instead
    /// of leaving it open on the form. Left nil for the plain "tap a past
    /// session from the list" navigation, where popping back is correct.
    var onDone: (() -> Void)? = nil

    @Environment(\.dismiss) private var dismiss
    @State private var session: SessionDetail?
    @State private var loadError: String?
    @State private var answersByQuestion: [String: String] = [:]
    @State private var answering = false
    @State private var refineText = ""
    @State private var refining = false
    @State private var icsFileURL: URL?
    @State private var downloadError: String?
    @State private var editingEvent: EditingEvent?

    /// `initialSession`: when known already (right after creating it), show
    /// the title/description immediately instead of a blank screen until
    /// the first /continue round-trip comes back.
    init(sessionId: String, initialSession: SessionDetail? = nil, onDone: (() -> Void)? = nil) {
        self.sessionId = sessionId
        self.onDone = onDone
        _session = State(initialValue: initialSession)
    }

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
                    Section { HStack { ProgressView(); Text(session.currentStage ?? "Working on it…") } }
                }

                if session.status == "error", let error = session.error {
                    Section { Text(error).foregroundStyle(.red) }
                }

                if session.status == "awaiting_input", let questions = session.pendingQuestions {
                    ForEach(questions) { question in
                        Section(question.question) {
                            if question.type == "choice", let options = question.options {
                                ForEach(options, id: \.self) { option in
                                    let selected = answersByQuestion[question.toolCallId] == option
                                    Button {
                                        answersByQuestion[question.toolCallId] = option
                                    } label: {
                                        HStack {
                                            Text(option)
                                            if selected {
                                                Spacer()
                                                Image(systemName: "checkmark")
                                            }
                                        }
                                    }
                                    .disabled(answering)
                                }
                            } else {
                                TextField(
                                    question.placeholder ?? "Your answer",
                                    text: Binding(
                                        get: { answersByQuestion[question.toolCallId] ?? "" },
                                        set: { answersByQuestion[question.toolCallId] = $0 }
                                    )
                                )
                            }
                        }
                    }
                    Section {
                        Button(answering ? "Sending…" : (questions.count > 1 ? "Send answers" : "Send")) {
                            submitAnswers(for: questions)
                        }
                        .disabled(answering || questions.contains {
                            (answersByQuestion[$0.toolCallId] ?? "").trimmingCharacters(in: .whitespaces).isEmpty
                        })
                    }
                }

                if session.status == "done", let events = session.resultEvents {
                    Section("Calendar (swipe for actions)") {
                        ForEach(Array(events.enumerated()), id: \.offset) { index, event in
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
                            .swipeActions(edge: .trailing) {
                                Button(role: .destructive) { deleteEvent(index) } label: {
                                    Label("Delete", systemImage: "trash")
                                }
                                Button { editingEvent = EditingEvent(index: index, event: event) } label: {
                                    Label("Edit", systemImage: "pencil")
                                }
                                .tint(.orange)
                            }
                        }
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
        .navigationTitle(session?.title ?? "Session")
        .toolbar {
            if session?.status == "done" || session?.status == "error" {
                ToolbarItem(placement: .confirmationAction) {
                    Button("Done") {
                        if let onDone {
                            onDone()
                        } else {
                            dismiss()
                        }
                    }
                }
            }
        }
        .sheet(item: $editingEvent) { editing in
            EditEventView(original: editing.event) { updated in
                updateEvent(at: editing.index, with: updated)
            }
        }
        .task { await pollUntilSettled() }
    }

    /// Drives multi-stage generation forward: each call both advances the
    /// agent by one step and reports the result, so this doubles as both the
    /// "do the work" and "poll for status" mechanism — there's no background
    /// worker making progress on its own between calls.
    private func pollUntilSettled() async {
        while !Task.isCancelled {
            do {
                let latest = try await APIClient.continueSession(id: sessionId)
                session = latest
                loadError = nil
                if latest.status != "running" { return }
            } catch {
                loadError = error.localizedDescription
                return
            }
            try? await Task.sleep(for: .seconds(1))
        }
    }

    private func submitAnswers(for questions: [PendingQuestion]) {
        let answers = questions.map {
            APIClient.QuestionAnswer(
                toolCallId: $0.toolCallId,
                answer: (answersByQuestion[$0.toolCallId] ?? "").trimmingCharacters(in: .whitespaces)
            )
        }
        answering = true
        Task {
            do {
                session = try await APIClient.answer(sessionId: sessionId, answers: answers)
                answersByQuestion = [:]
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

    private func deleteEvent(_ index: Int) {
        Task {
            do {
                session = try await APIClient.deleteEvent(sessionId: sessionId, eventIndex: index)
                icsFileURL = nil
            } catch {
                loadError = error.localizedDescription
            }
        }
    }

    private func updateEvent(at index: Int, with event: NormalizedEvent) {
        Task {
            do {
                session = try await APIClient.updateEvent(sessionId: sessionId, eventIndex: index, event: event)
                icsFileURL = nil
                editingEvent = nil
            } catch {
                loadError = error.localizedDescription
                editingEvent = nil
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
