# Interactive Globe

A minimal React application demonstrating a 3D interactive CesiumJS globe with drag-and-drop area selection.

## Technologies & Services

- **3D globe** – [Cesium](https://cesium.com/)
- **Satellite imagery** – Cesium Ion (default imagery provider)
- **Styling** – Emotion CSS
- **Framework** – Next.js with React 19
- **Language** – TypeScript

## Features

- 3D interactive globe with satellite imagery
- Drag to select rectangular areas on the globe
- Real-time display of selected coordinates
- Smooth navigation and camera controls
- Responsive design

## Setup

1. Install dependencies:
   ```bash
   cd apps/globe
   npm install
   # or
   bun install
   ```

2. Run the development server:
   ```bash
   npm run dev
   # or
   bun dev
   ```

3. Open [http://localhost:3001](http://localhost:3001) in your browser

## Usage

- **Navigate**: Click and drag to rotate the globe
- **Zoom**: Scroll to zoom in/out
- **Select Area**: Click and drag to select a rectangular area on the globe
- **Clear Selection**: Click the "Clear Selection" button in the info box

## Cesium Ion Access Token

The application uses a default Cesium Ion access token for demonstration purposes. For production use, you should:

1. Create a free account at [https://ion.cesium.com/](https://ion.cesium.com/)
2. Generate your own access token
3. Replace the token in [src/components/Globe.tsx:8](src/components/Globe.tsx#L8)

## MapTiler Integration (Optional)

To use MapTiler satellite imagery instead of Cesium Ion:

1. Sign up for a free MapTiler account at [https://maptiler.com/](https://maptiler.com/)
2. Get your API key
3. Update the `imageryProvider` in the Cesium Viewer configuration in [Globe.tsx](src/components/Globe.tsx)

```typescript
imageryProvider: new Cesium.UrlTemplateImageryProvider({
  url: 'https://api.maptiler.com/tiles/satellite/{z}/{x}/{y}.jpg?key=YOUR_API_KEY',
  maximumLevel: 19,
})
```

## Project Structure

```
apps/globe/
├── src/
│   ├── app/
│   │   ├── layout.tsx      # Root layout
│   │   └── page.tsx        # Main page
│   └── components/
│       └── Globe.tsx       # Globe component with Cesium
├── package.json
├── tsconfig.json
├── next.config.ts
└── README.md
```

## License

Private
