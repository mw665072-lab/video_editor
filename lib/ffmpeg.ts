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
  trim?: {
    start: number;
    duration: number;
  };
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
    // Basic progress estimation from logs can be added here if needed
  });

  ff.on('progress', ({ progress }) => {
    if (options.onProgress) options.onProgress(Math.round(progress * 100));
  });

  // --- Build Filter Strings ---
  const videoFilters: string[] = [];
  
  const b = options.filters.brightness - 1;
  const c = options.filters.contrast;
  const s = options.filters.saturation;
  if (b !== 0 || c !== 1 || s !== 1) {
    videoFilters.push(`eq=brightness=${b}:contrast=${c}:saturation=${s}`);
  }

  if (options.filters.hue !== 0) {
    videoFilters.push(`hue=h=${options.filters.hue}`);
  }

  if (options.filters.blur > 0) {
    videoFilters.push(`boxblur=${Math.min(20, options.filters.blur)}`);
  }

  if (options.filters.grayscale > 0) {
    videoFilters.push(`hue=s=0`);
  } else if (options.filters.sepia > 0) {
    videoFilters.push('colorchannelmixer=.393:.769:.189:0:.349:.686:.168:0:.272:.534:.131:0');
  }
  
  if (options.filters.invert > 0) {
    videoFilters.push('negate');
  }

  const rot = ((options.transform.rotation % 360) + 360) % 360;
  if (rot === 90) {
    videoFilters.push('transpose=1');
  } else if (rot === 180) {
    videoFilters.push('transpose=2,transpose=2');
  } else if (rot === 270) {
    videoFilters.push('transpose=2');
  } else if (rot !== 0) {
    const rad = (rot * Math.PI) / 180;
    videoFilters.push(`rotate=${rad}:ow='hypot(iw,ih)':oh='hypot(iw,ih)'`);
  }

  if (options.transform.flipH) videoFilters.push('hflip');
  if (options.transform.flipV) videoFilters.push('vflip');
  
  if (options.transform.opacity < 1) {
    videoFilters.push(`format=rgba,colorchannelmixer=aa=${options.transform.opacity}`);
  }

  options.captions.forEach(cap => {
    const escapedText = cap.text.replace(/'/g, "'\\\\\\''").replace(/:/g, '\\\\\\:');
    let yPos = 'h*0.85';
    if (cap.position === 'top') yPos = 'h*0.1';
    else if (cap.position === 'center') yPos = '(h-text_h)/2';

    const drawText = `drawtext=fontfile=${fontName}:text='${escapedText}':x=(w-text_w)/2:y=${yPos}:fontsize=32:fontcolor=white:box=1:boxcolor=black@0.5:boxborderw=5:enable='between(t,${cap.start},${cap.end})'`;
    videoFilters.push(drawText);
  });

  videoFilters.push("scale='trunc(iw/2)*2:trunc(ih/2)*2'");

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
  const args: string[] = [];
  
  // Trim options (Input-side seek for speed)
  if (options.trim) {
    args.push('-ss', String(options.trim.start));
    args.push('-t', String(options.trim.duration));
  }

  args.push('-i', inputName);
  
  if (filterStr) {
    args.push('-vf', filterStr);
  }
  
  if (audioFilterStr) {
    args.push('-af', audioFilterStr);
  }

  args.push(
    '-c:v', 'libx264',
    '-preset', 'ultrafast',
    '-crf', '26',
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

  const data = await ff.readFile(outputName);
  const result = new Blob([data], { type: 'video/mp4' });

  await ff.deleteFile(inputName);
  await ff.deleteFile(outputName);
  
  return result;
}
