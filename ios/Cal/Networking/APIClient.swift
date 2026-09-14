import Foundation
import ClerkKit

enum APIError: LocalizedError {
    case notSignedIn
    case server(String)
    case decoding

    var errorDescription: String? {
        switch self {
        case .notSignedIn: return "You're not signed in."
        case .server(let message): return message
        case .decoding: return "Couldn't understand the server's response."
        }
    }
}

/// Thin REST client shared by every screen. Every request carries the
/// current Clerk session token as a bearer token — the same auth path the
/// web app uses via its cookie session, verified server-side by the same
/// `requireUser()` helper either way.
enum APIClient {
    private static let decoder: JSONDecoder = JSONDecoder()
    private static let encoder: JSONEncoder = JSONEncoder()

    private static func authorizedRequest(path: String, method: String = "GET") async throws -> URLRequest {
        guard let token = try await Clerk.shared.session?.getToken() else {
            throw APIError.notSignedIn
        }
        var request = URLRequest(url: AppConfig.baseURL.appendingPathComponent(path))
        request.httpMethod = method
        request.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
        return request
    }

    private static func send<T: Decodable>(_ request: URLRequest) async throws -> T {
        let (data, response) = try await URLSession.shared.data(for: request)
        guard let http = response as? HTTPURLResponse else { throw APIError.decoding }
        guard (200..<300).contains(http.statusCode) else {
            let message = (try? decoder.decode(APIErrorBody.self, from: data))?.error
            throw APIError.server(message ?? "Request failed (\(http.statusCode))")
        }
        do {
            return try decoder.decode(T.self, from: data)
        } catch {
            throw APIError.decoding
        }
    }

    static func me() async throws -> Me {
        let request = try await authorizedRequest(path: "/api/me")
        return try await send(request)
    }

    static func listSessions() async throws -> [SessionSummary] {
        let request = try await authorizedRequest(path: "/api/sessions")
        struct Wrapper: Codable { let sessions: [SessionSummary] }
        let wrapper: Wrapper = try await send(request)
        return wrapper.sessions
    }

    static func renameSession(id: String, title: String) async throws -> SessionDetail {
        var request = try await authorizedRequest(path: "/api/sessions/\(id)", method: "PATCH")
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        request.httpBody = try encoder.encode(["title": title])
        return try await send(request)
    }

    static func deleteSession(id: String) async throws {
        let request = try await authorizedRequest(path: "/api/sessions/\(id)", method: "DELETE")
        struct OK: Codable { let ok: Bool }
        let _: OK = try await send(request)
    }

    static func createSession(textPrompt: String, icsData: Data?, imageData: Data?) async throws -> SessionDetail {
        var request = try await authorizedRequest(path: "/api/sessions", method: "POST")
        let boundary = "Boundary-\(UUID().uuidString)"
        request.setValue("multipart/form-data; boundary=\(boundary)", forHTTPHeaderField: "Content-Type")
        request.httpBody = multipartBody(
            boundary: boundary,
            textPrompt: textPrompt,
            icsData: icsData,
            imageData: imageData
        )
        return try await send(request)
    }

    static func session(id: String) async throws -> SessionDetail {
        let request = try await authorizedRequest(path: "/api/sessions/\(id)")
        return try await send(request)
    }

    static func answer(sessionId: String, answer: String) async throws -> SessionDetail {
        var request = try await authorizedRequest(path: "/api/sessions/\(sessionId)/answer", method: "POST")
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        request.httpBody = try encoder.encode(["answer": answer])
        return try await send(request)
    }

    static func refine(sessionId: String, prompt: String) async throws -> SessionDetail {
        var request = try await authorizedRequest(path: "/api/sessions/\(sessionId)/refine", method: "POST")
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        request.httpBody = try encoder.encode(["prompt": prompt])
        return try await send(request)
    }

    static func deleteEvent(sessionId: String, eventIndex: Int) async throws -> SessionDetail {
        let request = try await authorizedRequest(
            path: "/api/sessions/\(sessionId)/events/\(eventIndex)",
            method: "DELETE"
        )
        return try await send(request)
    }

    static func updateEvent(sessionId: String, eventIndex: Int, event: NormalizedEvent) async throws -> SessionDetail {
        var request = try await authorizedRequest(
            path: "/api/sessions/\(sessionId)/events/\(eventIndex)",
            method: "PATCH"
        )
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        request.httpBody = try encoder.encode(event)
        return try await send(request)
    }

    static func icsURL(sessionId: String) -> URL {
        AppConfig.baseURL.appendingPathComponent("/api/sessions/\(sessionId)/ics")
    }

    /// Downloads the finished .ics to a temp file for `ShareLink`, since a
    /// bearer-token-authenticated download can't just be a plain URL a share
    /// sheet fetches on its own.
    static func downloadIcs(sessionId: String) async throws -> URL {
        let request = try await authorizedRequest(path: "/api/sessions/\(sessionId)/ics")
        let (data, response) = try await URLSession.shared.data(for: request)
        guard let http = response as? HTTPURLResponse, (200..<300).contains(http.statusCode) else {
            throw APIError.server("Couldn't download the calendar file")
        }
        let url = FileManager.default.temporaryDirectory.appendingPathComponent("\(sessionId).ics")
        try data.write(to: url, options: .atomic)
        return url
    }

    static func getCalendarFeed() async throws -> CalendarFeed {
        let request = try await authorizedRequest(path: "/api/me/calendar-feed")
        return try await send(request)
    }

    static func getSettings() async throws -> ProviderSettings {
        let request = try await authorizedRequest(path: "/api/admin/settings")
        return try await send(request)
    }

    static func putSettings(baseURL: String, apiKey: String?, model: String, visionModel: String?) async throws {
        var request = try await authorizedRequest(path: "/api/admin/settings", method: "PUT")
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        var body: [String: String] = ["baseURL": baseURL, "model": model]
        if let apiKey, !apiKey.isEmpty { body["apiKey"] = apiKey }
        if let visionModel, !visionModel.isEmpty { body["visionModel"] = visionModel }
        request.httpBody = try encoder.encode(body)
        struct OK: Codable { let ok: Bool }
        let _: OK = try await send(request)
    }

    private static func multipartBody(boundary: String, textPrompt: String, icsData: Data?, imageData: Data?) -> Data {
        var body = Data()
        func appendField(name: String, value: String) {
            body.append("--\(boundary)\r\n".data(using: .utf8)!)
            body.append("Content-Disposition: form-data; name=\"\(name)\"\r\n\r\n".data(using: .utf8)!)
            body.append("\(value)\r\n".data(using: .utf8)!)
        }
        func appendFile(name: String, filename: String, mimeType: String, data: Data) {
            body.append("--\(boundary)\r\n".data(using: .utf8)!)
            body.append(
                "Content-Disposition: form-data; name=\"\(name)\"; filename=\"\(filename)\"\r\n"
                    .data(using: .utf8)!
            )
            body.append("Content-Type: \(mimeType)\r\n\r\n".data(using: .utf8)!)
            body.append(data)
            body.append("\r\n".data(using: .utf8)!)
        }

        if !textPrompt.isEmpty { appendField(name: "textPrompt", value: textPrompt) }
        if let icsData { appendFile(name: "icsFile", filename: "calendar.ics", mimeType: "text/calendar", data: icsData) }
        if let imageData { appendFile(name: "imageFile", filename: "image.jpg", mimeType: "image/jpeg", data: imageData) }
        body.append("--\(boundary)--\r\n".data(using: .utf8)!)
        return body
    }
}
