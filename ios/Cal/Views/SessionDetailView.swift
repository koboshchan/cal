import SwiftUI

private struct EditingEvent: Identifiable {
    let index: Int
    let event: NormalizedEvent
    var id: Int { index }
}

struct SessionDetailView: View {
    let sessionId: String
    /// Set only in the "New schedule" flow, where this view is pushed inside
    /// a sheet's own NavigationStack and so has no back button of its own —
    /// the toolbar's "Done" button (shown only when this is set) calls it to
    /// close the whole sheet. Left nil for the plain "tap a past session
    /// from the list" navigation, where the back chevron already suffices.
    var onDone: (() -> Void)? = nil

    @State private var session: SessionDetail?
    @State private var loadError: String?
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
                }

                if session.status == "running" {
                    Section { HStack { ProgressView(); Text(session.currentStage ?? "Working on it…") } }
                }

                if session.status == "error", let error = session.error {
                    Section { Text(error).foregroundStyle(.red) }
                }

                if let userAnswers = session.userAnswers, !userAnswers.isEmpty {
                    Section {
                        ForEach(userAnswers) { qa in
                            VStack(alignment: .leading, spacing: 2) {
                                Text(qa.question).font(.caption).foregroundStyle(.secondary)
                                Text(qa.answer).font(.body.weight(.medium))
                            }
                        }
                    }
                }

                if session.status == "awaiting_input", let questions = session.pendingQuestions {
                    Section {
                        // Keying on the question batch's identity forces SwiftUI to
                        // recreate this view (resetting its @State) whenever a new
                        // batch of questions arrives, instead of reusing the same
                        // instance with a stale stepIndex that could be out of range
                        // for a shorter new batch.
                        QuestionWizardView(questions: questions, submitting: answering) { answers in
                            submitAnswers(answers)
                        }
                        .id(questions.map(\.toolCallId).joined(separator: ","))
                    }
                }

                if session.status == "done", let events = session.resultEvents {
                    Section("Calendar") {
                        ForEach(Array(events.enumerated()), id: \.offset) { index, event in
                            VStack(alignment: .leading, spacing: 2) {
                                Text(event.title).font(.body)
                                if let start = event.startDate, let end = event.endDate {
                                    Text("\(start.formatted()) – \(end.formatted())")
                                        .font(.caption)
                                        .foregroundStyle(.secondary)
                                }
                                if let rrule = event.formattedRRule {
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
                        } else if let downloadError {
                            VStack(alignment: .leading, spacing: 4) {
                                Text(downloadError).foregroundStyle(.red)
                                Button("Retry") { downloadIcs() }
                            }
                        } else {
                            HStack { ProgressView(); Text("Preparing your calendar file…") }
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
        // `navigationBarTitleDisplayMode(.inline)` only actually collapses
        // the nav bar's reserved title space when there's a real title
        // behind it — leaving `navigationTitle` unset here left a tall
        // empty gap where a large title would otherwise go, never drawn.
        .navigationTitle(session?.title ?? "New schedule")
        .navigationBarTitleDisplayMode(.inline)
        .toolbar {
            // Only shown when this view has no back button of its own to
            // rely on (the "New schedule" flow, presented as a sheet with
            // its own NavigationStack) — when pushed from the session list,
            // the back chevron already dismisses it, so a second "Done"
            // button would just be a redundant way to do the same thing.
            if let onDone {
                ToolbarItem(placement: .confirmationAction) {
                    if isWorking {
                        ProgressView()
                    } else if session?.status == "done" || session?.status == "error" {
                        Button("Done", action: onDone)
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

    /// Drives the toolbar's Done-vs-spinner swap: true whenever the agent is
    /// actively doing something, whether that's the initial generation, a
    /// step still running after the user answered, or an in-flight
    /// answer/refine request.
    private var isWorking: Bool {
        answering || refining || session?.status == "running"
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
                if latest.status != "running" {
                    if latest.status == "done" { downloadIcs() }
                    return
                }
            } catch {
                loadError = error.localizedDescription
                return
            }
            try? await Task.sleep(for: .seconds(1))
        }
    }

    private func submitAnswers(_ answers: [APIClient.QuestionAnswer]) {
        // Show the answers right away instead of waiting for the server to
        // confirm them — the QuestionWizardView already collected all of
        // this locally, and the server will send back the same data anyway.
        if let pending = session?.pendingQuestions {
            let newlyAnswered = pending.compactMap { question -> UserAnswer? in
                guard let match = answers.first(where: { $0.toolCallId == question.toolCallId }) else { return nil }
                return UserAnswer(question: question.question, answer: match.answer)
            }
            session?.userAnswers = (session?.userAnswers ?? []) + newlyAnswered
            session?.pendingQuestions = nil
        }

        answering = true
        Task {
            do {
                session = try await APIClient.answer(sessionId: sessionId, answers: answers)
                answering = false
                if session?.status == "running" {
                    await pollUntilSettled()
                } else if session?.status == "done" {
                    downloadIcs()
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
                } else if session?.status == "done" {
                    downloadIcs()
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
                downloadIcs()
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
                downloadIcs()
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
