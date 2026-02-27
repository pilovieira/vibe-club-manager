import { storage } from '../firebase/config';
import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';

export const storageService = {
    /**
     * Uploads an avatar image for a specific user
     * @param {string} userId - ID of the user
     * @param {File} file - Image file to upload
     * @returns {Promise<string>} - Download URL of the uploaded image
     */
    uploadAvatar: async (userId, file) => {
        if (!file) throw new Error('No file provided');

        // Check file type
        if (!file.type.startsWith('image/')) {
            throw new Error('Only image files are allowed');
        }

        // Check file size (max 2MB)
        const maxSize = 2 * 1024 * 1024;
        if (file.size > maxSize) {
            throw new Error('File size should be less than 2MB');
        }

        const storageRef = ref(storage, `avatars/${userId}/${Date.now()}_${file.name}`);

        try {
            const snapshot = await uploadBytes(storageRef, file);
            const downloadURL = await getDownloadURL(snapshot.ref);
            return downloadURL;
        } catch (error) {
            console.error('Error uploading avatar:', error);
            throw new Error('Failed to upload image. Please try again.');
        }
    },

    /**
     * Uploads a photo to an event gallery
     * @param {string} eventId - ID of the event
     * @param {string} userId - ID of the user uploading
     * @param {File} file - Image file to upload
     * @returns {Promise<string>} - Download URL of the uploaded image
     */
    uploadEventPhoto: async (eventId, userId, file) => {
        if (!file) throw new Error('No file provided');

        // Check file type
        if (!file.type.startsWith('image/')) {
            throw new Error('Only image files are allowed');
        }

        // Check file size (max 10MB)
        const maxSize = 10 * 1024 * 1024;
        if (file.size > maxSize) {
            throw new Error('File size should be less than 10MB');
        }

        const storageRef = ref(storage, `events/${eventId}/photos/${Date.now()}_${file.name}`);

        const metadata = {
            customMetadata: {
                'uploadedById': userId
            }
        };

        try {
            const snapshot = await uploadBytes(storageRef, file, metadata);
            const downloadURL = await getDownloadURL(snapshot.ref);
            return downloadURL;
        } catch (error) {
            console.error('Error uploading event photo:', error);
            throw new Error('Failed to upload image. Please try again.');
        }
    },

    deleteFile: async (fileUrl) => {
        if (!fileUrl) return;
        try {
            const fileRef = ref(storage, fileUrl);
            await deleteObject(fileRef);
        } catch (error) {
            console.error('Error deleting file from storage:', error);
        }
    }
};
