
import { db, storage } from './firebase';
import { 
  collection, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  doc, 
  getDocs, 
  getDoc,
  query, 
  orderBy, 
  where,
  writeBatch,
  increment,
  setDoc,
  serverTimestamp,
  getCountFromServer,
  arrayUnion,
  arrayRemove
} from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { OnlineCourse, CourseFormData, CourseModule, CourseSubModule, CourseLesson, CourseContent } from '../types/course';
import { CourseEditalStructure } from '../types/courseEdital';

const COLLECTION_NAME = 'online_courses';
const MODULES_COLLECTION = 'course_modules';
const SUBMODULES_COLLECTION = 'course_submodules';
const LESSONS_COLLECTION = 'course_lessons';
const CONTENTS_COLLECTION = 'course_contents';
const EDITAL_COLLECTION = 'course_edital'; 

export const courseService = {
  // Helper para upload de Banner
  uploadBanner: async (file: File): Promise<string> => {
    try {
      const storageRef = ref(storage, `course_banners/${Date.now()}_${file.name}`);
      const snapshot = await uploadBytes(storageRef, file);
      return await getDownloadURL(snapshot.ref);
    } catch (error) {
      console.error("Erro upload banner:", error);
      throw error;
    }
  },

  // Criar novo curso
  createCourse: async (data: CourseFormData, bannerDesktopFile?: File, bannerMobileFile?: File): Promise<string> => {
    try {
      const finalData: any = { ...data };

      if (bannerDesktopFile) {
        finalData.bannerUrlDesktop = await courseService.uploadBanner(bannerDesktopFile);
      }
      if (bannerMobileFile) {
        finalData.bannerUrlMobile = await courseService.uploadBanner(bannerMobileFile);
      }

      // =======================================================================
      // LIMPEZA CIRÚRGICA: Remove qualquer campo 'undefined' antes de salvar
      // =======================================================================
      Object.keys(finalData).forEach(key => {
        if (finalData[key] === undefined) {
          delete finalData[key];
        }
      });

      const docRef = await addDoc(collection(db, COLLECTION_NAME), {
        ...finalData,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        active: true
      });
      return docRef.id;
    } catch (error) {
      console.error("Erro ao criar curso:", error);
      throw error;
    }
  },

  // Listar cursos
  getCourses: async (): Promise<OnlineCourse[]> => {
    try {
      const q = query(collection(db, COLLECTION_NAME), orderBy('createdAt', 'desc'));
      const snapshot = await getDocs(q);
      return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as OnlineCourse));
    } catch (error) {
      console.error("Erro ao buscar cursos:", error);
      throw error;
    }
  },

  // Atualizar curso
  updateCourse: async (id: string, data: Partial<CourseFormData>, bannerDesktopFile?: File, bannerMobileFile?: File) => {
    try {
      const finalData: any = { ...data };

      if (bannerDesktopFile) {
        finalData.bannerUrlDesktop = await courseService.uploadBanner(bannerDesktopFile);
      }
      if (bannerMobileFile) {
        finalData.bannerUrlMobile = await courseService.uploadBanner(bannerMobileFile);
      }

      // =======================================================================
      // LIMPEZA CIRÚRGICA: Remove qualquer campo 'undefined' antes de salvar
      // =======================================================================
      Object.keys(finalData).forEach(key => {
        if (finalData[key] === undefined) {
          delete finalData[key];
        }
      });

      const docRef = doc(db, COLLECTION_NAME, id);
      await updateDoc(docRef, {
        ...finalData,
        updatedAt: new Date().toISOString()
      });
    } catch (error) {
      console.error("Erro ao atualizar curso:", error);
      throw error;
    }
  },

  // Excluir curso
  deleteCourse: async (id: string) => {
    try {
      await deleteDoc(doc(db, COLLECTION_NAME, id));
    } catch (error) {
      console.error("Erro ao excluir curso:", error);
      throw error;
    }
  },

  // Duplicar curso
  duplicateCourse: async (originalCourse: OnlineCourse) => {
    try {
      // Garantir que não passamos undefined na duplicação também
      const newCourseData: any = {
        title: `${originalCourse.title} (Cópia)`,
        coverUrl: originalCourse.coverUrl,
        bannerUrlDesktop: originalCourse.bannerUrlDesktop || null,
        bannerUrlMobile: originalCourse.bannerUrlMobile || null,
        categoryId: originalCourse.categoryId,
        subcategoryId: originalCourse.subcategoryId || '',
        organization: originalCourse.organization || '',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        active: true
      };

      // Limpeza de segurança
      Object.keys(newCourseData).forEach(key => {
        if (newCourseData[key] === undefined) delete newCourseData[key];
      });

      const docRef = await addDoc(collection(db, COLLECTION_NAME), newCourseData);
      return docRef.id;
    } catch (error) {
      console.error("Erro ao duplicar curso:", error);
      throw error;
    }
  },

  // Upload de Capa
  uploadCover: async (file: File): Promise<string> => {
    try {
      const storageRef = ref(storage, `course_covers/${Date.now()}_${file.name}`);
      const snapshot = await uploadBytes(storageRef, file);
      const downloadURL = await getDownloadURL(snapshot.ref);
      return downloadURL;
    } catch (error) {
      console.error("Erro ao fazer upload da capa:", error);
      throw error;
    }
  },

  // --- MÓDULOS ---

  createModule: async (moduleData: Omit<CourseModule, 'id'>) => {
    try {
      const q = query(
        collection(db, MODULES_COLLECTION), 
        where('courseId', '==', moduleData.courseId),
        orderBy('order', 'desc')
      );
      const snapshot = await getDocs(q);
      const lastOrder = snapshot.docs.length > 0 ? snapshot.docs[0].data().order : 0;

      const docRef = await addDoc(collection(db, MODULES_COLLECTION), {
        ...moduleData,
        order: lastOrder + 1
      });
      return docRef.id;
    } catch (error) {
      console.error("Erro ao criar módulo:", error);
      throw error;
    }
  },

  getModules: async (courseId: string): Promise<CourseModule[]> => {
    try {
      const q = query(
        collection(db, MODULES_COLLECTION),
        where('courseId', '==', courseId),
        orderBy('order', 'asc')
      );
      const snapshot = await getDocs(q);
      return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as CourseModule));
    } catch (error) {
      console.error("Erro ao buscar módulos:", error);
      throw error;
    }
  },

  updateModule: async (moduleId: string, data: Partial<CourseModule>) => {
    try {
      const docRef = doc(db, MODULES_COLLECTION, moduleId);
      await updateDoc(docRef, data);
    } catch (error) {
      console.error("Erro ao atualizar módulo:", error);
      throw error;
    }
  },

  deleteModule: async (moduleId: string) => {
    try {
      await deleteDoc(doc(db, MODULES_COLLECTION, moduleId));
    } catch (error) {
      console.error("Erro ao excluir módulo:", error);
      throw error;
    }
  },

  reorderModules: async (modules: CourseModule[]) => {
    try {
      const batch = writeBatch(db);
      modules.forEach((mod, index) => {
        const docRef = doc(db, MODULES_COLLECTION, mod.id);
        batch.update(docRef, { order: index + 1 });
      });
      await batch.commit();
    } catch (error) {
      console.error("Erro ao reordenar módulos:", error);
      throw error;
    }
  },

  // --- PASTAS (SUBMÓDULOS) ---

  createSubModule: async (data: Omit<CourseSubModule, 'id'>) => {
    try {
      const q = query(
        collection(db, SUBMODULES_COLLECTION), 
        where('moduleId', '==', data.moduleId),
        orderBy('order', 'desc')
      );
      const snapshot = await getDocs(q);
      const lastOrder = snapshot.docs.length > 0 ? snapshot.docs[0].data().order : 0;

      const docRef = await addDoc(collection(db, SUBMODULES_COLLECTION), {
        ...data,
        order: lastOrder + 1
      });
      return docRef.id;
    } catch (error) {
      console.error("Erro ao criar pasta:", error);
      throw error;
    }
  },

  getSubModules: async (moduleId: string): Promise<CourseSubModule[]> => {
    try {
      const q = query(
        collection(db, SUBMODULES_COLLECTION),
        where('moduleId', '==', moduleId),
        orderBy('order', 'asc')
      );
      const snapshot = await getDocs(q);
      return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as CourseSubModule));
    } catch (error) {
      console.error("Erro ao buscar pastas:", error);
      throw error;
    }
  },

  updateSubModule: async (id: string, data: Partial<CourseSubModule>) => {
    await updateDoc(doc(db, SUBMODULES_COLLECTION, id), data);
  },

  deleteSubModule: async (id: string) => {
    await deleteDoc(doc(db, SUBMODULES_COLLECTION, id));
  },

  reorderSubModules: async (subModules: CourseSubModule[]) => {
    try {
      const batch = writeBatch(db);
      subModules.forEach((sub, index) => {
        const docRef = doc(db, SUBMODULES_COLLECTION, sub.id);
        batch.update(docRef, { order: index + 1 });
      });
      await batch.commit();
    } catch (error) {
      console.error("Erro ao reordenar pastas:", error);
      throw error;
    }
  },

  // --- AULAS ---

  createLesson: async (data: Omit<CourseLesson, 'id'>) => {
    try {
      let q;
      if (data.subModuleId) {
        q = query(
          collection(db, LESSONS_COLLECTION),
          where('moduleId', '==', data.moduleId),
          where('subModuleId', '==', data.subModuleId),
          orderBy('order', 'desc')
        );
      } else {
        q = query(
          collection(db, LESSONS_COLLECTION),
          where('moduleId', '==', data.moduleId),
          where('subModuleId', '==', null),
          orderBy('order', 'desc')
        );
      }
      
      const snapshot = await getDocs(q);
      const lastOrder = snapshot.docs.length > 0 ? snapshot.docs[0].data().order : 0;

      const docRef = await addDoc(collection(db, LESSONS_COLLECTION), {
        ...data,
        order: lastOrder + 1
      });
      return docRef.id;
    } catch (error) {
      console.error("Erro ao criar aula:", error);
      throw error;
    }
  },

  getLessons: async (moduleId: string): Promise<CourseLesson[]> => {
    try {
      const q = query(
        collection(db, LESSONS_COLLECTION),
        where('moduleId', '==', moduleId),
        orderBy('order', 'asc')
      );
      const snapshot = await getDocs(q);
      return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as CourseLesson));
    } catch (error) {
      console.error("Erro ao buscar aulas:", error);
      throw error;
    }
  },

  updateLesson: async (id: string, data: Partial<CourseLesson>) => {
    await updateDoc(doc(db, LESSONS_COLLECTION, id), data);
  },

  deleteLesson: async (id: string) => {
    await deleteDoc(doc(db, LESSONS_COLLECTION, id));
  },
  
  moveLesson: async (lessonId: string, targetSubModuleId: string | null) => {
     await updateDoc(doc(db, LESSONS_COLLECTION, lessonId), {
         subModuleId: targetSubModuleId
     });
  },

  reorderLessons: async (lessons: CourseLesson[]) => {
    try {
      const batch = writeBatch(db);
      lessons.forEach((lesson, index) => {
        const docRef = doc(db, LESSONS_COLLECTION, lesson.id);
        batch.update(docRef, { order: index + 1 });
      });
      await batch.commit();
    } catch (error) {
      console.error("Erro ao reordenar aulas:", error);
      throw error;
    }
  },

  // --- CONTEÚDOS ---

  createContent: async (data: Omit<CourseContent, 'id'>) => {
    try {
      const q = query(
        collection(db, CONTENTS_COLLECTION), 
        where('lessonId', '==', data.lessonId),
        orderBy('order', 'desc')
      );
      const snapshot = await getDocs(q);
      const lastOrder = snapshot.docs.length > 0 ? snapshot.docs[0].data().order : 0;

      const docRef = await addDoc(collection(db, CONTENTS_COLLECTION), {
        ...data,
        order: lastOrder + 1
      });

      const lessonRef = doc(db, LESSONS_COLLECTION, data.lessonId);
      if (data.type === 'video') await updateDoc(lessonRef, { videoCount: increment(1) });
      else if (data.type === 'pdf') await updateDoc(lessonRef, { pdfCount: increment(1) });

      return docRef.id;
    } catch (error) {
      console.error("Erro ao criar conteúdo:", error);
      throw error;
    }
  },

  getContents: async (lessonId: string): Promise<CourseContent[]> => {
    try {
      const q = query(
        collection(db, CONTENTS_COLLECTION),
        where('lessonId', '==', lessonId),
        orderBy('order', 'asc')
      );
      const snapshot = await getDocs(q);
      return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as CourseContent));
    } catch (error) {
      console.error("Erro ao buscar conteúdos:", error);
      throw error;
    }
  },

  updateContent: async (id: string, data: Partial<CourseContent>) => {
    await updateDoc(doc(db, CONTENTS_COLLECTION, id), data);
  },

  deleteContent: async (id: string) => {
    try {
      const contentRef = doc(db, CONTENTS_COLLECTION, id);
      const contentSnap = await getDoc(contentRef);

      if (contentSnap.exists()) {
        const content = contentSnap.data() as CourseContent;
        const lessonRef = doc(db, LESSONS_COLLECTION, content.lessonId);

        if (content.type === 'video') await updateDoc(lessonRef, { videoCount: increment(-1) });
        else if (content.type === 'pdf') await updateDoc(lessonRef, { pdfCount: increment(-1) });

        await deleteDoc(contentRef);
      }
    } catch (error) {
      console.error("Erro ao excluir conteúdo:", error);
      throw error;
    }
  },

  reorderContents: async (contents: CourseContent[]) => {
    try {
      const batch = writeBatch(db);
      contents.forEach((item, index) => {
        const docRef = doc(db, CONTENTS_COLLECTION, item.id);
        batch.update(docRef, { order: index + 1 });
      });
      await batch.commit();
    } catch (error) {
      console.error("Erro ao reordenar conteúdos:", error);
      throw error;
    }
  },

  uploadPDF: async (file: File): Promise<string> => {
    try {
      const storageRef = ref(storage, `course_pdfs/${Date.now()}_${file.name}`);
      const snapshot = await uploadBytes(storageRef, file);
      return await getDownloadURL(snapshot.ref);
    } catch (error) {
      console.error("Erro ao fazer upload do PDF:", error);
      throw error;
    }
  },

  // --- PROGRESSO ---
  
  toggleLessonCompletion: async (userId: string, courseId: string, lessonId: string, isCompleted: boolean) => {
    try {
        const docRef = doc(db, 'users', userId, 'course_progress', courseId);
        const docSnap = await getDoc(docRef);
        let completedLessons: string[] = [];
        
        if (docSnap.exists()) {
            completedLessons = docSnap.data().completedLessons || [];
        }

        if (isCompleted) {
            if (!completedLessons.includes(lessonId)) completedLessons.push(lessonId);
        } else {
            completedLessons = completedLessons.filter(id => id !== lessonId);
        }

        await setDoc(docRef, {
            completedLessons,
            lastUpdated: serverTimestamp()
        }, { merge: true });
        return true;
    } catch (error) {
        console.error("Erro ao salvar progresso:", error);
        throw error;
    }
  },

  getCompletedLessons: async (userId: string, courseId: string): Promise<string[]> => {
    try {
        const docRef = doc(db, 'users', userId, 'course_progress', courseId);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) return docSnap.data().completedLessons || [];
        return [];
    } catch (error) {
        return [];
    }
  },

  // --- NOVAS FUNÇÕES PARA O PROGRESSO DO EDITAL VERTICALIZADO ---
  
  getCompletedTopics: async (userId: string, courseId: string) => {
    try {
      // Cria um documento único para o progresso do edital do aluno neste curso
      const progressRef = doc(db, 'course_edital_progress', `${userId}_${courseId}`);
      const snap = await getDoc(progressRef);
      if (snap.exists() && snap.data().completedTopics) {
        return snap.data().completedTopics;
      }
      return [];
    } catch (error) {
      console.error("Erro ao buscar tópicos concluídos:", error);
      return [];
    }
  },

  toggleTopicCompletion: async (userId: string, courseId: string, topicId: string, isCompleted: boolean) => {
    try {
      const progressRef = doc(db, 'course_edital_progress', `${userId}_${courseId}`);
      
      // Usa arrayUnion para adicionar ou arrayRemove para tirar o ID do tópico
      if (isCompleted) {
        await setDoc(progressRef, { completedTopics: arrayUnion(topicId) }, { merge: true });
      } else {
        await setDoc(progressRef, { completedTopics: arrayRemove(topicId) }, { merge: true });
      }
    } catch (error) {
      console.error("Erro ao alternar conclusão do tópico:", error);
    }
  },

  getCourseStats: async (courseId: string) => {
    try {
      const modules = await courseService.getModules(courseId);
      const moduleIds = modules.map(m => m.id);
      if (moduleIds.length === 0) return { totalLessons: 0 };
      
      let totalLessons = 0;
      const lessonsRef = collection(db, LESSONS_COLLECTION);
      for (const modId of moduleIds) {
          const q = query(lessonsRef, where('moduleId', '==', modId));
          const snapshot = await getCountFromServer(q);
          totalLessons += snapshot.data().count;
      }
      return { totalLessons };
    } catch (error) {
      return { totalLessons: 0 };
    }
  },

  // --- EDITAL VERTICALIZADO ---
  
  getCourseEdital: async (courseId: string): Promise<CourseEditalStructure | null> => {
    try {
      const docRef = doc(db, EDITAL_COLLECTION, courseId);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        return docSnap.data() as CourseEditalStructure;
      }
      return null;
    } catch (error) {
      return null;
    }
  },

  saveCourseEdital: async (data: CourseEditalStructure) => {
    try {
      const docRef = doc(db, EDITAL_COLLECTION, data.courseId);
      
      // SANITIZAÇÃO: Remove campos 'undefined' que quebram o Firestore
      // JSON.stringify ignora chaves com valor undefined
      const sanitizedData = JSON.parse(JSON.stringify(data));

      await setDoc(docRef, {
        ...sanitizedData,
        updatedAt: serverTimestamp()
      });
    } catch (error) {
      console.error("Erro ao salvar edital:", error);
      throw error;
    }
  },

  // --- NOVOS MÉTODOS PARA VINCULAÇÃO E UPLOAD DO EDITAL ---

  // Retorna estrutura completa do curso (Módulos + Pastas + Aulas) para o modal de vinculação
  getCourseStructure: async (courseId: string) => {
    try {
      // 1. Busca Módulos
      const modulesRef = collection(db, MODULES_COLLECTION);
      const qModules = query(modulesRef, where('courseId', '==', courseId), orderBy('order', 'asc'));
      const modulesSnap = await getDocs(qModules);

      const structure = [];

      // 2. Para cada módulo, busca pastas e aulas
      for (const modDoc of modulesSnap.docs) {
        const mod = { id: modDoc.id, ...modDoc.data() } as CourseModule;

        // Busca pastas (submódulos) deste módulo
        const subRef = collection(db, SUBMODULES_COLLECTION);
        const qSub = query(subRef, where('moduleId', '==', mod.id), orderBy('order', 'asc'));
        const subSnap = await getDocs(qSub);
        const subModules = subSnap.docs.map(d => ({ id: d.id, ...d.data() } as CourseSubModule));

        // Busca aulas deste módulo
        const lessonsRef = collection(db, LESSONS_COLLECTION);
        const qLessons = query(lessonsRef, where('moduleId', '==', mod.id), orderBy('order', 'asc'));
        const lessonsSnap = await getDocs(qLessons);
        const lessons = lessonsSnap.docs.map(d => ({ id: d.id, ...d.data() } as CourseLesson));

        // Monta a árvore relacional
        structure.push({
          ...mod,
          folders: subModules.map(folder => ({
            ...folder,
            // Aulas que pertencem a esta pasta
            lessons: lessons.filter(l => l.subModuleId === folder.id) 
          })),
          // Aulas que estão soltas no módulo (sem pasta)
          looseLessons: lessons.filter(l => !l.subModuleId) 
        });
      }
      
      return structure;
    } catch (error) {
      console.error("Erro ao buscar estrutura do curso:", error);
      return [];
    }
  },

  // Upload de Material Específico do Edital
  uploadEditalFile: async (file: File, courseId: string, topicId: string): Promise<{url: string, path: string}> => {
      try {
        const uniqueName = `${Date.now()}_${file.name}`;
        // Path organizado por curso e tópico
        const path = `courses/${courseId}/edital_pdfs/${topicId}/${uniqueName}`;
        const storageRef = ref(storage, path);
        
        const snapshot = await uploadBytes(storageRef, file);
        const url = await getDownloadURL(snapshot.ref);
        
        return { url, path };
      } catch (error) {
        console.error("Erro upload PDF edital:", error);
        throw error;
      }
  }
};

export const getAllOnlineCourses = async () => {
  try {
    const coursesRef = collection(db, 'online_courses');
    const q = query(coursesRef, orderBy('title', 'asc'));
    const snapshot = await getDocs(q);
    
    const courses = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));

    // Para cada curso, buscamos sua estrutura (módulos e pastas)
    const coursesWithStructure = await Promise.all(courses.map(async (course: any) => {
      const structure = await courseService.getCourseStructure(course.id);
      return {
        ...course,
        modules: structure
      };
    }));
    
    return coursesWithStructure;
  } catch (error) {
    console.error("Erro ao buscar todos os cursos online:", error);
    throw error;
  }
};
