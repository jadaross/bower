import SwiftUI

/// Deliberately thin. v1 has one thing to configure and one number to watch.
struct SettingsScreen: View {
    @Environment(AppState.self) private var state
    @Environment(\.bower) private var theme

    @State private var blocked: Platform?
    @State private var email: String?
    @State private var signingOut = false
    @State private var confirmDelete = false
    @State private var deleting = false
    @State private var deleteFailed = false

    var body: some View {
        VStack(alignment: .leading, spacing: 20) {
            section("Where you sell") {
                BowerGroup {
                    ForEach(Array(Platform.allCases.enumerated()), id: \.element) { i, p in
                        if i > 0 { Hairline() }
                        platformRow(p)
                    }
                }
                if blocked != nil {
                    Text("Keep at least one — there'd be nothing to price against.")
                        .font(BowerFont.ui(12)).foregroundStyle(theme.coral).padding(.leading, 4)
                }
            }

            section("Preferred reseller") {
                BowerGroup {
                    ForEach(Array(state.orderedEnabled.enumerated()), id: \.element) { i, p in
                        if i > 0 { Hairline() }
                        Button { Task { await state.savePreferred(p) } } label: {
                            HStack(spacing: 12) {
                                Circle().fill(p.tint).frame(width: 10, height: 10)
                                Text(p.name).font(BowerFont.ui(14.5)).foregroundStyle(theme.text)
                                Spacer()
                                if state.preferred == p {
                                    Image(systemName: "checkmark").font(.system(size: 13, weight: .bold)).foregroundStyle(theme.satin)
                                }
                            }
                            .padding(.vertical, 12).padding(.horizontal, 16)
                            .contentShape(Rectangle())
                        }
                        .buttonStyle(.plain)
                    }
                }
                Text("Every listing gets written in this one's voice first. You can still switch on the listing screen.")
                    .font(BowerFont.ui(11.5)).foregroundStyle(theme.muted).padding(.leading, 4)
            }

            section("What's left") { allowanceCard }

            section("Account") {
                BowerGroup {
                    row("Signed in with", value: "Apple")
                    Hairline()
                    row("Version", value: "\(Bundle.main.infoDictionary?["CFBundleShortVersionString"] as? String ?? "1.0") · v1")
                }
            }

            BowerButton(title: signingOut ? "Signing out…" : "Sign out", kind: .danger, disabled: signingOut) {
                signingOut = true
                Task { await state.signOut(); signingOut = false }
            }

            Text("Photos are read and discarded — bower keeps no images. It does keep a text history of your items and their prices, cleared when you delete your account.")
                .font(BowerFont.ui(11.5)).foregroundStyle(theme.muted)
                .multilineTextAlignment(.center)
                .frame(maxWidth: .infinity)

            Button { confirmDelete = true } label: {
                Text(deleting ? "Deleting…" : "Delete account")
                    .font(BowerFont.ui(12.5, weight: .medium))
                    .foregroundStyle(theme.muted)
                    .frame(maxWidth: .infinity)
                    .padding(.vertical, 8)
            }
            .buttonStyle(.plain)
            .disabled(deleting)
            if deleteFailed {
                Text("Couldn't delete the account. Check your connection and try again.")
                    .font(BowerFont.ui(11.5)).foregroundStyle(theme.coral)
                    .multilineTextAlignment(.center).frame(maxWidth: .infinity)
            }
        }
        .confirmationDialog("Delete your account?", isPresented: $confirmDelete, titleVisibility: .visible) {
            Button("Delete account", role: .destructive) {
                deleting = true
                Task {
                    do { try await state.deleteAccount() } catch { deleteFailed = true }
                    deleting = false
                }
            }
            Button("Keep it", role: .cancel) {}
        } message: {
            Text("This removes your sign-in, your remaining allowance and your whole item history. Bower keeps no photos.")
        }
        .padding(.horizontal, 22)
        .padding(.top, 4)
        .padding(.bottom, 34)
        .task { await state.loadProfile() }
    }

    private func section<Content: View>(_ title: String, @ViewBuilder content: () -> Content) -> some View {
        VStack(alignment: .leading, spacing: 8) {
            Kicker(title)
            content()
        }
    }

    private func platformRow(_ p: Platform) -> some View {
        let on = state.enabled.contains(p)
        return HStack(spacing: 12) {
            Text(String(p.name.prefix(1)))
                .font(BowerFont.ui(14, weight: .bold)).foregroundStyle(.white)
                .frame(width: 30, height: 30).background(p.tint)
                .clipShape(RoundedRectangle(cornerRadius: 8))
                .opacity(on ? 1 : 0.35)
            VStack(alignment: .leading, spacing: 1) {
                Text(p.name).font(BowerFont.ui(14.5, weight: .medium)).foregroundStyle(theme.text)
                Text(p.note).font(BowerFont.ui(11)).foregroundStyle(theme.muted)
            }
            Spacer()
            BowerToggle(
                isOn: Binding(get: { on }, set: { v in
                    if state.enable(p, v) {
                        Task { await state.savePlatforms() }
                    } else {
                        blocked = p
                        Task { try? await Task.sleep(for: .seconds(2.4)); if blocked == p { blocked = nil } }
                    }
                }),
                tint: p.tint
            )
        }
        .padding(.vertical, 12).padding(.horizontal, 16)
    }

    private var allowanceCard: some View {
        let pct = state.allowance > 0 ? Double(state.used) / Double(state.allowance) : 0
        return BowerCard(padding: 16) {
            VStack(alignment: .leading, spacing: 0) {
                HStack(alignment: .firstTextBaseline) {
                    HStack(alignment: .firstTextBaseline, spacing: 6) {
                        Text("\(state.remaining)").font(BowerFont.serif(30)).foregroundStyle(theme.text)
                        Text("of \(state.allowance) left").font(BowerFont.serif(17)).foregroundStyle(theme.muted)
                    }
                    Spacer()
                    Text("resets on the 1st").font(BowerFont.ui(11.5)).foregroundStyle(theme.muted)
                }
                GeometryReader { geo in
                    ZStack(alignment: .leading) {
                        Capsule().fill(theme.subtle)
                        Capsule().fill(pct > 0.8 ? theme.coral : theme.satin).frame(width: geo.size.width * pct)
                    }
                }
                .frame(height: 6)
                .padding(.top, 12)
                .animation(.easeOut(duration: 0.5), value: pct)
                Text("A read costs one. A real market search costs one. There's no way to buy more in this version.")
                    .font(BowerFont.ui(11.5)).foregroundStyle(theme.muted).padding(.top, 9)
            }
        }
    }

    private func row(_ label: String, value: String) -> some View {
        HStack {
            Text(label).font(BowerFont.ui(14.5)).foregroundStyle(theme.text)
            Spacer()
            Text(value).font(BowerFont.ui(13)).foregroundStyle(theme.muted)
        }
        .padding(.vertical, 12).padding(.horizontal, 16)
    }
}
