import React, { useState, useRef } from 'react';
import {
  Upload,
  Image as ImageIcon,
  Trash2,
  AlertCircle,
  CheckCircle2,
  Clock,
  X
} from 'lucide-react';
import { getAuthToken, getBackendUrl } from '../services/api.js';

/**
 * PublishProduct Component
 * Provides direct publish product flow with absolute backend URL support (e.g. Render)
 * and robust error handling to prevent "Unexpected token '<', '<!DOCTYPE' is not valid JSON".
 */
export default function PublishProduct({ categories = [], onClose, onSuccess }) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState('');
  const [originalPrice, setOriginalPrice] = useState('');
  const [categoryId, setCategoryId] = useState(categories[0]?.id || 'phones-tablets');
  const [condition, setCondition] = useState('new');
  const [images, setImages] = useState([]);
  const [whatsappNumber, setWhatsappNumber] = useState('');
  const [state, setState] = useState('Lagos');
  const [city, setCity] = useState('Ikeja');
  const [quantity, setQuantity] = useState('1');

  const [loading, setLoading] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const fileInputRef = useRef(null);

  // Handle Image File Upload to backend
  const handleImageUpload = async (e) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setUploadingImage(true);
    setErrorMessage('');

    try {
      const formData = new FormData();
      for (const file of files) {
        formData.append('images', file);
      }

      const token = getAuthToken();
      const base = getBackendUrl();
      const uploadUrl = base ? `${base}/api/upload` : '/api/upload';

      const res = await fetch(uploadUrl, {
        method: 'POST',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        body: formData
      });

      // Defensive JSON parsing: catch HTML error pages before crashing
      const text = await res.text();
      let data;
      try {
        data = text ? JSON.parse(text) : {};
      } catch {
        if (text.trim().startsWith('<')) {
          throw new Error(
            `Upload endpoint returned HTML (${res.status} ${res.statusText}). ` +
            `Ensure ${uploadUrl} is properly mounted on your backend.`
          );
        }
        throw new Error(`Upload failed: ${text.slice(0, 100)}`);
      }

      if (!res.ok) {
        throw new Error(data.error || 'Failed to upload photograph');
      }

      if (data.urls && Array.isArray(data.urls)) {
        setImages((prev) => [...prev, ...data.urls]);
      }
    } catch (err) {
      setErrorMessage(err.message || 'Image upload failed');
    } finally {
      setUploadingImage(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const removeImage = (index) => {
    setImages((prev) => prev.filter((_, idx) => idx !== index));
  };

  // Publish Product POST request
  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage('');

    // MANDATORY REQUIREMENT: At least one photo required
    if (images.length === 0) {
      setErrorMessage('MANDATORY: You must upload at least one valid product photograph.');
      return;
    }

    setLoading(true);

    try {
      const base = getBackendUrl();
      // Constructs absolute or relative URL
      const targetUrl = base ? `${base}/api/products` : '/api/products';
      const token = getAuthToken();

      const res = await fetch(targetUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        body: JSON.stringify({
          title: title.trim(),
          description: description.trim(),
          price: Number(price),
          originalPrice: originalPrice ? Number(originalPrice) : undefined,
          categoryId,
          condition,
          images,
          whatsappNumber: whatsappNumber.trim(),
          state,
          city,
          quantity: Number(quantity) || 1
        })
      });

      // SAFE RESPONSE PARSING: Prevents "Unexpected token '<', '<!DOCTYPE' is not valid JSON"
      const responseText = await res.text();
      let responseData;

      try {
        responseData = responseText ? JSON.parse(responseText) : {};
      } catch {
        // If the server returns HTML (e.g. 404 HTML page or Render gateway error), catch it cleanly
        if (responseText.trim().startsWith('<')) {
          throw new Error(
            `Backend returned HTML instead of JSON (${res.status} ${res.statusText}) at ${targetUrl}. ` +
            `Please ensure that POST ${targetUrl} is defined in your backend and CORS is enabled.`
          );
        }
        throw new Error(`Invalid response received: ${responseText.slice(0, 120)}`);
      }

      if (!res.ok) {
        throw new Error(responseData.error || responseData.message || `Publish failed (HTTP ${res.status})`);
      }

      if (onSuccess) onSuccess(responseData.product);
      if (onClose) onClose();
    } catch (err) {
      setErrorMessage(err.message || 'An error occurred while publishing.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4">
      <div className="relative w-full max-w-2xl bg-white rounded-3xl shadow-2xl overflow-hidden my-4">
        {/* Header */}
        <div className="bg-[#F68B1F] text-white px-6 py-4 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-black">Publish Product Listing</h2>
            <p className="text-xs text-white/90">NaijaMart • Direct WhatsApp Contact</p>
          </div>
          {onClose && (
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center"
            >
              <X className="w-4 h-4 text-white" />
            </button>
          )}
        </div>

        {/* 7-Day Expiration Banner */}
        <div className="bg-amber-50 border-b border-amber-200 px-6 py-2.5 text-xs text-amber-900 flex items-center gap-2">
          <Clock className="w-4 h-4 text-[#F68B1F] shrink-0" />
          <span>Strict 7-Day Listing: All published items automatically expire after 168 hours.</span>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[75vh] overflow-y-auto">
          {errorMessage && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Mandatory Image Upload Section */}
          <div>
            <label className="block text-xs font-bold text-gray-800 uppercase tracking-wider mb-1">
              Product Images <span className="text-red-500">* MANDATORY</span>
            </label>
            <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 mb-2">
              {images.map((url, idx) => (
                <div key={idx} className="relative aspect-square rounded-xl overflow-hidden border border-gray-200 bg-gray-50">
                  <img src={url} alt={`Photo ${idx + 1}`} className="w-full h-full object-cover" />
                  <button
                    type="button"
                    onClick={() => removeImage(idx)}
                    className="absolute top-1 right-1 w-5 h-5 bg-red-600 text-white rounded-full flex items-center justify-center"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              ))}
              {images.length < 6 && (
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploadingImage}
                  className="aspect-square rounded-xl border-2 border-dashed border-[#F68B1F] bg-orange-50/50 hover:bg-orange-50 flex flex-col items-center justify-center text-xs font-bold text-[#F68B1F]"
                >
                  <Upload className="w-4 h-4 mb-1" />
                  <span>{uploadingImage ? 'Uploading...' : 'Add Photo'}</span>
                </button>
              )}
            </div>
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept="image/*"
              className="hidden"
              onChange={handleImageUpload}
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-800 mb-1">Product Title</label>
            <input
              type="text"
              required
              placeholder="e.g. iPhone 15 Pro Max 256GB"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full text-xs p-2.5 bg-gray-50 border border-gray-300 rounded-xl outline-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-gray-800 mb-1">Price (₦)</label>
              <input
                type="number"
                required
                min="1"
                placeholder="45000"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                className="w-full text-xs p-2.5 bg-gray-50 border border-gray-300 rounded-xl outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-800 mb-1">WhatsApp Phone</label>
              <input
                type="tel"
                required
                placeholder="08012345678"
                value={whatsappNumber}
                onChange={(e) => setWhatsappNumber(e.target.value)}
                className="w-full text-xs p-2.5 bg-gray-50 border border-gray-300 rounded-xl outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-800 mb-1">Description</label>
            <textarea
              required
              rows={3}
              placeholder="Provide condition, features, warranty..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full text-xs p-2.5 bg-gray-50 border border-gray-300 rounded-xl outline-none"
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-gray-200">
            {onClose && (
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-xs font-semibold text-gray-600 hover:bg-gray-100 rounded-xl"
              >
                Cancel
              </button>
            )}
            <button
              type="submit"
              disabled={loading || images.length === 0}
              className={`px-5 py-2.5 text-xs font-bold rounded-xl text-white transition ${
                images.length === 0 ? 'bg-gray-300 text-gray-500 cursor-not-allowed' : 'bg-[#F68B1F] hover:bg-[#E07A15]'
              }`}
            >
              {loading ? 'Publishing...' : 'Publish Product (7 Days)'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
