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
    <section className="py-12 sm:py-16 lg:py-20 bg-zinc-950 relative overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="text-center mb-8 sm:mb-10 lg:mb-12">
          <span className="px-4 py-1.5 sm:px-5 sm:py-2 bg-gradient-to-r from-violet-500 to-fuchsia-500 text-white text-xs sm:text-sm font-semibold rounded-full">
            LIVE PREVIEW
          </span>
          <h2 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold text-white mt-4 sm:mt-6 tracking-tighter px-2">
            Blushing Video Previews
          </h2>
          <p className="text-zinc-400 text-base sm:text-lg md:text-xl mt-2 sm:mt-3 px-2">
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
                className={`group flex gap-3 sm:gap-4 md:gap-5 bg-zinc-900 rounded-2xl sm:rounded-3xl p-3 sm:p-4 cursor-pointer border transition-all hover:border-violet-500 ${
                  activeVideo === video.id ? "border-violet-500 ring-1 ring-violet-500/50" : "border-zinc-800"
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
                  <h4 className="font-semibold text-white text-sm sm:text-base md:text-[17px] leading-tight line-clamp-2 group-hover:text-violet-400 transition-colors">
                    {video.title}
                  </h4>
                  <p className="text-zinc-400 text-xs sm:text-sm mt-2 sm:mt-3">{video.creator}</p>
                  <div className="flex gap-2 sm:gap-3 text-[10px] sm:text-xs text-zinc-500 mt-2 sm:mt-4">
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
              className="mt-6 sm:mt-8 w-full py-4 sm:py-5 bg-gradient-to-r from-violet-600 via-fuchsia-600 to-pink-600 text-white font-semibold rounded-2xl sm:rounded-3xl text-base sm:text-lg flex items-center justify-center gap-2 sm:gap-3 hover:brightness-110 transition-all"
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