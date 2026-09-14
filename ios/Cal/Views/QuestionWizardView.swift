import SwiftUI

/// Shows one pending question at a time (the agent may ask several in a
/// single turn) and submits all of them together once the last one is
/// answered — a model turn with multiple tool calls can't be half-resolved,
/// so partial submission isn't an option.
struct QuestionWizardView: View {
    let questions: [PendingQuestion]
    let submitting: Bool
    let onSubmit: ([APIClient.QuestionAnswer]) -> Void

    @State private var stepIndex = 0
    @State private var answers: [String: String] = [:]
    @State private var customText = ""
    @State private var usingOther = false

    private var question: PendingQuestion { questions[stepIndex] }
    private var isLast: Bool { stepIndex == questions.count - 1 }
    private var showingTextEntry: Bool { question.type != "choice" || usingOther }

    var body: some View {
        VStack(alignment: .leading, spacing: 10) {
            if questions.count > 1 {
                Text("Question \(stepIndex + 1) of \(questions.count)")
                    .font(.caption)
                    .foregroundStyle(.secondary)
            }
            Text(question.question).font(.body.weight(.medium))

            if !showingTextEntry {
                ForEach(question.options ?? [], id: \.self) { option in
                    Button(option) { chooseAndAdvance(option) }
                        .disabled(submitting)
                }
                Button("Other") { usingOther = true }
                    .foregroundStyle(.secondary)
                    .disabled(submitting)
            } else {
                TextField(
                    question.type == "text" ? (question.placeholder ?? "Your answer") : "Type your own answer",
                    text: $customText
                )
                .textFieldStyle(.roundedBorder)
                .submitLabel(isLast ? .done : .next)
                .onSubmit { submitCustomText() }
                Button(isLast ? "Submit" : "Next") { submitCustomText() }
                    .disabled(submitting || customText.trimmingCharacters(in: .whitespaces).isEmpty)
            }
        }
        .padding(.vertical, 4)
    }

    private func submitCustomText() {
        let trimmed = customText.trimmingCharacters(in: .whitespaces)
        guard !trimmed.isEmpty else { return }
        chooseAndAdvance(trimmed)
    }

    private func chooseAndAdvance(_ value: String) {
        answers[question.toolCallId] = value
        customText = ""
        usingOther = false
        if isLast {
            onSubmit(questions.map { APIClient.QuestionAnswer(toolCallId: $0.toolCallId, answer: answers[$0.toolCallId] ?? "") })
        } else {
            stepIndex += 1
        }
    }
}
