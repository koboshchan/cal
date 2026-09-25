import Foundation
import Observation
import SwiftUI

/// View model for HomeView managing schedule sessions, caching, and network refresh state.
/// Follows SwiftUI Pro guidelines by keeping business logic separate from view layout.
@Observable
@MainActor
final class HomeViewModel {
    var sessions: [SessionSummary] = []
    var me: Me?
    var isRefreshing: Bool = false
    var isOfflineBannerVisible: Bool = false
    var errorMessage: String?

    var showingNewSession: Bool = false
    var showingSettings: Bool = false
    var renamingSession: SessionSummary?
    var renameText: String = ""
    var isRenamingPresented: Bool = false

    private let cache = DataCache.shared

    init() {
        // Immediately populate state with cached data so it is visible and accessible
        // on the very first frame before network refresh begins.
        self.sessions = cache.loadSessions()
        self.me = cache.loadMe()
    }

    /// Fetches the latest user profile and sessions from the server.
    /// On success, replaces the old data and updates the persistent cache.
    /// On failure, preserves the old cached data and displays the offline banner.
    func refresh() async {
        isRefreshing = true
        defer { isRefreshing = false }

        do {
            async let meResult = APIClient.me()
            async let sessionsResult = APIClient.listSessions()

            let freshMe = try await meResult
            let freshSessions = try await sessionsResult

            // Replace old data with fresh data
            self.me = freshMe
            self.sessions = freshSessions
            self.errorMessage = nil

            // Persist the fresh copy to disk
            cache.saveMe(freshMe)
            cache.saveSessions(freshSessions)

            // Hide offline banner on successful refresh
            withAnimation(.snappy) {
                self.isOfflineBannerVisible = false
            }
        } catch {
            self.errorMessage = error.localizedDescription

            // Keep the old data displayed and accessible, but show the top banner
            withAnimation(.snappy) {
                self.isOfflineBannerVisible = true
            }
        }
    }

    func prepareRename(_ session: SessionSummary) {
        renamingSession = session
        renameText = session.title
        isRenamingPresented = true
    }

    func cancelRename() {
        renamingSession = nil
        isRenamingPresented = false
    }

    func saveRename() {
        guard let session = renamingSession else { return }
        let title = renameText.trimmingCharacters(in: .whitespaces)
        renamingSession = nil
        isRenamingPresented = false
        guard !title.isEmpty else { return }

        Task {
            do {
                _ = try await APIClient.renameSession(id: session.id, title: title)
                await refresh()
            } catch {
                errorMessage = error.localizedDescription
            }
        }
    }

    func deleteSession(_ session: SessionSummary) {
        Task {
            do {
                try await APIClient.deleteSession(id: session.id)
                sessions.removeAll { $0.id == session.id }
                cache.deleteSession(id: session.id)
            } catch {
                errorMessage = error.localizedDescription
            }
        }
    }
}
