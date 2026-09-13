import { useState, useEffect, useRef, forwardRef, useImperativeHandle } from 'react';
import { useConfirm, useAlert } from '../context/ConfirmContext';
import { useLanguage } from '../context/LanguageContext';
import { mockService } from '../services/mockData';
import { FaBold, FaItalic, FaListUl, FaListOl, FaLink, FaImage, FaUpload, FaTrash, FaHeading, FaAlignLeft, FaAlignCenter, FaAlignRight, FaQuoteLeft, FaSpinner, FaUndo, FaRedo } from 'react-icons/fa';

/**
 * Reusable rich text editor built on contentEditable.
 * Uncontrolled by design: read the current HTML via ref.getHTML() when saving.
 */
const RichTextEditor = forwardRef(({ initialValue = '', storagePathPrefix, placeholder }, ref) => {
    const { t } = useLanguage();
    const confirm = useConfirm();
    const alert = useAlert();

    const [isUploading, setIsUploading] = useState(false);
    const [showLinkModal, setShowLinkModal] = useState(false);
    const [linkData, setLinkData] = useState({ text: '', url: '' });
    const [resizingImg, setResizingImg] = useState(null);
    const [startSize, setStartSize] = useState({ width: 0, x: 0 });
    const [hoveredImg, setHoveredImg] = useState(null);
    const [imgRect, setImgRect] = useState(null);

    const editorRef = useRef(null);
    const fileInputRef = useRef(null);
    const wrapperRef = useRef(null);

    useImperativeHandle(ref, () => ({
        getHTML: () => editorRef.current?.innerHTML || '',
        getImages: () => editorRef.current
            ? Array.from(editorRef.current.querySelectorAll('img')).map(img => img.src)
            : [],
        focus: () => editorRef.current?.focus(),
    }));

    useEffect(() => {
        if (editorRef.current) {
            editorRef.current.innerHTML = initialValue || '';
        }
        // Only seed content on mount / explicit resets, never on every keystroke.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    useEffect(() => {
        const handleMouseMove = (e) => {
            if (!resizingImg) return;
            const deltaX = e.clientX - startSize.x;
            const newWidth = Math.max(50, startSize.width + deltaX);
            resizingImg.style.width = `${newWidth}px`;
            resizingImg.style.height = 'auto';
        };
        const handleMouseUp = () => setResizingImg(null);

        if (resizingImg) {
            window.addEventListener('mousemove', handleMouseMove);
            window.addEventListener('mouseup', handleMouseUp);
        }
        return () => {
            window.removeEventListener('mousemove', handleMouseMove);
            window.removeEventListener('mouseup', handleMouseUp);
        };
    }, [resizingImg, startSize]);

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
            const textToInsert = linkData.text || linkData.url;
            const linkHtml = `<a href="${linkData.url}" target="_blank" rel="noopener noreferrer">${textToInsert}</a>`;
            document.execCommand('insertHTML', false, linkHtml);
        }

        setShowLinkModal(false);
        setLinkData({ text: '', url: '' });
    };

    const handleFileUpload = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        setIsUploading(true);
        try {
            const fileName = `${Date.now()}_${file.name}`;
            const storagePath = `${storagePathPrefix}/${fileName}`;
            const downloadUrl = await mockService.uploadImage(storagePath, file);

            if (editorRef.current) {
                editorRef.current.focus();
                document.execCommand('insertImage', false, downloadUrl);

                const img = editorRef.current.querySelector(`img[src="${downloadUrl}"]`);
                if (!img) {
                    const newImg = document.createElement('img');
                    newImg.src = downloadUrl;
                    newImg.style.maxWidth = '100%';
                    editorRef.current.appendChild(newImg);
                    editorRef.current.appendChild(document.createElement('br'));
                }
            }

            e.target.value = '';
        } catch (err) {
            console.error('Error uploading image:', err);
            await alert(t('pageEditor.errorUpload'));
        } finally {
            setIsUploading(false);
        }
    };

    const handleEditorMouseDown = (e) => {
        if (e.target.tagName !== 'IMG') return;

        const img = e.target;
        const rect = img.getBoundingClientRect();
        const offsetX = e.clientX - rect.left;
        const offsetY = e.clientY - rect.top;

        if (offsetX > rect.width - 40 && offsetY > rect.height - 40) {
            e.preventDefault();
            e.stopPropagation();
            setResizingImg(img);
            setStartSize({ width: rect.width, x: e.clientX });
        }
    };

    const handleEditorMouseMove = (e) => {
        const target = e.target;
        if (target.tagName === 'IMG') {
            setHoveredImg(target);
            setImgRect(target.getBoundingClientRect());
        } else if (hoveredImg) {
            const rect = hoveredImg.getBoundingClientRect();
            const buffer = 30;
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
        if (await confirm(t('pageEditor.confirmDeleteImage'))) {
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

    return (
        <div className="rich-text-editor" ref={wrapperRef}>
            <div className="editor-toolbar">
                <button type="button" onClick={() => execCommand('undo')} title={t('pageEditor.undo')}><FaUndo /></button>
                <button type="button" onClick={() => execCommand('redo')} title={t('pageEditor.redo')}><FaRedo /></button>
                <div className="toolbar-separator"></div>
                <button type="button" onClick={() => execCommand('bold')} title="Bold"><FaBold /></button>
                <button type="button" onClick={() => execCommand('italic')} title="Italic"><FaItalic /></button>
                <button type="button" onClick={() => execCommand('formatBlock', 'BLOCKQUOTE')} title={t('pageEditor.quote')}><FaQuoteLeft /></button>
                <div className="toolbar-separator"></div>
                <button type="button" onClick={() => execCommand('justifyLeft')} title={t('pageEditor.alignLeft')}><FaAlignLeft /></button>
                <button type="button" onClick={() => execCommand('justifyCenter')} title={t('pageEditor.alignCenter')}><FaAlignCenter /></button>
                <button type="button" onClick={() => execCommand('justifyRight')} title={t('pageEditor.alignRight')}><FaAlignRight /></button>
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
                <button type="button" onClick={() => execCommand('insertUnorderedList')} title="Unordered List"><FaListUl /></button>
                <button type="button" onClick={() => execCommand('insertOrderedList')} title="Ordered List"><FaListOl /></button>
                <button type="button" onClick={addLink} title="Add Link"><FaLink /></button>
                <button type="button" onClick={() => fileInputRef.current?.click()} title={t('pageEditor.uploadImage')} disabled={isUploading}>
                    {isUploading ? <FaSpinner className="icon-spin" /> : <FaImage />}
                </button>
            </div>

            <input
                type="file"
                ref={fileInputRef}
                style={{ display: 'none' }}
                accept="image/*"
                onChange={handleFileUpload}
            />

            <div
                ref={editorRef}
                className="rich-text-content"
                contentEditable
                onMouseDown={handleEditorMouseDown}
                onMouseMove={handleEditorMouseMove}
                data-placeholder={placeholder}
                suppressContentEditableWarning
            />

            {hoveredImg && imgRect && (
                <button
                    type="button"
                    className="floating-delete-btn animate-fade-in"
                    style={{
                        position: 'absolute',
                        top: imgRect.top + window.scrollY - (wrapperRef.current?.getBoundingClientRect().top + window.scrollY || 0) + 10,
                        left: imgRect.right + window.scrollX - (wrapperRef.current?.getBoundingClientRect().left + window.scrollX || 0) - 40,
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
                <div className="modal-overlay" onClick={() => setShowLinkModal(false)}>
                    <div className="modal-content card animate-fade-in" onClick={e => e.stopPropagation()}>
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
                .rich-text-editor {
                    position: relative;
                    border: 1px solid var(--glass-border);
                    border-radius: 0.75rem;
                    overflow: hidden;
                    background: rgba(0,0,0,0.15);
                }
                .editor-toolbar {
                    display: flex;
                    flex-wrap: wrap;
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
                .editor-toolbar button:disabled {
                    opacity: 0.5;
                    cursor: not-allowed;
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
                .rich-text-content {
                    font-size: 1.05rem;
                    min-height: 300px;
                    padding: 1.5rem;
                    outline: none;
                    line-height: 1.7;
                }
                .rich-text-content:empty::before {
                    content: attr(data-placeholder);
                    color: var(--text-secondary);
                    opacity: 0.6;
                    pointer-events: none;
                }
                .rich-text-content h1, .rich-text-content h2, .rich-text-content h3, .rich-text-content h4 {
                    margin-top: 1.5rem;
                    margin-bottom: 0.75rem;
                }
                .rich-text-content p {
                    margin-bottom: 1rem;
                }
                .rich-text-content ul, .rich-text-content ol {
                    margin-bottom: 1rem;
                    padding-left: 2rem;
                }
                .rich-text-content blockquote {
                    border-left: 3px solid var(--primary);
                    margin: 1rem 0;
                    padding: 0.5rem 0 0.5rem 1.25rem;
                    color: var(--text-secondary);
                    font-style: italic;
                }
                .rich-text-content img {
                    max-width: 100%;
                    border-radius: 0.5rem;
                    margin: 1rem 0;
                    cursor: nwse-resize;
                    outline: 2px dashed rgba(255, 255, 255, 0.3);
                }
                .rich-text-content img:hover {
                    outline: 3px solid var(--primary);
                }
                .rich-text-content a {
                    color: var(--primary);
                    text-decoration: underline;
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
                .icon-spin {
                    animation: spin 1s linear infinite;
                }
                @keyframes spin {
                    from { transform: rotate(0deg); }
                    to { transform: rotate(360deg); }
                }
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
});

RichTextEditor.displayName = 'RichTextEditor';

export default RichTextEditor;
