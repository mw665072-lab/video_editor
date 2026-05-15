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
    <section className="py-20 bg-zinc-950 relative overflow-hidden">
      <div className="max-w-7xl mx-auto px-6">
        <div className="text-center mb-12">
          <span className="px-5 py-2 bg-gradient-to-r from-violet-500 to-fuchsia-500 text-white text-sm font-semibold rounded-full">
            LIVE PREVIEW
          </span>
          <h2 className="text-5xl md:text-6xl font-bold text-white mt-6 tracking-tighter">
            Blushing Video Previews
          </h2>
          <p className="text-zinc-400 text-xl mt-3">
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

              <div className="absolute bottom-6 left-6 right-6 text-white z-10">
                <h3 className="text-2xl font-bold">{currentVideo?.title}</h3>
                <p className="text-zinc-400 mt-1">
                  By {currentVideo?.creator} • {currentVideo?.views} views
                </p>
              </div>

              <motion.button
                whileTap={{ scale: 0.9 }}
                onClick={togglePlay}
                className="absolute bottom-6 right-6 w-14 h-14 bg-white/10 backdrop-blur-xl border border-white/30 rounded-2xl flex items-center justify-center hover:bg-white/20 transition-all z-20"
              >
                {isPlaying ? <Pause className="w-6 h-6" /> : <Play className="w-6 h-6 ml-0.5" />}
              </motion.button>

              <div className="absolute top-6 right-6 bg-black/70 px-4 py-1.5 rounded-xl text-sm font-mono text-white flex items-center gap-2 z-20">
                <Clock className="w-4 h-4" />
                {currentVideo?.duration}
              </div>
            </div>
          </div>

          {/* Side List */}
          <div className="space-y-6">
            {largeVideos.map((video, index) => (
              <motion.div
                key={video.id}
                initial={{ opacity: 0, x: 40 }}
                whileInView={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.1 }}
                onClick={() => handleVideoClick(video.id)}
                className={`group flex gap-5 bg-zinc-900 rounded-3xl p-4 cursor-pointer border transition-all hover:border-violet-500 ${
                  activeVideo === video.id ? "border-violet-500 ring-1 ring-violet-500/50" : "border-zinc-800"
                }`}
              >
                <div className="relative w-56 aspect-video rounded-2xl overflow-hidden flex-shrink-0">
                  <img
                    src={video.thumbnail}
                    alt={video.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                  />
                  <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                    <Play className="w-9 h-9 text-white" fill="white" />
                  </div>
                </div>

                <div className="flex-1 py-2">
                  <h4 className="font-semibold text-white text-[17px] leading-tight line-clamp-2 group-hover:text-violet-400 transition-colors">
                    {video.title}
                  </h4>
                  <p className="text-zinc-400 text-sm mt-3">{video.creator}</p>
                  <div className="flex gap-3 text-xs text-zinc-500 mt-4">
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
              className="mt-8 w-full py-5 bg-gradient-to-r from-violet-600 via-fuchsia-600 to-pink-600 text-white font-semibold rounded-3xl text-lg flex items-center justify-center gap-3 hover:brightness-110 transition-all"
            >
              Start Editing Now
              <ArrowRight className="w-5 h-5" />
            </motion.button>
          </div>
        </div>
      </div>
    </section>
  );
}