import Foundation

/// Persistent disk and memory cache for sessions, user profile, and session details.
/// Uses `URL.applicationSupportDirectory` so cached records survive app restarts
/// and are not purged during low disk conditions, allowing full offline access.
final class DataCache: @unchecked Sendable {
    static let shared = DataCache()

    private let fileManager = FileManager.default
    private let cacheDirectory: URL
    private let encoder = JSONEncoder()
    private let decoder = JSONDecoder()
    private let lock = NSLock()

    // In-memory cache for instant zero-latency access on app launch
    private var cachedSessions: [SessionSummary]?
    private var cachedMe: Me?
    private var cachedSessionDetails: [String: SessionDetail] = [:]

    init() {
        let base = URL.applicationSupportDirectory.appending(path: "CalCache", directoryHint: .isDirectory)
        if !fileManager.fileExists(atPath: base.path()) {
            try? fileManager.createDirectory(at: base, withIntermediateDirectories: true)
        }
        self.cacheDirectory = base

        // Pre-load critical data into memory
        self.cachedSessions = loadFromDisk([SessionSummary].self, filename: "sessions.json")
        self.cachedMe = loadFromDisk(Me.self, filename: "me.json")
    }

    // MARK: - Sessions

    func loadSessions() -> [SessionSummary] {
        lock.lock()
        defer { lock.unlock() }

        if let cachedSessions {
            return cachedSessions
        }
        let loaded = loadFromDisk([SessionSummary].self, filename: "sessions.json") ?? []
        self.cachedSessions = loaded
        return loaded
    }

    func saveSessions(_ sessions: [SessionSummary]) {
        lock.lock()
        self.cachedSessions = sessions
        lock.unlock()

        saveToDisk(sessions, filename: "sessions.json")
    }

    // MARK: - Me (User Profile)

    func loadMe() -> Me? {
        lock.lock()
        defer { lock.unlock() }

        if let cachedMe {
            return cachedMe
        }
        let loaded = loadFromDisk(Me.self, filename: "me.json")
        self.cachedMe = loaded
        return loaded
    }

    func saveMe(_ me: Me) {
        lock.lock()
        self.cachedMe = me
        lock.unlock()

        saveToDisk(me, filename: "me.json")
    }

    // MARK: - Session Detail

    func loadSessionDetail(id: String) -> SessionDetail? {
        lock.lock()
        defer { lock.unlock() }

        if let detail = cachedSessionDetails[id] {
            return detail
        }
        let loaded = loadFromDisk(SessionDetail.self, filename: "session_\(id).json")
        if let loaded {
            cachedSessionDetails[id] = loaded
        }
        return loaded
    }

    func saveSessionDetail(_ detail: SessionDetail) {
        lock.lock()
        cachedSessionDetails[detail.id] = detail
        lock.unlock()

        saveToDisk(detail, filename: "session_\(detail.id).json")
    }

    func deleteSession(id: String) {
        lock.lock()
        cachedSessions?.removeAll { $0.id == id }
        cachedSessionDetails.removeValue(forKey: id)
        lock.unlock()

        let fileURL = cacheDirectory.appending(path: "session_\(id).json")
        try? fileManager.removeItem(at: fileURL)

        if let sessions = cachedSessions {
            saveToDisk(sessions, filename: "sessions.json")
        }
    }

    // MARK: - Disk Helpers

    private func saveToDisk<T: Encodable>(_ item: T, filename: String) {
        let fileURL = cacheDirectory.appending(path: filename)
        do {
            let data = try encoder.encode(item)
            try data.write(to: fileURL, options: .atomic)
        } catch {
            // Caching failure is non-fatal but logged for diagnostics
            print("[DataCache] Failed to save \(filename): \(error)")
        }
    }

    private func loadFromDisk<T: Decodable>(_ type: T.Type, filename: String) -> T? {
        let fileURL = cacheDirectory.appending(path: filename)
        guard fileManager.fileExists(atPath: fileURL.path()) else { return nil }
        do {
            let data = try Data(contentsOf: fileURL)
            return try decoder.decode(type, from: data)
        } catch {
            print("[DataCache] Failed to decode \(filename): \(error)")
            return nil
        }
    }
}
