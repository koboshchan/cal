import XCTest
@testable import Cal

final class CalTests: XCTestCase {
    func testStatusLabels() {
        XCTAssertEqual(ScheduleStatus.title(for: "done"), "Ready")
        XCTAssertEqual(ScheduleStatus.title(for: "awaiting_input"), "Needs your input")
        XCTAssertEqual(ScheduleStatus.title(for: "error"), "Needs attention")
    }
    func testUnknownStatusRemainsReadable() {
        XCTAssertEqual(ScheduleStatus.title(for: "queued_for_review"), "Queued For Review")
        XCTAssertEqual(ScheduleStatus.symbol(for: "future_status"), "calendar")
    }
    func testEventDatesAndRecurrence() {
        let event = NormalizedEvent(title: "Study", start: "2026-10-15T07:00:00Z", end: "2026-10-15T08:00:00Z", rrule: "FREQ=WEEKLY;BYDAY=MO,WE")
        XCTAssertNotNil(event.startDate)
        XCTAssertNotNil(event.endDate)
        XCTAssertNotNil(event.formattedRRule)
    }
    func testLegacyAlarmDecoding() throws {
        let json = #"{"title":"Study","start":"2026-10-15T07:00:00Z","end":"2026-10-15T08:00:00Z","alarms":["1 hour"]}"#.data(using: .utf8)!
        let event = try JSONDecoder().decode(NormalizedEvent.self, from: json)
        XCTAssertEqual(event.alarms, [3600])
    }
    func testEventRoundTripPreservesPreferences() throws {
        let event = NormalizedEvent(title: "Study", start: "2026-10-15T07:00:00Z", end: "2026-10-15T08:00:00Z", allDay: true, location: "Library", description: "Read", rrule: "FREQ=DAILY", alarms: [300, 900])
        let decoded = try JSONDecoder().decode(NormalizedEvent.self, from: JSONEncoder().encode(event))
        XCTAssertEqual(decoded.alarms, event.alarms)
        XCTAssertEqual(decoded.rrule, event.rrule)
        XCTAssertEqual(decoded.allDay, true)
    }
    @MainActor
    func testICSExport() throws {
        let event = NormalizedEvent(title: "Study", start: "2026-10-15T07:00:00Z", end: "2026-10-15T08:00:00Z", alarms: [900])
        let url = try XCTUnwrap(ICSGenerator.generateTempFile(events: [event], title: "Study"))
        let contents = try String(contentsOf: url, encoding: .utf8)
        XCTAssertTrue(contents.contains("BEGIN:VCALENDAR"))
        XCTAssertTrue(contents.contains("Study"))
        try? FileManager.default.removeItem(at: url)
    }
    func testRecurrenceWeeklyDays() {
        XCTAssertEqual(RRuleFormat.describe("FREQ=WEEKLY;BYDAY=MO,WE"), "Weekly on Monday, Wednesday")
    }
    func testRecurrenceIntervalAndCount() {
        XCTAssertEqual(RRuleFormat.describe("FREQ=DAILY;INTERVAL=2;COUNT=3"), "Every 2 days, 3 times")
    }
    func testRecurrenceOrdinal() {
        XCTAssertEqual(RRuleFormat.describe("FREQ=MONTHLY;BYDAY=-1FR"), "Monthly on the last Friday")
    }
    func testUnknownRecurrencePreservesRawValue() {
        XCTAssertEqual(RRuleFormat.describe("FREQ=HOURLY;INTERVAL=2"), "FREQ=HOURLY;INTERVAL=2")
    }
    func testInvalidEventDatesAreSafe() {
        let event = NormalizedEvent(title: "Bad date", start: "invalid", end: "")
        XCTAssertNil(event.startDate)
        XCTAssertNil(event.endDate)
        XCTAssertNil(event.formattedRRule)
    }
    func testOlderSessionWithoutOptionalFields() throws {
        let json = #"{"id":"old","status":"done","title":"Legacy","userPrompt":"Study"}"#.data(using: .utf8)!
        let session = try JSONDecoder().decode(SessionDetail.self, from: json)
        XCTAssertNil(session.description)
        XCTAssertNil(session.pendingQuestions)
        XCTAssertNil(session.resultEvents)
    }
    func testEmptyQuestionBatchDecodes() throws {
        let json = #"{"id":"empty","status":"awaiting_input","title":"Empty","userPrompt":"Study","pendingQuestions":[]}"#.data(using: .utf8)!
        XCTAssertEqual(try JSONDecoder().decode(SessionDetail.self, from: json).pendingQuestions?.count, 0)
    }
    func testAdminRole() {
        XCTAssertTrue(Me(id: "1", email: "test@example.org", role: "admin").isAdmin)
        XCTAssertFalse(Me(id: "2", email: "test@example.org", role: "user").isAdmin)
    }
    @MainActor
    func testICSAlarmsAndRecurrence() {
        let event = NormalizedEvent(title: "Study", start: "2026-10-15T07:00:00Z", end: "2026-10-15T08:00:00Z", rrule: "RRULE:FREQ=WEEKLY;BYDAY=MO", alarms: [900, 3600, 86400, 0])
        let text = ICSGenerator.generate(event: event)
        XCTAssertTrue(text.contains("RRULE:FREQ=WEEKLY;BYDAY=MO"))
        XCTAssertTrue(text.contains("TRIGGER:-PT15M"))
        XCTAssertTrue(text.contains("TRIGGER:-PT1H"))
        XCTAssertTrue(text.contains("TRIGGER:-P1D"))
        XCTAssertFalse(text.contains("TRIGGER:-PT0"))
    }
    @MainActor
    func testICSAllDayAndTextEscaping() {
        let event = NormalizedEvent(title: "Read, write; study", start: "2026-10-15T00:00:00Z", end: "2026-10-16T00:00:00Z", allDay: true, description: "Line one\nLine two")
        let text = ICSGenerator.generate(event: event)
        XCTAssertTrue(text.contains("DTSTART;VALUE=DATE:20261015"))
        XCTAssertTrue(text.contains("DTEND;VALUE=DATE:20261016"))
        XCTAssertTrue(text.contains("SUMMARY:Read\\, write\\; study"))
        XCTAssertTrue(text.contains("DESCRIPTION:Line one\\nLine two"))
    }

}
