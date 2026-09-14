import SwiftUI

/// Shows one pending question at a time (the agent may ask several in a
/// single turn) and submits all of them together once the last one is
/// answered — a model turn with multiple tool calls can't be half-resolved,
/// so partial submission isn't an option.
///
/// There's no separate free-text question type: every question is
/// multiple-choice, and a "write your own" text field is always shown
/// underneath as its own section rather than replacing the choices, so the
/// choice buttons can have a clean, uncluttered layout.
struct QuestionWizardView: View {
    let questions: [PendingQuestion]
    let submitting: Bool
    let onSubmit: ([APIClient.QuestionAnswer]) -> Void

    @State private var stepIndex = 0
    @State private var answers: [String: String] = [:]
    @State private var customText = ""

    private var question: PendingQuestion { questions[stepIndex] }
    private var isLast: Bool { stepIndex == questions.count - 1 }

    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            if questions.count > 1 {
                Text("QUESTION \(stepIndex + 1) OF \(questions.count)")
                    .font(.caption2.weight(.semibold))
                    .foregroundStyle(.secondary)
            }
            Text(question.question)
                .font(.body.weight(.semibold))

            VStack(spacing: 8) {
                ForEach(question.options, id: \.self) { option in
                    Button {
                        chooseAndAdvance(option)
                    } label: {
                        HStack {
                            Text(option)
                                .font(.subheadline.weight(.medium))
                                .foregroundStyle(.primary)
                                .multilineTextAlignment(.leading)
                            Spacer(minLength: 0)
                        }
                        .padding(.vertical, 12)
                        .padding(.horizontal, 14)
                        .background(Color(.secondarySystemBackground))
                        .clipShape(RoundedRectangle(cornerRadius: 12, style: .continuous))
                    }
                    .buttonStyle(.plain)
                    .disabled(submitting)
                }
            }

            HStack(spacing: 8) {
                Rectangle().fill(Color(.separator)).frame(height: 1)
                Text("or write your own")
                    .font(.caption2)
                    .foregroundStyle(.secondary)
                    .fixedSize()
                Rectangle().fill(Color(.separator)).frame(height: 1)
            }
            .padding(.vertical, 2)

            HStack(spacing: 8) {
                TextField("Type your own answer", text: $customText)
                    .textFieldStyle(.roundedBorder)
                    .submitLabel(isLast ? .done : .next)
                    .onSubmit { submitCustomText() }
                Button(isLast ? "Submit" : "Next") { submitCustomText() }
                    .buttonStyle(.borderedProminent)
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
        if isLast {
            onSubmit(questions.map { APIClient.QuestionAnswer(toolCallId: $0.toolCallId, answer: answers[$0.toolCallId] ?? "") })
        } else {
            stepIndex += 1
        }
    }
}
