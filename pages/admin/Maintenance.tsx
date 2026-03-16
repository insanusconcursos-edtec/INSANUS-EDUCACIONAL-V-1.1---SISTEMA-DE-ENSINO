import React from 'react';
import { Upload, Image as ImageIcon } from 'lucide-react';
import { uploadSystemLogo } from '../../services/settingsService';

const Maintenance: React.FC = () => {
  return (
    <div className="p-10 text-center animate-in fade-in duration-500">
      <h1 className="text-3xl font-black text-white mb-4 uppercase">Manutenção do Sistema</h1>
      <p className="text-zinc-500 mb-10">Módulo em desenvolvimento.</p>

      {/* Bloco de Identidade Visual */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 mt-6 text-left max-w-2xl mx-auto">
        <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
          <ImageIcon className="text-red-500" /> Identidade Visual
        </h3>
        <div className="flex flex-col gap-4">
          <p className="text-sm text-gray-400">
            Faça o upload da logo principal do sistema (Máx. 250x60px, formato PNG ou SVG).
          </p>
          <label className="relative inline-flex items-center justify-center gap-2 w-fit px-4 py-2 bg-gray-800 hover:bg-gray-700 text-white text-sm font-bold rounded-lg cursor-pointer transition border border-gray-700">
            <Upload size={16} /> Enviar Nova Logo
            <input 
              type="file" 
              accept="image/png, image/jpeg, image/svg+xml" 
              className="hidden" 
              onChange={async (e) => {
                const file = e.target.files?.[0];
                if (file) {
                  try {
                    await uploadSystemLogo(file);
                    alert("Logo atualizada com sucesso!");
                  } catch (error) {
                    console.error(error);
                    alert("Erro ao enviar logo.");
                  }
                }
              }}
            />
          </label>
        </div>
      </div>
    </div>
  );
};

export default Maintenance;
