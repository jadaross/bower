import Foundation
import UserNotifications
import UIKit

/// Local notifications only. There is no push server and none is needed for
/// these three: a deep research finishing while the app is in the background,
/// the meters resetting on the 1st, and one nudge after a week of silence.
///
/// Permission is asked the first time it would matter, when a deep research
/// starts, because "we'll tell you when it's done" is a fair reason to ask and
/// a launch-time prompt is not.
enum Notifications {
    private static let center = UNUserNotificationCenter.current()
    private static let resetId = "bower.reset"
    private static let nudgeId = "bower.nudge"

    /// Asks once. Later calls are no-ops; a refusal is respected silently.
    static func requestIfNeeded() async {
        let settings = await center.notificationSettings()
        #if DEBUG
        print("[bower notifications] authorization=\(settings.authorizationStatus.rawValue)")
        #endif
        guard settings.authorizationStatus == .notDetermined else { return }
        _ = try? await center.requestAuthorization(options: [.alert, .sound])
    }

    /// The deep research came back while the app was not on screen.
    @MainActor
    static func priceIsIn(_ body: String) {
        let state = UIApplication.shared.applicationState
        #if DEBUG
        print("[bower notifications] priceIsIn state=\(state.rawValue)")
        #endif
        guard state != .active else { return }
        let content = UNMutableNotificationContent()
        content.title = "Your price is in"
        content.body = body
        content.sound = .default
        center.add(UNNotificationRequest(identifier: "bower.price.\(UUID().uuidString)", content: content, trigger: nil)) { error in
            #if DEBUG
            print("[bower notifications] priceIsIn added, error=\(error.map { "\($0)" } ?? "none")")
            #endif
        }
    }

    /// One reminder on the 1st of next month at 9am, replacing any pending
    /// one, so there is never more than one. Skipped without a limit.
    static func scheduleReset(reads: Int?, searches: Int?) {
        center.removePendingNotificationRequests(withIdentifiers: [resetId])
        guard reads != nil || searches != nil else { return }
        let content = UNMutableNotificationContent()
        content.title = "Your credits are back"
        content.body = [reads.map { "\($0) listings" }, searches.map { "\($0) market checks" }]
            .compactMap { $0 }.joined(separator: " and ") + " for the month."
        content.sound = .default
        let now = Date()
        var next = Calendar.current.dateComponents([.year, .month], from: now)
        next.month = (next.month ?? 1) + 1
        next.day = 1; next.hour = 9; next.minute = 0
        let trigger = UNCalendarNotificationTrigger(dateMatching: next, repeats: false)
        center.add(UNNotificationRequest(identifier: resetId, content: content, trigger: trigger))
    }

    /// A week after the last read, once. Every read pushes it back a week.
    static func scheduleNudge() {
        center.removePendingNotificationRequests(withIdentifiers: [nudgeId])
        let content = UNMutableNotificationContent()
        content.title = "Got something to sell?"
        content.body = "Photograph it and bower will price it."
        content.sound = .default
        let trigger = UNTimeIntervalNotificationTrigger(timeInterval: 7 * 24 * 3600, repeats: false)
        center.add(UNNotificationRequest(identifier: nudgeId, content: content, trigger: trigger))
    }

    /// Sign-out: nothing scheduled should outlive the account on this device.
    static func clearScheduled() {
        center.removePendingNotificationRequests(withIdentifiers: [resetId, nudgeId])
    }

    #if DEBUG
    /// What is queued, for looking at in the simulator's log.
    static func dumpPending() async {
        let pending = await center.pendingNotificationRequests()
        let lines = pending.map { r -> String in
            let when: String
            if let t = r.trigger as? UNCalendarNotificationTrigger, let d = t.nextTriggerDate() { when = d.formatted() }
            else if let t = r.trigger as? UNTimeIntervalNotificationTrigger, let d = t.nextTriggerDate() { when = d.formatted() }
            else { when = "now" }
            return "\(r.identifier) @ \(when): \(r.content.title) / \(r.content.body)"
        }
        print("[bower notifications] pending \(pending.count): \(lines.joined(separator: " | "))")
    }
    #endif
}
