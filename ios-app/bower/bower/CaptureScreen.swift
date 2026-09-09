import SwiftUI
import PhotosUI

/// Home. Empty, it is one big place to tap. With photos in, the blank space
/// becomes the next shot: a checklist of the angles not yet covered, each a
/// suggestion rather than a slot — the user may ignore every one and upload
/// whatever they have. Owns its nav, its scroll and its pinned footer.
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

    private var empty: Bool { state.photos.isEmpty }
    private var covered: [SuggestedShot] { SuggestedShot.allCases.filter { shot in state.photos.contains { $0.shot == shot } } }
    private var missing: [SuggestedShot] { SuggestedShot.allCases.filter { shot in !state.photos.contains { $0.shot == shot } } }

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
        .fullScreenCover(isPresented: $showCamera) {
            CameraPicker(
                onCapture: { image in
                    showCamera = false
                    add([image], shot: pendingShot)
                    pendingShot = nil
                },
                onCancel: { showCamera = false; pendingShot = nil }
            )
            .ignoresSafeArea()
        }
        .photosPicker(isPresented: $showLibrary, selection: $libraryItems, maxSelectionCount: 20, matching: .images)
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
            HStack(spacing: 9) {
                Arch(size: 30)
                HStack(spacing: 0) {
                    Text("bower").foregroundStyle(theme.text)
                    Text(".").foregroundStyle(theme.coral)
                }
                .font(BowerFont.serif(36))
            }
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
                Text("Photograph the piece")
                    .font(BowerFont.serif(32))
                    .foregroundStyle(theme.text)
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
            checklist
            if importing { preparing }
        }
        .padding(.horizontal, 22)
        .padding(.bottom, 16)
    }

    /// The gap becomes the next shot. Six thin bars, one per angle, and the
    /// first three angles not yet covered as rows to tap.
    private var checklist: some View {
        VStack(alignment: .leading, spacing: 0) {
            HStack {
                Kicker("\(covered.count) of \(SuggestedShot.allCases.count) angles in")
                Spacer()
                Button("Tips") { showTips = true }
                    .buttonStyle(.plain)
                    .font(BowerFont.ui(12, weight: .semibold))
                    .foregroundStyle(theme.satin)
            }

            HStack(spacing: 3) {
                ForEach(SuggestedShot.allCases) { shot in
                    Capsule()
                        .fill(covered.contains(shot) ? theme.moss : theme.line)
                        .frame(height: 3)
                }
            }
            .padding(.top, 10)
            .padding(.bottom, 8)
            .animation(.easeOut(duration: 0.25), value: covered)

            if missing.isEmpty {
                HStack(spacing: 9) {
                    Image(systemName: "checkmark").font(.system(size: 11, weight: .bold)).foregroundStyle(theme.moss)
                    Text("Every angle in. That's as sharp as it gets.").font(BowerFont.ui(13.5)).foregroundStyle(theme.text)
                }
                .padding(.vertical, 10)
                .overlay(alignment: .top) { Hairline() }
            } else {
                ForEach(missing.prefix(3)) { shot in
                    Button {
                        pendingShot = shot
                        showSheet = true
                    } label: {
                        HStack(spacing: 12) {
                            Image(systemName: shot.symbol)
                                .font(.system(size: 14))
                                .foregroundStyle(theme.satin)
                                .frame(width: 34, height: 34)
                                .background(theme.subtle)
                                .clipShape(RoundedRectangle(cornerRadius: 10))
                            VStack(alignment: .leading, spacing: 1) {
                                Text(shot.label).font(BowerFont.ui(14.5, weight: .semibold)).foregroundStyle(theme.text)
                                Text(shot.hint).font(BowerFont.ui(12)).foregroundStyle(theme.muted)
                            }
                            Spacer(minLength: 0)
                            Image(systemName: "plus").font(.system(size: 15, weight: .medium)).foregroundStyle(theme.satin)
                        }
                        .padding(.vertical, 11)
                        .contentShape(Rectangle())
                        .overlay(alignment: .top) { Hairline() }
                    }
                    .buttonStyle(.plain)
                }
            }
        }
        .padding(.vertical, 14)
        .padding(.horizontal, 15)
        .background(theme.card)
        .clipShape(RoundedRectangle(cornerRadius: 16))
        .overlay(RoundedRectangle(cornerRadius: 16).stroke(theme.line, lineWidth: 0.5))
    }

    /// Pinned above the tab bar once there is something to price.
    private var footer: some View {
        VStack(spacing: 9) {
            BowerButton(title: "Price it · \(state.photos.count) photo\(state.photos.count == 1 ? "" : "s")") { state.screen = .analysing }
            HStack(spacing: 9) {
                BowerButton(title: "Upload more", kind: .secondary) { showLibrary = true }
                Button("Clear") { state.photos = [] }
                    .buttonStyle(.plain)
                    .font(BowerFont.ui(12.5, weight: .medium))
                    .foregroundStyle(theme.muted)
                    .padding(.horizontal, 8)
            }
        }
        .padding(.horizontal, 22)
        .padding(.top, 12)
        .padding(.bottom, 10)
        .background(theme.chrome)
        .overlay(alignment: .top) { Hairline() }
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

    private func add(_ images: [UIImage], shot: SuggestedShot?) {
        var batch: [CapturedPhoto] = []
        for image in images { if let p = PhotoPrep.prepare(image) { batch.append(p) } }
        guard !batch.isEmpty else { return }
        if let shot, !batch.isEmpty { batch[0].shot = shot }
        state.photos.append(contentsOf: batch)
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
        add(images, shot: pendingShot)
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
        case .detail: "magnifyingglass.circle"
        case .flaw:   "exclamationmark.triangle"
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
