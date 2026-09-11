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
                    .buttonStyle(.plain)
                    .font(BowerFont.ui(14, weight: .semibold))
                    .foregroundStyle(theme.satin)
            }

            VStack(spacing: 12) {
                Arch(size: 64)
                HStack(spacing: 0) {
                    Text("bower").foregroundStyle(theme.text)
                    Text(".").foregroundStyle(theme.coral)
                }
                .font(BowerFont.serif(40))
            }
            .frame(maxWidth: .infinity)
            .padding(.top, 4)

            VStack(alignment: .leading, spacing: 12) {
                Text("The satin bowerbird is an Australian bird that collects things. Blue things, mostly: bottle tops, pegs, feathers. It arranges them in front of its bower until the arrangement is right.")
                Text("bower does that for the clothes you're selling. Photograph a piece and it gathers what matters, the brand, the size, the condition, what the same thing is going for, and arranges it into a listing for Vinted, Depop or eBay.")
                Text("It exists because writing the listing was the bit that stopped a wardrobe clear-out ever getting finished.")
            }
            .font(BowerFont.ui(14.5))
            .foregroundStyle(theme.text)
            .lineSpacing(4)
            .fixedSize(horizontal: false, vertical: true)
            .padding(.top, 22)

            Spacer(minLength: 16)

            Text("Photos are read and thrown away. bower keeps no images.")
                .font(BowerFont.ui(11.5))
                .foregroundStyle(theme.muted)
                .frame(maxWidth: .infinity)
        }
        .padding(.horizontal, 24)
        .padding(.top, 14)
        .padding(.bottom, 24)
        .background(theme.bg)
    }
}
