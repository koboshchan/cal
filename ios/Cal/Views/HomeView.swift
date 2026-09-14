import SwiftUI
import ClerkKitUI

struct HomeView: View {
    @State private var me: Me?
    @State private var sessions: [SessionSummary] = []
    @State private var errorMessage: String?
    @State private var showingNewSession = false
    @State private var showingSettings = false

    var body: some View {
        NavigationStack {
            List {
                if let errorMessage {
                    Text(errorMessage).foregroundStyle(.red)
                }
                ForEach(sessions) { session in
                    NavigationLink(value: session.id) {
                        VStack(alignment: .leading) {
                            Text(session.title).font(.body)
                            Text(session.status.replacingOccurrences(of: "_", with: " "))
                                .font(.caption)
                                .foregroundStyle(.secondary)
                        }
                    }
                }
            }
            .navigationDestination(for: String.self) { sessionId in
                SessionDetailView(sessionId: sessionId)
            }
            .navigationTitle("Cal")
            .toolbar {
                ToolbarItem(placement: .topBarLeading) {
                    UserButton()
                }
                ToolbarItemGroup(placement: .topBarTrailing) {
                    if me?.isAdmin == true {
                        NavigationLink("Admin") { AdminView() }
                    }
                    Button {
                        showingSettings = true
                    } label: {
                        Image(systemName: "gearshape")
                    }
                    Button {
                        showingNewSession = true
                    } label: {
                        Image(systemName: "plus")
                    }
                }
            }
            .sheet(isPresented: $showingNewSession, onDismiss: reload) {
                NavigationStack { NewSessionView() }
            }
            .sheet(isPresented: $showingSettings) {
                SettingsView()
            }
            .task { await reloadAsync() }
            .refreshable { await reloadAsync() }
        }
    }

    private func reload() {
        Task { await reloadAsync() }
    }

    private func reloadAsync() async {
        do {
            async let meResult = APIClient.me()
            async let sessionsResult = APIClient.listSessions()
            me = try await meResult
            sessions = try await sessionsResult
            errorMessage = nil
        } catch {
            errorMessage = error.localizedDescription
        }
    }
}
