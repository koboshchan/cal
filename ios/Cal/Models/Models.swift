import Foundation

struct Me: Codable {
    let id: String
    let email: String
    let role: String

    var isAdmin: Bool { role == "admin" }
}

struct NormalizedEvent: Codable, Identifiable {
    var id: String { title + start + end }
    let title: String
    let start: String
    let end: String
    let allDay: Bool?
    let location: String?
    let description: String?
    let rrule: String?

    var startDate: Date? { ISO8601DateFormatter().date(from: start) }
    var endDate: Date? { ISO8601DateFormatter().date(from: end) }
    var formattedRRule: String? { rrule.map { RRuleFormat.describe($0) } }
}

struct UserAnswer: Codable, Identifiable {
    let question: String
    let answer: String
    var id: String { question }
}

struct PendingQuestion: Codable, Identifiable {
    let question: String
    let options: [String]
    let toolCallId: String

    var id: String { toolCallId }
}

struct SessionSummary: Codable, Identifiable {
    let id: String
    let title: String
    let status: String
    let createdAt: String
}

struct SessionDetail: Codable, Identifiable {
    let id: String
    let status: String
    let title: String
    // Optional: older sessions predate this field.
    let description: String?
    let userPrompt: String
    let currentStage: String?
    let pendingQuestions: [PendingQuestion]?
    let userAnswers: [UserAnswer]?
    let resultEvents: [NormalizedEvent]?
    let error: String?
}

struct ProviderSettings: Codable {
    let configured: Bool
    let baseURL: String?
    let apiKey: String?
    let model: String?
    let visionModel: String?
}

struct APIErrorBody: Codable {
    let error: String
}

struct CalendarFeed: Codable {
    let path: String
}
