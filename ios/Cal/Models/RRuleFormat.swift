import Foundation

/// Renders an RFC 5545 RRULE (as our agent generates them) as plain
/// English, falling back to the raw string for anything unexpected.
enum RRuleFormat {
    private static let dayNames: [String: String] = [
        "MO": "Monday", "TU": "Tuesday", "WE": "Wednesday", "TH": "Thursday",
        "FR": "Friday", "SA": "Saturday", "SU": "Sunday",
    ]

    static func describe(_ rrule: String) -> String {
        var parts: [String: String] = [:]
        for kv in rrule.split(separator: ";") {
            let pair = kv.split(separator: "=", maxSplits: 1)
            if pair.count == 2 { parts[String(pair[0]).uppercased()] = String(pair[1]) }
        }

        let interval = parts["INTERVAL"].flatMap { Int($0) } ?? 1
        let freqPhrase: String
        switch parts["FREQ"] {
        case "DAILY": freqPhrase = interval > 1 ? "Every \(interval) days" : "Daily"
        case "WEEKLY": freqPhrase = interval > 1 ? "Every \(interval) weeks" : "Weekly"
        case "MONTHLY": freqPhrase = interval > 1 ? "Every \(interval) months" : "Monthly"
        case "YEARLY": freqPhrase = interval > 1 ? "Every \(interval) years" : "Yearly"
        default: return rrule
        }

        var dayPhrase = ""
        if let byDay = parts["BYDAY"] {
            let tokens = byDay.split(separator: ",").map(String.init)
            let hasOrdinal = tokens.contains { $0.first == "-" || $0.first?.isNumber == true }
            let named = tokens.map { token -> String in
                guard let match = token.range(of: #"^-?\d+"#, options: .regularExpression) else {
                    return dayNames[token] ?? token
                }
                let numStr = String(token[match])
                let dayCode = String(token[match.upperBound...])
                let dayName = dayNames[dayCode] ?? dayCode
                let num = Int(numStr) ?? 0
                if num == -1 { return "last \(dayName)" }
                if num < 0 { return "\(ordinal(-num))-to-last \(dayName)" }
                return "\(ordinal(num)) \(dayName)"
            }
            dayPhrase = hasOrdinal ? " on the \(named.joined(separator: ", "))" : " on \(named.joined(separator: ", "))"
        }

        var countPhrase = ""
        if let countStr = parts["COUNT"], let n = Int(countStr) {
            countPhrase = ", \(n) time\(n == 1 ? "" : "s")"
        }

        var untilPhrase = ""
        if let until = parts["UNTIL"], let date = parseIcsDate(until) {
            let formatter = DateFormatter()
            formatter.dateStyle = .medium
            untilPhrase = ", until \(formatter.string(from: date))"
        }

        return "\(freqPhrase)\(dayPhrase)\(countPhrase)\(untilPhrase)"
    }

    private static func ordinal(_ n: Int) -> String {
        let suffix: String
        switch (n % 10, n % 100) {
        case (1, let h) where h != 11: suffix = "st"
        case (2, let h) where h != 12: suffix = "nd"
        case (3, let h) where h != 13: suffix = "rd"
        default: suffix = "th"
        }
        return "\(n)\(suffix)"
    }

    private static func parseIcsDate(_ value: String) -> Date? {
        let formatter = DateFormatter()
        formatter.timeZone = TimeZone(identifier: "UTC")
        formatter.dateFormat = value.contains("T") ? "yyyyMMdd'T'HHmmss" : "yyyyMMdd"
        return formatter.date(from: value.hasSuffix("Z") ? String(value.dropLast()) : value)
    }
}
