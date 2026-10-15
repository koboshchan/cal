import SwiftUI

struct WelcomeView: View {
    let signIn: () -> Void

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 32) {
                Image(systemName: "calendar")
                    .font(.largeTitle)
                    .foregroundStyle(.tint)
                    .padding(24)
                    .background(.tint.opacity(0.1), in: RoundedRectangle(cornerRadius: 28))
                    .accessibilityHidden(true)

                VStack(alignment: .leading, spacing: 12) {
                    Text("Make time\nfor your life.")
                        .font(.largeTitle.bold())
                        .fixedSize(horizontal: false, vertical: true)
                    Text("Describe your plans. Cal turns them into a calendar that keeps up with you.")
                        .font(.title3)
                        .foregroundStyle(.secondary)
                }

                VStack(alignment: .leading, spacing: 24) {
                    Label("Start with words, a photo, or a calendar", systemImage: "text.bubble")
                    Label("Fine-tune the details together", systemImage: "slider.horizontal.3")
                    Label("Stay in sync with Apple Calendar", systemImage: "calendar.badge.checkmark")
                }
                .font(.subheadline)
                .labelStyle(.titleAndIcon)
                .padding(24)
                .frame(maxWidth: .infinity, alignment: .leading)
                .background(Color(.secondarySystemGroupedBackground), in: RoundedRectangle(cornerRadius: 24))
            }
            .padding(28)
            .frame(maxWidth: 600, alignment: .leading)
            .frame(maxWidth: .infinity)
        }
        .background(Color(.systemGroupedBackground))
        .safeAreaInset(edge: .bottom) {
            Button("Sign in", action: signIn)
                .font(.headline)
                .buttonStyle(.borderedProminent)
                .controlSize(.large)
                .frame(maxWidth: .infinity)
                .padding(24)
                .background(.bar)
        }
    }
}
