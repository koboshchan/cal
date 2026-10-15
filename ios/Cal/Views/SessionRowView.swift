import SwiftUI

/// Extracted row view representing a single schedule session summary.
/// Follows SwiftUI Pro recommendation of isolating subviews into dedicated files.
struct SessionRowView: View {
    let session: SessionSummary
    let onRename: () -> Void
    let onDelete: () -> Void

    var body: some View {
        NavigationLink(value: session.id) {
            HStack(alignment: .top, spacing: 16) {
                Image(systemName: "calendar")
                    .font(.title2)
                    .foregroundStyle(.tint)
                    .padding(12)
                    .background(.tint.opacity(0.1), in: RoundedRectangle(cornerRadius: 14))
                    .accessibilityHidden(true)
                VStack(alignment: .leading, spacing: 8) {
                    Text(session.title)
                        .font(.headline)
                        .foregroundStyle(.primary)
                        .fixedSize(horizontal: false, vertical: true)
                    Label(ScheduleStatus.title(for: session.status), systemImage: ScheduleStatus.symbol(for: session.status))
                        .font(.subheadline)
                        .foregroundStyle(ScheduleStatus.color(for: session.status))
                }
            }
            .padding(.vertical, 10)
            .accessibilityElement(children: .combine)
        }
        .contextMenu {
            Button(action: onRename) {
                Label("Rename", systemImage: "pencil")
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
                Label("Rename", systemImage: "pencil")
            }
            .tint(.orange)
        }
    }
}
