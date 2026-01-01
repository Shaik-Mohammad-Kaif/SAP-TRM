import React, { useState } from 'react';
import '../styles/UploadDocument.css';

export default function UploadDocument({ apiEndpoint, onUploadSuccess }) {
    const [isDragging, setIsDragging] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [uploadResult, setUploadResult] = useState(null);
    const [error, setError] = useState(null);

    const handleDragOver = (e) => {
        e.preventDefault();
        setIsDragging(true);
    };

    const handleDragLeave = () => {
        setIsDragging(false);
    };

    const handleDrop = (e) => {
        e.preventDefault();
        setIsDragging(false);

        const files = e.dataTransfer.files;
        if (files.length > 0) {
            handleFileUpload(files[0]);
        }
    };

    const handleFileSelect = (e) => {
        const file = e.target.files[0];
        if (file) {
            handleFileUpload(file);
        }
    };

    const handleFileUpload = async (file) => {
        // Validate file type
        const validTypes = ['application/pdf', 'text/plain'];
        if (!validTypes.includes(file.type) && !file.name.endsWith('.pdf') && !file.name.endsWith('.txt')) {
            setError('Only PDF and TXT files are allowed');
            setTimeout(() => setError(null), 3000);
            return;
        }

        setUploading(true);
        setError(null);
        setUploadResult(null);

        try {
            const formData = new FormData();
            formData.append('file', file);

            const response = await fetch(`${apiEndpoint}/upload`, {
                method: 'POST',
                body: formData,
            });

            const data = await response.json();

            if (response.ok) {
                setUploadResult(data);
                if (onUploadSuccess) {
                    onUploadSuccess(data);
                }
                // Clear result after 5 seconds
                setTimeout(() => setUploadResult(null), 5000);
            } else {
                setError(data.detail || 'Upload failed');
                setTimeout(() => setError(null), 5000);
            }
        } catch (err) {
            setError('Failed to upload document. Please check your connection.');
            setTimeout(() => setError(null), 5000);
        } finally {
            setUploading(false);
        }
    };

    return (
        <div className="upload-document-container">
            <div
                className={`upload-dropzone ${isDragging ? 'dragging' : ''} ${uploading ? 'uploading' : ''}`}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
            >
                <div className="upload-icon">📄</div>
                <div className="upload-text">
                    {uploading ? (
                        <>
                            <strong>Uploading...</strong>
                            <p>Processing and embedding your document</p>
                        </>
                    ) : (
                        <>
                            <strong>Drop your document here</strong>
                            <p>or click to browse (PDF, TXT)</p>
                        </>
                    )}
                </div>
                <input
                    type="file"
                    accept=".pdf,.txt"
                    onChange={handleFileSelect}
                    disabled={uploading}
                    className="upload-input"
                />
            </div>

            {/* Upload Result */}
            {uploadResult && (
                <div className="upload-result success">
                    <div className="result-icon">✓</div>
                    <div className="result-content">
                        <strong>{uploadResult.message}</strong>
                        <p>Document: {uploadResult.document_name} • Chunks: {uploadResult.chunks_created}</p>
                    </div>
                </div>
            )}

            {/* Error Message */}
            {error && (
                <div className="upload-result error">
                    <div className="result-icon">✕</div>
                    <div className="result-content">
                        <strong>Upload Failed</strong>
                        <p>{error}</p>
                    </div>
                </div>
            )}
        </div>
    );
}
