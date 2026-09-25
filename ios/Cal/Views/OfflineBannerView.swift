import SwiftUI

/// Banner displayed at the top of screens when a data refresh fails due to unreachable internet.
/// Communicates offline status clearly, informs the user that cached data is being displayed,
/// and provides an accessible Retry button with standard HIG tap targets (>= 44x44).
struct OfflineBannerView: View {
    var message: String = "Internet is not reachable"
    var secondaryText: String = "Showing cached schedule data"
    var onRetry: (() -> Void)? = nil
    var onDismiss: (() -> Void)? = nil

    @Environment(\.accessibilityReduceMotion) private var reduceMotion

    var body: some View {
        HStack(alignment: .center, spacing: 12) {
            Image(systemName: "wifi.slash")
                .font(.title3.weight(.semibold))
                .foregroundStyle(.orange)
                .accessibilityHidden(true)

            VStack(alignment: .leading, spacing: 2) {
                Text(message)
                    .font(.subheadline.weight(.semibold))
                    .foregroundStyle(.primary)

                Text(secondaryText)
                    .font(.caption)
                    .foregroundStyle(.secondary)
            }
            .frame(maxWidth: .infinity, alignment: .leading)

            if let onRetry {
                Button("Retry", systemImage: "arrow.clockwise") {
                    onRetry()
                }
                .labelStyle(.titleAndIcon)
                .font(.caption.weight(.semibold))
                .buttonStyle(.bordered)
                .tint(.orange)
                .frame(minHeight: 44)
            }

            if let onDismiss {
                Button("Dismiss", systemImage: "xmark") {
                    onDismiss()
                }
                .labelStyle(.iconOnly)
                .font(.caption.weight(.bold))
                .foregroundStyle(.secondary)
                .frame(minWidth: 44, minHeight: 44)
            }
        }
        .padding(.horizontal, 14)
        .padding(.vertical, 8)
        .background {
            RoundedRectangle(cornerRadius: 12, style: .continuous)
                .fill(.regularMaterial)
                .overlay {
                    RoundedRectangle(cornerRadius: 12, style: .continuous)
                        .strokeBorder(.orange.opacity(0.35), lineWidth: 1)
                }
                .shadow(color: .black.opacity(0.06), radius: 4, x: 0, y: 2)
        }
        .padding(.horizontal, 16)
        .padding(.vertical, 6)
        .accessibilityElement(children: .combine)
        .accessibilityLabel("\(message). \(secondaryText)")
    }
}

#Preview {
    VStack {
        OfflineBannerView(onRetry: {}, onDismiss: {})
        Spacer()
    }
}
