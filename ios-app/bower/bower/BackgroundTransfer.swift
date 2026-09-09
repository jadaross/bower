import Foundation
import UIKit

/// Runs a request through a background `URLSession`, so the transfer survives
/// the app being suspended — the screen locked, another app opened. iOS
/// carries the request in its own process and wakes the app when the
/// response lands. Only the valuation uses this: it is the one call that
/// takes minutes, and it is the one call that used to die the moment the
/// phone went in a pocket.
///
/// Background sessions only accept upload and download tasks, and an upload's
/// body must come from a file, so the JSON body is written out first and the
/// response collected through the delegate.
final class BackgroundTransfer: NSObject, URLSessionDataDelegate, @unchecked Sendable {
    static let shared = BackgroundTransfer()

    private static let identifier = "com.jadaross.bower.transfer"

    private lazy var session: URLSession = {
        let c = URLSessionConfiguration.background(withIdentifier: Self.identifier)
        // A valuation sends nothing until it is finished, so the request
        // timeout — time between bytes — has to cover the whole search.
        c.timeoutIntervalForRequest = 600
        c.timeoutIntervalForResource = 900
        c.isDiscretionary = false
        c.sessionSendsLaunchEvents = true
        return URLSession(configuration: c, delegate: self, delegateQueue: nil)
    }()

    private let lock = NSLock()
    private var buffers: [Int: Data] = [:]
    private var continuations: [Int: CheckedContinuation<(Data, URLResponse), any Error>] = [:]
    private var bodyFiles: [Int: URL] = [:]
    /// Handed over by the app delegate when iOS relaunches the app for this
    /// session's events; called once those events have been delivered.
    private var launchCompletion: (() -> Void)?

    /// Sends the request and waits for the whole response. Suspension of the
    /// app in between is fine; the await resumes when the app is woken.
    func perform(_ request: URLRequest) async throws -> (Data, URLResponse) {
        var req = request
        let body = req.httpBody ?? Data()
        req.httpBody = nil
        let file = FileManager.default.temporaryDirectory.appending(path: "bower-\(UUID().uuidString).json")
        try body.write(to: file)

        return try await withCheckedThrowingContinuation { cont in
            let task = session.uploadTask(with: req, fromFile: file)
            lock.lock()
            continuations[task.taskIdentifier] = cont
            buffers[task.taskIdentifier] = Data()
            bodyFiles[task.taskIdentifier] = file
            lock.unlock()
            task.resume()
        }
    }

    /// From `application(_:handleEventsForBackgroundURLSession:completionHandler:)`.
    /// Touching `session` here recreates it with the same identifier, which is
    /// what lets iOS deliver the finished task's events.
    func resume(events completion: @escaping () -> Void) {
        lock.lock(); launchCompletion = completion; lock.unlock()
        _ = session
    }

    // MARK: URLSessionDataDelegate

    func urlSession(_ session: URLSession, dataTask: URLSessionDataTask, didReceive data: Data) {
        lock.lock(); defer { lock.unlock() }
        buffers[dataTask.taskIdentifier, default: Data()].append(data)
    }

    func urlSession(_ session: URLSession, task: URLSessionTask, didCompleteWithError error: (any Error)?) {
        lock.lock()
        let cont = continuations.removeValue(forKey: task.taskIdentifier)
        let data = buffers.removeValue(forKey: task.taskIdentifier) ?? Data()
        let file = bodyFiles.removeValue(forKey: task.taskIdentifier)
        lock.unlock()
        if let file { try? FileManager.default.removeItem(at: file) }

        // No continuation means the app was killed and relaunched while the
        // transfer ran. The screen that asked is gone; the server has already
        // written the result to History, so nothing is lost.
        guard let cont else { return }
        if let error {
            cont.resume(throwing: error)
        } else if let response = task.response {
            cont.resume(returning: (data, response))
        } else {
            cont.resume(throwing: URLError(.badServerResponse))
        }
    }

    func urlSessionDidFinishEvents(forBackgroundURLSession session: URLSession) {
        lock.lock()
        let completion = launchCompletion
        launchCompletion = nil
        lock.unlock()
        if let completion { DispatchQueue.main.async(execute: completion) }
    }
}

/// The one thing the app delegate exists for: receiving the wake-up when a
/// background transfer finishes after the app was terminated.
final class BowerAppDelegate: NSObject, UIApplicationDelegate {
    func application(_ application: UIApplication,
                     handleEventsForBackgroundURLSession identifier: String,
                     completionHandler: @escaping () -> Void) {
        BackgroundTransfer.shared.resume(events: completionHandler)
    }
}
