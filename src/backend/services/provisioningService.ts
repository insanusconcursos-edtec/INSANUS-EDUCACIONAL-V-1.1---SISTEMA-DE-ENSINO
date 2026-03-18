import * as admin from 'firebase-admin';
import { sendWelcomeEmail } from './emailService.js';

if (!admin.apps.length) {
  try {
    admin.initializeApp({
      credential: admin.credential.cert({
        projectId: process.env.FIREBASE_PROJECT_ID,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        privateKey: process.env.FIREBASE_PRIVATE_KEY ? process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n') : undefined,
      }),
    });
    console.log("Firebase Admin inicializado com sucesso.");
  } catch (error) {
    console.error("Erro crítico na inicialização do Firebase Admin:", error);
  }
}

const dbAdmin = admin.firestore();
const authAdmin = admin.auth();

export const provisionTictoPurchase = async (customerData: any, tictoProductId: string) => {
  try {
    const safeProductId = String(tictoProductId);
    console.log(`Iniciando provisionamento para: ${customerData.email}`);

    // 1. Procurar na coleção ticto_products qual o produto que possui o tictoId correspondente
    const productsSnapshot = await dbAdmin.collection('ticto_products')
      .where('tictoId', '==', safeProductId)
      .limit(1)
      .get();

    if (productsSnapshot.empty) {
      throw new Error(`Produto Ticto com ID ${safeProductId} não encontrado.`);
    }

    console.log(`Produto encontrado. Criando usuário no Auth...`);
    const productDoc = productsSnapshot.docs[0];
    const productData = productDoc.data();
    const accessDays = productData.accessDays || 365;
    const linkedResources = productData.linkedResources || {
      plans: [],
      onlineCourses: [],
      presentialClasses: [],
      simulated: []
    };

    // Calcular data de expiração
    const expirationDate = new Date();
    expirationDate.setDate(expirationDate.getDate() + accessDays);

    // 2. Verificar se o e-mail do cliente já existe
    let userRecord;
    let isNewUser = false;

    try {
      userRecord = await authAdmin.getUserByEmail(customerData.email);
    } catch (error: any) {
      if (error.code === 'auth/user-not-found') {
        isNewUser = true;
      } else {
        throw error;
      }
    }

    if (isNewUser) {
      // 3. SE FOR ALUNO NOVO
      // Gerar senha aleatória de 8 caracteres
      const generatePassword = () => {
        const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*';
        let password = '';
        for (let i = 0; i < 8; i++) {
          password += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        return password;
      };
      const generatedPassword = generatePassword();

      // Criar usuário no Auth
      userRecord = await authAdmin.createUser({
        email: customerData.email,
        password: generatedPassword,
        displayName: customerData.name,
        phoneNumber: customerData.phone || undefined, // Opcional
      });

      // Criar documento na coleção users
      const newUserDoc = {
        name: customerData.name,
        email: customerData.email,
        phone: customerData.phone || '',
        role: 'student',
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        access: [
          {
            productId: productDoc.id,
            tictoId: safeProductId,
            productName: productData.name,
            grantedAt: admin.firestore.FieldValue.serverTimestamp(),
            expiresAt: admin.firestore.Timestamp.fromDate(expirationDate),
            resources: linkedResources
          }
        ]
      };

      await dbAdmin.collection('users').doc(userRecord.uid).set(newUserDoc);

      // Enviar e-mail de boas-vindas real
      console.log(`Usuário criado. Enviando e-mail de boas-vindas...`);
      await sendWelcomeEmail(customerData.name, customerData.email, generatedPassword);

    } else {
      // 4. SE FOR ALUNO EXISTENTE
      const userRef = dbAdmin.collection('users').doc(userRecord.uid);
      const userDoc = await userRef.get();

      if (!userDoc.exists) {
        // Caso o usuário exista no Auth mas não no Firestore, cria o documento
        const newUserDoc = {
          name: customerData.name || userRecord.displayName || '',
          email: customerData.email,
          phone: customerData.phone || userRecord.phoneNumber || '',
          role: 'student',
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
          access: [
            {
              productId: productDoc.id,
              tictoId: safeProductId,
              productName: productData.name,
              grantedAt: admin.firestore.FieldValue.serverTimestamp(),
              expiresAt: admin.firestore.Timestamp.fromDate(expirationDate),
              resources: linkedResources
            }
          ]
        };
        await userRef.set(newUserDoc);
      } else {
        // Atualiza o documento adicionando os novos acessos
        const userData = userDoc.data() || {};
        const currentAccess = userData.access || [];

        // Verifica se já possui o acesso ativo para não duplicar
        const hasActiveAccess = currentAccess.some((acc: any) => 
          acc.tictoId === safeProductId && 
          acc.expiresAt && 
          acc.expiresAt.toDate() > new Date()
        );

        if (!hasActiveAccess) {
          const newAccess = {
            productId: productDoc.id,
            tictoId: safeProductId,
            productName: productData.name,
            grantedAt: admin.firestore.FieldValue.serverTimestamp(),
            expiresAt: admin.firestore.Timestamp.fromDate(expirationDate),
            resources: linkedResources
          };

          await userRef.update({
            access: admin.firestore.FieldValue.arrayUnion(newAccess)
          });
          console.log(`[PROVISIONAMENTO] Novos acessos adicionados para o usuário existente ${customerData.email}`);
        } else {
          console.log(`[PROVISIONAMENTO] Usuário ${customerData.email} já possui acesso ativo ao produto ${safeProductId}`);
        }
      }
    }

    console.log(`Provisionamento concluído com sucesso para ${customerData.email}`);
    return { success: true, message: 'Provisionamento concluído com sucesso.' };

  } catch (error) {
    console.error('Erro no provisionamento:', error);
    throw error;
  }
};

export const revokeTictoPurchase = async (email: string, tictoProductId: string) => {
  try {
    const safeProductId = String(tictoProductId);
    // 1. Busca o documento do produto na coleção ticto_products para saber quais recursos ele liberava
    const productsSnapshot = await dbAdmin.collection('ticto_products')
      .where('tictoId', '==', safeProductId)
      .limit(1)
      .get();

    if (productsSnapshot.empty) {
      console.log(`[REVOGAÇÃO] Produto Ticto com ID ${safeProductId} não encontrado.`);
    }

    // 2. Busca o utilizador na coleção users através do e-mail
    let userRecord;
    try {
      userRecord = await authAdmin.getUserByEmail(email);
    } catch (error: any) {
      if (error.code === 'auth/user-not-found') {
        console.log(`[REVOGAÇÃO] Usuário com e-mail ${email} não encontrado no Auth.`);
        return { success: false, message: 'Usuário não encontrado.' };
      }
      throw error;
    }

    const userRef = dbAdmin.collection('users').doc(userRecord.uid);
    const userDoc = await userRef.get();

    if (!userDoc.exists) {
      console.log(`[REVOGAÇÃO] Documento do usuário ${email} não encontrado no Firestore.`);
      return { success: false, message: 'Documento do usuário não encontrado.' };
    }

    const userData = userDoc.data() || {};
    const currentAccess = userData.access || [];

    // 3. Percorre o array access do utilizador. Para cada item de acesso que corresponda ao produto cancelado, altere a propriedade isActive para false
    let hasChanges = false;
    const updatedAccess = currentAccess.map((acc: any) => {
      if (acc.tictoId === safeProductId && acc.isActive !== false) {
        hasChanges = true;
        return { ...acc, isActive: false, revokedAt: admin.firestore.FieldValue.serverTimestamp() };
      }
      return acc;
    });

    if (hasChanges) {
      // 4. Salva o array access atualizado no documento do utilizador
      await userRef.update({ access: updatedAccess });
      console.log(`[REVOGAÇÃO] Acessos revogados para o usuário ${email} referente ao produto ${safeProductId}`);
    } else {
      console.log(`[REVOGAÇÃO] Nenhum acesso ativo encontrado para revogar do usuário ${email} referente ao produto ${safeProductId}`);
    }

    return { success: true, message: 'Revogação concluída com sucesso.' };

  } catch (error) {
    console.error('Erro na revogação:', error);
    throw error;
  }
};
