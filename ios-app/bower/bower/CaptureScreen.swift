import SwiftUI
import PhotosUI

/// Suggestions, never slots. The user may ignore every chip and upload
/// whatever they have — the chips only tick as coverage happens.
struct CaptureScreen: View {
    @Environment(AppState.self) private var state
    @Environment(\.bower) private var theme

    @State private var cameraState = CameraAccess.state
    @State private var showCamera = false
    @State private var pendingShot: SuggestedShot?
    @State private var showSheet = false
    @State private var libraryItems: [PhotosPickerItem] = []
    @State private var showLibrary = false
    @State private var hints = true
    @State private var importing = false

    private var empty: Bool { state.photos.isEmpty }

    var body: some View {
        Group {
            if cameraState == .denied && empty {
                denied
            } else {
                content
            }
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

    // MARK: - Content

    private var content: some View {
        VStack(alignment: .leading, spacing: 16) {
            VStack(alignment: .leading, spacing: 0) {
                Kicker(empty ? "Add as many as you like" : "\(state.photos.count) photo\(state.photos.count == 1 ? "" : "s") · add as many as you like")
                Text(empty ? "Photograph the thing" : "Anything else worth a shot?")
                    .font(BowerFont.serif(30))
                    .foregroundStyle(theme.text)
                    .padding(.top, 5)
                Text("More angles read better, but one photo is enough to start. Daylight, plain wall, tag flat.")
                    .font(BowerFont.ui(13))
                    .foregroundStyle(theme.muted)
                    .padding(.top, 6)
            }

            suggestions

            if !empty { pile }

            VStack(spacing: 9) {
                if empty {
                    BowerButton(title: "Take a photo", icon: "camera") { openCamera() }
                    BowerButton(title: "Upload from library", kind: .secondary) { showLibrary = true }
                } else {
                    BowerButton(title: "Suss it out") { state.screen = .analysing }
                    HStack(spacing: 9) {
                        BowerButton(title: "Upload more", kind: .secondary) { showLibrary = true }
                        Button("Clear") { state.photos = [] }
                            .buttonStyle(.plain)
                            .font(BowerFont.ui(12.5, weight: .medium))
                            .foregroundStyle(theme.muted)
                            .padding(.horizontal, 8)
                    }
                }
            }

            if importing {
                HStack(spacing: 8) {
                    ProgressView().tint(theme.satin)
                    Text("Preparing photos…").font(BowerFont.ui(12.5)).foregroundStyle(theme.muted)
                }
                .frame(maxWidth: .infinity)
            }
        }
        .padding(.horizontal, 22)
        .padding(.top, 2)
        .padding(.bottom, 30)
    }

    private var suggestions: some View {
        VStack(alignment: .leading, spacing: 10) {
            HStack {
                Kicker("Worth including")
                Spacer()
                Button(hints ? "Hide" : "Show") { withAnimation(.easeOut(duration: 0.2)) { hints.toggle() } }
                    .buttonStyle(.plain)
                    .font(BowerFont.ui(12, weight: .semibold))
                    .foregroundStyle(theme.satin)
            }
            if hints {
                FlowLayout(spacing: 7) {
                    ForEach(SuggestedShot.allCases) { shot in
                        let covered = state.photos.contains { $0.shot == shot }
                        Button {
                            pendingShot = shot
                            showSheet = true
                        } label: {
                            HStack(spacing: 6) {
                                if covered {
                                    Image(systemName: "checkmark").font(.system(size: 10, weight: .bold)).foregroundStyle(theme.moss)
                                } else {
                                    Image(systemName: shot.symbol).font(.system(size: 12)).foregroundStyle(theme.muted)
                                }
                                Text(shot.label).font(BowerFont.ui(12.5, weight: .medium)).foregroundStyle(theme.text)
                            }
                            .padding(.vertical, 6)
                            .padding(.leading, 8)
                            .padding(.trailing, 11)
                            .background(covered ? theme.moss.opacity(0.08) : .clear)
                            .clipShape(Capsule())
                            .overlay(Capsule().stroke(covered ? theme.moss.opacity(0.45) : theme.line, lineWidth: 0.5))
                        }
                        .buttonStyle(.plain)
                    }
                }
                Text("Suggestions only — tap one to shoot it, or ignore them and upload whatever you have.")
                    .font(BowerFont.ui(11.5))
                    .foregroundStyle(theme.muted)
            }
        }
        .padding(.vertical, 12)
        .padding(.horizontal, 13)
        .background(theme.card)
        .clipShape(RoundedRectangle(cornerRadius: 14))
        .overlay(RoundedRectangle(cornerRadius: 14).stroke(theme.line, lineWidth: 0.5))
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
                Text("Bower can't see anything without it. Photos are read and thrown away — none are ever stored.")
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
