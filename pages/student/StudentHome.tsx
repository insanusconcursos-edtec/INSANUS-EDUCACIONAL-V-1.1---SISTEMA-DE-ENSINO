import React, { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { EditProfileModal } from '../../components/student/profile/EditProfileModal';
import { UserCircle } from 'lucide-react';

export const StudentHome: React.FC = () => {
  const { currentUser } = useAuth();
  const [isEditProfileOpen, setIsEditProfileOpen] = useState(false);

  return (
    <div className="p-8 w-full max-w-7xl mx-auto flex flex-col gap-6">
      <div className="flex items-center justify-between bg-gray-900 border border-gray-800 p-6 rounded-xl">
        <div>
          <h1 className="text-2xl font-bold text-white">Bem-vindo(a), {currentUser?.name || 'Aluno'}!</h1>
          <p className="text-gray-400 mt-1">Este é o seu painel central. Mais novidades em breve.</p>
        </div>
        <button 
          onClick={() => setIsEditProfileOpen(true)}
          className="bg-red-600 hover:bg-red-700 text-white px-5 py-2.5 rounded-lg transition flex items-center gap-2 font-medium shadow-lg shadow-red-500/20"
        >
          <UserCircle size={20} />
          EDITAR PERFIL
        </button>
      </div>

      {isEditProfileOpen && (
        <EditProfileModal 
          isOpen={isEditProfileOpen} 
          onClose={() => setIsEditProfileOpen(false)} 
          user={currentUser} 
        />
      )}
    </div>
  );
};
