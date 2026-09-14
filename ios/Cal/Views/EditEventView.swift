import SwiftUI

struct EditEventView: View {
    let original: NormalizedEvent
    let onSave: (NormalizedEvent) -> Void

    @Environment(\.dismiss) private var dismiss
    @State private var title: String
    @State private var start: Date
    @State private var end: Date
    @State private var allDay: Bool
    @State private var location: String
    @State private var notes: String
    @State private var rrule: String
    @State private var saving = false

    init(original: NormalizedEvent, onSave: @escaping (NormalizedEvent) -> Void) {
        self.original = original
        self.onSave = onSave
        _title = State(initialValue: original.title)
        _start = State(initialValue: original.startDate ?? Date())
        _end = State(initialValue: original.endDate ?? Date())
        _allDay = State(initialValue: original.allDay ?? false)
        _location = State(initialValue: original.location ?? "")
        _notes = State(initialValue: original.description ?? "")
        _rrule = State(initialValue: original.rrule ?? "")
    }

    var body: some View {
        NavigationStack {
            Form {
                Section {
                    TextField("Title", text: $title)
                    Toggle("All day", isOn: $allDay)
                    DatePicker(
                        "Starts",
                        selection: $start,
                        displayedComponents: allDay ? [.date] : [.date, .hourAndMinute]
                    )
                    DatePicker(
                        "Ends",
                        selection: $end,
                        displayedComponents: allDay ? [.date] : [.date, .hourAndMinute]
                    )
                }
                Section {
                    TextField("Location (optional)", text: $location)
                    TextField("Notes (optional)", text: $notes)
                }
                Section("Repeats (advanced)") {
                    TextField("RRULE, e.g. FREQ=WEEKLY;BYDAY=MO,WE,FR", text: $rrule)
                        .textInputAutocapitalization(.never)
                        .autocorrectionDisabled()
                }
            }
            .navigationTitle("Edit event")
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Cancel") { dismiss() }
                }
                ToolbarItem(placement: .confirmationAction) {
                    Button(saving ? "Saving…" : "Save") { save() }
                        .disabled(saving || title.trimmingCharacters(in: .whitespaces).isEmpty)
                }
            }
        }
    }

    private func save() {
        saving = true
        let formatter = ISO8601DateFormatter()
        let updated = NormalizedEvent(
            title: title.trimmingCharacters(in: .whitespaces),
            start: formatter.string(from: start),
            end: formatter.string(from: end),
            allDay: allDay,
            location: location.isEmpty ? nil : location,
            description: notes.isEmpty ? nil : notes,
            rrule: rrule.isEmpty ? nil : rrule
        )
        onSave(updated)
    }
}
