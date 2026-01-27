import QRCode from 'qrcode';

/**
 * Generate a QR code as a data URL (PNG).
 */
export async function generateQRDataUrl(text: string): Promise<string> {
	return QRCode.toDataURL(text, {
		width: 256,
		margin: 2,
		color: {
			dark: '#000000',
			light: '#ffffff'
		}
	});
}

/**
 * Generate a QR code as an SVG string.
 */
export async function generateQRSvg(text: string): Promise<string> {
	return QRCode.toString(text, {
		type: 'svg',
		width: 256,
		margin: 2
	});
}
