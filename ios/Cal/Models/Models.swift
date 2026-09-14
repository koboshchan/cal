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
}

struct PendingQuestion: Codable {
    let type: String // "choice" | "text"
    let question: String
    let options: [String]?
    let placeholder: String?
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
    let userPrompt: String
    let pendingQuestion: PendingQuestion?
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
