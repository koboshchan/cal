import Foundation
import Network
import Observation

/// Observes network reachability using Apple's Network framework.
/// Published state is marked `@MainActor` for seamless integration into SwiftUI views.
@Observable
@MainActor
final class NetworkMonitor {
    static let shared = NetworkMonitor()

    var isConnected: Bool = true
    var isExpensive: Bool = false
    var isConstrained: Bool = false

    private let monitor: NWPathMonitor
    private let queue = DispatchQueue(label: "com.cal.networkmonitor")

    init() {
        self.monitor = NWPathMonitor()
        self.monitor.pathUpdateHandler = { [weak self] path in
            Task { @MainActor [weak self] in
                guard let self else { return }
                let wasConnected = self.isConnected
                self.isConnected = (path.status == .satisfied)
                self.isExpensive = path.isExpensive
                self.isConstrained = path.isConstrained
                if !wasConnected && self.isConnected {
                    NotificationCenter.default.post(name: .networkDidBecomeReachable, object: nil)
                }
            }
        }
        self.monitor.start(queue: queue)
    }

    deinit {
        monitor.cancel()
    }
}

extension Notification.Name {
    static let networkDidBecomeReachable = Notification.Name("networkDidBecomeReachable")
}
