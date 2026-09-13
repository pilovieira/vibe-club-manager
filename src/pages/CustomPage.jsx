import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { useAlert } from '../context/ConfirmContext';
import { mockService } from '../services/mockData';
import RichTextEditor from '../components/RichTextEditor';
import { FaEdit, FaSave, FaSpinner } from 'react-icons/fa';

const CustomPage = () => {
    const { path } = useParams();
    const { isAdmin, user } = useAuth();
    const { t } = useLanguage();
    const alert = useAlert();
    const navigate = useNavigate();
    const [pageData, setPageData] = useState(null);
    const [isEditing, setIsEditing] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const editorRef = useRef(null);
    const staticContentRef = useRef(null);

    useEffect(() => {
        if (!isLoading && pageData && staticContentRef.current && !isEditing) {
            staticContentRef.current.innerHTML = pageData.content || '';
        }
    }, [isLoading, pageData, isEditing]);

    useEffect(() => {
        const fetchContent = async () => {
            setIsLoading(true);
            try {
                const pageId = path.replace(/\//g, '_').toLowerCase();
                const data = await mockService.getPageContent(pageId);
                if (data) {
                    setPageData(data);
                } else {
                    console.error('Page not found:', path);
                    navigate('/');
                }
            } catch (err) {
                console.error('Error fetching custom page content:', err);
                navigate('/');
            } finally {
                setIsLoading(false);
            }
        };
        fetchContent();
        setIsEditing(false); // Reset editing state when path changes
    }, [path, navigate]);

    const handleSave = async () => {
        const newContent = editorRef.current?.getHTML() ?? '';
        const imageUrls = editorRef.current?.getImages() ?? [];
        setIsSaving(true);
        try {
            await mockService.updatePageContent(pageData.id, newContent, imageUrls, '', '', pageData.coverImage || '');
            setPageData({ ...pageData, content: newContent, images: imageUrls });
            setIsEditing(false);

            await mockService.createLog({
                userId: user.id || user.uid,
                userName: user.name || user.displayName || user.email,
                description: `Updated custom page content: ${pageData.title}`
            });
        } catch (err) {
            console.error('Error saving page content:', err);
            await alert(t('common.error') || 'Error saving content');
        } finally {
            setIsSaving(false);
        }
    };

    if (isLoading) {
        return <div className="container" style={{ paddingTop: '2rem' }}>{t('common.loading')}</div>;
    }

    if (!pageData) return null;

    return (
        <div className="container custom-page">
            {pageData.coverImage && (
                <div className="page-cover">
                    <img src={pageData.coverImage} alt={pageData.title} />
                </div>
            )}

            <header className="page-header">
                <h1 className="page-title">{pageData.title}</h1>
                {isAdmin && (
                    <div className="admin-actions">
                        {!isEditing ? (
                            <button className="btn btn-outline" onClick={() => setIsEditing(true)}>
                                <FaEdit /> {t('pageEditor.edit')}
                            </button>
                        ) : (
                            <button className="btn btn-primary" onClick={handleSave} disabled={isSaving}>
                                {isSaving ? <FaSpinner className="icon-spin" /> : <FaSave />} {t('pageEditor.save')}
                            </button>
                        )}
                    </div>
                )}
            </header>

            {isAdmin && !isEditing && <p className="admin-hint text-secondary">{t('pageEditor.hint')}</p>}

            <div className="card custom-page-content-card">
                {isEditing ? (
                    <RichTextEditor
                        ref={editorRef}
                        initialValue={pageData.content}
                        storagePathPrefix={`pages/${pageData.id}`}
                        placeholder={t('pageEditor.placeholder')}
                    />
                ) : (
                    <div ref={staticContentRef} className="custom-page-content" />
                )}
            </div>

            <style>{`
                .custom-page {
                    padding-top: 2rem;
                    max-width: 900px;
                }
                .page-cover {
                    width: 100%;
                    max-height: 320px;
                    overflow: hidden;
                    border-radius: 1rem;
                    margin-bottom: 1.5rem;
                }
                .page-cover img {
                    width: 100%;
                    height: 100%;
                    object-fit: cover;
                }
                .admin-hint {
                    margin-bottom: 1rem;
                    font-size: 0.9rem;
                    font-style: italic;
                }
                .custom-page-content-card {
                    padding: 2.5rem;
                    line-height: 1.8;
                }
                .custom-page-content-card:has(.rich-text-editor) {
                    padding: 0;
                }
                .custom-page-content {
                    font-size: 1.1rem;
                }
                .custom-page-content h1, .custom-page-content h2, .custom-page-content h3 {
                    margin-top: 2rem;
                    margin-bottom: 1rem;
                }
                .custom-page-content p {
                    margin-bottom: 1.5rem;
                }
                .custom-page-content ul, .custom-page-content ol {
                    margin-bottom: 1.5rem;
                    padding-left: 2rem;
                }
                .custom-page-content blockquote {
                    border-left: 3px solid var(--primary);
                    margin: 1rem 0;
                    padding: 0.5rem 0 0.5rem 1.25rem;
                    color: var(--text-secondary);
                    font-style: italic;
                }
                .custom-page-content img {
                    max-width: 100%;
                    border-radius: 0.5rem;
                    margin: 1.5rem 0;
                }
                .custom-page-content a {
                    color: var(--primary);
                    text-decoration: underline;
                }
                .icon-spin {
                    animation: spin 1s linear infinite;
                }
                @keyframes spin {
                    from { transform: rotate(0deg); }
                    to { transform: rotate(360deg); }
                }
            `}</style>
        </div>
    );
};

export default CustomPage;
