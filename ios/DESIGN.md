# Cal for iOS

The native app uses system typography, semantic grouped surfaces, and native navigation and sheets. On current iOS, the system supplies Liquid Glass for navigation controls; content cards remain solid for legibility. Appearance follows the device setting.

The welcome screen explains the three ways into a schedule. The library emphasizes schedule titles and readable status labels. Creation separates instructions, the prompt, and attachments. Results separate state, events, sharing, and refinement. Settings keeps the live-calendar subscription action explicit.

No scheduling endpoints, authentication flows, cache format, alarm preferences, or calendar subscription scheme were replaced. Notification questions still come from the existing generation flow. Advanced RRULE editing remains available.

## Checks

Generate the project with xcodegen generate from ios/. The Cal scheme includes CalTests and CalUITests.

UI tests exercise real screens using deterministic DEBUG-only fixtures. They capture eleven screens/states in light and dark, plus six accessibility-size captures, and test creation/settings navigation. Fixtures suppress network requests only when CAL_UI_SCREEN is explicitly supplied to a Debug build. Release builds contain no fixture entry point.

Run simulator tests with normal or ad-hoc signing. Disabling signing entirely prevents Clerk from opening its Keychain storage in this simulator, so CODE_SIGNING_ALLOWED=NO is not suitable for the UI suite.

Screenshot fixtures validate presentation and navigation, not a production login or live schedule generation. Those paths retain their existing integration code and need a signed-in device for end-to-end verification.
