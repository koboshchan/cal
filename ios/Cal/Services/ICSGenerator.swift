import Foundation

/// Generates valid iCalendar (.ics, RFC 5545) files for individual events or full schedules.
/// Enables offline-first sharing of single events without requiring server round-trips.
struct ICSGenerator: Sendable {

    /// Generates standard .ics formatted text for a single event.
    static func generate(event: NormalizedEvent) -> String {
        generate(events: [event], calendarName: event.title)
    }

    /// Generates standard .ics formatted text for a collection of events.
    static func generate(events: [NormalizedEvent], calendarName: String = "Cal") -> String {
        var lines: [String] = [
            "BEGIN:VCALENDAR",
            "VERSION:2.0",
            "PRODID:-//Cal//EN",
            "CALSCALE:GREGORIAN",
            "METHOD:PUBLISH",
            "X-WR-CALNAME:\(escapeText(calendarName))"
        ]

        let utcFormatter = DateFormatter()
        utcFormatter.dateFormat = "yyyyMMdd'T'HHmmss'Z'"
        utcFormatter.timeZone = TimeZone(secondsFromGMT: 0)
        utcFormatter.locale = Locale(identifier: "en_US_POSIX")

        let dateOnlyFormatter = DateFormatter()
        dateOnlyFormatter.dateFormat = "yyyyMMdd"
        dateOnlyFormatter.timeZone = TimeZone(secondsFromGMT: 0)
        dateOnlyFormatter.locale = Locale(identifier: "en_US_POSIX")

        let nowString = utcFormatter.string(from: Date.now)

        for event in events {
            lines.append("BEGIN:VEVENT")
            lines.append("UID:\(UUID().uuidString)")
            lines.append("DTSTAMP:\(nowString)")
            lines.append("SUMMARY:\(escapeText(event.title))")

            let startDate = parseDate(event.start)
            let endDate = parseDate(event.end) ?? startDate

            if event.allDay == true, let startDate {
                lines.append("DTSTART;VALUE=DATE:\(dateOnlyFormatter.string(from: startDate))")
                if let endDate {
                    lines.append("DTEND;VALUE=DATE:\(dateOnlyFormatter.string(from: endDate))")
                }
            } else {
                if let startDate {
                    lines.append("DTSTART:\(utcFormatter.string(from: startDate))")
                }
                if let endDate {
                    lines.append("DTEND:\(utcFormatter.string(from: endDate))")
                }
            }

            if let location = event.location?.trimmingCharacters(in: .whitespaces), !location.isEmpty {
                lines.append("LOCATION:\(escapeText(location))")
            }

            if let description = event.description?.trimmingCharacters(in: .whitespaces), !description.isEmpty {
                lines.append("DESCRIPTION:\(escapeText(description))")
            }

            if let rrule = event.rrule?.trimmingCharacters(in: .whitespaces), !rrule.isEmpty {
                let cleaned = rrule.replacing(/^RRULE:/, with: "")
                lines.append("RRULE:\(cleaned)")
            }

            if let alarms = event.alarms {
                for seconds in alarms where seconds > 0 {
                    lines.append("BEGIN:VALARM")
                    lines.append("ACTION:DISPLAY")
                    lines.append("DESCRIPTION:\(escapeText(event.title))")
                    let triggerString: String
                    if seconds % 86400 == 0 {
                        triggerString = "-P\(seconds / 86400)D"
                    } else if seconds % 3600 == 0 {
                        triggerString = "-PT\(seconds / 3600)H"
                    } else if seconds % 60 == 0 {
                        triggerString = "-PT\(seconds / 60)M"
                    } else {
                        triggerString = "-PT\(seconds)S"
                    }
                    lines.append("TRIGGER:\(triggerString)")
                    lines.append("END:VALARM")
                }
            }

            lines.append("STATUS:CONFIRMED")
            lines.append("SEQUENCE:0")
            lines.append("END:VEVENT")
        }

        lines.append("END:VCALENDAR")
        return lines.joined(separator: "\r\n") + "\r\n"
    }

    /// Creates a temporary .ics file on disk containing only this single event.
    /// Returns the file URL ready to be shared via ShareLink or UIActivityViewController.
    static func generateTempFile(for event: NormalizedEvent) -> URL? {
        generateTempFile(events: [event], title: event.title)
    }

    /// Creates a temporary .ics file on disk containing multiple events.
    static func generateTempFile(events: [NormalizedEvent], title: String) -> URL? {
        let icsContent = generate(events: events, calendarName: title)
        guard let data = icsContent.data(using: .utf8) else { return nil }

        let safeTitle = title
            .components(separatedBy: CharacterSet.alphanumerics.inverted)
            .filter { !$0.isEmpty }
            .joined(separator: "_")
        let filename = (safeTitle.isEmpty ? "event" : safeTitle) + ".ics"
        let tempURL = FileManager.default.temporaryDirectory.appending(path: filename)

        do {
            try data.write(to: tempURL, options: .atomic)
            return tempURL
        } catch {
            print("[ICSGenerator] Failed to write temporary ICS file: \(error)")
            return nil
        }
    }

    private static func parseDate(_ string: String) -> Date? {
        let withFraction = ISO8601DateFormatter()
        withFraction.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
        if let date = withFraction.date(from: string) {
            return date
        }

        let standard = ISO8601DateFormatter()
        standard.formatOptions = [.withInternetDateTime]
        return standard.date(from: string)
    }

    private static func escapeText(_ text: String) -> String {
        text.replacing("\\", with: "\\\\")
            .replacing(";", with: "\\;")
            .replacing(",", with: "\\,")
            .replacing("\n", with: "\\n")
            .replacing("\r", with: "")
    }
}
