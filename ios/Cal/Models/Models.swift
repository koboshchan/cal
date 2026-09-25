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
    let alarms: [Int]?

    var startDate: Date? { ISO8601DateFormatter().date(from: start) }
    var endDate: Date? { ISO8601DateFormatter().date(from: end) }
    var formattedRRule: String? { rrule.map { RRuleFormat.describe($0) } }

    enum CodingKeys: String, CodingKey {
        case title, start, end, allDay, location, description, rrule, alarms
    }

    init(
        title: String,
        start: String,
        end: String,
        allDay: Bool? = nil,
        location: String? = nil,
        description: String? = nil,
        rrule: String? = nil,
        alarms: [Int]? = nil
    ) {
        self.title = title
        self.start = start
        self.end = end
        self.allDay = allDay
        self.location = location
        self.description = description
        self.rrule = rrule
        self.alarms = alarms
    }

    init(from decoder: Decoder) throws {
        let container = try decoder.container(keyedBy: CodingKeys.self)
        title = try container.decode(String.self, forKey: .title)
        start = try container.decode(String.self, forKey: .start)
        end = try container.decode(String.self, forKey: .end)
        allDay = try container.decodeIfPresent(Bool.self, forKey: .allDay)
        location = try container.decodeIfPresent(String.self, forKey: .location)
        description = try container.decodeIfPresent(String.self, forKey: .description)
        rrule = try container.decodeIfPresent(String.self, forKey: .rrule)

        if let ints = try? container.decodeIfPresent([Int].self, forKey: .alarms) {
            alarms = ints
        } else if let strings = try? container.decodeIfPresent([String].self, forKey: .alarms) {
            alarms = strings.compactMap { str in
                let lower = str.lowercased()
                if lower.contains("day") { return 86400 }
                if lower.contains("hour") { return 3600 }
                if lower.contains("min") { return 300 }
                return Int(str)
            }
        } else {
            alarms = nil
        }
    }

    func encode(to encoder: Encoder) throws {
        var container = encoder.container(keyedBy: CodingKeys.self)
        try container.encode(title, forKey: .title)
        try container.encode(start, forKey: .start)
        try container.encode(end, forKey: .end)
        try container.encodeIfPresent(allDay, forKey: .allDay)
        try container.encodeIfPresent(location, forKey: .location)
        try container.encodeIfPresent(description, forKey: .description)
        try container.encodeIfPresent(rrule, forKey: .rrule)
        try container.encodeIfPresent(alarms, forKey: .alarms)
    }
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
    // var, not let: SessionDetailView optimistically updates these the
    // instant the last question in a batch is answered, without waiting
    // for the round trip to the server to confirm it.
    var pendingQuestions: [PendingQuestion]?
    var userAnswers: [UserAnswer]?
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
