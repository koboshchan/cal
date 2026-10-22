#if DEBUG
import SwiftUI

enum UITestSupport {
    static var screen: String? { ProcessInfo.processInfo.environment["CAL_UI_SCREEN"] }
    static let event = NormalizedEvent(title: "Morning training", start: "2026-10-15T07:00:00Z", end: "2026-10-15T08:00:00Z", location: "Community centre", description: "Bring a water bottle.", rrule: "FREQ=WEEKLY;BYDAY=MO,WE,FR", alarms: [900])
    static let question = PendingQuestion(question: "When would you like a reminder?", options: ["15 minutes before", "At the start", "No reminder"], toolCallId: "reminder")
    static var detail: SessionDetail {
        SessionDetail(id: "fixture", status: screen == "question" ? "awaiting_input" : screen == "running" ? "running" : "done", title: "A little more routine", description: "Training, time to focus, and room for yourself.", userPrompt: "Plan my week", currentStage: "Finding the right times", pendingQuestions: screen == "question" ? [question] : nil, userAnswers: nil, resultEvents: [event], error: nil)
    }
}
struct UITestHost: View {
    let screen: String
    var body: some View {
        Group {
            switch screen {
            case "welcome": WelcomeView {}
            case "new": NavigationStack { NewSessionView() }
            case "settings": SettingsView()
            case "edit": UITestEditorHost()
            case "admin": NavigationStack { AdminView() }
            case "detail", "question", "running": NavigationStack { SessionDetailView(sessionId: "fixture", initialSession: UITestSupport.detail) }
            default: HomeView()
            }
        }
        .preferredColorScheme(ProcessInfo.processInfo.environment["CAL_UI_DARK"] == "1" ? .dark : .light)
        .dynamicTypeSize(ProcessInfo.processInfo.environment["CAL_UI_LARGE"] == "1" ? .accessibility3 : .large)
    }
}
private struct UITestEditorHost: View {
    @State private var presented = true
    var body: some View {
        Text("Editor dismissed")
            .sheet(isPresented: $presented) {
                EditEventView(original: UITestSupport.event) { _ in presented = false }
            }
    }
}
#endif
