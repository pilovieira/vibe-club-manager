import { supabase } from '../supabaseClient';

// We keep the export name as mockService for compatibility with existing components
// but it now talks to real Supabase tables.
export const mockService = {
    // Members
    getMembers: async () => {
        const { data, error } = await supabase
            .from('members')
            .select('*')
            .order('name');
        if (error) throw error;

        return data.map(member => ({
            ...member,
            joinDate: member.join_date,
            dateBirth: member.date_birth,
            avatar: member.avatar || 'https://via.placeholder.com/150?text=Member'
        }));
    },

    getMemberById: async (id) => {
        const { data, error } = await supabase
            .from('members')
            .select('*')
            .eq('id', id)
            .single();
        if (error) throw error;
        if (!data) return null;

        return {
            ...data,
            joinDate: data.join_date,
            dateBirth: data.date_birth,
            avatar: data.avatar || 'https://via.placeholder.com/150?text=Member'
        };
    },

    createMember: async (member) => {
        const memberToInsert = {
            ...member,
            join_date: member.joinDate || new Date().toISOString(),
            date_birth: member.dateBirth,
            role: member.role || 'member',
            status: member.status || 'active'
        };
        // Remove camelCase fields that don't exist in DB
        delete memberToInsert.joinDate;
        delete memberToInsert.dateBirth;

        const { data, error } = await supabase
            .from('members')
            .insert([memberToInsert])
            .select()
            .single();
        if (error) throw error;

        return {
            ...data,
            joinDate: data.join_date,
            dateBirth: data.date_birth,
            avatar: data.avatar || 'https://via.placeholder.com/150?text=Member'
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

        const { data, error } = await supabase
            .from('members')
            .update(memberToUpdate)
            .eq('id', id)
            .select()
            .single();
        if (error) throw error;

        return {
            ...data,
            joinDate: data.join_date,
            dateBirth: data.date_birth,
            avatar: data.avatar || 'https://via.placeholder.com/150?text=Member'
        };
    },

    updateMemberStatus: async (memberId, status) => {
        const { data, error } = await supabase
            .from('members')
            .update({ status })
            .eq('id', memberId)
            .select()
            .single();
        if (error) throw error;
        return data;
    },

    // Cars
    getCars: async (memberId) => {
        let query = supabase.from('cars').select('*');
        if (memberId) query = query.eq('member_id', memberId);
        const { data, error } = await query;
        if (error) throw error;
        return data;
    },

    addCar: async (car) => {
        const { data, error } = await supabase
            .from('cars')
            .insert([car])
            .select()
            .single();
        if (error) throw error;
        return data;
    },

    updateCar: async (updatedCar) => {
        const { data, error } = await supabase
            .from('cars')
            .update(updatedCar)
            .eq('id', updatedCar.id)
            .select()
            .single();
        if (error) throw error;
        return data;
    },

    deleteCar: async (carId) => {
        const { error } = await supabase
            .from('cars')
            .delete()
            .eq('id', carId);
        if (error) throw error;
    },

    // Events
    getEvents: async () => {
        const { data, error } = await supabase
            .from('events')
            .select(`
                *,
                event_attendees(member_id)
            `)
            .order('date', { ascending: true });
        if (error) throw error;

        // Transform Supabase structure to match frontend expectations
        return data.map(event => ({
            ...event,
            attendees: event.event_attendees.map(a => a.member_id)
        }));
    },

    createEvent: async (event) => {
        const { data, error } = await supabase
            .from('events')
            .insert([event])
            .select()
            .single();
        if (error) throw error;
        return { ...data, attendees: [] };
    },

    updateEvent: async (eventId, updatedEvent) => {
        const { data, error } = await supabase
            .from('events')
            .update(updatedEvent)
            .eq('id', eventId)
            .select()
            .single();
        if (error) throw error;
        return data;
    },

    joinEvent: async (eventId, memberId) => {
        const { error } = await supabase
            .from('event_attendees')
            .insert([{ event_id: eventId, member_id: memberId }]);
        if (error) throw error;

        // Refetch event or return updated state locally
        return this.getEvents().then(events => events.find(e => e.id === eventId));
    },

    leaveEvent: async (eventId, memberId) => {
        const { error } = await supabase
            .from('event_attendees')
            .delete()
            .match({ event_id: eventId, member_id: memberId });
        if (error) throw error;

        return this.getEvents().then(events => events.find(e => e.id === eventId));
    },

    // Contributions & Expenses (To be implemented later if needed)
    getAllContributions: async () => {
        const { data, error } = await supabase.from('contributions').select('*');
        if (error) throw error;
        return data;
    },

    getExpenses: async () => {
        const { data, error } = await supabase.from('expenses').select('*');
        if (error) throw error;
        return data;
    }
};
