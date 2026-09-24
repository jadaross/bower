import SwiftUI
import UIKit
import AVFoundation
import PhotosUI

enum PhotoPrep {
    /// The model does not need more than this, and a 12MP JPEG is ~4MB before
    /// base64 makes it a third bigger again. Twenty of those would blow the
    /// request. 1600px on the long edge keeps labels legible.
    static let maxEdge: CGFloat = 1600

    static func prepare(_ image: UIImage) -> CapturedPhoto? {
        let scaled = downscale(image)
        guard let data = scaled.jpegData(compressionQuality: 0.82) else { return nil }
        return CapturedPhoto(image: scaled, data: data)
    }

    private static func downscale(_ image: UIImage) -> UIImage {
        let size = image.size
        let longest = max(size.width, size.height)
        guard longest > maxEdge else { return image }
        let scale = maxEdge / longest
        let target = CGSize(width: size.width * scale, height: size.height * scale)
        let format = UIGraphicsImageRendererFormat.default()
        format.scale = 1
        return UIGraphicsImageRenderer(size: target, format: format).image { _ in
            image.draw(in: CGRect(origin: .zero, size: target))
        }
    }
}

enum CameraAccess {
    enum State { case granted, denied, undetermined }

    static var state: State {
        switch AVCaptureDevice.authorizationStatus(for: .video) {
        case .authorized: .granted
        case .denied, .restricted: .denied
        case .notDetermined: .undetermined
        @unknown default: .denied
        }
    }

    static func request() async -> Bool {
        await AVCaptureDevice.requestAccess(for: .video)
    }

    static var isAvailable: Bool {
        UIImagePickerController.isSourceTypeAvailable(.camera)
    }
}

/// SwiftUI has no camera view of its own; this wraps UIKit's.
struct CameraPicker: UIViewControllerRepresentable {
    let onCapture: (UIImage) -> Void
    let onCancel: () -> Void

    func makeUIViewController(context: Context) -> UIImagePickerController {
        let picker = UIImagePickerController()
        picker.sourceType = .camera
        picker.cameraCaptureMode = .photo
        picker.delegate = context.coordinator
        return picker
    }

    func updateUIViewController(_ uiViewController: UIImagePickerController, context: Context) {}

    func makeCoordinator() -> Coordinator { Coordinator(self) }

    final class Coordinator: NSObject, UIImagePickerControllerDelegate, UINavigationControllerDelegate {
        let parent: CameraPicker
        init(_ parent: CameraPicker) { self.parent = parent }

        func imagePickerController(_ picker: UIImagePickerController, didFinishPickingMediaWithInfo info: [UIImagePickerController.InfoKey: Any]) {
            if let image = info[.originalImage] as? UIImage { parent.onCapture(image) }
        }

        func imagePickerControllerDidCancel(_ picker: UIImagePickerController) {
            parent.onCancel()
        }
    }
}

/// A photo in the pile — real image, index badge, remove button.
struct PhotoTile: View {
    let photo: CapturedPhoto
    var index: Int?
    var onRemove: (() -> Void)?

    var body: some View {
        Color.clear
            .aspectRatio(3 / 4, contentMode: .fit)
            .overlay {
                Image(uiImage: photo.image)
                    .resizable()
                    .scaledToFill()
            }
            .clipShape(RoundedRectangle(cornerRadius: 12))
            .overlay(alignment: .topLeading) {
                if let index {
                    Text("\(index)")
                        .font(BowerFont.ui(10, weight: .bold))
                        .foregroundStyle(.white)
                        .frame(width: 18, height: 18)
                        .background(.black.opacity(0.5))
                        .clipShape(Circle())
                        .padding(6)
                }
            }
            .overlay(alignment: .topTrailing) {
                if let onRemove {
                    Button(action: onRemove) {
                        Image(systemName: "xmark")
                            .font(.system(size: 9, weight: .bold))
                            .foregroundStyle(.white)
                            .frame(width: 22, height: 22)
                            .background(.black.opacity(0.55))
                            .clipShape(Circle())
                            // 22pt to look at, 44pt to hit.
                            .padding(5)
                            .frame(width: 44, height: 44, alignment: .topTrailing)
                            .contentShape(Rectangle())
                    }
                    .buttonStyle(.bowerPress)
                    .accessibilityLabel("Remove")
                }
            }
            .overlay(alignment: .bottomLeading) {
                if let shot = photo.shot {
                    Text(shot.label)
                        .font(BowerFont.ui(10, weight: .medium))
                        .foregroundStyle(.white)
                        .padding(.horizontal, 8)
                        .padding(.vertical, 6)
                        .frame(maxWidth: .infinity, alignment: .leading)
                        .background(LinearGradient(colors: [.clear, .black.opacity(0.45)], startPoint: .top, endPoint: .bottom))
                }
            }
    }
}
