# Multi-Clip Video Editor

A production-level SaaS web application for editing and exporting multi-clip videos, built with Next.js 16 and React 19. All processing happens client-side with no server storage required.

## Features

### Core Functionality
- **Video Upload**: Upload video files (MP4, MOV, AVI, WebM) or load from URL
- **Interactive Timeline**: Visual timeline with draggable clip handles for frame-accurate editing
- **Multi-Clip Sequencing**: Select, arrange, and reorder multiple clips from a single video
- **Clip Management**: Add, remove, edit, and reorder clips with real-time preview
- **FFmpeg Export**: Process and export edited videos as H.264 MP4 files
- **Quality Options**: Choose export quality (fast, medium, slow) based on your needs

### User Experience
- Real-time video preview with Plyr.js player controls
- Drag-and-drop timeline with precise start/end handles
- Toast notifications for user feedback
- Progress tracking during export operations
- Error handling with helpful recovery messages
- Responsive design for desktop and tablet viewing

### Technical Highlights
- **Client-Side Processing**: No server uploads, all video processing in browser
- **WebAssembly**: FFmpeg.wasm for efficient video encoding
- **Type-Safe**: Full TypeScript support throughout
- **State Management**: React hooks with useReducer for predictable state updates
- **Memory Efficient**: Proper cleanup of blob URLs and temporary files

## Technology Stack

- **Framework**: Next.js 16 with React 19.2
- **UI Components**: shadcn/ui with Radix UI
- **Styling**: Tailwind CSS v4.2
- **Video Player**: Plyr.js (lightweight, accessible)
- **Video Processing**: FFmpeg.wasm (client-side)
- **State Management**: React Hooks + useReducer
- **Notifications**: Sonner
- **Language**: TypeScript

## Getting Started

### Installation

1. **Clone or download the project**
   ```bash
   git clone <repository-url>
   cd video-editor
   ```

2. **Install dependencies**
   ```bash
   pnpm install
   ```

3. **Run development server**
   ```bash
   pnpm dev
   ```

4. **Open in browser**
   Navigate to `http://localhost:3000`

### Build for Production

```bash
pnpm build
pnpm start
```

## Usage Guide

### 1. Upload or Load Video
- Click on the upload area or drag-and-drop a video file
- OR enter a video URL (ensure CORS is enabled)
- Supported formats: MP4, MOV, AVI, WebM (max 500MB)

### 2. Select Clips on Timeline
- Click and drag on the timeline to select a clip range
- Use the "Add Clip at Current Time" button for convenience
- Click on a clip to select it for editing

### 3. Manage Clips
- **Edit**: Click on a clip in the sidebar to edit its start/end times
- **Reorder**: Drag clips in the sidebar to change their order
- **Delete**: Click the trash icon to remove a clip
- **Clear All**: Remove all clips with one click

### 4. Preview and Export
- Use the video player to preview your selections
- Click "Export Video" to open export settings
- Choose quality level (affects file size and processing time)
- Click "Export" and wait for processing to complete
- Video automatically downloads when ready

## Configuration

### FFmpeg Settings
- **Codec**: H.264 (broad compatibility)
- **Audio**: AAC (universal support)
- **Pixel Format**: YUV420p (standard compatibility)

### Quality Presets
- **Fast**: CRF 35, ultrafast preset (largest file, lowest quality)
- **Medium**: CRF 28, fast preset (balanced) - **Recommended**
- **Slow**: CRF 18, slow preset (smallest file, highest quality)

### Browser Requirements
- Modern browser with WebAssembly support
- 2GB+ RAM for processing large videos
- Chrome/Firefox/Safari/Edge (latest versions recommended)

## File Structure

```
/app
  /page.tsx              # Main page component
  /layout.tsx            # Root layout with metadata
  /globals.css           # Global styles and theme

/components
  /VideoEditor.tsx       # Main editor component
  /VideoUpload.tsx       # File/URL upload handler
  /VideoPlayer.tsx       # Plyr video player wrapper
  /Timeline.tsx          # Interactive timeline component
  /ClipList.tsx          # Clip management panel
  /ExportDialog.tsx      # Export settings dialog
  /ErrorBoundary.tsx     # Error handling boundary
  /LoadingSpinner.tsx    # Loading indicator
  /ui/*                  # shadcn/ui components

/hooks
  /useVideoEditorState.ts # Editor state management hook

/lib
  /types.ts              # TypeScript interfaces
  /videoUtils.ts         # Video utility functions
  /ffmpegUtils.ts        # FFmpeg processing utilities
  /utils.ts              # General utilities
```

## Performance Considerations

### Large File Handling
- Videos up to 500MB are supported
- Larger files may require more RAM and processing time
- Processing time varies by quality setting:
  - Fast: 1-2 minutes per 1GB
  - Medium: 3-5 minutes per 1GB
  - Slow: 5-10 minutes per 1GB

### Optimization Tips
1. **Choose appropriate quality** - Use "Fast" for quick exports
2. **Keep clips reasonably short** - Multiple small clips are faster than one long clip
3. **Check browser memory** - Close other tabs before processing large videos
4. **Use modern browser** - Newer versions have better WebAssembly performance

## Browser Support

| Browser | Support | Min Version |
|---------|---------|------------|
| Chrome  | ✓ Full  | 91+        |
| Firefox | ✓ Full  | 89+        |
| Safari  | ✓ Full  | 15+        |
| Edge    | ✓ Full  | 91+        |
| Opera   | ✓ Full  | 77+        |

## Limitations & Known Issues

1. **CORS**: External URLs must have CORS enabled
2. **Memory**: Large videos require significant RAM
3. **Codec Support**: Input codec affects processing time
4. **Audio**: Audio from selected clips is preserved as-is
5. **Transitions**: No built-in transitions between clips

## Troubleshooting

### Video Won't Load
- Verify file format is supported
- Check file size (max 500MB)
- For URLs, ensure CORS is enabled
- Try with a different video file

### Export Fails
- Check browser console for error messages
- Ensure enough RAM is available
- Try with "Fast" quality setting
- Check that all clips are within video duration

### Slow Performance
- Close other browser tabs
- Reduce video resolution if possible
- Use "Fast" quality setting
- Refresh the page to clear memory

### Browser Freezes
- Keep browser window in focus during export
- Use smaller clips or shorter total duration
- Enable hardware acceleration in browser settings
- Update to latest browser version

## Security & Privacy

- **No Server Storage**: All files processed locally in browser
- **No Tracking**: No analytics or user data collection
- **No Uploads**: Videos never leave your computer
- **Memory Ephemeral**: All data cleared when closing tab
- **Open Source**: Full transparency in code

## Deployment

### Vercel Deployment
```bash
# Connect GitHub repository
# Push to main branch
# Vercel auto-deploys
```

### Custom Deployment
The app is compatible with any Node.js hosting:
- AWS Amplify
- Netlify
- Heroku
- DigitalOcean
- Self-hosted servers

## Contributing

Contributions welcome! Please:
1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request

## License

MIT License - feel free to use for personal or commercial projects.

## Support

For issues, questions, or suggestions:
- Open an issue on GitHub
- Check existing documentation
- Review browser console for error messages

## Credits

Built with:
- [Next.js](https://nextjs.org/)
- [React](https://react.dev/)
- [shadcn/ui](https://ui.shadcn.com/)
- [FFmpeg.wasm](https://ffmpeg.wasm.medicine/)
- [Plyr](https://plyr.io/)
# video_editor
