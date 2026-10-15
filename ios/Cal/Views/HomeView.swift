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
                    Section {
                        Label(errorMessage, systemImage: "exclamationmark.circle")
                            .foregroundStyle(.red)
                            .fixedSize(horizontal: false, vertical: true)
                        Button("Try again") { Task { await viewModel.refresh() } }
                    }
                }

                if viewModel.sessions.isEmpty && viewModel.errorMessage == nil && !viewModel.isRefreshing {
                    ContentUnavailableView(
                        "No schedules yet",
                        systemImage: "calendar.badge.plus",
                        description: Text("Turn a few words, a photo, or an existing calendar into your next plan.")
                    )
                    .listRowSeparator(.hidden)
                    Button("Create a schedule", systemImage: "plus") {
                        viewModel.showingNewSession = true
                    }
                    .buttonStyle(.borderedProminent)
                    .controlSize(.large)
                    .frame(maxWidth: .infinity)
                    .listRowSeparator(.hidden)
                }

                if viewModel.isRefreshing && viewModel.sessions.isEmpty {
                    HStack { ProgressView(); Text("Loading your schedules…").foregroundStyle(.secondary) }
                        .frame(maxWidth: .infinity)
                }
                Section {
                ForEach(viewModel.sessions) { session in
                    SessionRowView(
                        session: session,
                        onRename: { viewModel.prepareRename(session) },
                        onDelete: { viewModel.deleteSession(session) }
                    )
                }
                } header: {
                    if !viewModel.sessions.isEmpty {
                        Text("Your schedules")
                    }
                }
            }
            .listStyle(.insetGrouped)
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
