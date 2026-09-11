import SwiftUI
import PhotosUI

/// Home. Empty, it is one big place to tap. With photos in, the pile sits
/// above one line of advice; nothing about the advice is a slot, and the
/// user may upload whatever they have. Owns its nav, its scroll and its
/// pinned footer.
struct CaptureScreen: View {
    @Environment(AppState.self) private var state
    @Environment(\.bower) private var theme

    @State private var cameraState = CameraAccess.state
    @State private var showCamera = false
    @State private var pendingShot: SuggestedShot?
    @State private var showSheet = false
    @State private var libraryItems: [PhotosPickerItem] = []
    @State private var showLibrary = false
    @State private var importing = false
    @State private var showTips = false
    @State private var showHelp = false
    @State private var showAbout = false
    /// Set when photos were dropped for being past the limit. Cleared on the next add.
    @State private var overLimit = false
    /// Set when the on-device check turned a photo away. Cleared on the next add.
    @State private var turnedAway = false

    private var empty: Bool { state.photos.isEmpty }

    var body: some View {
        VStack(spacing: 0) {
            nav
            GeometryReader { geo in
                ScrollView {
                    Group {
                        if cameraState == .denied && empty {
                            denied
                        } else if empty {
                            emptyContent
                        } else {
                            filledContent
                        }
                    }
                    .frame(maxWidth: .infinity, minHeight: empty ? geo.size.height : 0, alignment: .top)
                }
                .scrollBounceBehavior(.basedOnSize)
            }
        }
        .safeAreaInset(edge: .bottom) { if !empty { footer } }
        .animation(.snappy(duration: 0.22), value: empty)
        .animation(.snappy(duration: 0.22), value: state.analysis == nil)
        .sheet(isPresented: $showTips) {
            TipsSheet()
                .environment(\.bower, theme)
                .presentationDetents([.fraction(0.82)])
                .presentationDragIndicator(.visible)
                .presentationBackground(theme.bg)
        }
        .sheet(isPresented: $showHelp) {
            HelpSheet()
                .environment(\.bower, theme)
                .presentationDetents([.fraction(0.78)])
                .presentationDragIndicator(.visible)
                .presentationBackground(theme.bg)
        }
        .sheet(isPresented: $showAbout) {
            AboutSheet()
                .environment(\.bower, theme)
                .presentationDetents([.fraction(0.72)])
                .presentationDragIndicator(.visible)
                .presentationBackground(theme.bg)
        }
        .fullScreenCover(isPresented: $showCamera) {
            CameraPicker(
                onCapture: { image in
                    showCamera = false
                    let shot = pendingShot
                    pendingShot = nil
                    Task { await add([image], shot: shot) }
                },
                onCancel: { showCamera = false; pendingShot = nil }
            )
            .ignoresSafeArea()
        }
        .photosPicker(isPresented: $showLibrary, selection: $libraryItems,
                      maxSelectionCount: max(1, SuggestedShot.maxPhotos - state.photos.count), matching: .images)
        .onChange(of: libraryItems) { _, items in
            guard !items.isEmpty else { return }
            Task { await importLibrary(items) }
        }
        .confirmationDialog(pendingShot?.label ?? "Add a photo", isPresented: $showSheet, titleVisibility: pendingShot == nil ? .hidden : .visible) {
            Button("Take Photo") { openCamera() }
            Button(pendingShot == nil ? "Select Multiple from Library" : "Choose from Library") { showLibrary = true }
            Button("Cancel", role: .cancel) { pendingShot = nil }
        } message: {
            if let hint = pendingShot?.hint { Text(hint) }
        }
    }

    // MARK: - Nav

    /// The mark and the wordmark on the left; Tips (what photographs well)
    /// and ? (how bower works) on the right. Home has no serif headline under
    /// it any more, so the wordmark carries the page.
    private var nav: some View {
        HStack {
            Button { showAbout = true } label: {
                HStack(spacing: 9) {
                    Arch(size: 30)
                    HStack(spacing: 0) {
                        Text("bower").foregroundStyle(theme.text)
                        Text(".").foregroundStyle(theme.coral)
                    }
                    .font(BowerFont.serif(36))
                }
            }
            .buttonStyle(.plain)
            .accessibilityLabel("About bower")
            Spacer()
            HStack(spacing: 8) {
                Button { showTips = true } label: {
                    HStack(spacing: 6) {
                        Image(systemName: "lightbulb").font(.system(size: 12, weight: .semibold))
                        Text("Tips")
                    }
                    .font(BowerFont.ui(13, weight: .semibold))
                    .foregroundStyle(theme.satin)
                    .padding(.horizontal, 14)
                    .frame(height: 34)
                    .background(theme.card)
                    .clipShape(Capsule())
                    .overlay(Capsule().stroke(theme.line, lineWidth: 0.5))
                }
                .buttonStyle(.plain)
                .accessibilityLabel("What photographs well")

                Button { showHelp = true } label: {
                    Text("?")
                        .font(BowerFont.ui(15, weight: .semibold))
                        .foregroundStyle(theme.satin)
                        .frame(width: 34, height: 34)
                        .background(theme.card)
                        .clipShape(Circle())
                        .overlay(Circle().stroke(theme.line, lineWidth: 0.5))
                }
                .buttonStyle(.plain)
                .accessibilityLabel("How bower works")
            }
        }
        .padding(.leading, 20)
        .padding(.trailing, 18)
        .padding(.top, 6)
        .padding(.bottom, 10)
    }

    // MARK: - Empty

    private var emptyContent: some View {
        VStack(spacing: 12) {
            captureZone
            BowerButton(title: "Upload from library", kind: .secondary) { showLibrary = true }
            if importing { preparing }
            if turnedAway { turnedAwayNote }
        }
        .padding(.horizontal, 22)
        .padding(.bottom, 22)
    }

    /// The empty state: a big, obvious place to tap. Opens the camera.
    private var captureZone: some View {
        Button { openCamera() } label: {
            VStack(spacing: 14) {
                Image(systemName: "camera")
                    .font(.system(size: 24, weight: .medium))
                    .foregroundStyle(.white)
                    .frame(width: 62, height: 62)
                    .background(theme.satin)
                    .clipShape(Circle())
                VStack(spacing: 5) {
                    Text("Photograph the piece")
                        .font(BowerFont.serif(32))
                        .foregroundStyle(theme.text)
                    Text("Up to 5 photos.")
                        .font(BowerFont.ui(13.5))
                        .foregroundStyle(theme.muted)
                }
            }
            .frame(maxWidth: .infinity, maxHeight: .infinity)
            .frame(minHeight: 260)
            .background(
                LinearGradient(colors: [theme.shell.opacity(0.5), theme.card.opacity(0.7)],
                               startPoint: .top, endPoint: .bottom)
            )
            .clipShape(RoundedRectangle(cornerRadius: 20))
            .overlay(
                RoundedRectangle(cornerRadius: 20)
                    .strokeBorder(theme.satin.opacity(0.27), style: StrokeStyle(lineWidth: 1.5, dash: [6, 5]))
            )
            .contentShape(RoundedRectangle(cornerRadius: 20))
        }
        .buttonStyle(.plain)
        .accessibilityLabel("Photograph the piece")
    }

    // MARK: - With photos

    private var filledContent: some View {
        VStack(alignment: .leading, spacing: 14) {
            pile
            adviceLine
            if importing { preparing }
            if turnedAway { turnedAwayNote }
            if overLimit { overLimitNote }
        }
        .padding(.horizontal, 22)
        .padding(.bottom, 16)
    }

    /// One line of advice under the pile — a caption, not a tool. It never
    /// reacts to the photos (nothing tags a photo's angle before the read),
    /// so it says its piece once and lets the pile have the room.
    private var adviceLine: some View {
        HStack(alignment: .firstTextBaseline, spacing: 6) {
            Text("Front, back, size tag, brand label. Up to 5 photos.")
                .font(BowerFont.ui(12.5)).foregroundStyle(theme.muted)
                .fixedSize(horizontal: false, vertical: true)
            Spacer(minLength: 0)
            Button("Tips") { showTips = true }
                .buttonStyle(.plain)
                .font(BowerFont.ui(12.5, weight: .semibold))
                .foregroundStyle(theme.satin)
        }
        .padding(.horizontal, 2)
    }

    /// Pinned above the tab bar once there is something to price. With a
    /// listing already written for these photos, the way back to it leads
    /// and writing again is a stated cost, never the only thing to tap.
    private var footer: some View {
        VStack(spacing: 9) {
            if state.analysis != nil {
                BowerButton(title: "View listing") { state.screen = .listing }
                HStack(spacing: 9) {
                    BowerButton(title: canSpend ? "Write it again" : "No listings left", kind: .secondary, disabled: !canSpend) { state.screen = .analysing }
                    clearButton
                }
                if let note = costNote(again: true) { costLine(note) }
            } else {
                BowerButton(title: canSpend ? "Write it · \(state.photos.count) photo\(state.photos.count == 1 ? "" : "s")" : "No listings left",
                            disabled: !canSpend) { state.screen = .analysing }
                HStack(spacing: 9) {
                    BowerButton(title: state.photos.count < SuggestedShot.maxPhotos ? "Upload more" : "Five photos in",
                                kind: .secondary, disabled: state.photos.count >= SuggestedShot.maxPhotos) { showLibrary = true }
                    clearButton
                }
                if let note = costNote(again: false) { costLine(note) }
            }
        }
        .padding(.horizontal, 22)
        .padding(.top, 12)
        .padding(.bottom, 10)
        .background(theme.chrome)
        .overlay(alignment: .top) { Hairline() }
    }

    private var canSpend: Bool { state.reads.canSpend }

    /// What Write it spends, in the words the market check already uses under
    /// its own button. Nothing on an account with no limit.
    private func costNote(again: Bool) -> String? {
        let reads = state.reads
        guard let left = reads.remaining else { return nil }
        if left == 0 {
            return ["All \(reads.limit ?? reads.used) listings are used this month.", reads.resetsText].compactMap { $0 }.joined(separator: " ")
        }
        return "\(again ? "Writing it again uses" : "Uses") 1 of your \(left) listing\(left == 1 ? "" : "s")."
    }

    private func costLine(_ text: String) -> some View {
        Text(text)
            .font(BowerFont.ui(11.5)).foregroundStyle(theme.muted)
            .multilineTextAlignment(.center)
            .frame(maxWidth: .infinity)
    }

    private var clearButton: some View {
        Button("Clear") { state.photos = [] }
            .buttonStyle(.plain)
            .font(BowerFont.ui(12.5, weight: .medium))
            .foregroundStyle(theme.muted)
            .padding(.horizontal, 8)
    }

    private var turnedAwayNote: some View {
        HStack(alignment: .top, spacing: 8) {
            Text("!")
                .font(BowerFont.ui(11, weight: .bold))
                .foregroundStyle(.white)
                .frame(width: 16, height: 16)
                .background(theme.coral)
                .clipShape(Circle())
            Text("Sorry, that was inappropriate. It wasn't added.")
                .font(BowerFont.ui(12.5)).foregroundStyle(theme.text)
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .padding(.vertical, 10)
        .padding(.horizontal, 12)
        .background(theme.coral.opacity(0.08))
        .clipShape(RoundedRectangle(cornerRadius: 10))
    }

    private var overLimitNote: some View {
        HStack(alignment: .top, spacing: 8) {
            Text("!")
                .font(BowerFont.ui(11, weight: .bold))
                .foregroundStyle(theme.ink)
                .frame(width: 16, height: 16)
                .background(theme.pollen)
                .clipShape(Circle())
            Text("Five photos is the limit. The extras weren't added.")
                .font(BowerFont.ui(12.5)).foregroundStyle(theme.text)
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .padding(.vertical, 10)
        .padding(.horizontal, 12)
        .background(theme.pollen.opacity(0.12))
        .clipShape(RoundedRectangle(cornerRadius: 10))
    }

    private var preparing: some View {
        HStack(spacing: 8) {
            ProgressView().tint(theme.satin)
            Text("Preparing photos…").font(BowerFont.ui(12.5)).foregroundStyle(theme.muted)
        }
        .frame(maxWidth: .infinity)
    }

    private var pile: some View {
        LazyVGrid(columns: Array(repeating: GridItem(.flexible(), spacing: 9), count: 3), spacing: 9) {
            ForEach(Array(state.photos.enumerated()), id: \.element.id) { i, photo in
                PhotoTile(photo: photo, index: i + 1) {
                    state.photos.removeAll { $0.id == photo.id }
                }
            }
            if state.photos.count < SuggestedShot.maxPhotos {
              Button { pendingShot = nil; showSheet = true } label: {
                Color.clear
                    .aspectRatio(3 / 4, contentMode: .fit)
                    .overlay {
                        VStack(spacing: 6) {
                            Image(systemName: "plus").font(.system(size: 18, weight: .medium)).foregroundStyle(theme.satin)
                            Text("Add").font(BowerFont.ui(11)).foregroundStyle(theme.muted)
                        }
                    }
                    .overlay(RoundedRectangle(cornerRadius: 12).strokeBorder(theme.line, style: StrokeStyle(lineWidth: 1.5, dash: [5, 4])))
              }
              .buttonStyle(.plain)
            }
        }
    }

    private var denied: some View {
        VStack(spacing: 16) {
            Image(systemName: "camera.fill")
                .font(.system(size: 26))
                .foregroundStyle(theme.muted)
                .frame(width: 62, height: 62)
                .background(theme.subtle)
                .clipShape(RoundedRectangle(cornerRadius: 18))
                .overlay(alignment: .topTrailing) {
                    Image(systemName: "slash.circle.fill").foregroundStyle(theme.coral).offset(x: 4, y: -4)
                }
            VStack(spacing: 6) {
                Text("No camera access").font(BowerFont.serif(26)).foregroundStyle(theme.text)
                Text("Bower can't see anything without it. Photos are read and thrown away, never stored.")
                    .font(BowerFont.ui(13.5))
                    .foregroundStyle(theme.muted)
                    .multilineTextAlignment(.center)
                    .frame(maxWidth: 250)
            }
            VStack(spacing: 9) {
                BowerButton(title: "Open iOS Settings") {
                    if let url = URL(string: UIApplication.openSettingsURLString) { UIApplication.shared.open(url) }
                }
                BowerButton(title: "Choose from library instead", kind: .secondary) { showLibrary = true }
            }
            .padding(.top, 4)
        }
        .padding(.horizontal, 24)
        .padding(.vertical, 60)
        .frame(maxWidth: .infinity)
    }

    // MARK: - Actions

    private func openCamera() {
        guard CameraAccess.isAvailable else {
            // Simulators have no camera; fall through to the library so the
            // flow can still be exercised.
            showLibrary = true
            return
        }
        Task {
            switch CameraAccess.state {
            case .granted:
                showCamera = true
            case .undetermined:
                let ok = await CameraAccess.request()
                cameraState = ok ? .granted : .denied
                if ok { showCamera = true }
            case .denied:
                cameraState = .denied
            }
        }
    }

    /// Runs the on-device check on each photo before it joins the pile. A
    /// flagged photo is dropped and said so, once; the rest go in as normal.
    private func add(_ images: [UIImage], shot: SuggestedShot?) async {
        turnedAway = false
        overLimit = false
        var batch: [CapturedPhoto] = []
        for image in images {
            if await SensitiveContent.isSensitive(image) { turnedAway = true; continue }
            if let p = PhotoPrep.prepare(image) { batch.append(p) }
        }
        guard !batch.isEmpty else { return }
        if let shot { batch[0].shot = shot }
        let room = max(0, SuggestedShot.maxPhotos - state.photos.count)
        if batch.count > room { overLimit = true }
        state.photos.append(contentsOf: batch.prefix(room))
    }

    private func importLibrary(_ items: [PhotosPickerItem]) async {
        importing = true
        defer { importing = false; libraryItems = [] }
        var images: [UIImage] = []
        for item in items {
            if let data = try? await item.loadTransferable(type: Data.self), let image = UIImage(data: data) {
                images.append(image)
            }
        }
        await add(images, shot: pendingShot)
        pendingShot = nil
    }
}

extension SuggestedShot {
    var symbol: String {
        switch self {
        case .front:  "tshirt"
        case .back:   "tshirt.fill"
        case .tag:    "tag"
        case .logo:   "rectangle.and.text.magnifyingglass"
        }
    }
}

/// Wraps children onto new lines. Chips need this; SwiftUI has no built-in.
struct FlowLayout: Layout {
    var spacing: CGFloat = 8

    func sizeThatFits(proposal: ProposedViewSize, subviews: Subviews, cache: inout ()) -> CGSize {
        let width = proposal.width ?? .infinity
        var x: CGFloat = 0, y: CGFloat = 0, rowHeight: CGFloat = 0
        for sub in subviews {
            let size = sub.sizeThatFits(.unspecified)
            if x + size.width > width, x > 0 { x = 0; y += rowHeight + spacing; rowHeight = 0 }
            x += size.width + spacing
            rowHeight = max(rowHeight, size.height)
        }
        return CGSize(width: width == .infinity ? x : width, height: y + rowHeight)
    }

    func placeSubviews(in bounds: CGRect, proposal: ProposedViewSize, subviews: Subviews, cache: inout ()) {
        var x = bounds.minX, y = bounds.minY, rowHeight: CGFloat = 0
        for sub in subviews {
            let size = sub.sizeThatFits(.unspecified)
            if x + size.width > bounds.maxX, x > bounds.minX { x = bounds.minX; y += rowHeight + spacing; rowHeight = 0 }
            sub.place(at: CGPoint(x: x, y: y), proposal: .unspecified)
            x += size.width + spacing
            rowHeight = max(rowHeight, size.height)
        }
    }
}
