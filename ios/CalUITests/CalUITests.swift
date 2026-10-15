import XCTest

final class CalUITests: XCTestCase {
    @MainActor
    func testScreensInBothAppearances() {
        for dark in ["0", "1"] {
            for screen in ["welcome", "home", "empty", "offline", "new", "settings", "detail", "question", "running", "edit", "admin"] {
                let app = XCUIApplication()
                app.launchEnvironment["CAL_UI_SCREEN"] = screen
                app.launchEnvironment["CAL_UI_DARK"] = dark
                app.launch()
                XCTAssertTrue(app.wait(for: .runningForeground, timeout: 10))
                let shot = XCTAttachment(screenshot: app.screenshot())
                shot.name = "\(screen)-\(dark == "1" ? "dark" : "light")"
                shot.lifetime = .keepAlways
                add(shot)
                app.terminate()
            }
        }
    }

    @MainActor
    func testCreateAndSettingsNavigation() {
        let app = XCUIApplication()
        app.launchEnvironment["CAL_UI_SCREEN"] = "home"
        app.launch()
        app.buttons["New schedule"].tap()
        XCTAssertTrue(app.navigationBars["New schedule"].waitForExistence(timeout: 3))
        XCTAssertFalse(app.buttons["Generate"].isEnabled)
        app.textFields.firstMatch.tap()
        app.textFields.firstMatch.typeText("Gym every Monday at 7am")
        XCTAssertTrue(app.buttons["Generate"].isEnabled)
        app.buttons["Cancel"].tap()
        app.buttons["Settings"].tap()
        XCTAssertTrue(app.buttons["Add to Calendar"].waitForExistence(timeout: 3))
        app.buttons["Done"].tap()
        XCTAssertTrue(app.navigationBars["Cal"].exists)
    }

    @MainActor
    func testLargeTextScreens() {
        for screen in ["welcome", "home", "new", "detail", "question", "offline"] {
            let app = XCUIApplication()
            app.launchEnvironment["CAL_UI_SCREEN"] = screen
            app.launchEnvironment["CAL_UI_LARGE"] = "1"
            app.launch()
            let shot = XCTAttachment(screenshot: app.screenshot())
            shot.name = "\(screen)-accessibility"
            shot.lifetime = .keepAlways
            add(shot)
            XCTAssertTrue(app.wait(for: .runningForeground, timeout: 5))
            app.terminate()
        }
    }
    @MainActor
    private func launch(_ screen: String) -> XCUIApplication {
        let app = XCUIApplication()
        app.launchEnvironment["CAL_UI_SCREEN"] = screen
        app.launch()
        XCTAssertTrue(app.wait(for: .runningForeground, timeout: 10))
        return app
    }

    @MainActor
    func testWelcomeHasSignIn() {
        let app = launch("welcome")
        XCTAssertTrue(app.buttons["Sign in"].waitForExistence(timeout: 5))
    }

    @MainActor
    func testEmptyLibraryExplainsCreation() {
        let app = launch("empty")
        XCTAssertTrue(app.staticTexts["No schedules yet"].waitForExistence(timeout: 5))
        XCTAssertTrue(app.buttons["New schedule"].exists)
    }

    @MainActor
    func testWhitespacePromptCannotGenerate() {
        let app = launch("new")
        let field = app.textFields.firstMatch
        XCTAssertTrue(field.waitForExistence(timeout: 5))
        field.tap()
        field.typeText("   ")
        XCTAssertFalse(app.buttons["Generate"].isEnabled)
    }

    @MainActor
    func testCompletedScheduleAllowsSharingAndRefinement() {
        let app = launch("detail")
        XCTAssertTrue(app.staticTexts["Morning training"].waitForExistence(timeout: 5))
        XCTAssertTrue(app.buttons["Share .ics"].exists)
        app.swipeUp()
        XCTAssertTrue(app.buttons["Send change"].waitForExistence(timeout: 5))
        XCTAssertFalse(app.buttons["Send change"].isEnabled)
        let field = app.textFields.firstMatch
        field.tap()
        field.typeText("Move training to 8am")
        XCTAssertTrue(app.buttons["Send change"].isEnabled)
    }

    @MainActor
    func testQuestionOffersReminderPreferences() {
        let app = launch("question")
        XCTAssertTrue(app.staticTexts["When would you like a reminder?"].waitForExistence(timeout: 5))
        XCTAssertTrue(app.buttons["15 minutes before"].exists)
        XCTAssertTrue(app.buttons["No reminder"].exists)
    }

    @MainActor
    func testRunningScheduleShowsProgress() {
        let app = launch("running")
        XCTAssertTrue(app.staticTexts["Finding the right times"].waitForExistence(timeout: 5))
        XCTAssertFalse(app.buttons["Send change"].exists)
    }

    @MainActor
    func testOfflineLibraryKeepsCachedSchedules() {
        let app = launch("offline")
        XCTAssertTrue(app.staticTexts["Internet is not reachable"].waitForExistence(timeout: 5))
        XCTAssertTrue(app.buttons["Retry"].exists)
        XCTAssertTrue(app.staticTexts["A little more routine"].exists)
    }

    @MainActor
    func testEventEditorCanCancelWithoutSaving() {
        let app = launch("edit")
        XCTAssertTrue(app.navigationBars["Edit event"].waitForExistence(timeout: 5))
        XCTAssertTrue(app.buttons["Save"].exists)
        XCTAssertTrue(app.buttons["Cancel"].exists)
        app.buttons["Cancel"].tap()
        XCTAssertFalse(app.navigationBars["Edit event"].exists)
    }

}
