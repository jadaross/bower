import SwiftUI

/// What bower is, and why it is called that. Behind a tap on the mark.
struct AboutSheet: View {
    @Environment(\.bower) private var theme
    @Environment(\.dismiss) private var dismiss

    var body: some View {
        VStack(alignment: .leading, spacing: 0) {
            HStack {
                Spacer()
                Button("Done") { dismiss() }
                    .buttonStyle(.bowerPressText)
                    .font(BowerFont.ui(.body, weight: .semibold))
                    .foregroundStyle(theme.accentText)
            }

            VStack(spacing: 12) {
                Arch(size: 64)
                HStack(spacing: 0) {
                    Text("bower").foregroundStyle(theme.text)
                    Text(".").foregroundStyle(theme.coral)
                }
                .font(BowerFont.serif(.large))
                .wordmarkAccessibility()
            }
            .frame(maxWidth: .infinity)
            .padding(.top, 4)

            VStack(alignment: .leading, spacing: 16) {
                Text(BowerOrigin.bowerbird)
                BowerbirdDisplay(arrange: true, bower: false)
                Text(BowerOrigin.theStage)
                Text("It exists because writing the listing was the bit that stopped a wardrobe clear-out ever getting finished.")
            }
            .font(BowerFont.ui(.body))
            .foregroundStyle(theme.text)
            .lineSpacing(4)
            .fixedSize(horizontal: false, vertical: true)
            .padding(.top, 22)

            Spacer(minLength: 16)

            Text("Photos are read and thrown away. Bower keeps no images.")
                .font(BowerFont.ui(.caption))
                .foregroundStyle(theme.muted)
                .frame(maxWidth: .infinity)
        }
        .padding(.horizontal, 24)
        .padding(.top, 14)
        .padding(.bottom, 24)
        .background(theme.bg)
    }
}
