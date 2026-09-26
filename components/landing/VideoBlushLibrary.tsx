"use client";

import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Play, Pause, Clock, ArrowRight } from "lucide-react";
import { useState, useRef, useEffect } from "react";

const largeVideos = [
  {
    id: 1,
    title: "Big Buck Bunny - Trailer",
    duration: "0:30",
    videoUrl: "http://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4",
    thumbnail: "https://picsum.photos/id/1015/800/450",
    creator: "Blender Foundation",
    views: "1.2M",
  },
  {
    id: 2,
    title: "Elephant Dream",
    duration: "0:45",
    videoUrl: "http://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4",
    thumbnail: "https://picsum.photos/id/1018/800/450",
    creator: "Blender Foundation",
    views: "892K",
  },
  {
    id: 3,
    title: "For Bigger Blazes",
    duration: "0:25",
    videoUrl: "http://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4",
    thumbnail: "https://picsum.photos/id/133/800/450",
    creator: "Google",
    views: "654K",
  },
];

export default function BlushingVideoPreview() {
  const router = useRouter();
  const [activeVideo, setActiveVideo] = useState(1);
  const [isPlaying, setIsPlaying] = useState(true);
  const videoRefs = useRef<(HTMLVideoElement | null)[]>([]);

  const currentVideo = largeVideos.find((v) => v.id === activeVideo);

  // Auto play the active video
  useEffect(() => {
    videoRefs.current.forEach((video, index) => {
      if (video) {
        if (largeVideos[index].id === activeVideo) {
          video.play().catch(() => {});
          setIsPlaying(true);
        } else {
          video.pause();
        }
      }
    });
  }, [activeVideo]);

  const togglePlay = () => {
    const activeRef = videoRefs.current[activeVideo - 1];
    if (activeRef) {
      if (isPlaying) {
        activeRef.pause();
      } else {
        activeRef.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  const handleVideoClick = (id: number) => {
    setActiveVideo(id);
  };

  return (
    <section className="relative overflow-hidden border-y border-slate-200 bg-white py-12 sm:py-16 lg:py-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="text-center mb-8 sm:mb-10 lg:mb-12">
          <span className="rounded-full bg-emerald-50 px-4 py-1.5 text-xs font-semibold text-emerald-700 ring-1 ring-emerald-200 sm:px-5 sm:py-2 sm:text-sm">
            LIVE PREVIEW
          </span>
          <h2 className="mt-4 px-2 text-3xl font-bold tracking-tighter text-slate-950 sm:mt-6 sm:text-4xl md:text-5xl lg:text-6xl">
            Blushing Video Previews
          </h2>
          <p className="mt-2 px-2 text-base text-slate-500 sm:mt-3 sm:text-lg md:text-xl">
            Real working auto-playing videos
          </p>
        </div>

        <div className="grid lg:grid-cols-2 gap-8 items-center">
          {/* Main Large Video */}
          <div className="relative group rounded-3xl overflow-hidden border border-zinc-800 shadow-2xl shadow-black/80 bg-black">
            <div className="aspect-video relative">
              {largeVideos.map((video, index) => (
                <video
                  key={video.id}
                  ref={(el) => {
                    videoRefs.current[index] = el;
                  }}
                  src={video.videoUrl}
                  poster={video.thumbnail}
                  muted
                  loop
                  playsInline
                  className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-700 ${
                    activeVideo === video.id ? "opacity-100" : "opacity-0 pointer-events-none"
                  }`}
                />
              ))}

              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />

              <div className="absolute bottom-4 sm:bottom-6 left-4 sm:left-6 right-4 sm:right-6 text-white z-10">
                <h3 className="text-lg sm:text-xl md:text-2xl font-bold">{currentVideo?.title}</h3>
                <p className="text-zinc-400 mt-1 text-xs sm:text-sm">
                  By {currentVideo?.creator} • {currentVideo?.views} views
                </p>
              </div>

              <motion.button
                whileTap={{ scale: 0.9 }}
                onClick={togglePlay}
                className="absolute bottom-4 sm:bottom-6 right-4 sm:right-6 w-12 h-12 sm:w-14 sm:h-14 bg-white/10 backdrop-blur-xl border border-white/30 rounded-xl sm:rounded-2xl flex items-center justify-center hover:bg-white/20 transition-all z-20"
              >
                {isPlaying ? <Pause className="w-5 h-5 sm:w-6 sm:h-6" /> : <Play className="w-5 h-5 sm:w-6 sm:h-6 ml-0.5" />}
              </motion.button>

              <div className="absolute top-4 sm:top-6 right-4 sm:right-6 bg-black/70 px-3 py-1 sm:px-4 sm:py-1.5 rounded-lg sm:rounded-xl text-xs sm:text-sm font-mono text-white flex items-center gap-1.5 sm:gap-2 z-20">
                <Clock className="w-3 h-3 sm:w-4 sm:h-4" />
                {currentVideo?.duration}
              </div>
            </div>
          </div>

          {/* Side List */}
          <div className="space-y-4 sm:space-y-6">
            {largeVideos.map((video, index) => (
              <motion.div
                key={video.id}
                initial={{ opacity: 0, x: 40 }}
                whileInView={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.1 }}
                onClick={() => handleVideoClick(video.id)}
                className={`group flex cursor-pointer gap-3 rounded-2xl border bg-white p-3 shadow-sm transition-all hover:border-emerald-300 hover:shadow-lg sm:gap-4 sm:rounded-3xl sm:p-4 md:gap-5 ${
                  activeVideo === video.id ? "border-emerald-500 ring-2 ring-emerald-100" : "border-slate-200"
                }`}
              >
                <div className="relative w-32 sm:w-40 md:w-48 lg:w-56 aspect-video rounded-xl sm:rounded-2xl overflow-hidden flex-shrink-0">
                  <img
                    src={video.thumbnail}
                    alt={video.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                  />
                  <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                    <Play className="w-6 h-6 sm:w-8 sm:h-8 md:w-9 md:h-9 text-white" fill="white" />
                  </div>
                </div>

                <div className="flex-1 py-1 sm:py-2 min-w-0">
                  <h4 className="line-clamp-2 text-sm font-semibold leading-tight text-slate-900 transition-colors group-hover:text-emerald-600 sm:text-base md:text-[17px]">
                    {video.title}
                  </h4>
                  <p className="mt-2 text-xs text-slate-500 sm:mt-3 sm:text-sm">{video.creator}</p>
                  <div className="mt-2 flex gap-2 text-[10px] text-slate-400 sm:mt-4 sm:gap-3 sm:text-xs">
                    <span>{video.duration}</span>
                    <span>•</span>
                    <span>{video.views} views</span>
                  </div>
                </div>
              </motion.div>
            ))}

            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => router.push("/editor")}
              className="mt-6 flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-emerald-600 to-green-600 py-4 text-base font-semibold text-white shadow-lg shadow-emerald-200 transition-all hover:brightness-105 sm:mt-8 sm:gap-3 sm:rounded-3xl sm:py-5 sm:text-lg"
            >
              Start Editing Now
              <ArrowRight className="w-4 h-4 sm:w-5 sm:h-5" />
            </motion.button>
          </div>
        </div>
      </div>
    </section>
  );
}
