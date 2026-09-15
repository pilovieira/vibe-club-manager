import { db, storage, auth } from '../firebase/config';
import {
    collection,
    getDocs,
    getDoc,
    doc,
    addDoc,
    updateDoc,
    deleteDoc,
    query,
    where,
    setDoc,
    orderBy,
    limit
} from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';

export const mockService = {
    // Members
    getMembers: async () => {
        const membersRef = collection(db, 'members');
        const querySnapshot = await getDocs(membersRef);
        return querySnapshot.docs.map(doc => {
            const data = doc.data();
            return {
                ...data,
                id: doc.id,
                joinDate: data.join_date,
                dateBirth: data.date_birth,
                avatar: data.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${data.username}`
            };
        });
    },

    getMemberById: async (id) => {
        const docRef = doc(db, 'members', id);
        const docSnap = await getDoc(docRef);
        if (!docSnap.exists()) return null;

        const data = docSnap.data();
        return {
            ...data,
            id: docSnap.id,
            joinDate: data.join_date,
            dateBirth: data.date_birth,
            avatar: data.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${data.username}`
        };
    },

    createMember: async (member) => {
        const memberToInsert = {
            ...member,
            join_date: member.joinDate || new Date().toISOString(),
            date_birth: member.dateBirth || null,
            role: member.role || 'member',
            status: member.status || 'active',
            avatar: member.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${member.username || Date.now()}`
        };
        delete memberToInsert.joinDate;
        delete memberToInsert.dateBirth;

        let docRef;
        if (member.id) {
            docRef = doc(db, 'members', member.id);
            await setDoc(docRef, memberToInsert);
        } else {
            docRef = await addDoc(collection(db, 'members'), memberToInsert);
        }

        const created = await getDoc(docRef);
        return {
            ...created.data(),
            id: docRef.id,
            joinDate: created.data().join_date,
            dateBirth: created.data().date_birth
        };
    },

    updateMember: async (id, updatedMember) => {
        const memberToUpdate = { ...updatedMember };
        if (updatedMember.joinDate) {
            memberToUpdate.join_date = updatedMember.joinDate;
            delete memberToUpdate.joinDate;
        }
        if (updatedMember.dateBirth) {
            memberToUpdate.date_birth = updatedMember.dateBirth;
            delete memberToUpdate.dateBirth;
        }

        const docRef = doc(db, 'members', id);
        await updateDoc(docRef, memberToUpdate);

        const updated = await getDoc(docRef);
        return {
            ...updated.data(),
            id: id,
            joinDate: updated.data().join_date,
            dateBirth: updated.data().date_birth
        };
    },
    updateMemberStatus: async (memberId, status) => {
        const memberDoc = await getDoc(doc(db, 'members', memberId));
        if (memberDoc.exists()) {
            const memberData = memberDoc.data();
            if (memberData.role === 'admin' && status === 'inactive') {
                throw new Error('error.adminInactivation');
            }
        }
        const docRef = doc(db, 'members', memberId);
        await updateDoc(docRef, { status });
        return { id: memberId, status };
    },

    // Properties / Settings
    getProperties: async () => {
        const querySnapshot = await getDocs(collection(db, 'properties'));
        const props = {};
        querySnapshot.forEach(doc => {
            props[doc.id] = doc.data().value;
        });
        if (!props.event_types) {
            props.event_types = ['soft trail', 'hard trail', 'members meetup', 'club official meetup'];
        }
        if (!props.app_language) {
            props.app_language = 'pt';
        }
        return props;
    },

    updateProperty: async (key, value) => {
        const docRef = doc(db, 'properties', key);
        await setDoc(docRef, { value });
        return { key, value };
    },

    updateProperties: async (properties) => {
        const { writeBatch } = await import('firebase/firestore');
        const batch = writeBatch(db);
        Object.entries(properties).forEach(([key, value]) => {
            const docRef = doc(db, 'properties', key);
            batch.set(docRef, { value }, { merge: true });
        });
        await batch.commit();
        return properties;
    },

    getProperty: async (key, defaultValue) => {
        const docRef = doc(db, 'properties', key);
        const docSnap = await getDoc(docRef);
        return docSnap.exists() ? docSnap.data().value : defaultValue;
    },

    // Events
    getEvents: async () => {
        const { query, where } = await import('firebase/firestore');
        let eventsRef = collection(db, 'events');
        
        // If not logged in, only fetch public events (to satisfy security rules)
        if (!auth.currentUser) {
            eventsRef = query(eventsRef, where('visibility', '==', 'public'));
        }
        
        const querySnapshot = await getDocs(eventsRef);

        const events = await Promise.all(querySnapshot.docs.map(async (eventDoc) => {
            const eventData = eventDoc.data();

            // Fetch attendees for this event
            const attendeesRef = collection(db, 'event_attendees');
            const q = query(attendeesRef, where('event_id', '==', eventDoc.id));
            const attendeesSnapshot = await getDocs(q);
            const attendees = attendeesSnapshot.docs.map(doc => doc.data().member_id);

            return {
                ...eventData,
                id: eventDoc.id,
                eventType: eventData.event_type,
                createdBy: eventData.created_by,
                visibility: eventData.visibility || 'private',
                attendees: attendees
            };
        }));

        return events;
    },

    createEvent: async (event) => {
        const eventToInsert = { ...event };
        if (eventToInsert.eventType) {
            eventToInsert.event_type = eventToInsert.eventType;
            delete eventToInsert.eventType;
        }
        if (eventToInsert.createdBy) {
            eventToInsert.created_by = eventToInsert.createdBy;
            delete eventToInsert.createdBy;
        }

        const docRef = await addDoc(collection(db, 'events'), eventToInsert);
        const created = await getDoc(docRef);
        return {
            ...created.data(),
            id: docRef.id,
            eventType: created.data().event_type,
            attendees: []
        };
    },

    updateEvent: async (eventId, event) => {
        const eventToUpdate = { ...event };
        if (eventToUpdate.eventType) {
            eventToUpdate.event_type = eventToUpdate.eventType;
            delete eventToUpdate.eventType;
        }
        if (eventToUpdate.createdBy) {
            eventToUpdate.created_by = eventToUpdate.createdBy;
            delete eventToUpdate.createdBy;
        }

        const docRef = doc(db, 'events', eventId);
        await updateDoc(docRef, eventToUpdate);
        const updated = await getDoc(docRef);
        return {
            ...updated.data(),
            id: eventId,
            eventType: updated.data().event_type,
            attendees: event.attendees || []
        };
    },

    joinEvent: async (eventId, memberId) => {
        const attendeesRef = collection(db, 'event_attendees');
        const q = query(attendeesRef, where('event_id', '==', eventId), where('member_id', '==', memberId));
        const querySnapshot = await getDocs(q);

        if (querySnapshot.empty) {
            await addDoc(collection(db, 'event_attendees'), { event_id: eventId, member_id: memberId });
        }

        return mockService.getEvents().then(events => events.find(e => e.id === eventId));
    },

    leaveEvent: async (eventId, memberId) => {
        const attendeesRef = collection(db, 'event_attendees');
        const q = query(attendeesRef, where('event_id', '==', eventId), where('member_id', '==', memberId));
        const querySnapshot = await getDocs(q);

        if (!querySnapshot.empty) {
            await deleteDoc(doc(db, 'event_attendees', querySnapshot.docs[0].id));
        }

        return mockService.getEvents().then(events => events.find(e => e.id === eventId));
    },

    getAllContributions: async () => {
        const q = query(collection(db, 'contributions'), orderBy('date', 'desc'));
        const querySnapshot = await getDocs(q);
        return querySnapshot.docs.map(doc => ({ ...doc.data(), id: doc.id }));
    },

    getMemberContributions: async (memberId) => {
        const q = query(collection(db, 'contributions'), where('member_id', '==', memberId), orderBy('date', 'desc'));
        const querySnapshot = await getDocs(q);
        return querySnapshot.docs.map(doc => ({ ...doc.data(), id: doc.id }));
    },

    addContribution: async (contribution) => {
        const item = {
            ...contribution,
            member_id: contribution.member_id || contribution.memberId
        };
        delete item.memberId;
        const docRef = await addDoc(collection(db, 'contributions'), item);
        const created = await getDoc(docRef);
        return { ...created.data(), id: docRef.id };
    },

    getGlobalTransactions: async () => {
        const q = query(collection(db, 'global_transactions'), orderBy('date', 'desc'));
        const querySnapshot = await getDocs(q);
        return querySnapshot.docs.map(doc => ({ ...doc.data(), id: doc.id }));
    },

    addGlobalTransaction: async (tx) => {
        const docRef = await addDoc(collection(db, 'global_transactions'), tx);
        const created = await getDoc(docRef);
        return { ...created.data(), id: docRef.id };
    },

    deleteContribution: async (id) => {
        const docRef = doc(db, 'contributions', id);
        await deleteDoc(docRef);
        return { id };
    },

    deleteGlobalTransaction: async (id) => {
        const docRef = doc(db, 'global_transactions', id);
        await deleteDoc(docRef);
        return { id };
    },

    // Logs
    getLogs: async (max = 1000) => {
        try {
            const q = query(collection(db, 'logs'), orderBy('timestamp', 'desc'), limit(max));
            const querySnapshot = await getDocs(q);
            return querySnapshot.docs.map(doc => ({ ...doc.data(), id: doc.id }));
        } catch (error) {
            console.warn('mockService: Failed to fetch sorted logs, falling back to unsorted with in-memory sort:', error);
            // Fallback: Fetch all logs and sort them in memory
            const q = query(collection(db, 'logs'), limit(max));
            const querySnapshot = await getDocs(q);
            const logs = querySnapshot.docs.map(doc => ({ ...doc.data(), id: doc.id }));
            return logs.sort((a, b) => new Date(b.timestamp || 0) - new Date(a.timestamp || 0));
        }
    },

    createLog: async (log) => {
        const logToInsert = {
            timestamp: new Date().toISOString(),
            userId: log.userId || null,
            userEmail: log.userEmail || null,
            userName: log.userName || null,
            description: log.description || ''
        };
        const docRef = await addDoc(collection(db, 'logs'), logToInsert);
        const created = await getDoc(docRef);
        return { ...created.data(), id: docRef.id };
    },

    // Event Photos
    getEventPhotos: async (eventId) => {
        const q = query(collection(db, 'event_photos'), where('event_id', '==', eventId), orderBy('timestamp', 'desc'));
        const querySnapshot = await getDocs(q);
        return querySnapshot.docs.map(doc => ({ ...doc.data(), id: doc.id }));
    },

    addEventPhoto: async (photoData) => {
        const docRef = await addDoc(collection(db, 'event_photos'), {
            ...photoData,
            timestamp: new Date().toISOString()
        });
        const created = await getDoc(docRef);
        return { ...created.data(), id: docRef.id };
    },

    deleteEventPhoto: async (photoId) => {
        const docRef = doc(db, 'event_photos', photoId);
        await deleteDoc(docRef);
        return { id: photoId };
    },

    // Page Content Management
    getCustomPages: async () => {
        const querySnapshot = await getDocs(collection(db, 'pages'));
        return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    },

    getPageContent: async (pageId) => {
        const docRef = doc(db, 'pages', pageId);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
            return { id: docSnap.id, ...docSnap.data() };
        }
        return null; // Return null if not found
    },

    updatePageContent: async (pageId, content, images = [], title = '', path = '', coverImage = undefined) => {
        const docRef = doc(db, 'pages', pageId);
        const data = { content, images, updatedAt: new Date().toISOString() };
        if (title) data.title = title;
        if (path) data.path = path;
        if (coverImage !== undefined) data.coverImage = coverImage;

        await setDoc(docRef, data, { merge: true });
        return { id: pageId, ...data };
    },

    deleteCustomPage: async (pageId) => {
        const docRef = doc(db, 'pages', pageId);
        await deleteDoc(docRef);
        return { id: pageId };
    },

    // Vehicles
    getMemberVehicles: async (memberId) => {
        const q = query(collection(db, 'vehicles'), where('member_id', '==', memberId));
        const querySnapshot = await getDocs(q);
        return querySnapshot.docs.map(doc => ({ ...doc.data(), id: doc.id }));
    },

    addVehicle: async (vehicle) => {
        const docRef = await addDoc(collection(db, 'vehicles'), vehicle);
        const created = await getDoc(docRef);
        return { ...created.data(), id: docRef.id };
    },

    updateVehicle: async (vehicleId, vehicle) => {
        const docRef = doc(db, 'vehicles', vehicleId);
        await updateDoc(docRef, vehicle);
        const updated = await getDoc(docRef);
        return { ...updated.data(), id: vehicleId };
    },

    deleteVehicle: async (vehicleId) => {
        const docRef = doc(db, 'vehicles', vehicleId);
        await deleteDoc(docRef);
        return { id: vehicleId };
    },

    // Storage
    uploadImage: async (path, file) => {
        const storageRef = ref(storage, path);
        await uploadBytes(storageRef, file);
        return await getDownloadURL(storageRef);
    },

    deleteImageByUrl: async (url) => {
        const storageRef = ref(storage, url);
        await deleteObject(storageRef);
    }
};



