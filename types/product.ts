export type ProductType = 'COMBO' | 'PLANO' | 'TURMA_ONLINE' | 'CURSO_ISOLADO' | 'SIMULADO';

export interface LinkedResources {
  plans: string[];
  onlineCourses: string[];
  presentialClasses: string[];
  simulated: string[];
}

export interface TictoProduct {
  id?: string;
  name: string;
  tictoId: string;
  type: ProductType;
  accessDays: number;
  coverUrl?: string;
  linkedResources: LinkedResources;
  createdAt?: any;
  updatedAt?: any;
}
