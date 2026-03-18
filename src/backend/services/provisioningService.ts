import admin from 'firebase-admin';
import { sendWelcomeEmail } from './emailService';

// Initialize Firebase Admin if not already initialized
if (!admin.apps.length) {
  admin.initializeApp();
}

export const provisionTictoPurchase = async (customerData: any, tictoProductId: string) => {
  try {
    const db = admin.firestore();
    const auth = admin.auth();

    // 1. Procurar na coleção ticto_products qual o produto que possui o tictoId correspondente
    const productsSnapshot = await db.collection('ticto_products')
      .where('tictoId', '==', tictoProductId)
      .limit(1)
      .get();

    if (productsSnapshot.empty) {
      throw new Error(`Produto Ticto com ID ${tictoProductId} não encontrado.`);
    }

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
      userRecord = await auth.getUserByEmail(customerData.email);
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
      userRecord = await auth.createUser({
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
            tictoId: tictoProductId,
            productName: productData.name,
            grantedAt: admin.firestore.FieldValue.serverTimestamp(),
            expiresAt: admin.firestore.Timestamp.fromDate(expirationDate),
            resources: linkedResources
          }
        ]
      };

      await db.collection('users').doc(userRecord.uid).set(newUserDoc);

      // Enviar e-mail de boas-vindas real
      await sendWelcomeEmail(customerData.name, customerData.email, generatedPassword);

    } else {
      // 4. SE FOR ALUNO EXISTENTE
      const userRef = db.collection('users').doc(userRecord.uid);
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
              tictoId: tictoProductId,
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
          acc.tictoId === tictoProductId && 
          acc.expiresAt && 
          acc.expiresAt.toDate() > new Date()
        );

        if (!hasActiveAccess) {
          const newAccess = {
            productId: productDoc.id,
            tictoId: tictoProductId,
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
          console.log(`[PROVISIONAMENTO] Usuário ${customerData.email} já possui acesso ativo ao produto ${tictoProductId}`);
        }
      }
    }

    return { success: true, message: 'Provisionamento concluído com sucesso.' };

  } catch (error) {
    console.error('Erro no provisionamento:', error);
    throw error;
  }
};

export const revokeTictoPurchase = async (email: string, tictoProductId: string) => {
  try {
    const db = admin.firestore();
    const auth = admin.auth();

    // 1. Busca o documento do produto na coleção ticto_products para saber quais recursos ele liberava
    const productsSnapshot = await db.collection('ticto_products')
      .where('tictoId', '==', tictoProductId)
      .limit(1)
      .get();

    if (productsSnapshot.empty) {
      console.log(`[REVOGAÇÃO] Produto Ticto com ID ${tictoProductId} não encontrado.`);
    }

    // 2. Busca o utilizador na coleção users através do e-mail
    let userRecord;
    try {
      userRecord = await auth.getUserByEmail(email);
    } catch (error: any) {
      if (error.code === 'auth/user-not-found') {
        console.log(`[REVOGAÇÃO] Usuário com e-mail ${email} não encontrado no Auth.`);
        return { success: false, message: 'Usuário não encontrado.' };
      }
      throw error;
    }

    const userRef = db.collection('users').doc(userRecord.uid);
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
      if (acc.tictoId === tictoProductId && acc.isActive !== false) {
        hasChanges = true;
        return { ...acc, isActive: false, revokedAt: admin.firestore.FieldValue.serverTimestamp() };
      }
      return acc;
    });

    if (hasChanges) {
      // 4. Salva o array access atualizado no documento do utilizador
      await userRef.update({ access: updatedAccess });
      console.log(`[REVOGAÇÃO] Acessos revogados para o usuário ${email} referente ao produto ${tictoProductId}`);
    } else {
      console.log(`[REVOGAÇÃO] Nenhum acesso ativo encontrado para revogar do usuário ${email} referente ao produto ${tictoProductId}`);
    }

    return { success: true, message: 'Revogação concluída com sucesso.' };

  } catch (error) {
    console.error('Erro na revogação:', error);
    throw error;
  }
};
