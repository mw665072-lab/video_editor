import { FFmpeg } from '@ffmpeg/ffmpeg';
import { toBlobURL, fetchFile } from '@ffmpeg/util';

let ffmpeg: FFmpeg | null = null;

export interface ExportOptions {
  filters: {
    brightness: number;
    contrast: number;
    saturation: number;
    hue: number;
    blur: number;
    sepia: number;
    grayscale: number;
    invert: number;
  };
  transform: {
    rotation: number;
    flipH: boolean;
    flipV: boolean;
    opacity: number;
  };
  audio: {
    volume: number;
    muted: boolean;
    fadeIn: number;
    fadeOut: number;
  };
  captions: Array<{
    text: string;
    start: number;
    end: number;
    position: 'top' | 'center' | 'bottom';
  }>;
  onProgress?: (progress: number) => void;
}

export async function loadFFmpeg() {
  if (ffmpeg) return ffmpeg;

  ffmpeg = new FFmpeg();
  
  // Load version 0.12.x style
  const baseURL = 'https://unpkg.com/@ffmpeg/core@0.12.6/dist/umd';
  await ffmpeg.load({
    coreURL: await toBlobURL(`${baseURL}/ffmpeg-core.js`, 'text/javascript'),
    wasmURL: await toBlobURL(`${baseURL}/ffmpeg-core.wasm`, 'application/wasm'),
  });

  return ffmpeg;
}

export async function processLocalVideo(file: Blob, options: ExportOptions): Promise<Blob> {
  const ff = await loadFFmpeg();
  
  const inputName = 'input.mp4';
  const outputName = 'output.mp4';
  const fontName = 'font.ttf';

  // Write file to memory
  await ff.writeFile(inputName, await fetchFile(file));

  // Load a font for captions
  try {
    const fontUrl = 'https://raw.githubusercontent.com/google/fonts/main/apache/roboto/Roboto-Regular.ttf';
    await ff.writeFile(fontName, await fetchFile(fontUrl));
  } catch (err) {
    console.warn('Failed to load font for captions, using fallback', err);
  }

  // Hook progress
  ff.on('log', ({ message }) => {
    // Basic progress estimation from logs
    const timeMatch = message.match(/time=([0-9:.]+)/);
    if (timeMatch && options.onProgress) {
        // FFmpeg logs don't give a simple percentage, but we could estimate if we had the duration
        // For now, let the UI handle the step-based progress or simulate it
        console.debug('FFmpeg log:', message);
    }
  });

  ff.on('progress', ({ progress }) => {
    if (options.onProgress) options.onProgress(Math.round(progress * 100));
  });

  // --- Build Filter Strings ---
  const videoFilters: string[] = [];
  
  // 1. Colour corrections (Brightness, Contrast, Saturation)
  // FFmpeg eq filter: brightness -1 to 1 (default 0), contrast 0 to 10 (default 1), saturation 0 to 10 (default 1)
  // Our inputs: brightness 0-2 (def 1), contrast 0-2 (def 1), saturation 0-2 (def 1)
  const b = options.filters.brightness - 1;
  const c = options.filters.contrast;
  const s = options.filters.saturation;
  if (b !== 0 || c !== 1 || s !== 1) {
    videoFilters.push(`eq=brightness=${b}:contrast=${c}:saturation=${s}`);
  }

  // 2. Hue
  if (options.filters.hue !== 0) {
    videoFilters.push(`hue=h=${options.filters.hue}`);
  }

  // 3. Blur
  if (options.filters.blur > 0) {
    videoFilters.push(`boxblur=${Math.min(20, options.filters.blur)}`);
  }

  // 4. Sepia / Grayscale / Invert
  if (options.filters.grayscale > 0) {
    videoFilters.push(`hue=s=0`);
  } else if (options.filters.sepia > 0) {
    // Simple sepia approximation: grayscale then colorize
    videoFilters.push('colorchannelmixer=.393:.769:.189:0:.349:.686:.168:0:.272:.534:.131:0');
  }
  
  if (options.filters.invert > 0) {
    videoFilters.push('negate');
  }

  // 5. Transform (Rotation & Flips)
  const rot = ((options.transform.rotation % 360) + 360) % 360;
  if (rot === 90) {
    videoFilters.push('transpose=1');
  } else if (rot === 180) {
    videoFilters.push('transpose=2,transpose=2');
  } else if (rot === 270) {
    videoFilters.push('transpose=2');
  } else if (rot !== 0) {
    const rad = (rot * Math.PI) / 180;
    // For arbitrary rotation, we need to ensure the frame expands or we'll get cropping
    videoFilters.push(`rotate=${rad}:ow='hypot(iw,ih)':oh='hypot(iw,ih)'`);
  }

  if (options.transform.flipH) videoFilters.push('hflip');
  if (options.transform.flipV) videoFilters.push('vflip');
  
  // 6. Opacity
  if (options.transform.opacity < 1) {
    // Use format=rgba for standard 8-bit opacity support
    videoFilters.push(`format=rgba,colorchannelmixer=aa=${options.transform.opacity}`);
  }

  // 7. Captions (drawtext)
  options.captions.forEach(cap => {
    const escapedText = cap.text.replace(/'/g, "'\\\\\\''").replace(/:/g, '\\\\\\:');
    
    let yPos = 'h*0.85';
    if (cap.position === 'top') yPos = 'h*0.1';
    else if (cap.position === 'center') yPos = '(h-text_h)/2';

    const drawText = `drawtext=fontfile=${fontName}:text='${escapedText}':x=(w-text_w)/2:y=${yPos}:fontsize=32:fontcolor=white:box=1:boxcolor=black@0.5:boxborderw=5:enable='between(t,${cap.start},${cap.end})'`;
    videoFilters.push(drawText);
  });

  // 8. FINAL SAFETY: Ensure even dimensions for H.264 compatibility
  // This is CRITICAL. Many players fail if width/height are odd.
  videoFilters.push("scale='trunc(iw/2)*2:trunc(ih/2)*2'");

  // --- Audio Filters ---
  const audioFilters: string[] = [];
  if (options.audio.muted) {
    audioFilters.push('volume=0');
  } else {
    if (options.audio.volume !== 1) {
      audioFilters.push(`volume=${options.audio.volume}`);
    }
    if (options.audio.fadeIn > 0) {
      audioFilters.push(`afade=t=in:st=0:d=${options.audio.fadeIn}`);
    }
  }

  const filterStr = videoFilters.length > 0 ? videoFilters.join(',') : null;
  const audioFilterStr = audioFilters.length > 0 ? audioFilters.join(',') : null;

  // --- Run FFmpeg ---
  const args = ['-i', inputName];
  
  if (filterStr) {
    args.push('-vf', filterStr);
  }
  
  if (audioFilterStr) {
    args.push('-af', audioFilterStr);
  }

  args.push(
    '-c:v', 'libx264',
    '-preset', 'ultrafast',
    '-crf', '26', // Slightly better quality
    '-profile:v', 'high',
    '-level:v', '4.1',
    '-pix_fmt', 'yuv420p',
    '-c:a', 'aac',
    '-b:a', '128k',
    '-movflags', '+faststart',
    '-y',
    outputName
  );

  await ff.exec(args);

  // Read the result
  const data = await ff.readFile(outputName);
  const result = new Blob([data], { type: 'video/mp4' });

  // Cleanup
  await ff.deleteFile(inputName);
  await ff.deleteFile(outputName);
  
  return result;
}
