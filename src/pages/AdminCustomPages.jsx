import { useState, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { useConfirm, useAlert } from '../context/ConfirmContext';
import { useSettings } from '../context/SettingsContext';
import { mockService } from '../services/mockData';
import RichTextEditor from '../components/RichTextEditor';
import { FaPlus, FaTrash, FaEdit, FaExternalLinkAlt, FaTimes, FaUpload, FaSpinner, FaImage } from 'react-icons/fa';
import { Link } from 'react-router-dom';

const emptyForm = { title: '', path: '', coverImage: '' };

const AdminCustomPages = () => {
    const { isAdmin, user } = useAuth();
    const { t } = useLanguage();
    const confirm = useConfirm();
    const alert = useAlert();
    const { customPages, refreshSettings } = useSettings();
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [editingPage, setEditingPage] = useState(null);
    const [formData, setFormData] = useState(emptyForm);
    const [isSaving, setIsSaving] = useState(false);
    const [isUploadingCover, setIsUploadingCover] = useState(false);
    const editorRef = useRef(null);
    const coverInputRef = useRef(null);

    const openCreateForm = () => {
        setEditingPage(null);
        setFormData(emptyForm);
        setIsFormOpen(true);
    };

    const [pendingContent, setPendingContent] = useState('');
    const [isLoadingPage, setIsLoadingPage] = useState(false);

    const handleEditClick = async (page) => {
        setIsLoadingPage(true);
        try {
            // Content isn't loaded in the list view, fetch the full page doc for editing.
            const fullPage = await mockService.getPageContent(page.id);
            setEditingPage(page);
            setFormData({ title: page.title, path: page.path, coverImage: page.coverImage || '' });
            setPendingContent(fullPage?.content || '');
            setIsFormOpen(true);
        } catch (err) {
            console.error('Error loading page content:', err);
            await alert(t('common.error') || 'Error loading page');
        } finally {
            setIsLoadingPage(false);
        }
    };

    const handleCoverUpload = async (e) => {
        const file = e.target.files[0];
        if (!file) return;
        setIsUploadingCover(true);
        try {
            const fileName = `cover_${Date.now()}_${file.name}`;
            const storagePath = `pages/${editingPage?.id || 'new'}/${fileName}`;
            const url = await mockService.uploadImage(storagePath, file);
            setFormData(prev => ({ ...prev, coverImage: url }));
        } catch (err) {
            console.error('Error uploading cover image:', err);
            await alert(t('pageEditor.errorUpload'));
        } finally {
            setIsUploadingCover(false);
            e.target.value = '';
        }
    };

    const handleSave = async (e) => {
        e.preventDefault();
        if (!formData.title || !formData.path) return;

        const normalizedPath = formData.path.replace(/^\//, '').toLowerCase().trim();
        const pageId = normalizedPath.replace(/\//g, '_');

        const isDuplicate = customPages.some(p =>
            p.path === normalizedPath && (!editingPage || p.id !== editingPage.id)
        );

        if (isDuplicate) {
            await alert(t('admin.duplicatePathError') || 'A page with this path already exists.');
            return;
        }

        setIsSaving(true);
        try {
            if (editingPage && editingPage.id !== pageId) {
                await mockService.deleteCustomPage(editingPage.id);
            }

            const content = editorRef.current?.getHTML() ?? pendingContent;
            const images = editorRef.current?.getImages() ?? [];

            await mockService.updatePageContent(
                pageId,
                content,
                images,
                formData.title,
                normalizedPath,
                formData.coverImage || ''
            );

            await mockService.createLog({
                userId: user.id || user.uid,
                userName: user.profile?.name || user.email,
                userEmail: user.email,
                description: `${editingPage ? 'Updated' : 'Created'} custom page: ${formData.title} (/pages/${normalizedPath})`
            });

            setFormData(emptyForm);
            setPendingContent('');
            setIsFormOpen(false);
            setEditingPage(null);
            await refreshSettings();
        } catch (err) {
            console.error('Error saving page:', err);
            await alert(t('common.error') || 'Error saving page');
        } finally {
            setIsSaving(false);
        }
    };

    const handleDelete = async (pageId, title) => {
        const displayTitle = title;
        if (!(await confirm(t('common.confirmDelete') || `Are you sure you want to delete "${displayTitle}"?`))) return;

        try {
            await mockService.deleteCustomPage(pageId);

            await mockService.createLog({
                userId: user.id || user.uid,
                userName: user.profile?.name || user.email,
                userEmail: user.email,
                description: `Deleted custom page: ${displayTitle}`
            });

            await refreshSettings();
        } catch (err) {
            console.error('Error deleting page:', err);
            await alert(t('common.error') || 'Error deleting page');
        }
    };

    if (!isAdmin) return <div className="container">{t('common.unauthorized')}</div>;

    return (
        <div className="container admin-custom-pages">
            <header className="page-header">
                <h1 className="page-title">{t('admin.customPages')}</h1>
                <button className="btn btn-primary" onClick={openCreateForm}>
                    <FaPlus /> {t('admin.createPage')}
                </button>
            </header>

            {isFormOpen && (
                <div className="card create-form animate-fade-in">
                    <div className="card-header">
                        <h2>{editingPage ? t('admin.editPage') || 'Edit Page' : t('admin.newPage')}</h2>
                        <button className="btn-close" onClick={() => setIsFormOpen(false)}><FaTimes /></button>
                    </div>
                    <form onSubmit={handleSave} className="form-vertical">
                        <div className="form-row">
                            <div className="form-group">
                                <label>{t('admin.pageTitle')}</label>
                                <input
                                    type="text"
                                    className="input-field"
                                    value={formData.title}
                                    onChange={e => setFormData({ ...formData, title: e.target.value })}
                                    placeholder="e.g. Terms of Service"
                                    required
                                />
                            </div>
                            <div className="form-group">
                                <label>{t('admin.pagePath')}</label>
                                <div className="path-input-wrapper">
                                    <span className="path-prefix">/pages/</span>
                                    <input
                                        type="text"
                                        className="input-field"
                                        value={formData.path}
                                        onChange={e => setFormData({ ...formData, path: e.target.value })}
                                        placeholder="e.g. terms"
                                        required
                                    />
                                </div>
                                <small className="form-hint">{t('admin.pathHint')}</small>
                            </div>
                        </div>

                        <div className="form-group">
                            <label>{t('pageEditor.coverImage')}</label>
                            <small className="form-hint">{t('pageEditor.coverImageDesc')}</small>
                            <div className="cover-image-field">
                                {formData.coverImage ? (
                                    <div className="cover-preview">
                                        <img src={formData.coverImage} alt="Cover" />
                                        <button
                                            type="button"
                                            className="btn-icon delete cover-remove"
                                            onClick={() => setFormData(prev => ({ ...prev, coverImage: '' }))}
                                            title={t('pageEditor.removeCoverImage')}
                                        >
                                            <FaTrash />
                                        </button>
                                    </div>
                                ) : (
                                    <button
                                        type="button"
                                        className="btn btn-outline cover-upload-btn"
                                        onClick={() => coverInputRef.current?.click()}
                                        disabled={isUploadingCover}
                                    >
                                        {isUploadingCover ? <FaSpinner className="icon-spin" /> : <FaImage />}
                                        {t('pageEditor.uploadImage')}
                                    </button>
                                )}
                                <input
                                    type="file"
                                    ref={coverInputRef}
                                    style={{ display: 'none' }}
                                    accept="image/*"
                                    onChange={handleCoverUpload}
                                />
                            </div>
                        </div>

                        <div className="form-group">
                            <label>{t('pageEditor.content')}</label>
                            <RichTextEditor
                                key={editingPage?.id || 'new'}
                                ref={editorRef}
                                initialValue={pendingContent}
                                storagePathPrefix={`pages/${editingPage?.id || 'new'}`}
                                placeholder={t('pageEditor.placeholder')}
                            />
                        </div>

                        <div className="form-actions">
                            <button type="button" className="btn btn-outline" onClick={() => setIsFormOpen(false)}>
                                {t('common.cancel')}
                            </button>
                            <button type="submit" className="btn btn-primary" disabled={isSaving}>
                                {isSaving ? t('common.saving') : t('common.save')}
                            </button>
                        </div>
                    </form>
                </div>
            )}

            <div className="pages-list">
                {customPages.length === 0 ? (
                    <div className="card empty-state">
                        <p>{t('admin.noCustomPages')}</p>
                    </div>
                ) : (
                    <div className="pages-grid">
                        {customPages.map(page => (
                            <div key={page.id} className="card page-card">
                                {page.coverImage && (
                                    <img src={page.coverImage} alt={page.title} className="page-card-cover" />
                                )}
                                <div className="page-card-body">
                                    <div className="page-info">
                                        <h3>{page.title}</h3>
                                        <p className="page-path">/pages/{page.path}</p>
                                    </div>
                                    <div className="page-actions">
                                        <button className="btn-icon" onClick={() => handleEditClick(page)} disabled={isLoadingPage} title={t('common.edit')}>
                                            <FaEdit />
                                        </button>
                                        <Link to={`/pages/${page.path}`} className="btn-icon" title={t('common.view')}>
                                            <FaExternalLinkAlt />
                                        </Link>
                                        <button className="btn-icon delete" onClick={() => handleDelete(page.id, page.title)} title={t('common.delete')}>
                                            <FaTrash />
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            <style>{`
                .admin-custom-pages {
                    padding-top: 2rem;
                }
                .create-form {
                    margin-bottom: 2rem;
                    max-width: 900px;
                }
                .card-header {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    margin-bottom: 1.5rem;
                }
                .btn-close {
                    background: none;
                    border: none;
                    color: var(--text-secondary);
                    cursor: pointer;
                    font-size: 1.2rem;
                }
                .form-vertical {
                    display: flex;
                    flex-direction: column;
                    gap: 1.5rem;
                }
                .form-row {
                    display: grid;
                    grid-template-columns: 1fr 1fr;
                    gap: 1rem;
                }
                .form-group {
                    display: flex;
                    flex-direction: column;
                    gap: 0.5rem;
                }
                .path-input-wrapper {
                    display: flex;
                    align-items: center;
                    gap: 0.5rem;
                }
                .path-prefix {
                    color: var(--text-secondary);
                    font-weight: 600;
                }
                .form-hint {
                    color: var(--text-secondary);
                    font-size: 0.8rem;
                }
                .form-actions {
                    display: flex;
                    justify-content: flex-end;
                    gap: 1rem;
                }
                .cover-image-field {
                    display: flex;
                }
                .cover-upload-btn {
                    display: flex;
                    align-items: center;
                    gap: 0.5rem;
                }
                .cover-preview {
                    position: relative;
                    width: 100%;
                    max-width: 400px;
                }
                .cover-preview img {
                    width: 100%;
                    max-height: 200px;
                    object-fit: cover;
                    border-radius: 0.75rem;
                    border: 1px solid var(--glass-border);
                }
                .cover-remove {
                    position: absolute;
                    top: 0.5rem;
                    right: 0.5rem;
                    background: rgba(0,0,0,0.6);
                }
                .icon-spin {
                    animation: spin 1s linear infinite;
                }
                @keyframes spin {
                    from { transform: rotate(0deg); }
                    to { transform: rotate(360deg); }
                }
                .pages-grid {
                    display: grid;
                    grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
                    gap: 1.5rem;
                }
                .page-card {
                    display: flex;
                    flex-direction: column;
                    padding: 0;
                    overflow: hidden;
                }
                .page-card-cover {
                    width: 100%;
                    height: 120px;
                    object-fit: cover;
                }
                .page-card-body {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    padding: 1.5rem;
                }
                .page-info h3 {
                    margin: 0 0 0.5rem 0;
                    color: var(--primary);
                }
                .page-path {
                    color: var(--text-secondary);
                    font-size: 0.9rem;
                    font-family: monospace;
                }
                .page-actions {
                    display: flex;
                    gap: 0.75rem;
                }
                .btn-icon {
                    background: none;
                    border: 1px solid var(--glass-border);
                    color: var(--text-secondary);
                    width: 36px;
                    height: 36px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    border-radius: 0.5rem;
                    cursor: pointer;
                    transition: all 0.2s;
                    text-decoration: none;
                }
                .btn-icon:hover {
                    border-color: var(--primary);
                    color: var(--primary);
                    background: rgba(255, 255, 255, 0.05);
                }
                .btn-icon.delete:hover {
                    border-color: #ef4444;
                    color: #ef4444;
                    background: rgba(239, 68, 68, 0.1);
                }
                .empty-state {
                    text-align: center;
                    padding: 3rem;
                    color: var(--text-secondary);
                }
                .animate-fade-in {
                    animation: fadeIn 0.3s ease-out;
                }
                @keyframes fadeIn {
                    from { opacity: 0; transform: translateY(10px); }
                    to { opacity: 1; transform: translateY(0); }
                }
                @media (max-width: 640px) {
                    .form-row {
                        grid-template-columns: 1fr;
                    }
                }
            `}</style>
        </div>
    );
};

export default AdminCustomPages;
