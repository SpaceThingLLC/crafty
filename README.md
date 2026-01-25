# PriceMyCraft - Craft Cost Calculator

A web-based cost calculator for crafters to determine pricing for handmade items based on material costs and labor time.

## Features

- **Materials Library**: Create a shared library of materials with costs (e.g., beads at $0.01 each)
- **Project Management**: Create multiple projects with different material combinations
- **Labor Cost Calculation**: Set your hourly, per-minute, or per-15-minute rate
- **Currency Flexibility**: Use any currency symbol
- **Automatic Pricing**: See suggested prices based on materials + labor
- **Local Storage**: Your data is automatically saved in your browser
- **Import/Export**: Backup and restore your data as JSON files

## Usage

### Getting Started

1. **Set Your Labor Rate**: In the Settings section, enter your preferred rate and select whether it's per hour, per 15 minutes, or per minute.

2. **Add Materials**: Click "+ Add Material" to add items to your materials library. For example:
   - Beads: $0.01 per each
   - Stretchy cord: $0.50 per ft
   - Keychain ring: $0.25 per each

3. **Create Projects**: Click "+ New Project" to create a project (e.g., "Cow Keychain") and set how long it takes to make.

4. **Add Materials to Projects**: Select a project, then add materials from your library and specify quantities.

5. **See Your Price**: The app automatically calculates your suggested price based on materials and labor.

### Example

For a bead keychain that uses:
- 45 beads × $0.01 = $0.45
- 1 ft stretchy cord × $0.50 = $0.50
- 1 keychain ring × $0.25 = $0.25

Plus 15 minutes of labor at $0.33/minute = $4.95

**Suggested Price: $6.15**

## Development

### Prerequisites

- Node.js 20+
- npm

### Setup

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview
```

### Tech Stack

- [SvelteKit](https://svelte.dev/docs/kit/introduction) - Web framework
- [Svelte 5](https://svelte.dev/docs/svelte/overview) - UI framework with runes
- [Skeleton UI](https://www.skeleton.dev/) - UI component library
- [Tailwind CSS 4](https://tailwindcss.com/) - Styling
- [TypeScript](https://www.typescriptlang.org/) - Type safety

## Deployment

This project is configured to deploy to GitHub Pages automatically via GitHub Actions.

1. Enable GitHub Pages in your repository settings
2. Set the source to "GitHub Actions"
3. Push to the `main` branch

The site will be available at `https://<username>.github.io/pricemycraft/`

## Data Storage

All data is stored locally in your browser using localStorage. This means:

- Your data never leaves your device
- Data persists between browser sessions
- Use the Export feature to backup your data
- Use the Import feature to restore from a backup

## License

MIT License - see [LICENSE](LICENSE) for details.
