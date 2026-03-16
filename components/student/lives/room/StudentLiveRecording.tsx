import React, { useState } from 'react';
import { Download, PlayCircle } from 'lucide-react';

export const StudentLiveRecording = ({ event }: { event: any }) => {
  const [activeVideoIndex, setActiveVideoIndex] = useState(0);
  const recordings = event.recordings || [];
  const materials = event.materials || [];

  if (recordings.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-gray-400 p-8 text-center">
        <PlayCircle size={48} className="mb-4 opacity-50" />
        <h3 className="text-xl font-bold text-white mb-2">Gravação em Processamento</h3>
        <p>A gravação deste evento estará disponível em breve. Aguarde a publicação pelo administrador.</p>
      </div>
    );
  }

  const activeVideo = recordings[activeVideoIndex];

  return (
    <div className="flex flex-col gap-6 p-4">
      {/* Player de Vídeo da Gravação */}
      <div className="w-full aspect-video bg-black rounded-lg overflow-hidden border border-gray-800">
         <iframe
            src={activeVideo.url}
            title={activeVideo.title}
            className="w-full h-full border-0"
            allowFullScreen
         ></iframe>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Lista de Aulas Gravadas */}
        <div className="md:col-span-2 flex flex-col gap-3">
          <h3 className="text-lg font-bold text-white">Conteúdo da Gravação</h3>
          <div className="flex flex-col gap-2">
            {recordings.map((rec: any, idx: number) => (
              <button 
                key={rec.id || idx}
                onClick={() => setActiveVideoIndex(idx)}
                className={`flex items-center gap-3 p-3 rounded-lg border text-left transition ${activeVideoIndex === idx ? 'border-red-500 bg-red-900/20' : 'border-gray-800 bg-gray-900 hover:border-gray-600'}`}
              >
                <PlayCircle size={20} className={activeVideoIndex === idx ? 'text-red-500' : 'text-gray-400'} />
                <span className="text-white font-medium">{rec.title}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Lista de Materiais PDF */}
        <div className="flex flex-col gap-3">
          <h3 className="text-lg font-bold text-white">Materiais (PDF)</h3>
          {materials.length === 0 ? (
            <p className="text-sm text-gray-400">Nenhum material disponibilizado.</p>
          ) : (
            <div className="flex flex-col gap-2">
              {materials.map((mat: any, idx: number) => (
                <a 
                  key={mat.id || idx}
                  href={mat.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-3 p-3 rounded-lg border border-gray-800 bg-gray-900 hover:border-gray-600 transition"
                >
                  <Download size={18} className="text-gray-400" />
                  <span className="text-sm text-white font-medium truncate">{mat.title}</span>
                </a>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
