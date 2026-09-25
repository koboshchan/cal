import SwiftUI
import ClerkKitUI

struct HomeView: View {
    @State private var viewModel = HomeViewModel()
    @Environment(\.accessibilityReduceMotion) private var reduceMotion

    var body: some View {
        @Bindable var viewModel = viewModel

        NavigationStack {
            List {
                if let errorMessage = viewModel.errorMessage, !viewModel.isOfflineBannerVisible {
                    Text(errorMessage)
                        .foregroundStyle(.red)
                }

                if viewModel.sessions.isEmpty && viewModel.errorMessage == nil && !viewModel.isRefreshing {
                    ContentUnavailableView(
                        "No schedules yet",
                        systemImage: "calendar.badge.plus",
                        description: Text("Add a schedule by pressing the + button above")
                    )
                    .listRowSeparator(.hidden)
                }

                ForEach(viewModel.sessions) { session in
                    SessionRowView(
                        session: session,
                        onRename: { viewModel.prepareRename(session) },
                        onDelete: { viewModel.deleteSession(session) }
                    )
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
                    if viewModel.me?.isAdmin == true {
                        NavigationLink("Admin") {
                            AdminView()
                        }
                    }
                    Button("Settings", systemImage: "gearshape") {
                        viewModel.showingSettings = true
                    }
                    Button("New schedule", systemImage: "plus") {
                        viewModel.showingNewSession = true
                    }
                }
            }
            .safeAreaInset(edge: .top) {
                if viewModel.isOfflineBannerVisible {
                    OfflineBannerView(
                        message: "Internet is not reachable",
                        secondaryText: "Showing cached schedule data",
                        onRetry: {
                            Task { await viewModel.refresh() }
                        },
                        onDismiss: {
                            withAnimation(.snappy) {
                                viewModel.isOfflineBannerVisible = false
                            }
                        }
                    )
                    .transition(reduceMotion ? .opacity : .move(edge: .top).combined(with: .opacity))
                }
            }
            .sheet(isPresented: $viewModel.showingNewSession, onDismiss: handleNewSessionDismiss) {
                NavigationStack {
                    NewSessionView()
                }
            }
            .sheet(isPresented: $viewModel.showingSettings) {
                SettingsView()
            }
            .alert("Rename schedule", isPresented: $viewModel.isRenamingPresented) {
                TextField("Title", text: $viewModel.renameText)
                Button("Cancel", role: .cancel) {
                    viewModel.cancelRename()
                }
                Button("Save") {
                    viewModel.saveRename()
                }
            }
            .task {
                await viewModel.refresh()
            }
            .refreshable {
                await viewModel.refresh()
            }
            .onReceive(NotificationCenter.default.publisher(for: .networkDidBecomeReachable)) { _ in
                if viewModel.isOfflineBannerVisible {
                    Task {
                        await viewModel.refresh()
                    }
                }
            }
        }
    }

    private func handleNewSessionDismiss() {
        Task {
            await viewModel.refresh()
        }
    }
}
