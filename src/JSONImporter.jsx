import React, { useState } from 'react';
import { db, auth } from './firebase';
import { collection, writeBatch, doc } from 'firebase/firestore';

export default function JSONImporter({ onComplete }) {
  const [importing, setImporting] = useState(false);
  const [progress, setProgress] = useState('');
  const [showModal, setShowModal] = useState(false);

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setImporting(true);
    setProgress('Reading file...');

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const fileContent = event.target.result;
        const booksArray = JSON.parse(fileContent);

        if (!Array.isArray(booksArray)) {
          alert('Invalid file format. The JSON file must contain an array of books.');
          setImporting(false);
          setProgress('');
          return;
        }

        setProgress(`Parsing ${booksArray.length} books...`);

        const currentUser = auth.currentUser;
        if (!currentUser) {
          alert('You must be logged in to import books.');
          setImporting(false);
          setProgress('');
          return;
        }

        const booksToSave = booksArray.map(b => {
          let tagsArray = [];
          if (Array.isArray(b.tags)) {
            tagsArray = b.tags;
          } else if (typeof b.tags === 'string' && b.tags.trim()) {
            tagsArray = b.tags.split(',').map(t => t.trim()).filter(t => t);
          }

          return {
            title: b.title || 'Untitled Book',
            author: b.author || 'Unknown Author',
            type: b.type || 'Physical',
            status: b.status || 'Owned',
            inQueue: b.inQueue || (b.status === 'Queue'),
            location: b.location || '',
            tags: tagsArray,
            series: b.series || '',
            seriesNumber: b.seriesNumber || '',
            cataloged: b.cataloged || new Date().toLocaleDateString('en-US', { month: 'short', year: 'numeric' }),
            startedAt: b.startedAt || '',
            finishedAt: b.finishedAt || '',
            provenance: b.provenance || '',
            reading: b.reading || '',
            ownership: b.ownership || '',
            coverUrl: b.coverUrl || '',
            isbn: b.isbn || '',
            borrower: b.borrower || '',
            lentAt: b.lentAt || '',
            dueAt: b.dueAt || '',
            loans: Array.isArray(b.loans) ? b.loans : [],
            rating: b.rating !== undefined ? Number(b.rating) : 0,
            price: b.price || '',
            purchaseUrl: b.purchaseUrl || '',
            quotes: Array.isArray(b.quotes) ? b.quotes : [],
            currentPage: b.currentPage || '',
            totalPages: b.totalPages || '',
            readingSessions: Array.isArray(b.readingSessions) ? b.readingSessions : [],
            userId: currentUser.uid,
            createdAt: new Date()
          };
        });

        setProgress(`Importing ${booksToSave.length} books...`);

        const CHUNK_SIZE = 500;
        let count = 0;
        for (let i = 0; i < booksToSave.length; i += CHUNK_SIZE) {
          const chunk = booksToSave.slice(i, i + CHUNK_SIZE);
          const batch = writeBatch(db);
          chunk.forEach(book => {
            const docRef = doc(collection(db, 'books'));
            batch.set(docRef, book);
            count++;
          });
          await batch.commit();
          setProgress(`Saved ${count} of ${booksToSave.length} books...`);
        }

        alert(`Successfully imported ${booksToSave.length} books into your personal library!`);
        if (onComplete) onComplete();
      } catch (err) {
        console.error(err);
        alert('Error parsing JSON backup file. Make sure it is a valid Benedict Library export.');
      } finally {
        setImporting(false);
        setProgress('');
      }
    };

    reader.onerror = () => {
      alert('Error reading file.');
      setImporting(false);
      setProgress('');
    };

    reader.readAsText(file);
  };

  return (
    <div style={{ display: 'inline-block' }}>
      <button 
        type="button" 
        className="primaryBtn" 
        style={{ background: 'var(--blue)', cursor: importing ? 'wait' : 'pointer' }}
        onClick={() => setShowModal(true)}
        disabled={importing}
      >
        {importing ? progress : 'Import JSON Backup'}
      </button>

      {showModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.7)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
          <div style={{ background: 'var(--cream)', border: '8px double var(--line)', maxWidth: '420px', width: '100%', padding: '24px', position: 'relative', boxShadow: '0 20px 40px rgba(0,0,0,0.4)', borderRadius: '4px', fontFamily: 'Cormorant Garamond, serif', color: 'var(--ink)' }}>
            <button 
              style={{ position: 'absolute', top: '10px', right: '14px', background: 'transparent', border: 'none', fontSize: '24px', cursor: 'pointer', color: 'var(--muted)', fontFamily: 'inherit' }} 
              onClick={() => setShowModal(false)}
            >
              ×
            </button>
            <h3 style={{ fontSize: '24px', margin: '0 0 12px 0', borderBottom: '1px solid var(--line)', paddingBottom: '6px', color: 'var(--blue)' }}>JSON Import Settings</h3>
            
            <p style={{ fontSize: '14px', fontFamily: 'Inter, sans-serif', lineHeight: '1.4', margin: '14px 0', color: 'var(--ink)' }}>
              Choose a valid <strong>Benedict Library JSON export</strong> file. The books will be added to your account's personal library.
            </p>

            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '20px', flexWrap: 'wrap', alignItems: 'center' }}>
              <button 
                type="button" 
                onClick={() => setShowModal(false)}
                style={{ 
                  cursor: 'pointer', 
                  fontSize: '12px', 
                  padding: '6px 14px', 
                  margin: 0, 
                  borderRadius: '999px', 
                  fontWeight: 'bold', 
                  background: 'var(--muted)', 
                  color: '#ffffff', 
                  border: 'none',
                  boxShadow: '0 2px 6px rgba(0,0,0,0.15)'
                }}
              >
                Cancel
              </button>
              
              <label 
                style={{ 
                  cursor: 'pointer', 
                  fontSize: '12px', 
                  padding: '6px 14px', 
                  margin: 0, 
                  borderRadius: '999px', 
                  fontWeight: 'bold', 
                  background: 'var(--blue)', 
                  color: '#ffffff', 
                  border: 'none', 
                  display: 'inline-flex', 
                  alignItems: 'center',
                  boxShadow: '0 2px 6px rgba(0,0,0,0.15)'
                }}
              >
                Choose JSON File
                <input 
                  type="file" 
                  accept=".json" 
                  style={{ display: 'none' }} 
                  onChange={(e) => {
                    handleFileChange(e);
                    setShowModal(false);
                  }}
                  disabled={importing}
                />
              </label>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
