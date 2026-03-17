import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import LoginPage from './pages/LoginPage';
import PlansPage from './pages/admin/PlansPage';
import PlanEditor from './pages/admin/PlanEditor'; 
import StudentManager from './pages/admin/StudentManager'; 
import SimulatedExamsManager from './pages/admin/SimulatedExamsManager'; 
import SimulatedClassDetails from './pages/admin/SimulatedClassDetails'; 
import TeamManager from './pages/admin/TeamManager';
import Maintenance from './pages/admin/Maintenance';
import { AdminCoursesTab } from './components/admin/courses/AdminCoursesTab'; // Nova Importação
import PresentialClassesPage from './pages/admin/PresentialClasses'; // Nova Importação Presential
import PresentialClassManager from './pages/admin/PresentialClassManager';
import { AdminLiveEvents } from './pages/admin/AdminLiveEvents'; // Nova Importação Eventos ao Vivo
import { AdminLiveEventDetails } from './pages/admin/AdminLiveEventDetails'; // Nova Importação Gerenciar Evento
import { AdminLiveRoom } from './pages/admin/AdminLiveRoom'; // Nova Importação Sala de Transmissão
import { StudentCoursesTab } from './components/student/courses/StudentCoursesTab'; // Nova Importação Student
import { StudentPresentialTab } from './components/student/presential/StudentPresentialTab'; // Nova Importação Presential
import { StudentPresentialDetails } from './pages/student/presential/StudentPresentialDetails'; // Nova Importação Detalhes Presencial
import { StudentLiveEvents } from './pages/student/liveEvents/StudentLiveEvents';
import { StudentLiveEventRoom } from './pages/student/liveEvents/StudentLiveEventRoom';
import AdminLayout from './components/Layout/AdminLayout';
import StudentLayout from './components/Layout/StudentLayout';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import PrivateRoute from './components/PrivateRoute';

// Student Pages Imports
import { 
  StudentDashboard, 
  StudentCalendar, 
  StudentEdict, 
  StudentSimulated
} from './pages/student/StudentPages';
import { StudentHome } from './pages/student/StudentHome';
import StudentConfigPage from './pages/student/StudentConfigPage';
import ProductsManager from './pages/admin/products/ProductsManager';

// Wrapper to handle root redirection based on role
const RootRedirect = () => {
    const { userRole, currentUser, loading } = useAuth();
    
    if (loading) return null;
    if (!currentUser) return <Navigate to="/login" replace />;
    
    if (userRole === 'ADMIN' || userRole === 'COLLABORATOR') return <Navigate to="/admin/planos" replace />;
    return <Navigate to="/app/home" replace />;
};

const App: React.FC = () => {
  return (
    <AuthProvider>
      <Toaster position="top-right" />
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        
        {/* Admin Routes */}
        <Route path="/admin/eventos-ao-vivo/sala/:id" element={
            <PrivateRoute requiredRole="ADMIN">
                <AdminLiveRoom />
            </PrivateRoute>
        } />

        <Route path="/admin" element={
            <PrivateRoute requiredRole="ADMIN">
                <AdminLayout />
            </PrivateRoute>
        }>
            <Route index element={<Navigate to="planos" replace />} />
            <Route path="planos" element={<PlansPage />} />
            <Route path="plans/:planId" element={<PlanEditor />} />
            
            <Route path="products" element={<ProductsManager />} />

            <Route path="cursos" element={<AdminCoursesTab />} /> {/* Nova Rota */}

            <Route path="presencial" element={<PresentialClassesPage />} /> {/* Nova Rota Presencial */}
            <Route path="presencial/:classId" element={<PresentialClassManager />} />

            <Route path="alunos" element={<StudentManager />} />
            
            <Route path="simulados" element={<SimulatedExamsManager />} />
            <Route path="simulados/:classId" element={<SimulatedClassDetails />} />
            
            <Route path="eventos-ao-vivo" element={<AdminLiveEvents />} />
            <Route path="eventos-ao-vivo/:eventId" element={<AdminLiveEventDetails />} />
            
            <Route path="equipe" element={<TeamManager />} />
            
            <Route path="manutencao" element={<Maintenance />} />
        </Route>

        {/* Student Routes */}
        <Route path="/app" element={
            <PrivateRoute requiredRole="STUDENT">
                <StudentLayout />
            </PrivateRoute>
        }>
            <Route index element={<Navigate to="home" replace />} />
            <Route path="home" element={<StudentHome />} />
            <Route path="dashboard" element={<StudentDashboard />} />
            <Route path="calendar" element={<StudentCalendar />} />
            <Route path="edict" element={<StudentEdict />} />
            <Route path="simulated" element={<StudentSimulated />} />
            <Route path="courses/:courseId?" element={<StudentCoursesTab />} />
            <Route path="presential" element={<StudentPresentialTab />} />
            <Route path="presential/:classId" element={<StudentPresentialDetails />} />
            <Route path="eventos-ao-vivo" element={<StudentLiveEvents />} />
            <Route path="eventos-ao-vivo/sala/:eventId" element={<StudentLiveEventRoom />} />
            <Route path="config" element={<StudentConfigPage />} />
            
            {/* Fallback for old routes if any */}
            <Route path="metas" element={<Navigate to="dashboard" replace />} />
            <Route path="calendario" element={<Navigate to="calendar" replace />} />
            <Route path="edital" element={<Navigate to="edict" replace />} />
        </Route>

        {/* Root Redirect */}
        <Route path="/" element={<RootRedirect />} />
        
        {/* Catch all */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </AuthProvider>
  );
};

export default App;