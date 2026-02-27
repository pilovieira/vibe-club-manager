import { storage } from '../firebase/config';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';

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
    }
};
