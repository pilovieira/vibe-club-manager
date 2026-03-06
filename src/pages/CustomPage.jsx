import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { mockService } from '../services/mockData';
import { FaEdit, FaSave, FaSpinner, FaBold, FaItalic, FaListUl, FaListOl, FaLink, FaImage, FaUpload, FaTrash, FaHeading } from 'react-icons/fa';

const CustomPage = () => {
    const { path } = useParams();
    const { isAdmin, user } = useAuth();
    const { t, getTranslatedTitle } = useLanguage();
    const navigate = useNavigate();
    const [pageData, setPageData] = useState(null);
    const [isEditing, setIsEditing] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [isUploading, setIsUploading] = useState(false);
    const [showLinkModal, setShowLinkModal] = useState(false);
    const [linkData, setLinkData] = useState({ text: '', url: '' });
    const [resizingImg, setResizingImg] = useState(null);
    const [startSize, setStartSize] = useState({ width: 0, x: 0 });
    const [hoveredImg, setHoveredImg] = useState(null);
    const [imgRect, setImgRect] = useState(null);
    const editorRef = useRef(null);
    const fileInputRef = useRef(null);

    useEffect(() => {
        const handleMouseMove = (e) => {
            if (!resizingImg) return;
            const deltaX = e.clientX - startSize.x;
            const newWidth = Math.max(50, startSize.width + deltaX);
            resizingImg.style.width = `${newWidth}px`;
            resizingImg.style.height = 'auto';
        };

        const handleMouseUp = () => {
            setResizingImg(null);
        };

        if (resizingImg) {
            window.addEventListener('mousemove', handleMouseMove);
            window.addEventListener('mouseup', handleMouseUp);
        }
        return () => {
            window.removeEventListener('mousemove', handleMouseMove);
            window.removeEventListener('mouseup', handleMouseUp);
        };
    }, [resizingImg, startSize]);

    useEffect(() => {
        if (!isLoading && pageData && editorRef.current && !isEditing) {
            editorRef.current.innerHTML = pageData.content || '';
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
                    // Page not found
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
        const newContent = editorRef.current.innerHTML;
        const imageUrls = Array.from(editorRef.current.querySelectorAll('img')).map(img => img.src);
        setIsSaving(true);
        try {
            await mockService.updatePageContent(pageData.id, newContent, imageUrls);
            setPageData({ ...pageData, content: newContent, images: imageUrls });
            setIsEditing(false);

            // Create log
            await mockService.createLog({
                userId: user.id || user.uid,
                userName: user.name || user.displayName || user.email,
                description: `Updated custom page content: ${pageData.title}`
            });
        } catch (err) {
            console.error('Error saving page content:', err);
            alert(t('common.error') || 'Error saving content');
        } finally {
            setIsSaving(false);
        }
    };

    const execCommand = (command, value = null) => {
        if (editorRef.current) editorRef.current.focus();
        document.execCommand(command, false, value);
    };

    const addLink = () => {
        const selection = window.getSelection();
        const selectedText = selection.toString();
        setLinkData({ text: selectedText, url: '' });
        setShowLinkModal(true);
    };

    const handleLinkSubmit = (e) => {
        e.preventDefault();
        if (!linkData.url) return;

        if (editorRef.current) {
            editorRef.current.focus();

            // If text is provided, insert a linked text, otherwise just the URL
            const textToInsert = linkData.text || linkData.url;
            const linkHtml = `<a href="${linkData.url}" target="_blank" rel="noopener noreferrer">${textToInsert}</a>`;

            document.execCommand('insertHTML', false, linkHtml);
        }

        setShowLinkModal(false);
        setLinkData({ text: '', url: '' });
    };

    const addImage = () => {
        const url = prompt('Enter image URL:');
        if (url) execCommand('insertImage', url);
    };

    const handleFileUpload = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        setIsUploading(true);
        try {
            const fileName = `custom_page_${pageData.id}_${Date.now()}_${file.name}`;
            const storagePath = `pages/${pageData.id}/${fileName}`;
            const downloadUrl = await mockService.uploadImage(storagePath, file);

            // Ensure editor has focus
            if (editorRef.current) {
                editorRef.current.focus();
                // If it's the first image/content, it might need an extra push
                document.execCommand('insertImage', false, downloadUrl);

                // Fallback for some browsers if execCommand fails
                const img = editorRef.current.querySelector(`img[src="${downloadUrl}"]`);
                if (!img) {
                    // Manually append if selection was lost
                    const newImg = document.createElement('img');
                    newImg.src = downloadUrl;
                    newImg.style.maxWidth = '100%';
                    editorRef.current.appendChild(newImg);
                    editorRef.current.appendChild(document.createElement('br'));
                }
            }

            // Optional: reset file input
            e.target.value = '';
        } catch (err) {
            console.error('Error uploading image:', err);
            alert(t('pageEditor.errorUpload'));
        } finally {
            setIsUploading(false);
        }
    };

    const handleEditorMouseDown = (e) => {
        if (!isEditing || e.target.tagName !== 'IMG') return;

        const img = e.target;
        const rect = img.getBoundingClientRect();
        const offsetX = e.clientX - rect.left;
        const offsetY = e.clientY - rect.top;

        // If near bottom-right corner (within 40px)
        if (offsetX > rect.width - 40 && offsetY > rect.height - 40) {
            e.preventDefault();
            e.stopPropagation();
            setResizingImg(img);
            setStartSize({ width: rect.width, x: e.clientX });
        }
    };

    const handleEditorMouseMove = (e) => {
        if (!isEditing) return;
        const target = e.target;

        if (target.tagName === 'IMG') {
            setHoveredImg(target);
            setImgRect(target.getBoundingClientRect());
        } else if (hoveredImg) {
            // Check if mouse is still near the active image
            const rect = hoveredImg.getBoundingClientRect();
            const buffer = 30; // 30px buffer to allow moving to the delete button
            if (
                e.clientX < rect.left - buffer ||
                e.clientX > rect.right + buffer ||
                e.clientY < rect.top - buffer ||
                e.clientY > rect.bottom + buffer
            ) {
                setHoveredImg(null);
                setImgRect(null);
            }
        }
    };

    const handleDeleteImage = async (img) => {
        if (window.confirm(t('pageEditor.confirmDeleteImage'))) {
            const src = img.src;
            if (src.includes('firebasestorage.googleapis.com')) {
                try {
                    await mockService.deleteImageByUrl(src);
                } catch (err) {
                    console.error('Error deleting from storage:', err);
                }
            }
            img.remove();
            setHoveredImg(null);
            setImgRect(null);
        }
    };

    const handleEditorClick = async (e) => {
        if (!isEditing) return;

        if (e.target.tagName === 'IMG') {
            // Click no longer triggers delete
        }
    };

    if (isLoading) {
        return <div className="container" style={{ paddingTop: '2rem' }}>{t('common.loading')}</div>;
    }

    if (!pageData) return null;

    return (
        <div className="container custom-page">
            <header className="page-header">
                <h1 className="page-title">{getTranslatedTitle(pageData.title)}</h1>
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

            {isAdmin && <p className="admin-hint text-secondary">{t('pageEditor.hint')}</p>}

            <div className={`card custom-page-content-card ${isEditing ? 'editing' : ''}`}>
                {isEditing && (
                    <div className="editor-toolbar">
                        <button onClick={() => execCommand('bold')} title="Bold"><FaBold /></button>
                        <button onClick={() => execCommand('italic')} title="Italic"><FaItalic /></button>
                        <div className="toolbar-separator"></div>
                        <div className="toolbar-select-wrapper">
                            <FaHeading className="select-icon" />
                            <select
                                onChange={(e) => execCommand('formatBlock', e.target.value)}
                                className="editor-select"
                                defaultValue="P"
                            >
                                <option value="P">{t('pageEditor.textNormal')}</option>
                                <option value="H1">{t('pageEditor.title1')}</option>
                                <option value="H2">{t('pageEditor.title2')}</option>
                                <option value="H3">{t('pageEditor.title3')}</option>
                                <option value="H4">{t('pageEditor.title4')}</option>
                            </select>
                        </div>
                        <div className="toolbar-separator"></div>
                        <button onClick={() => execCommand('insertUnorderedList')} title="Unordered List"><FaListUl /></button>
                        <button onClick={() => execCommand('insertOrderedList')} title="Ordered List"><FaListOl /></button>
                        <button onClick={addLink} title="Add Link"><FaLink /></button>
                        <button onClick={addImage} title="Add Image URL"><FaImage /></button>
                        <button onClick={() => fileInputRef.current?.click()} title={t('pageEditor.uploadImage')} disabled={isUploading}>
                            {isUploading ? <FaSpinner className="icon-spin" /> : <FaUpload />}
                        </button>
                    </div>
                )}

                <input
                    type="file"
                    ref={fileInputRef}
                    style={{ display: 'none' }}
                    accept="image/*"
                    onChange={handleFileUpload}
                />

                <div
                    ref={editorRef}
                    className="custom-page-content"
                    contentEditable={isEditing}
                    onMouseDown={handleEditorMouseDown}
                    onMouseMove={handleEditorMouseMove}
                    onClick={handleEditorClick}
                    onInput={() => {/* Triggered on every change, but we read on save */ }}
                    style={{
                        outline: 'none',
                        minHeight: '200px',
                        padding: isEditing ? '1rem' : '0'
                    }}
                />
            </div>

            {isEditing && hoveredImg && imgRect && (
                <button
                    className="floating-delete-btn animate-fade-in"
                    style={{
                        position: 'absolute',
                        top: imgRect.top + window.scrollY + 10,
                        left: imgRect.right + window.scrollX - 40,
                        zIndex: 100,
                    }}
                    onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        handleDeleteImage(hoveredImg);
                    }}
                    title={t('common.delete')}
                >
                    <FaTrash />
                </button>
            )}

            {showLinkModal && (
                <div className="modal-overlay">
                    <div className="modal-content card animate-fade-in">
                        <h3>{t('pageEditor.addLink')}</h3>
                        <form onSubmit={handleLinkSubmit} className="form-vertical">
                            <div className="form-group">
                                <label>{t('pageEditor.linkText')}</label>
                                <input
                                    type="text"
                                    className="input-field"
                                    value={linkData.text}
                                    onChange={e => setLinkData({ ...linkData, text: e.target.value })}
                                />
                            </div>
                            <div className="form-group">
                                <label>{t('pageEditor.linkUrl')}</label>
                                <input
                                    type="url"
                                    className="input-field"
                                    value={linkData.url}
                                    onChange={e => setLinkData({ ...linkData, url: e.target.value })}
                                    required
                                    autoFocus
                                />
                            </div>
                            <div className="form-actions">
                                <button type="button" className="btn btn-outline" onClick={() => setShowLinkModal(false)}>
                                    {t('common.cancel')}
                                </button>
                                <button type="submit" className="btn btn-primary">
                                    {t('common.save')}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            <style>{`
                .modal-overlay {
                    position: fixed;
                    top: 0;
                    left: 0;
                    right: 0;
                    bottom: 0;
                    background: rgba(0, 0, 0, 0.7);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    z-index: 1000;
                    backdrop-filter: blur(4px);
                }
                .modal-content {
                    width: 100%;
                    max-width: 400px;
                    padding: 2rem;
                }
                .form-vertical {
                    display: flex;
                    flex-direction: column;
                    gap: 1.5rem;
                }
                .form-group {
                    display: flex;
                    flex-direction: column;
                    gap: 0.5rem;
                }
                .form-actions {
                    display: flex;
                    justify-content: flex-end;
                    gap: 1rem;
                    margin-top: 0.5rem;
                }
                .custom-page {
                    padding-top: 2rem;
                    max-width: 900px;
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
                .custom-page-content-card.editing {
                    padding: 0;
                }
                .editor-toolbar {
                    display: flex;
                    gap: 0.5rem;
                    padding: 0.75rem 1rem;
                    background: rgba(255, 255, 255, 0.05);
                    border-bottom: 1px solid var(--glass-border);
                    position: sticky;
                    top: 0;
                    z-index: 10;
                }
                .editor-toolbar button {
                    background: none;
                    border: 1px solid var(--glass-border);
                    color: var(--text-primary);
                    padding: 0.5rem;
                    border-radius: 0.25rem;
                    cursor: pointer;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    transition: all 0.2s;
                }
                .editor-toolbar button:hover {
                    background: var(--primary);
                    color: white;
                }
                .toolbar-separator {
                    width: 1px;
                    height: 24px;
                    background: var(--glass-border);
                    margin: 0 0.25rem;
                }
                .toolbar-select-wrapper {
                    position: relative;
                    display: flex;
                    align-items: center;
                    border: 1px solid var(--glass-border);
                    border-radius: 0.25rem;
                    padding: 0 0.5rem;
                    background: rgba(255, 255, 255, 0.05);
                }
                .select-icon {
                    font-size: 0.8rem;
                    color: var(--text-secondary);
                    margin-right: 0.5rem;
                }
                .editor-select {
                    background: none;
                    border: none;
                    color: var(--text-primary);
                    font-size: 0.9rem;
                    padding: 0.4rem 0.25rem;
                    cursor: pointer;
                    outline: none;
                }
                .editor-select option {
                    background: #1a1a1a;
                    color: white;
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
                .custom-page-content img {
                    max-width: 100%;
                    border-radius: 0.5rem;
                    margin: 1.5rem 0;
                }
                .custom-page-content-card.editing .custom-page-content img {
                    cursor: nwse-resize;
                    transition: outline 0.2s;
                    position: relative;
                    outline: 2px dashed rgba(255, 255, 255, 0.3);
                }
                .custom-page-content-card.editing .custom-page-content img:hover {
                    outline: 3px solid var(--primary);
                }
                .floating-delete-btn {
                    background: #ef4444;
                    color: white;
                    border: none;
                    width: 30px;
                    height: 30px;
                    border-radius: 50%;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    cursor: pointer;
                    box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
                    transition: all 0.2s;
                }
                .floating-delete-btn:hover {
                    background: #dc2626;
                    transform: scale(1.1);
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
                .animate-fade-in {
                    animation: fadeIn 0.3s ease-out;
                }
                @keyframes fadeIn {
                    from { opacity: 0; transform: translateY(10px); }
                    to { opacity: 1; transform: translateY(0); }
                }
            `}</style>
        </div>
    );
};

export default CustomPage;
