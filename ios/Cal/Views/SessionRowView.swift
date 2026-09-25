import SwiftUI

/// Extracted row view representing a single schedule session summary.
/// Follows SwiftUI Pro recommendation of isolating subviews into dedicated files.
struct SessionRowView: View {
    let session: SessionSummary
    let onRename: () -> Void
    let onDelete: () -> Void

    var body: some View {
        NavigationLink(value: session.id) {
            VStack(alignment: .leading, spacing: 4) {
                Text(session.title)
                    .font(.body)

                Text(session.status.replacing("_", with: " "))
                    .font(.caption)
                    .foregroundStyle(.secondary)
            }
            .padding(.vertical, 2)
        }
        .contextMenu {
            Button(action: onRename) {
                Label("Edit", systemImage: "pencil")
            }

            Button(role: .destructive, action: onDelete) {
                Label("Delete", systemImage: "trash")
            }
        }
        .swipeActions(edge: .trailing) {
            Button(role: .destructive, action: onDelete) {
                Label("Delete", systemImage: "trash")
            }

            Button(action: onRename) {
                Label("Edit", systemImage: "pencil")
            }
            .tint(.orange)
        }
    }
}
