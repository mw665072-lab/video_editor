import { VideoUpload } from '@/components/upload/VideoUpload'
import React from 'react'

const VisualEditorLoader = ({handleVideoLoaded}:any) => {
  return (
     <div className="min-h-screen bg-[#f8f9fd] flex items-center justify-center p-8">
           <div className="max-w-xl w-full text-center space-y-10 animate-in fade-in slide-in-from-bottom-5 duration-700">
             <div className="space-y-4">
               <h1 className="text-7xl font-black italic tracking-tighter text-[#110d2e]">
                 Cut<span className="text-[#5842ed]">Pro</span>
               </h1>
               <p className="text-[#5e6578] text-lg font-medium">Professional grade multi-clip video editor.</p>
             </div>
             <div className="bg-white border-2 border-dashed border-[#e4e6f2] rounded-[2rem] p-12 hover:border-[#5842ed]/50 transition-all hover:shadow-xl">
               <VideoUpload showUrlUpload={true} onVideoLoaded={handleVideoLoaded} onDurationResolved={() => {}} />
             </div>
           </div>
         </div>
  )
}

export default VisualEditorLoader
