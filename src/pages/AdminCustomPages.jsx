import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { useConfirm, useAlert } from '../context/ConfirmContext';
import { useSettings } from '../context/SettingsContext';
import { mockService } from '../services/mockData';
import { FaPlus, FaTrash, FaEdit, FaExternalLinkAlt, FaTimes } from 'react-icons/fa';
import { Link } from 'react-router-dom';

const AdminCustomPages = () => {
    const { isAdmin, user } = useAuth();
    const { t } = useLanguage();
    const confirm = useConfirm();
    const alert = useAlert();
    const { customPages, refreshSettings } = useSettings();
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [editingPage, setEditingPage] = useState(null);
    const [formData, setFormData] = useState({ title: '', path: '' });
    const [isSaving, setIsSaving] = useState(false);

    const openCreateForm = () => {
        setEditingPage(null);
        setFormData({ title: '', path: '' });
        setIsFormOpen(true);
    };

    const openEditForm = (page) => {
        setEditingPage(page);
        setFormData({ title: page.title, path: page.path });
        setIsFormOpen(true);
    };

    const handleSave = async (e) => {
        e.preventDefault();
        if (!formData.title || !formData.path) return;

        // Normalize path: remove leading / and lowercase
        const normalizedPath = formData.path.replace(/^\//, '').toLowerCase().trim();
        const pageId = normalizedPath.replace(/\//g, '_');

        // Validation: Check for repeated pages
        const isDuplicate = customPages.some(p =>
            p.path === normalizedPath && (!editingPage || p.id !== editingPage.id)
        );

        if (isDuplicate) {
            await alert(t('admin.duplicatePathError') || 'A page with this path already exists.');
            return;
        }

        setIsSaving(true);
        try {
            // If editing, we might be changing the ID if the path changes
            // But usually we just update the content if ID is path-based.
            // If path changed, we should probably delete the old one and create new or just update if we use a stable ID.
            // mockService.updatePageContent uses pageId as the doc ID.

            if (editingPage && editingPage.id !== pageId) {
                // Path changed -> New ID. Delete old one.
                await mockService.deleteCustomPage(editingPage.id);
            }

            // Update/Create
            await mockService.updatePageContent(
                pageId,
                editingPage?.content || '',
                editingPage?.images || [],
                formData.title,
                normalizedPath
            );

            await mockService.createLog({
                userId: user.id || user.uid,
                userName: user.name || user.displayName || user.email,
                userEmail: user.email,
                description: `${editingPage ? 'Updated' : 'Created'} custom page: ${formData.title} (/pages/${normalizedPath})`
            });

            setFormData({ title: '', path: '' });
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
                userName: user.name || user.displayName || user.email,
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
                        <div className="form-group">
                            <label>{t('admin.pageTitle')}</label>
                            <textarea
                                className="input-field"
                                value={formData.title}
                                onChange={e => setFormData({ ...formData, title: e.target.value })}
                                placeholder="e.g. Terms of Service"
                                rows={4}
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
                                <div className="page-info">
                                    <h3>{page.title}</h3>
                                    <p className="page-path">/pages/{page.path}</p>
                                </div>
                                <div className="page-actions">
                                    <button className="btn-icon" onClick={() => openEditForm(page)} title={t('common.edit')}>
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
                    max-width: 600px;
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
                    margin-top: 0.25rem;
                }
                .form-actions {
                    display: flex;
                    justify-content: flex-end;
                    gap: 1rem;
                }
                .pages-grid {
                    display: grid;
                    grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
                    gap: 1.5rem;
                }
                .page-card {
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
                textarea.input-field {
                   font-family: monospace;
                   font-size: 0.9rem;
                   resize: vertical;
                }
            `}</style>
        </div>
    );
};

export default AdminCustomPages;
