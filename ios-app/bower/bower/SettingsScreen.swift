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
    @State private var feedback = false

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
                    Text("Keep at least one. Nothing to price against otherwise.")
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
                Text("Written in this voice first. Switch any time.")
                    .font(BowerFont.ui(11.5)).foregroundStyle(theme.muted).padding(.leading, 4)
            }

            section("Added to every listing") { sellerNotesCard }

            section("What's left") { allowanceCard }

            section("Feedback") {
                Button { feedback = true } label: {
                    HStack(spacing: 12) {
                        Image(systemName: "bubble.left").font(.system(size: 15)).foregroundStyle(theme.satin)
                        VStack(alignment: .leading, spacing: 1) {
                            Text("Tell bower what's wrong").font(BowerFont.ui(14.5, weight: .medium)).foregroundStyle(theme.text)
                            Text("A price, some wording, anything.").font(BowerFont.ui(11.5)).foregroundStyle(theme.muted)
                        }
                        Spacer()
                        Image(systemName: "chevron.right").font(.system(size: 12, weight: .semibold)).foregroundStyle(theme.muted)
                    }
                    .padding(.vertical, 12).padding(.horizontal, 16)
                    .background(theme.card)
                    .clipShape(RoundedRectangle(cornerRadius: 14))
                    .overlay(RoundedRectangle(cornerRadius: 14).stroke(theme.line, lineWidth: 0.5))
                    .contentShape(RoundedRectangle(cornerRadius: 14))
                }
                .buttonStyle(.plain)
            }

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

            Text("Photos are read and discarded. Bower keeps no images. It does keep a text history of your items and their prices, cleared when you delete your account.")
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
        .task {
            await state.loadProfile()
            #if DEBUG
            await Notifications.dumpPending()
            #endif
        }
        .sheet(isPresented: $feedback) {
            FeedbackSheet(screen: "profile")
                .environment(\.bower, theme)
                .presentationDetents([.medium])
                .presentationDragIndicator(.visible)
                .presentationBackground(theme.bg)
        }
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

    /// Off by default, because the model cannot see any of these in a photo.
    /// Each switch adds one agreed line to the end of every listing, and the
    /// preview shows exactly that line so the effect is never a mystery.
    private var sellerNotesCard: some View {
        VStack(alignment: .leading, spacing: 8) {
            BowerGroup {
                ForEach(Array(SellerNote.allCases.enumerated()), id: \.element) { i, note in
                    if i > 0 { Hairline() }
                    HStack {
                        Text(note.label).font(BowerFont.ui(14.5)).foregroundStyle(theme.text)
                        Spacer()
                        BowerToggle(isOn: Binding(
                            get: { state.sellerNotes.contains(note) },
                            set: { _ in Task { await state.toggleSellerNote(note) } }
                        ))
                    }
                    .padding(.vertical, 10).padding(.horizontal, 16)
                }
            }
            sellerNotesPreview
        }
    }

    /// A listing's last lines, with the added line in the seller's own voice.
    private var sellerNotesPreview: some View {
        let line = SellerNote.previewLine(state.sellerNotes)
        return VStack(alignment: .leading, spacing: 6) {
            Kicker("How it ends")
            VStack(alignment: .leading, spacing: 3) {
                Text("Good condition, light wear at the cuffs.")
                    .font(BowerFont.ui(13)).foregroundStyle(theme.muted)
                if line.isEmpty {
                    Text("Nothing about you. Only what the photos show.")
                        .font(BowerFont.ui(13)).foregroundStyle(theme.muted).italic()
                } else {
                    Text(line).font(BowerFont.ui(13, weight: .semibold)).foregroundStyle(theme.text)
                }
            }
            .padding(.vertical, 12).padding(.horizontal, 14)
            .frame(maxWidth: .infinity, alignment: .leading)
            .background(theme.subtle)
            .clipShape(RoundedRectangle(cornerRadius: 12))
            .animation(.easeOut(duration: 0.18), value: line)
        }
        .padding(.top, 4)
    }

    /// Two meters in one card. A generation and a deep research are different
    /// things at very different costs, so they are counted apart.
    private var allowanceCard: some View {
        BowerCard(padding: 16) {
            VStack(alignment: .leading, spacing: 0) {
                meterRow("Generations", state.reads)
                Hairline().padding(.vertical, 12)
                meterRow("Market checks", state.searches)
                Text("A generation reads your photos and writes the listing. A market check searches live listings for the price. Both reset on the 1st.")
                    .font(BowerFont.ui(11.5)).foregroundStyle(theme.muted)
                    .padding(.top, 12)
            }
        }
    }

    private func meterRow(_ label: String, _ m: AllowanceState) -> some View {
        let pct = m.limit.map { $0 > 0 ? Double(m.used) / Double($0) : 0 } ?? 0
        return VStack(alignment: .leading, spacing: 0) {
            HStack(alignment: .firstTextBaseline) {
                Kicker(label)
                Spacer()
                if let limit = m.limit, let remaining = m.remaining {
                    HStack(alignment: .firstTextBaseline, spacing: 5) {
                        Text("\(remaining)").font(BowerFont.serif(26)).foregroundStyle(theme.text)
                        Text("of \(limit) left").font(BowerFont.serif(15)).foregroundStyle(theme.muted)
                    }
                } else {
                    HStack(alignment: .firstTextBaseline, spacing: 5) {
                        Text("No limit").font(BowerFont.serif(26)).foregroundStyle(theme.text)
                        Text("\(m.used) used").font(BowerFont.serif(15)).foregroundStyle(theme.muted)
                    }
                }
            }
            if m.limit != nil {
                GeometryReader { geo in
                    ZStack(alignment: .leading) {
                        Capsule().fill(theme.subtle)
                        Capsule().fill(pct > 0.8 ? theme.coral : theme.satin).frame(width: geo.size.width * pct)
                    }
                }
                .frame(height: 6)
                .padding(.top, 8)
                .animation(.easeOut(duration: 0.5), value: pct)
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
