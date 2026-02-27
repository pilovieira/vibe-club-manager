import { db } from '../firebase/config';
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
    orderBy
} from 'firebase/firestore';

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
        return props;
    },

    updateProperty: async (key, value) => {
        const docRef = doc(db, 'properties', key);
        await setDoc(docRef, { value });
        return { key, value };
    },

    getProperty: async (key, defaultValue) => {
        const docRef = doc(db, 'properties', key);
        const docSnap = await getDoc(docRef);
        return docSnap.exists() ? docSnap.data().value : defaultValue;
    },

    // Events
    getEvents: async () => {
        const eventsRef = collection(db, 'events');
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

        const docRef = await addDoc(collection(db, 'events'), eventToInsert);
        const created = await getDoc(docRef);
        return { ...created.data(), id: docRef.id, attendees: [] };
    },

    updateEvent: async (eventId, event) => {
        const eventToUpdate = { ...event };
        if (eventToUpdate.eventType) {
            eventToUpdate.event_type = eventToUpdate.eventType;
            delete eventToUpdate.eventType;
        }

        const docRef = doc(db, 'events', eventId);
        await updateDoc(docRef, eventToUpdate);
        const updated = await getDoc(docRef);
        return { ...updated.data(), id: eventId };
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

    getExpenses: async () => {
        const q = query(collection(db, 'expenses'), orderBy('date', 'desc'));
        const querySnapshot = await getDocs(q);
        return querySnapshot.docs.map(doc => ({ ...doc.data(), id: doc.id }));
    },

    addExpense: async (expense) => {
        const docRef = await addDoc(collection(db, 'expenses'), expense);
        const created = await getDoc(docRef);
        return { ...created.data(), id: docRef.id };
    },

    deleteContribution: async (id) => {
        const docRef = doc(db, 'contributions', id);
        await deleteDoc(docRef);
        return { id };
    },

    deleteExpense: async (id) => {
        const docRef = doc(db, 'expenses', id);
        await deleteDoc(docRef);
        return { id };
    },

    // Logs
    getLogs: async () => {
        const q = query(collection(db, 'logs'), orderBy('timestamp', 'desc'));
        const querySnapshot = await getDocs(q);
        return querySnapshot.docs.map(doc => ({ ...doc.data(), id: doc.id }));
    },

    createLog: async (log) => {
        const logToInsert = {
            ...log,
            timestamp: new Date().toISOString(),
            userId: log.userId,
            userName: log.userName,
            description: log.description
        };
        const docRef = await addDoc(collection(db, 'logs'), logToInsert);
        const created = await getDoc(docRef);
        return { ...created.data(), id: docRef.id };
    }
};



