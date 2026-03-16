import React from 'react';
import { Calendar, Clock } from 'lucide-react';

interface StudentLiveWaitingRoomProps {
  thumbnailUrl?: string;
  eventDate: string;
  startTime: string;
}

export const StudentLiveWaitingRoom: React.FC<StudentLiveWaitingRoomProps> = ({
  thumbnailUrl,
  eventDate,
  startTime
}) => {
  return (
    <div className="relative w-full h-full bg-zinc-950 rounded-2xl overflow-hidden border border-zinc-800 flex items-center justify-center">
      {thumbnailUrl ? (
        <img 
          src={thumbnailUrl} 
          alt="Thumbnail do Evento" 
          className="absolute inset-0 w-full h-full object-cover opacity-30"
        />
      ) : (
        <div className="absolute inset-0 bg-gradient-to-br from-zinc-900 to-black"></div>
      )}
      
      <div className="relative z-10 flex flex-col items-center justify-center text-center p-2 md:p-6 bg-black/60 backdrop-blur-md rounded-2xl border border-zinc-800/50 max-w-[95%] md:max-w-md mx-auto">
        <div className="w-8 h-8 md:w-16 md:h-16 bg-brand-red/20 rounded-full flex items-center justify-center mb-1 md:mb-4">
          <Clock className="text-brand-red w-4 h-4 md:w-8 md:h-8" />
        </div>
        
        <h2 className="text-base md:text-2xl font-black text-white uppercase tracking-tight mb-0.5 md:mb-2">
          Evento Agendado
        </h2>
        
        <p className="text-[10px] md:text-base text-zinc-300 mb-2 md:mb-6 line-clamp-2 md:line-clamp-none">
          A transmissão ainda não começou. Aguarde o início do evento.
        </p>
        
        <div className="flex items-center gap-2 md:gap-6 bg-zinc-900/80 px-3 md:px-6 py-1.5 md:py-3 rounded-xl border border-zinc-700/50">
          <div className="flex items-center gap-1.5 md:gap-2 text-white">
            <Calendar size={12} className="text-brand-red md:w-[18px] md:h-[18px]" />
            <span className="text-[10px] md:text-base font-bold">{eventDate.split('-').reverse().join('/')}</span>
          </div>
          <div className="w-px h-3 md:h-6 bg-zinc-700"></div>
          <div className="flex items-center gap-1.5 md:gap-2 text-white">
            <Clock size={12} className="text-brand-red md:w-[18px] md:h-[18px]" />
            <span className="text-[10px] md:text-base font-bold">{startTime}</span>
          </div>
        </div>
      </div>
    </div>
  );
};
