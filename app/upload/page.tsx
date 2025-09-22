'use client';

import { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import Papa from 'papaparse';

export default function UploadPage() {
  const [files, setFiles] = useState<{ name: string; type: string; data: any[] }[]>([]);
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState('');

  const onDrop = useCallback((acceptedFiles: File[]) => {
    acceptedFiles.forEach(file => {
      Papa.parse(file, {
        complete: (result) => {
          const data = result.data as any[];
          // Filter out empty rows
          const cleanData = data.filter(row =>
            row && Object.values(row).some(val => val !== '' && val !== null)
          );

          setFiles(prev => [...prev, {
            name: file.name,
            type: file.name.toLowerCase().includes('hubspot') ? 'hubspot' : 'finance',
            data: cleanData
          }]);
          setMessage(`Loaded ${file.name} with ${cleanData.length} rows`);
        },
        header: true,
        skipEmptyLines: true,
        dynamicTyping: true
      });
    });
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'text/csv': ['.csv'],
      'application/vnd.ms-excel': ['.csv']
    }
  });

  const handleUpload = async () => {
    setUploading(true);
    try {
      const response = await fetch('/api/upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ files })
      });

      if (response.ok) {
        setMessage('Data uploaded successfully!');
        setTimeout(() => {
          window.location.href = '/dashboard';
        }, 2000);
      } else {
        setMessage('Upload failed. Please try again.');
      }
    } catch (error) {
      setMessage('Error uploading data: ' + error);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div style={{ padding: '2rem', fontFamily: 'system-ui' }}>
      <h1>Upload Weekly Data</h1>

      <div
        {...getRootProps()}
        style={{
          border: '2px dashed #ccc',
          borderRadius: '8px',
          padding: '2rem',
          textAlign: 'center',
          cursor: 'pointer',
          backgroundColor: isDragActive ? '#f0f0f0' : 'white',
          marginBottom: '1rem'
        }}
      >
        <input {...getInputProps()} />
        {isDragActive ? (
          <p>Drop the CSV files here...</p>
        ) : (
          <div>
            <p>Drag & drop CSV files here, or click to select</p>
            <p style={{ fontSize: '0.9em', color: '#666' }}>
              Upload your HubSpot export and Finance forecast
            </p>
          </div>
        )}
      </div>

      {files.length > 0 && (
        <div style={{ marginTop: '1rem' }}>
          <h3>Loaded Files:</h3>
          <ul>
            {files.map((file, index) => (
              <li key={index}>
                {file.name} - {file.data.length} rows ({file.type})
              </li>
            ))}
          </ul>

          {files.length >= 2 && (
            <button
              onClick={handleUpload}
              disabled={uploading}
              style={{
                padding: '0.5rem 2rem',
                backgroundColor: '#0070f3',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: uploading ? 'not-allowed' : 'pointer',
                opacity: uploading ? 0.5 : 1
              }}
            >
              {uploading ? 'Uploading...' : 'Process Data'}
            </button>
          )}
        </div>
      )}

      {message && (
        <div style={{
          marginTop: '1rem',
          padding: '0.5rem',
          backgroundColor: message.includes('success') ? '#d4edda' : '#f8d7da',
          color: message.includes('success') ? '#155724' : '#721c24',
          borderRadius: '4px'
        }}>
          {message}
        </div>
      )}

      <div style={{ marginTop: '2rem', fontSize: '0.9em', color: '#666' }}>
        <h3>Instructions:</h3>
        <ol>
          <li>Export your HubSpot data as CSV</li>
          <li>Export your Finance forecast as CSV</li>
          <li>Drag both files into the upload area above</li>
          <li>Click "Process Data" to analyze profitability</li>
        </ol>
      </div>
    </div>
  );
}