import SwiftUI

enum ScheduleStatus {
    static func title(for status: String) -> String {
        switch status {
        case "done": "Ready"
        case "running": "Building your schedule"
        case "awaiting_input": "Needs your input"
        case "error": "Needs attention"
        default: status.replacingOccurrences(of: "_", with: " ").capitalized
        }
    }

    static func symbol(for status: String) -> String {
        switch status {
        case "done": "checkmark.circle"
        case "running": "clock"
        case "awaiting_input": "bubble.left"
        case "error": "exclamationmark.circle"
        default: "calendar"
        }
    }

    static func color(for status: String) -> Color {
        switch status {
        case "done": .green
        case "awaiting_input": .orange
        case "error": .red
        default: .accentColor
        }
    }
}
