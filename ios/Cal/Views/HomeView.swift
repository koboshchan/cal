import SwiftUI
import ClerkKitUI

struct HomeView: View {
    @State private var me: Me?
    @State private var sessions: [SessionSummary] = []
    @State private var errorMessage: String?
    @State private var showingNewSession = false
    @State private var showingSettings = false
    @State private var renamingSession: SessionSummary?
    @State private var renameText = ""

    var body: some View {
        NavigationStack {
            List {
                if let errorMessage {
                    Text(errorMessage).foregroundStyle(.red)
                }
                if sessions.isEmpty && errorMessage == nil {
                    ContentUnavailableView(
                        "No schedules yet",
                        systemImage: "calendar.badge.plus",
                        description: Text("Add a schedule by pressing the + button above")
                    )
                    .listRowSeparator(.hidden)
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
                    .swipeActions(edge: .trailing) {
                        Button(role: .destructive) { deleteSession(session) } label: {
                            Label("Delete", systemImage: "trash")
                        }
                        Button {
                            renameText = session.title
                            renamingSession = session
                        } label: {
                            Label("Edit", systemImage: "pencil")
                        }
                        .tint(.orange)
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
            .alert("Rename schedule", isPresented: renamingSessionBinding, actions: {
                TextField("Title", text: $renameText)
                Button("Cancel", role: .cancel) { renamingSession = nil }
                Button("Save") { renameSession() }
            })
            .task { await reloadAsync() }
            .refreshable { await reloadAsync() }
        }
    }

    private var renamingSessionBinding: Binding<Bool> {
        Binding(get: { renamingSession != nil }, set: { if !$0 { renamingSession = nil } })
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

    private func renameSession() {
        guard let session = renamingSession else { return }
        let title = renameText.trimmingCharacters(in: .whitespaces)
        renamingSession = nil
        guard !title.isEmpty else { return }
        Task {
            do {
                _ = try await APIClient.renameSession(id: session.id, title: title)
                await reloadAsync()
            } catch {
                errorMessage = error.localizedDescription
            }
        }
    }

    private func deleteSession(_ session: SessionSummary) {
        Task {
            do {
                try await APIClient.deleteSession(id: session.id)
                sessions.removeAll { $0.id == session.id }
            } catch {
                errorMessage = error.localizedDescription
            }
        }
    }
}
