import { auth, db, firebaseConfig } from '../firebase/config';
import { initializeApp, deleteApp } from 'firebase/app';
import {
    getAuth,
    signOut,
    onAuthStateChanged,
    sendSignInLinkToEmail,
    isSignInWithEmailLink,
    signInWithEmailLink,
    GoogleAuthProvider,
    signInWithPopup,
    createUserWithEmailAndPassword,
    deleteUser
} from 'firebase/auth';
import {
    doc,
    setDoc,
    getDoc,
    collection,
    query,
    where,
    getDocs
} from 'firebase/firestore';
const authEvents = new Set();

const notifyAuthChange = (event, session) => {
    authEvents.forEach(callback => callback(event, session));
};

const ensureMemberProfile = async (user) => {
    const memberDocRef = doc(db, 'members', user.uid);
    const memberDoc = await getDoc(memberDocRef);

    if (!memberDoc.exists()) {
        console.log('authService: Member data not found, checking by email...');
        
        // Check if there is a member pre-created with this email but without ID set yet
        // (Wait, AdminCreateMember already sets the ID if they create the Auth user first)
        // But some older members might not have it.
        const q = query(collection(db, 'members'), where('email', '==', user.email));
        const querySnapshot = await getDocs(q);

        if (querySnapshot.empty) {
            // Not invited / Not pre-created
            console.warn('authService: No member document found for', user.email);
            return null;
        }

        const memberData = querySnapshot.docs[0].data();
        const existingId = querySnapshot.docs[0].id;

        if (existingId !== user.uid) {
            // If the ID in Firestore is different from the UID (shouldn't happen if created via AdminCreateMember)
            // Security rules only allow self-creating a 'member' doc, so this remap can fail with
            // permission-denied for pre-created admins/other roles. Don't let that crash the login;
            // fall back to using the existing record read-only so the user can still sign in.
            try {
                console.log('authService: Mapping existing member profile to new UID');
                await setDoc(doc(db, 'members', user.uid), { ...memberData, id: user.uid });
            } catch (err) {
                console.warn('authService: Could not remap member profile to new UID, continuing with existing data:', err);
            }
        }
        return memberData;
    }

    return memberDoc.data();
};

export const authService = {

    logout: async () => {
        console.log('authService: Logging out...');
        await signOut(auth);
        notifyAuthChange('SIGNED_OUT', null);
    },

    getSession: async () => {
        const user = auth.currentUser;
        if (!user) return null;

        const memberData = await ensureMemberProfile(user);
        if (!memberData) return null;

        return {
            user: {
                id: user.uid,
                email: user.email,
                user_metadata: {
                    username: memberData.username,
                    full_name: memberData.name
                }
            },
            access_token: await user.getIdToken()
        };
    },

    onAuthStateChange: (callback) => {
        authEvents.add(callback);

        const unsubscribe = onAuthStateChanged(auth, async (user) => {
            if (user) {
                const memberData = await ensureMemberProfile(user);
                
                if (!memberData) {
                    console.warn('authService: Unauthorized access attempted for', user.email);
                    // Optionally clean up the newly created Auth user if it was a "on-the-fly" creation
                    // But deleting might be too aggressive if they were just not yet pre-created.
                    // For now, just sign out and notify.
                    await signOut(auth);
                    callback('AUTH_ERROR', { message: 'auth.userNotFound' });
                    return;
                }

                if (memberData.status === 'inactive') {
                    await signOut(auth);
                    callback('AUTH_ERROR', { message: 'login.errorInactive' });
                    return;
                }

                const session = {
                    user: {
                        id: user.uid,
                        email: user.email,
                        user_metadata: {
                            username: memberData.username,
                            full_name: memberData.name
                        }
                    },
                    access_token: await user.getIdToken()
                };
                callback('SIGNED_IN', session);
            } else {
                callback('SIGNED_OUT', null);
            }
        });

        return {
            data: {
                subscription: {
                    unsubscribe: () => {
                        unsubscribe();
                        authEvents.delete(callback);
                    }
                }
            }
        };
    },

    createUser: async (email, password) => {
        console.log('authService: Admin creating user for', email);

        const secondaryApp = initializeApp(firebaseConfig, 'Secondary');
        const secondaryAuth = getAuth(secondaryApp);

        try {
            const userCredential = await createUserWithEmailAndPassword(secondaryAuth, email, password);
            const user = userCredential.user;

            await signOut(secondaryAuth);
            await deleteApp(secondaryApp);
            return user;
        } catch (error) {

            if (secondaryApp) await deleteApp(secondaryApp);
            console.error('Admin user creation error:', error);
            throw error;
        }
    },

    getProfile: async (userId) => {
        const memberDoc = await getDoc(doc(db, 'members', userId));
        return memberDoc.exists() ? memberDoc.data() : null;
    },


    sendEmailLink: async (email) => {
        // CHECK: If user exists in members collection
        const q = query(collection(db, 'members'), where('email', '==', email.trim()));
        const querySnapshot = await getDocs(q);
        
        if (querySnapshot.empty) {
            console.warn('authService: Login attempt for uninvited email:', email);
            throw new Error('auth.userNotFound');
        }

        const actionCodeSettings = {
            url: window.location.origin + '/login',
            handleCodeInApp: true,
        };

        try {
            await sendSignInLinkToEmail(auth, email, actionCodeSettings);
            window.localStorage.setItem('emailForSignIn', email);
            return true;
        } catch (error) {
            console.error('Error sending email link:', error);
            throw error;
        }
    },

    isSignInWithEmailLink: (url) => {
        return isSignInWithEmailLink(auth, url);
    },

    signInWithEmailLink: async (email, url) => {
        try {
            const result = await signInWithEmailLink(auth, email, url);
            const user = result.user;
            const memberData = await ensureMemberProfile(user);

            if (!memberData) {
                // Should already be caught by sendEmailLink, but good for safety
                // If it's a new user created on the fly, delete it
                const isNewUser = (user.metadata.creationTime === user.metadata.lastSignInTime);
                if (isNewUser) {
                    await deleteUser(user);
                } else {
                    await signOut(auth);
                }
                throw new Error('auth.userNotFound');
            }

            const session = {
                user: {
                    id: user.uid,
                    email: user.email,
                    user_metadata: {
                        username: memberData.username,
                        full_name: memberData.name
                    }
                },
                access_token: await user.getIdToken()
            };

            notifyAuthChange('SIGNED_IN', session);
            return session;
        } catch (error) {
            console.error('Error signing in with email link:', error);
            throw error;
        }
    },

    loginWithGoogle: async () => {
        const provider = new GoogleAuthProvider();
        try {
            const result = await signInWithPopup(auth, provider);
            const user = result.user;
            
            // CHECK: Look up in members table
            const memberData = await ensureMemberProfile(user);
            
            if (!memberData) {
                const isNewUser = (user.metadata.creationTime === user.metadata.lastSignInTime);
                if (isNewUser) {
                    // Delete the newly created Auth user to keep it clean
                    await deleteUser(user);
                } else {
                    await signOut(auth);
                }
                throw new Error('auth.userNotFound');
            }

            const session = {
                user: {
                    id: user.uid,
                    email: user.email,
                    user_metadata: {
                        username: memberData.username,
                        full_name: memberData.name
                    }
                },
                access_token: await user.getIdToken()
            };

            notifyAuthChange('SIGNED_IN', session);
            return session;
        } catch (error) {
            console.error('Error signing in with Google:', error);
            throw error;
        }
    }
};
