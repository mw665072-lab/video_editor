import { VideoUpload } from '@/components/upload/VideoUpload'
import React from 'react'

const VisualEditorLoader = ({handleVideoLoaded}:any) => {
  return (
     <div className="min-h-screen bg-[#020617] flex items-center justify-center p-8">
           <div className="max-w-xl w-full text-center space-y-10 animate-in fade-in slide-in-from-bottom-5 duration-700">
             <div className="space-y-4">
               <h1 className="text-7xl font-black italic tracking-tighter text-white">
                 Cut<span className="text-indigo-500">Pro</span>
               </h1>
               <p className="text-slate-400 text-lg font-medium">Professional grade multi-clip video editor.</p>
             </div>
             <div className="bg-slate-900/40 border-2 border-dashed border-slate-800 rounded-[2rem] p-12 hover:border-indigo-500/50 transition-all hover:bg-slate-900/60 shadow-2xl">
               <VideoUpload showUrlUpload={true} onVideoLoaded={handleVideoLoaded} onDurationResolved={() => {}} />
             </div>
           </div>
         </div>
  )
}

export default VisualEditorLoader
